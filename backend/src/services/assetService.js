'use strict';

/**
 * AssetService
 *
 * Implements every business rule from ARCHITECTURE.md §2.3 and every
 * edge case in §5 that touches assets.  All methods are tenant-scoped;
 * tenantId is ALWAYS supplied by the caller from req.user — never from
 * the request body or URL.
 *
 * Edge cases handled here:
 *  EC-01  Duplicate assetCode on creation → 409
 *  EC-02  QR token not found → 404 (same shape as EC-03/04)
 *  EC-03  Malformed QR token → 404 (validation layer fires first, but service
 *          also guards in case it's called directly)
 *  EC-04  isPublicVisible false → 404 (query includes filter)
 *  EC-05  Assign already-assigned asset → 409
 *  EC-06  Both employeeId + locationId → 422 (validation layer, re-checked here)
 *  EC-07  Retired asset mutation → 409
 *  EC-11  Inactive employee assignment → 409; cross-tenant employee → 404
 *  EC-13  Available status while assigned → 409
 */

const mongoose = require('mongoose');
const Asset = require('../models/Asset');
const Employee = require('../models/Employee');
const Location = require('../models/Location');
const historyService = require('./historyService');
const qrService = require('./qrService');
const { errors } = require('../middleware/errorHandler');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a qrCodeUrl for an asset without generating the image.
 * Used when returning the asset object from most endpoints.
 */
function attachQrCodeUrl(assetObj, tenantId) {
  if (assetObj && assetObj.qrToken) {
    assetObj.qrCodeUrl = qrService.buildScanUrl(assetObj.qrToken, tenantId);
  }
  return assetObj;
}

/**
 * Safely convert a plain asset document (lean or toJSON) into the standard
 * API response shape. tenantId is already stripped by the model's toJSON.
 */
function formatAsset(doc, tenantId) {
  const obj = typeof doc.toJSON === 'function' ? doc.toJSON() : doc;
  return attachQrCodeUrl(obj, tenantId);
}

// ── Auto-generate assetCode ───────────────────────────────────────────────────

/**
 * Generate the next AST-NNNN code for a tenant.
 * Counts existing assets for this tenant and pads to 4 digits.
 * The unique compound index (tenantId, assetCode) catches races — callers
 * must handle 409 from a MongoServerError code 11000 (Assumption A-05).
 */
async function generateAssetCode(tenantId) {
  const count = await Asset.countDocuments({ tenantId });
  const seq = String(count + 1).padStart(4, '0');
  return `AST${seq}`;
}

// ── Public scan ───────────────────────────────────────────────────────────────

/**
 * Resolve a QR token for the public scan endpoint.
 * Returns a stripped public profile — NO internal IDs, NO qrToken, NO tenantId.
 * Retired assets are returned (status visible) if isPublicVisible is true (§4).
 *
 * @param {string} qrToken   64-char hex string (already validated by route layer)
 * @param {string} tenantId  From ?t= query param (already validated by TenantResolver)
 */
async function resolvePublicScan(qrToken, tenantId) {
  const asset = await Asset.findOne({ qrToken, tenantId, isPublicVisible: true }).lean();
  if (!asset) {
    throw errors.notFound('Asset not found.');
  }

  // Build public profile — whitelist only permitted fields (§3 permission matrix)
  const profile = {
    assetCode: asset.assetCode,
    name: asset.name,
    category: asset.category,
    description: asset.description || null,
    status: asset.status,
    assignedTo: null,
  };

  // Resolve assignment display — no IDs, no contactInfo
  if (asset.assignedEmployeeId) {
    const emp = await Employee.findOne({
      _id: asset.assignedEmployeeId,
      tenantId,
    }).lean();
    if (emp) {
      profile.assignedTo = {
        type: 'employee',
        displayName: emp.name,
        title: emp.title,
      };
    }
  } else if (asset.assignedLocationId) {
    const loc = await Location.findOne({
      _id: asset.assignedLocationId,
      tenantId,
    }).lean();
    if (loc) {
      profile.assignedTo = {
        type: 'location',
        name: loc.name,
        locationType: loc.type,
      };
    }
  }

  return profile;
}

// ── List ──────────────────────────────────────────────────────────────────────

/**
 * List assets with pagination and optional filters.
 * Empty result → 200 with data:[] (EC-10).
 */
async function listAssets(tenantId, query) {
  const {
    page = 1,
    limit = 20,
    status,
    category,
    assignedEmployeeId,
    assignedLocationId,
    search,
    isPublicVisible,
  } = query;

  const filter = { tenantId };
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (assignedEmployeeId) filter.assignedEmployeeId = new mongoose.Types.ObjectId(assignedEmployeeId);
  if (assignedLocationId) filter.assignedLocationId = new mongoose.Types.ObjectId(assignedLocationId);
  if (isPublicVisible !== undefined) filter.isPublicVisible = isPublicVisible;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { assetCode: { $regex: search, $options: 'i' } },
      { serialNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const [docs, total] = await Promise.all([
    Asset.find(filter)
      .select('-qrToken') // qrToken excluded from list endpoint
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Asset.countDocuments(filter),
  ]);

  const data = docs.map((d) => {
    const obj = { ...d };
    obj.id = d._id.toString();
    delete obj._id;
    delete obj.__v;
    delete obj.tenantId;
    if (obj.assignedEmployeeId) obj.assignedEmployeeId = obj.assignedEmployeeId.toString();
    if (obj.assignedLocationId) obj.assignedLocationId = obj.assignedLocationId.toString();
    return obj;
  });

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ── Get single ────────────────────────────────────────────────────────────────

/**
 * Fetch a single asset by internal _id, tenant-scoped.
 * Optionally include the QR image (Admin only, ?includeQrImage=true).
 */
async function getAssetById(tenantId, assetId, { includeQrImage = false } = {}) {
  if (!mongoose.isValidObjectId(assetId)) {
    throw errors.notFound('Asset not found.');
  }

  const asset = await Asset.findOne({ _id: assetId, tenantId });
  if (!asset) throw errors.notFound('Asset not found.');

  const obj = formatAsset(asset, tenantId);

  if (includeQrImage) {
    obj.qrCodeImageBase64 = await qrService.generateQrImage(obj.qrCodeUrl);
  }

  return obj;
}

// ── Create ────────────────────────────────────────────────────────────────────

/**
 * Create a new asset.
 * Generates qrToken automatically. Generates assetCode if not supplied.
 * Writes a Created history record.
 */
async function createAsset(tenantId, userId, body) {
  const { name, category, description, serialNumber, isPublicVisible, assetCode: providedCode } = body;

  // Determine assetCode
  let assetCode;
  if (providedCode) {
    // Caller supplied one — check uniqueness (EC-01)
    const exists = await Asset.exists({ tenantId, assetCode: providedCode.toUpperCase() });
    if (exists) {
      throw errors.conflict(`An asset with code '${providedCode.toUpperCase()}' already exists in this organization.`);
    }
    assetCode = providedCode.toUpperCase();
  } else {
    assetCode = await generateAssetCode(tenantId);
  }

  // Generate token pair
  const { qrToken, qrCodeUrl } = await qrService.createTokenPair(tenantId);

  const asset = await Asset.create({
    tenantId,
    qrToken,
    assetCode,
    name,
    category,
    description: description || null,
    serialNumber: serialNumber || null,
    isPublicVisible: isPublicVisible !== undefined ? isPublicVisible : true,
    status: 'Available',
    assignedEmployeeId: null,
    assignedLocationId: null,
  });

  await historyService.recordCreated({
    tenantId,
    assetId: asset._id,
    performedBy: userId,
    asset,
  });

  const obj = formatAsset(asset, tenantId);
  obj.qrCodeUrl = qrCodeUrl;
  return obj;
}

// ── Update metadata ───────────────────────────────────────────────────────────

/**
 * PATCH metadata fields. Writes Updated history only if something changed.
 * assetCode, status, qrToken, assignedEmployeeId, assignedLocationId are
 * intentionally excluded (per ARCHITECTURE.md §2.3 PATCH notes).
 */
async function updateAsset(tenantId, userId, assetId, body) {
  if (!mongoose.isValidObjectId(assetId)) throw errors.notFound('Asset not found.');

  const asset = await Asset.findOne({ _id: assetId, tenantId });
  if (!asset) throw errors.notFound('Asset not found.');

  const allowedFields = ['name', 'category', 'description', 'serialNumber', 'isPublicVisible'];
  const previousValue = {};
  const newValue = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined && body[field] !== asset[field]) {
      previousValue[field] = asset[field];
      newValue[field] = body[field];
      asset[field] = body[field];
    }
  }

  if (Object.keys(newValue).length === 0) {
    // Nothing actually changed — return current state without writing history
    return formatAsset(asset, tenantId);
  }

  asset.updatedAt = new Date();
  await asset.save();

  await historyService.recordUpdated({
    tenantId,
    assetId: asset._id,
    performedBy: userId,
    previousValue,
    newValue,
  });

  return formatAsset(asset, tenantId);
}

// ── History ───────────────────────────────────────────────────────────────────

const AssetHistory = require('../models/AssetHistory');
const { HISTORY_EVENT_TYPES } = require('../config/constants');

async function getAssetHistory(tenantId, assetId, query) {
  if (!mongoose.isValidObjectId(assetId)) throw errors.notFound('Asset not found.');

  const exists = await Asset.exists({ _id: assetId, tenantId });
  if (!exists) throw errors.notFound('Asset not found.');

  const { page = 1, limit = 20, eventType } = query;

  const filter = { tenantId, assetId: new mongoose.Types.ObjectId(assetId) };
  if (eventType) filter.eventType = eventType;

  const skip = (page - 1) * limit;
  const [docs, total] = await Promise.all([
    AssetHistory.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AssetHistory.countDocuments(filter),
  ]);

  const data = docs.map((d) => {
    const obj = { ...d };
    obj.id = d._id.toString();
    obj.assetId = d.assetId.toString();
    obj.performedBy = d.performedBy.toString();
    delete obj._id;
    delete obj.__v;
    delete obj.tenantId;
    return obj;
  });

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ── Assign ────────────────────────────────────────────────────────────────────

/**
 * Assign to employee or location.
 * Business rules: EC-05 (already assigned), EC-06 (both supplied, caught by
 * validator but re-checked here), EC-07 (Retired), EC-11 (inactive employee).
 */
async function assignAsset(tenantId, userId, assetId, { employeeId, locationId, note }) {
  if (!mongoose.isValidObjectId(assetId)) throw errors.notFound('Asset not found.');

  // EC-06 re-check (schema validation fires first but guard here too)
  if (employeeId && locationId) {
    throw errors.validation('Provide either employeeId or locationId, not both.', {
      employeeId: 'Mutually exclusive with locationId',
      locationId: 'Mutually exclusive with employeeId',
    });
  }

  const asset = await Asset.findOne({ _id: assetId, tenantId });
  if (!asset) throw errors.notFound('Asset not found.');

  // EC-07 — Retired terminal state
  if (asset.status === 'Retired') {
    throw errors.conflict('Retired assets cannot be modified.');
  }

  // EC-05 — already assigned
  if (asset.assignedEmployeeId || asset.assignedLocationId) {
    throw errors.conflict('Asset is already assigned. Call /unassign before reassigning.');
  }

  const prevEmployeeId = asset.assignedEmployeeId;
  const prevLocationId = asset.assignedLocationId;

  if (employeeId) {
    if (!mongoose.isValidObjectId(employeeId)) throw errors.notFound('Employee not found.');

    // EC-11 — employee must exist in tenant and be active
    const employee = await Employee.findOne({ _id: employeeId, tenantId });
    if (!employee) throw errors.notFound('Employee not found.');
    if (employee.status === 'inactive') {
      throw errors.conflict('Cannot assign to an inactive employee.');
    }

    asset.assignedEmployeeId = new mongoose.Types.ObjectId(employeeId);
    asset.assignedLocationId = null;
    asset.status = 'Assigned';
    await asset.save();

    await historyService.recordAssignedToEmployee({
      tenantId,
      assetId: asset._id,
      performedBy: userId,
      previousEmployeeId: prevEmployeeId,
      previousLocationId: prevLocationId,
      newEmployeeId: employeeId,
      note,
    });
  } else {
    if (!mongoose.isValidObjectId(locationId)) throw errors.notFound('Location not found.');

    const location = await Location.findOne({ _id: locationId, tenantId });
    if (!location) throw errors.notFound('Location not found.');

    asset.assignedLocationId = new mongoose.Types.ObjectId(locationId);
    asset.assignedEmployeeId = null;
    asset.status = 'Assigned';
    await asset.save();

    await historyService.recordAssignedToLocation({
      tenantId,
      assetId: asset._id,
      performedBy: userId,
      previousEmployeeId: prevEmployeeId,
      previousLocationId: prevLocationId,
      newLocationId: locationId,
      note,
    });
  }

  return formatAsset(asset, tenantId);
}

// ── Unassign ──────────────────────────────────────────────────────────────────

/**
 * Remove current assignment.
 * Idempotent: if already unassigned, returns 200 without writing history.
 * EC-07: Retired asset → 409.
 */
async function unassignAsset(tenantId, userId, assetId, { note } = {}) {
  if (!mongoose.isValidObjectId(assetId)) throw errors.notFound('Asset not found.');

  const asset = await Asset.findOne({ _id: assetId, tenantId });
  if (!asset) throw errors.notFound('Asset not found.');

  if (asset.status === 'Retired') {
    throw errors.conflict('Retired assets cannot be modified.');
  }

  // Idempotent — already unassigned
  if (!asset.assignedEmployeeId && !asset.assignedLocationId) {
    return formatAsset(asset, tenantId);
  }

  const prevEmployeeId = asset.assignedEmployeeId;
  const prevLocationId = asset.assignedLocationId;

  asset.assignedEmployeeId = null;
  asset.assignedLocationId = null;
  asset.status = 'Available';
  await asset.save();

  await historyService.recordUnassigned({
    tenantId,
    assetId: asset._id,
    performedBy: userId,
    previousEmployeeId: prevEmployeeId,
    previousLocationId: prevLocationId,
    note,
  });

  return formatAsset(asset, tenantId);
}

// ── Status change ─────────────────────────────────────────────────────────────

/**
 * Change asset status.
 * Rules: EC-07 (Retired terminal), EC-13 (Available while assigned),
 * and Assigned-without-assignment conflict (§2.3 status transition rules).
 */
async function changeStatus(tenantId, userId, assetId, { status, note }) {
  if (!mongoose.isValidObjectId(assetId)) throw errors.notFound('Asset not found.');

  const asset = await Asset.findOne({ _id: assetId, tenantId });
  if (!asset) throw errors.notFound('Asset not found.');

  // EC-07 — Retired is terminal
  if (asset.status === 'Retired') {
    throw errors.conflict('Retired assets cannot be modified.');
  }

  // EC-13 — Available while assignment exists
  if (status === 'Available' && (asset.assignedEmployeeId || asset.assignedLocationId)) {
    throw errors.conflict(
      'Cannot set status to Available while asset is assigned. Unassign the asset first.'
    );
  }

  // Assigned without an active assignment
  if (status === 'Assigned' && !asset.assignedEmployeeId && !asset.assignedLocationId) {
    throw errors.conflict(
      'Cannot set status to Assigned without an active assignment. Use /assign instead.'
    );
  }

  const oldStatus = asset.status;
  asset.status = status;
  await asset.save();

  await historyService.recordStatusChange({
    tenantId,
    assetId: asset._id,
    performedBy: userId,
    oldStatus,
    newStatus: status,
    note,
  });

  return formatAsset(asset, tenantId);
}

// ── QR regenerate ─────────────────────────────────────────────────────────────

/**
 * Generate a new qrToken, invalidate the old one, write Updated history.
 * Returns full asset object plus qrCodeImageBase64 for immediate printing.
 */
async function regenerateQr(tenantId, userId, assetId) {
  if (!mongoose.isValidObjectId(assetId)) throw errors.notFound('Asset not found.');

  const asset = await Asset.findOne({ _id: assetId, tenantId });
  if (!asset) throw errors.notFound('Asset not found.');

  const oldToken = asset.qrToken;
  const { qrToken, qrCodeUrl, qrCodeImageBase64 } = await qrService.regenerateToken(tenantId);

  asset.qrToken = qrToken;
  await asset.save();

  await historyService.recordUpdated({
    tenantId,
    assetId: asset._id,
    performedBy: userId,
    previousValue: { qrToken: oldToken },
    newValue: { qrToken },
  });

  const obj = formatAsset(asset, tenantId);
  obj.qrCodeUrl = qrCodeUrl;
  obj.qrCodeImageBase64 = qrCodeImageBase64;
  return obj;
}

module.exports = {
  resolvePublicScan,
  listAssets,
  getAssetById,
  createAsset,
  updateAsset,
  getAssetHistory,
  assignAsset,
  unassignAsset,
  changeStatus,
  regenerateQr,
};
