'use strict';

const locationService = require('../services/locationService');

// ── GET /api/locations ────────────────────────────────────────────────────────
async function listLocations(req, res) {
  const { tenantId } = req.user;
  const result = await locationService.listLocations(tenantId, req.query);
  res.status(200).json(result); // { data, meta }
}

// ── GET /api/locations/:id ────────────────────────────────────────────────────
async function getLocation(req, res) {
  const { tenantId } = req.user;
  const { id } = req.params;
  const location = await locationService.getLocationById(tenantId, id);
  res.status(200).json({ data: location });
}

module.exports = { listLocations, getLocation };
