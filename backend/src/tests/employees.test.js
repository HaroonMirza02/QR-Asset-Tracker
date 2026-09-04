'use strict';

/**
 * Employee endpoint tests.
 * Covers list/get, field-level contactInfo restriction (Admin vs Viewer),
 * and auth/role enforcement.
 */

require('./setup');
const request = require('supertest');
const app = require('../app');
const {
  createTenant,
  createUser,
  createEmployee,
  loginAs,
  clearCollections,
} = require('./helpers');

describe('Employees', () => {
  let tenant;
  let adminUser;
  let viewerUser;
  let adminToken;
  let viewerToken;
  let employee;

  beforeEach(async () => {
    await clearCollections();
    tenant = await createTenant();
    adminUser = await createUser(tenant._id, 'Admin');
    viewerUser = await createUser(tenant._id, 'Viewer');
    adminToken = await loginAs(adminUser.email);
    viewerToken = await loginAs(viewerUser.email);
    employee = await createEmployee(tenant._id, {
      name: 'Jane Doe',
      title: 'Engineer',
      department: 'Engineering',
      contactInfo: { email: 'jane@test.example', phone: '+1-555-1234' },
    });
  });

  // ── GET /api/employees ──────────────────────────────────────────────────────

  describe('GET /api/employees', () => {
    test('200 — Admin can list employees; contactInfo omitted from list', async () => {
      const res = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      // contactInfo always excluded from list regardless of role
      expect(JSON.stringify(res.body)).not.toContain('contactInfo');
      expect(JSON.stringify(res.body)).not.toContain('tenantId');
    });

    test('200 — Viewer can list employees; contactInfo also omitted', async () => {
      const res = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).not.toContain('contactInfo');
    });

    test('EC-10 — search that matches nothing returns 200 with empty array', async () => {
      const res = await request(app)
        .get('/api/employees?search=zzznobody')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });

    test('401 — unauthenticated', async () => {
      const res = await request(app).get('/api/employees');
      expect(res.status).toBe(401);
    });

    test('422 — invalid status value', async () => {
      const res = await request(app)
        .get('/api/employees?status=unknown')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(422);
    });
  });

  // ── GET /api/employees/:id ──────────────────────────────────────────────────

  describe('GET /api/employees/:id', () => {
    test('200 — Admin receives contactInfo', async () => {
      const res = await request(app)
        .get(`/api/employees/${employee._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.contactInfo).toBeDefined();
      expect(res.body.data.contactInfo.email).toBe('jane@test.example');
      // tenantId must never appear
      expect(JSON.stringify(res.body)).not.toContain('tenantId');
    });

    test('200 — Viewer does NOT receive contactInfo (field-level restriction)', async () => {
      const res = await request(app)
        .get(`/api/employees/${employee._id}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).not.toHaveProperty('contactInfo');
    });

    test('404 — employee not found', async () => {
      const fakeId = '000000000000000000000001';
      const res = await request(app)
        .get(`/api/employees/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    test('404 — cross-tenant employee returns 404 (not 403)', async () => {
      const otherTenant = await createTenant();
      const otherEmployee = await createEmployee(otherTenant._id);

      const res = await request(app)
        .get(`/api/employees/${otherEmployee._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    test('401 — unauthenticated', async () => {
      const res = await request(app).get(`/api/employees/${employee._id}`);
      expect(res.status).toBe(401);
    });
  });
});
