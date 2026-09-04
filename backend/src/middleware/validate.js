'use strict';

/**
 * validate — Zod schema validation middleware factory.
 *
 * Usage:
 *   router.post('/path', validate(myZodSchema, 'body'), handler)
 *   router.get('/path', validate(myZodSchema, 'query'), handler)
 *   router.get('/:id', validate(myZodSchema, 'params'), handler)
 *
 * On failure: throws AppError 422 with per-field errors populated.
 * On success: replaces req[target] with the parsed (coerced) value so
 *             downstream handlers receive clean, typed data.
 */

const { errors } = require('./errorHandler');

/**
 * @param {import('zod').ZodSchema} schema
 * @param {'body'|'query'|'params'} target  Which part of the request to validate
 */
function validate(schema, target = 'body') {
  return function (req, _res, next) {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const fields = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || '_root';
        fields[key] = issue.message;
      }
      return next(
        errors.validation(
          'Validation failed. Check the fields object for details.',
          fields
        )
      );
    }
    req[target] = result.data;
    next();
  };
}

module.exports = { validate };
