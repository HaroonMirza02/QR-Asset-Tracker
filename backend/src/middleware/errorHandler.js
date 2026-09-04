'use strict';

/**
 * AppError — structured error that carries HTTP status, error code, and
 * optional per-field validation details.  Throw this anywhere in a service or
 * controller; the global handler below picks it up.
 */
class AppError extends Error {
  /**
   * @param {number} statusCode  HTTP status (400, 401, 403, 404, 409, 422, 500)
   * @param {string} code        Machine-readable code (e.g. 'NOT_FOUND')
   * @param {string} message     Human-readable message
   * @param {object} [fields={}] Per-field validation errors (422 only)
   */
  constructor(statusCode, code, message, fields = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
    this.isOperational = true; // distinguishes known errors from bugs
  }
}

/** Factory helpers so call-sites stay concise */
const errors = {
  badRequest: (msg) => new AppError(400, 'BAD_REQUEST', msg),
  unauthorized: (msg = 'Authentication required.') =>
    new AppError(401, 'UNAUTHORIZED', msg),
  forbidden: (msg = 'Insufficient permissions for this action.') =>
    new AppError(403, 'FORBIDDEN', msg),
  notFound: (msg = 'Resource not found.') =>
    new AppError(404, 'NOT_FOUND', msg),
  conflict: (msg) => new AppError(409, 'CONFLICT', msg),
  validation: (msg, fields = {}) =>
    new AppError(422, 'VALIDATION_ERROR', msg, fields),
  internal: (msg = 'An unexpected error occurred.') =>
    new AppError(500, 'INTERNAL_ERROR', msg),
};

/**
 * Express global error handler.
 * Must be registered LAST in app.js (4-argument signature).
 */
function globalErrorHandler(err, _req, res, _next) {
  // Known operational error — send the structured response
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        fields: err.fields || {},
      },
    });
  }

  // Mongoose duplicate-key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: `A record with that ${field} already exists.`,
        fields: {},
      },
    });
  }

  // Mongoose CastError (invalid ObjectId in URL param)
  if (err.name === 'CastError') {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Resource not found.', fields: {} },
    });
  }

  // Unexpected errors — log the stack, return a generic 500
  console.error('[error]', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
      fields: {},
    },
  });
}

module.exports = { AppError, errors, globalErrorHandler };
