'use strict';

/**
 * Public controller — no auth, no role guard.
 *
 * EC-03: If the qrToken param fails format validation, the validate()
 * middleware would normally return 422. The spec requires 404 for all
 * malformed token cases (§4, EC-03). The route layer wraps this handler with
 * a special error converter — see public.routes.js.
 */

const assetService = require('../services/assetService');
const tenantResolver = require('../services/tenantResolver');

async function scanQr(req, res) {
  // tenantId from ?t= query param (Assumption A-01)
  // Already validated by publicScanQuery schema on the route
  const tenantId = req.query.t;
  const { qrToken } = req.params;

  // Further tenant validation (active check, ObjectId check)
  await tenantResolver.resolvePublicTenant(tenantId);

  const profile = await assetService.resolvePublicScan(qrToken, tenantId);
  res.status(200).json({ data: profile });
}

module.exports = { scanQr };
