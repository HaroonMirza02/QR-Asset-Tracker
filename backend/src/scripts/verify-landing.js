'use strict';
// Uses a unique disposable account; cleans up only records created by this test.
require('../config/environment');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/database');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const app = require('../app');
(async () => {
  await connectDB();
  await User.init();
  await Tenant.init();
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const email = `signup-check-${new mongoose.Types.ObjectId()}@example.test`;
  const body = { name: 'Signup Check', organization: 'Disposable Signup Check', email, password: 'TestPassword1234!' };
  const post = (url, data) => fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  let tenantId;
  try {
    const invalid = await post('/api/auth/signup', { ...body, password: 'short' });
    assert.equal(invalid.status, 422);
    assert.equal(await User.exists({ email }), null);
    const valid = await post('/api/auth/signup', { ...body, role: 'Viewer', tenantId: new mongoose.Types.ObjectId().toString() });
    assert.equal(valid.status, 201);
    const result = (await valid.json()).data;
    const user = await User.findOne({ email });
    tenantId = user.tenantId;
    assert.equal(result.user.role, 'Admin');
    assert.ok(result.token);
    assert.equal(result.user.passwordHash, undefined);
    assert.notEqual(user.passwordHash, body.password);
    const assets = await fetch(base + '/api/assets', { headers: { Authorization: `Bearer ${result.token}` } });
    assert.equal(assets.status, 200);
    assert.equal((await assets.json()).meta.total, 0);
    assert.equal((await post('/api/auth/signup', body)).status, 409);
    assert.equal((await post('/api/auth/login', { email, password: body.password })).status, 200);
    const demo = await fetch(base + '/api/public/demo');
    assert.equal(demo.status, 200);
    const records = (await demo.json()).data;
    assert.ok(records.length > 0);
    for (const asset of records) {
      assert.equal(asset.tenantId, undefined);
      assert.equal(asset.serialNumber, undefined);
      assert.equal(asset.contactInfo, undefined);
      const scan = new URL(asset.qrCodeUrl);
      const response = await fetch(base + '/api/public' + scan.pathname + scan.search);
      assert.equal(response.status, 200);
      assert.equal((await response.json()).data.assetCode, asset.assetCode);
    }
    console.log('PASS: signup validation, real login, Admin role, isolated empty workspace, duplicate rejection, public demo and every demo QR link.');
  } finally {
    const created = await User.findOne({ email });
    if (created) {
      tenantId = created.tenantId;
      await User.deleteOne({ _id: created._id });
    }
    if (tenantId) await Tenant.deleteOne({ _id: tenantId });
    await new Promise(resolve => server.close(resolve));
    await disconnectDB();
  }
})().catch(err => { console.error(err); process.exitCode = 1; });
