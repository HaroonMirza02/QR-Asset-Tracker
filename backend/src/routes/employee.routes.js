'use strict';

/**
 * Employee router — all routes require authentication.
 *
 * Both Admin and Viewer may read employees.
 * contactInfo field restriction is enforced in employeeService.getEmployeeById,
 * not here — the route grants access, the service applies field-level filtering.
 *
 * No write endpoints exist for employees in this sprint (out of scope).
 */

const { Router } = require('express');
const { authenticate } = require('../middleware/authenticate');
const { anyAuthenticated } = require('../middleware/roleGuard');
const { validate } = require('../middleware/validate');
const { asyncWrapper } = require('../middleware/asyncWrapper');
const ctrl = require('../controllers/employee.controller');
const { employeeListQuery, employeeIdParams } = require('../validation/schemas');

const router = Router();

router.use(authenticate);

// GET /api/employees
router.get(
  '/',
  anyAuthenticated,
  validate(employeeListQuery, 'query'),
  asyncWrapper(ctrl.listEmployees)
);

// GET /api/employees/:id
router.get(
  '/:id',
  anyAuthenticated,
  validate(employeeIdParams, 'params'),
  asyncWrapper(ctrl.getEmployee)
);

module.exports = router;
