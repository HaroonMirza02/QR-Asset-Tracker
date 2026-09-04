'use strict';

/**
 * requireRole — role guard factory.
 *
 * Usage:
 *   router.post('/assets', authenticate, requireRole('Admin'), handler)
 *
 * Roles in ascending privilege order: Viewer < Admin.
 * If the authenticated user's role is not in the allowed list, returns 403.
 *
 * Must be placed AFTER authenticate middleware so req.user is populated.
 */

const { errors } = require('./errorHandler');

const ROLE_HIERARCHY = { Viewer: 1, Admin: 2 };

/**
 * @param {...string} allowedRoles  One or more role names that may access the route.
 */
function requireRole(...allowedRoles) {
  return function (req, _res, next) {
    const userRole = req.user && req.user.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return next(errors.forbidden());
    }
    next();
  };
}

/**
 * Convenience: only Admin may proceed.
 */
const adminOnly = requireRole('Admin');

/**
 * Convenience: Admin or Viewer may proceed.
 */
const anyAuthenticated = requireRole('Admin', 'Viewer');

module.exports = { requireRole, adminOnly, anyAuthenticated, ROLE_HIERARCHY };
