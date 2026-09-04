'use strict';

/**
 * AuthService
 *
 * Responsibilities:
 *  - Verify email/password credentials against the Users collection
 *  - Confirm the user's tenant is active (EC-12 first gate; authenticate
 *    middleware re-checks on every subsequent request)
 *  - Issue a signed JWT: { sub: userId, tenantId, role, iat, exp }
 *
 * Security notes:
 *  - bcrypt cost factor 12 (ARCHITECTURE.md §2.6 Users)
 *  - 401 response is identical whether the email is unknown or the password
 *    is wrong — prevents user enumeration (ARCHITECTURE.md §2.2)
 *  - passwordHash is never returned from any method here
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const { errors } = require('../middleware/errorHandler');

const BCRYPT_ROUNDS = process.env.NODE_ENV === 'test' ? 4 : 12;

/**
 * Authenticate a user and return a JWT + safe user object.
 *
 * @param {string} email
 * @param {string} password  Plain-text password from request body
 * @returns {{ token: string, expiresIn: number, user: object }}
 */
async function login(email, password) {
  // Use a single generic error for both "not found" and "wrong password"
  // so the caller cannot enumerate users.
  const genericError = errors.unauthorized('Invalid email or password.');

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+passwordHash'
  );
  if (!user) throw genericError;

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) throw genericError;

  // Check tenant active status
  const tenant = await Tenant.findById(user.tenantId).lean();
  if (!tenant || !tenant.isActive) {
    throw errors.unauthorized('Organization account is inactive.');
  }

  const expiresIn = parseInt(process.env.JWT_EXPIRES_IN || '86400', 10);
  const token = jwt.sign(
    { tenantId: user.tenantId.toString(), role: user.role },
    process.env.JWT_SECRET,
    { subject: user._id.toString(), expiresIn }
  );

  return {
    token,
    expiresIn,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

/**
 * Hash a plain-text password.  Used by the seed script and any future
 * user-management endpoints.
 *
 * @param {string} plaintext
 * @returns {Promise<string>}
 */
async function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
}

module.exports = { login, hashPassword };
