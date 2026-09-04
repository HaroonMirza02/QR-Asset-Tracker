'use strict';

/**
 * TenantResolver
 *
 * For authenticated routes: tenantId is always read from req.user.tenantId
 * (set by the authenticate middleware). Nothing here is needed for that path.
 *
 * For the public scan endpoint: tenantId arrives as the `?t=` query parameter
 * (per ARCHITECTURE.md Assumption A-01). This module validates and resolves it.
 *
 * Cross-tenant lookups return 404, not 403, to avoid leaking the existence of
 * tenants (same principle as EC-02 through EC-04 for asset tokens).
 */

const mongoose = require('mongoose');
const Tenant = require('../models/Tenant');
const { errors } = require('../middleware/errorHandler');

/**
 * Resolve and validate a tenant from the public `?t=` query parameter.
 *
 * @param {string|undefined} rawTenantId  Value of `req.query.t`
 * @returns {Promise<string>}  The validated tenantId string (ObjectId format)
 * @throws {AppError 422}  If the param is missing or not a valid ObjectId
 * @throws {AppError 404}  If the tenant does not exist or is inactive
 *                          (we return 404 here, not 403, to avoid leaking info)
 */
async function resolvePublicTenant(rawTenantId) {
  if (!rawTenantId) {
    throw errors.validation('tenantId query parameter is required.', {
      t: 'Required query parameter',
    });
  }

  if (!mongoose.isValidObjectId(rawTenantId)) {
    // Invalid format → treat same as "not found" to avoid format leakage
    throw errors.notFound('Asset not found.');
  }

  const tenant = await Tenant.findById(rawTenantId).lean();
  if (!tenant || !tenant.isActive) {
    throw errors.notFound('Asset not found.');
  }

  return rawTenantId;
}

module.exports = { resolvePublicTenant };
