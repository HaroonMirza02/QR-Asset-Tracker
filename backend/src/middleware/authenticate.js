'use strict';

/**
 * authenticate — JWT verification middleware.
 *
 * Enforcement chain per ARCHITECTURE.md §1.2:
 *   JWT presence → JWT validity → tenant isActive → attach req.user
 *
 * On success: attaches { userId, tenantId, role } to req.user.
 * On failure: calls next(AppError 401).
 *
 * The tenant isActive check satisfies EC-12.
 */

const jwt = require('jsonwebtoken');
const Tenant = require('../models/Tenant');
const { errors } = require('./errorHandler');
const { asyncWrapper } = require('./asyncWrapper');

const authenticate = asyncWrapper(async (req, _res, next) => {
  // 1. Extract bearer token
  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) {
    throw errors.unauthorized();
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    throw errors.unauthorized();
  }

  // 2. Verify signature and expiry
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw errors.unauthorized();
  }

  // 3. Validate payload shape
  if (!payload.sub || !payload.tenantId || !payload.role) {
    throw errors.unauthorized();
  }

  // 4. Check tenant isActive (EC-12)
  const tenant = await Tenant.findById(payload.tenantId).lean();
  if (!tenant || !tenant.isActive) {
    throw errors.unauthorized('Organization account is inactive.');
  }

  // 5. Attach to request — tenantId always comes from the JWT, never from body/URL
  req.user = {
    userId: payload.sub,
    tenantId: payload.tenantId,
    role: payload.role,
  };

  next();
});

module.exports = { authenticate };
