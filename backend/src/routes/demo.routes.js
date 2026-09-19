'use strict';
const { Router } = require('express');
const { asyncWrapper } = require('../middleware/asyncWrapper');
const { errors } = require('../middleware/errorHandler');
const Tenant = require('../models/Tenant');
const Asset = require('../models/Asset');
const { resolvePublicScan } = require('../services/assetService');
const { buildScanUrl } = require('../services/qrService');
const router = Router();
router.get('/demo', asyncWrapper(async (_req, res) => {
  // Only the explicit demo organization; never expose customer workspaces.
  const tenant = await Tenant.findOne({ slug: 'meridian-ops', isActive: true }).lean();
  if (!tenant) throw errors.notFound('The demo is not available right now.');
  const assets = await Asset.find({ tenantId: tenant._id, isPublicVisible: true }).sort({ assetCode: 1 }).limit(8).lean();
  const data = await Promise.all(assets.map(async asset => ({
    ...await resolvePublicScan(asset.qrToken, tenant._id),
    qrCodeUrl: buildScanUrl(asset.qrToken, tenant._id.toString()),
  })));
  res.json({ data });
}));
module.exports = router;
