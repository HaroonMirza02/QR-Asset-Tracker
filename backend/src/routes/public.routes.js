'use strict';

/**
 * Public router — NO authentication middleware on any route here.
 *
 * EC-03 handling: The spec requires that a malformed qrToken returns 404 (not
 * 422), so the token format is validated manually inside the handler rather
 * than via the validate() middleware, which would produce a 422.
 * The QR_TOKEN_REGEX check fires before the DB query and returns the same 404
 * shape as a token-not-found result.
 */

const { Router } = require('express');
const { asyncWrapper } = require('../middleware/asyncWrapper');
const { validate } = require('../middleware/validate');
const { publicScanQuery } = require('../validation/schemas');
const publicController = require('../controllers/public.controller');
const { QR_TOKEN_REGEX } = require('../config/constants');

const router = Router();

router.get(
  '/scan/:qrToken',
  // Validate the ?t= query param (tenantId). Missing/invalid → 422.
  validate(publicScanQuery, 'query'),
  asyncWrapper(async (req, res, next) => {
    const { qrToken } = req.params;

    // EC-03: malformed token → 404 (same shape as not-found), not 422
    if (!QR_TOKEN_REGEX.test(qrToken)) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Asset not found.', fields: {} },
      });
    }

    return publicController.scanQr(req, res, next);
  })
);

module.exports = router;
