'use strict';

/**
 * Asset controller.
 *
 * Every method delegates to AssetService. tenantId and userId always come
 * from req.user — never from the request body or URL params.
 *
 * The controller's only jobs are:
 *  1. Extract validated inputs from req.body / req.params / req.query
 *  2. Call the service
 *  3. Set the correct HTTP status and return { data: ... }
 *
 * Business rules, history writing, and field filtering live in the service.
 */

const assetService = require('../services/assetService');

// ── GET /api/assets ───────────────────────────────────────────────────────────
async function listAssets(req, res) {
  const { tenantId } = req.user;
  const result = await assetService.listAssets(tenantId, req.query);
  res.status(200).json(result); // result already has { data, meta }
}

// ── GET /api/assets/:id ───────────────────────────────────────────────────────
async function getAsset(req, res) {
  const { tenantId, role } = req.user;
  const { id } = req.params;

  // ?includeQrImage=true is Admin-only (§3 permission matrix)
  // The role guard on the route ensures only Admin reaches this point with
  // the flag; Viewer access to this endpoint is allowed but ignores the flag.
  const includeQrImage = role === 'Admin' ? req.query.includeQrImage : false;

  const asset = await assetService.getAssetById(tenantId, id, { includeQrImage });
  res.status(200).json({ data: asset });
}

// ── POST /api/assets ──────────────────────────────────────────────────────────
async function createAsset(req, res) {
  const { tenantId, userId } = req.user;
  const asset = await assetService.createAsset(tenantId, userId, req.body);
  res.status(201).json({ data: asset });
}

// ── PATCH /api/assets/:id ─────────────────────────────────────────────────────
async function updateAsset(req, res) {
  const { tenantId, userId } = req.user;
  const { id } = req.params;
  const asset = await assetService.updateAsset(tenantId, userId, id, req.body);
  res.status(200).json({ data: asset });
}

// ── GET /api/assets/:id/history ───────────────────────────────────────────────
async function getHistory(req, res) {
  const { tenantId } = req.user;
  const { id } = req.params;
  const result = await assetService.getAssetHistory(tenantId, id, req.query);
  res.status(200).json(result); // { data, meta }
}

// ── POST /api/assets/:id/assign ───────────────────────────────────────────────
async function assignAsset(req, res) {
  const { tenantId, userId } = req.user;
  const { id } = req.params;
  const asset = await assetService.assignAsset(tenantId, userId, id, req.body);
  res.status(200).json({ data: asset });
}

// ── POST /api/assets/:id/unassign ─────────────────────────────────────────────
async function unassignAsset(req, res) {
  const { tenantId, userId } = req.user;
  const { id } = req.params;
  const asset = await assetService.unassignAsset(tenantId, userId, id, req.body);
  res.status(200).json({ data: asset });
}

// ── POST /api/assets/:id/status ───────────────────────────────────────────────
async function changeStatus(req, res) {
  const { tenantId, userId } = req.user;
  const { id } = req.params;
  const asset = await assetService.changeStatus(tenantId, userId, id, req.body);
  res.status(200).json({ data: asset });
}

// ── POST /api/assets/:id/qr/regenerate ───────────────────────────────────────
async function regenerateQr(req, res) {
  const { tenantId, userId } = req.user;
  const { id } = req.params;
  const result = await assetService.regenerateQr(tenantId, userId, id);
  res.status(200).json({ data: result });
}

module.exports = {
  listAssets,
  getAsset,
  createAsset,
  updateAsset,
  getHistory,
  assignAsset,
  unassignAsset,
  changeStatus,
  regenerateQr,
};
