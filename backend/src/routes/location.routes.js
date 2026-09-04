'use strict';

/**
 * Location router — all routes require authentication.
 * Both Admin and Viewer may read locations. No write endpoints in this sprint.
 */

const { Router } = require('express');
const { authenticate } = require('../middleware/authenticate');
const { anyAuthenticated } = require('../middleware/roleGuard');
const { validate } = require('../middleware/validate');
const { asyncWrapper } = require('../middleware/asyncWrapper');
const ctrl = require('../controllers/location.controller');
const { locationListQuery, locationIdParams } = require('../validation/schemas');

const router = Router();

router.use(authenticate);

// GET /api/locations
router.get(
  '/',
  anyAuthenticated,
  validate(locationListQuery, 'query'),
  asyncWrapper(ctrl.listLocations)
);

// GET /api/locations/:id
router.get(
  '/:id',
  anyAuthenticated,
  validate(locationIdParams, 'params'),
  asyncWrapper(ctrl.getLocation)
);

module.exports = router;
