'use strict';

/**
 * LocationService
 *
 * Implements GET /api/locations and GET /api/locations/:id.
 * No field-level restrictions — all fields returned to any authenticated caller.
 */

const mongoose = require('mongoose');
const Location = require('../models/Location');
const { errors } = require('../middleware/errorHandler');

// ── List ──────────────────────────────────────────────────────────────────────

async function listLocations(tenantId, query) {
  const { page = 1, limit = 20, type, search } = query;

  const filter = { tenantId };
  if (type) filter.type = type;
  if (search) filter.name = { $regex: search, $options: 'i' };

  const skip = (page - 1) * limit;
  const [docs, total] = await Promise.all([
    Location.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Location.countDocuments(filter),
  ]);

  const data = docs.map((d) => {
    const obj = { ...d };
    obj.id = d._id.toString();
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

// ── Get single ────────────────────────────────────────────────────────────────

async function getLocationById(tenantId, locationId) {
  if (!mongoose.isValidObjectId(locationId)) {
    throw errors.notFound('Location not found.');
  }

  const location = await Location.findOne({ _id: locationId, tenantId });
  if (!location) throw errors.notFound('Location not found.');

  return location.toJSON();
}

module.exports = { listLocations, getLocationById };
