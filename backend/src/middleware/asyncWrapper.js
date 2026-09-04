'use strict';

/**
 * asyncWrapper — wraps an async route handler so any rejected promise is
 * forwarded to Express's next(err) and caught by the global error handler.
 *
 * Usage:
 *   router.get('/path', asyncWrapper(async (req, res) => { ... }));
 */
function asyncWrapper(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncWrapper };
