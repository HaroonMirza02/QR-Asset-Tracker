'use strict';

const authService = require('../services/authService');

async function login(req, res) {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.status(200).json({ data: result });
}

module.exports = { login };
