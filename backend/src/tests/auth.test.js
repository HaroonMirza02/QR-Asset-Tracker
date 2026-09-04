'use strict';

require('./setup');
const request = require('supertest');
const app = require('../app');
const { createTenant, createUser, clearCollections } = require('./helpers');

describe('Auth — POST /api/auth/login', () => {
  let tenant;
  let adminUser;
  const PASSWORD = 'Password1!';

  beforeEach(async () => {
    await clearCollections();
    tenant = await createTenant();
    adminUser = await createUser(tenant._id, 'Admin', {});
  });

  test('200 — valid Admin credentials return token + user shape', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: adminUser.email, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.expiresIn).toBe(86400);
    expect(res.body.data.user.email).toBe(adminUser.email);
    expect(res.body.data.user.role).toBe('Admin');
    // passwordHash must never appear
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    // tenantId must never appear
    expect(JSON.stringify(res.body)).not.toContain('tenantId');
  });

  test('200 — valid Viewer credentials return Viewer role', async () => {
    const viewer = await createUser(tenant._id, 'Viewer');
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: viewer.email, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('Viewer');
  });

  test('401 — wrong password (same response as unknown email — no enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: adminUser.email, password: 'wrongpass' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  test('401 — unknown email (same shape as wrong password)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.example', password: PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  test('401 — inactive tenant rejects login', async () => {
    const inactiveTenant = await createTenant({ isActive: false });
    const inactiveUser = await createUser(inactiveTenant._id, 'Admin');
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: inactiveUser.email, password: PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  test('422 — missing email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: PASSWORD });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.fields).toHaveProperty('email');
  });

  test('422 — invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: PASSWORD });

    expect(res.status).toBe(422);
    expect(res.body.error.fields).toHaveProperty('email');
  });

  test('422 — missing password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: adminUser.email });

    expect(res.status).toBe(422);
    expect(res.body.error.fields).toHaveProperty('password');
  });
});
