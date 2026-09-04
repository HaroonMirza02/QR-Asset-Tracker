'use strict';

/**
 * Role guard sweep — confirms every Admin-only write action returns 403
 * when called with a valid Viewer JWT. Covers EC-08 comprehensively.
 *
 * Also covers EC-09: every protected route returns 401 with no token.
 * Also covers EC-12: valid JWT from an inactive tenant returns 401.
 */

require('./setup');
const request = require('supertest');
const app = require('../app');
const {
  createTenant,
  createUser,
  createEmployee,
  createLocation,
  createAsset,
  loginAs,
  clearCollections,
} = require('./helpers');

describe('Role Guard & Auth Middleware', () => {
  let tenant;
  let adminUser;
  let viewerUser;
  let adminToken;
  let viewerToken;
  let asset;
  let employee;
  let location;

  // Use beforeAll + manual clear to avoid re-hashing bcrypt on every test.each
  beforeAll(async () => {
    await clearCollections();
    tenant = await createTenant();
    adminUser = await createUser(tenant._id, 'Admin');
    viewerUser = await createUser(tenant._id, 'Viewer');
    adminToken = await loginAs(adminUser.email);
    viewerToken = await loginAs(viewerUser.email);
    employee = await createEmployee(tenant._id);
    location = await createLocation(tenant._id);
    asset = await createAsset(tenant._id, adminUser._id);
  });

  afterAll(async () => {
    await clearCollections();
  });

  // ── EC-08: Viewer cannot reach Admin-only actions ───────────────────────────

  const viewerBlocked = [
    ['POST', () => `/api/assets`, { name: 'x', category: 'Laptop' }],
    ['PATCH', () => `/api/assets/${asset?._id}`, { name: 'y' }],
    ['POST', () => `/api/assets/${asset?._id}/assign`, { employeeId: '000000000000000000000001' }],
    ['POST', () => `/api/assets/${asset?._id}/unassign`, {}],
    ['POST', () => `/api/assets/${asset?._id}/status`, { status: 'In Repair' }],
    ['POST', () => `/api/assets/${asset?._id}/qr/regenerate`, {}],
  ];

  test.each(viewerBlocked)(
    'EC-08 — Viewer %s %s returns 403',
    async (method, pathFn, body) => {
      const res = await request(app)
        [method.toLowerCase()](pathFn())
        .set('Authorization', `Bearer ${viewerToken}`)
        .send(body);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    }
  );

  // ── EC-09: No token returns 401 on every protected route ───────────────────

  const protectedRoutes = [
    ['GET',   () => `/api/assets`],
    ['GET',   () => `/api/assets/${asset?._id}`],
    ['POST',  () => `/api/assets`],
    ['PATCH', () => `/api/assets/${asset?._id}`],
    ['GET',   () => `/api/assets/${asset?._id}/history`],
    ['POST',  () => `/api/assets/${asset?._id}/assign`],
    ['POST',  () => `/api/assets/${asset?._id}/unassign`],
    ['POST',  () => `/api/assets/${asset?._id}/status`],
    ['POST',  () => `/api/assets/${asset?._id}/qr/regenerate`],
    ['GET',   () => `/api/employees`],
    ['GET',   () => `/api/employees/${employee?._id}`],
    ['GET',   () => `/api/locations`],
    ['GET',   () => `/api/locations/${location?._id}`],
  ];

  test.each(protectedRoutes)(
    'EC-09 — No token %s %s returns 401',
    async (method, pathFn) => {
      const res = await request(app)[method.toLowerCase()](pathFn());
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    }
  );

  // ── EC-12: Valid JWT but tenant is now inactive ─────────────────────────────
  // NOTE: This test deactivates `tenant`. It must be the LAST test in this
  // describe block that uses adminToken, or the tenant must be re-activated.

  test('EC-12 — valid JWT from inactive tenant returns 401', async () => {
    const Tenant = require('../models/Tenant');
    await Tenant.findByIdAndUpdate(tenant._id, { isActive: false });

    const res = await request(app)
      .get('/api/assets')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(res.body.error.message).toMatch(/inactive/i);

    // Re-activate for remaining tests
    await Tenant.findByIdAndUpdate(tenant._id, { isActive: true });
  });

  // ── Expired / tampered JWT ──────────────────────────────────────────────────

  test('401 — tampered JWT returns 401', async () => {
    const tampered = adminToken.slice(0, -5) + 'XXXXX';
    const res = await request(app)
      .get('/api/assets')
      .set('Authorization', `Bearer ${tampered}`);

    expect(res.status).toBe(401);
  });

  test('401 — malformed Authorization header (no Bearer prefix)', async () => {
    const res = await request(app)
      .get('/api/assets')
      .set('Authorization', adminToken); // missing "Bearer "

    expect(res.status).toBe(401);
  });

  // ── Tenant isolation: cross-tenant requests return 404 (not 403) ────────────

  test('404 — asset from another tenant returns 404, not 403', async () => {
    const other = await createTenant();
    const otherAdmin = await createUser(other._id, 'Admin');
    const otherAsset = await createAsset(other._id, otherAdmin._id);

    const res = await request(app)
      .get(`/api/assets/${otherAsset._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
