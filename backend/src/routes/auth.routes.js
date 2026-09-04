'use strict';

const { Router } = require('express');
const { asyncWrapper } = require('../middleware/asyncWrapper');
const { validate } = require('../middleware/validate');
const { loginBody } = require('../validation/schemas');
const authController = require('../controllers/auth.controller');

const router = Router();

// POST /api/auth/login
router.post(
  '/login',
  validate(loginBody, 'body'),
  asyncWrapper(authController.login)
);

module.exports = router;
