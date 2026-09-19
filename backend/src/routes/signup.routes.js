'use strict';
const crypto = require('crypto');
const { z } = require('zod');
const { Router } = require('express');
const { validate } = require('../middleware/validate');
const { asyncWrapper } = require('../middleware/asyncWrapper');
const { errors } = require('../middleware/errorHandler');
const { hashPassword, login } = require('../services/authService');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const router = Router();
const schema = z.object({
  name: z.string().trim().min(2).max(100),
  organization: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(254).transform(v => v.toLowerCase()),
  password: z.string().min(10, 'Use at least 10 characters.').refine(v => Buffer.byteLength(v, 'utf8') <= 72, 'Password must be at most 72 bytes.'),
});
router.post('/signup', validate(schema, 'body'), asyncWrapper(async (req, res) => {
  const { name, organization, email, password } = req.body;
  if (!process.env.JWT_SECRET) throw errors.internal();
  if (await User.exists({ email })) throw errors.conflict('An account with this email already exists. Please log in.');
  const passwordHash = await hashPassword(password);
  const slug = `${organization.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'workspace'}-${crypto.randomBytes(8).toString('hex')}`;
  const tenant = await Tenant.create({ name: organization, slug });
  let user;
  try {
    user = await User.create({ tenantId: tenant._id, name, email, passwordHash, role: 'Admin' });
    const result = await login(email, password);
    res.status(201).json({ data: result });
  } catch (err) {
    // Compensating cleanup supports local MongoDB without a replica set.
    if (user) await User.deleteOne({ _id: user._id, tenantId: tenant._id });
    await Tenant.deleteOne({ _id: tenant._id });
    throw err;
  }
}));
module.exports = router;
