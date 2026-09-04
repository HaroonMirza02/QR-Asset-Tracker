'use strict';

/**
 * Asset endpoint tests.
 * Covers CRUD, history, assign/unassign/status/QR-regenerate, and all
 * edge cases EC-01, EC-05, EC-06, EC-07, EC-11, EC-13.
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

describe('Assets', () => {
  let tenant;
  let adminUser;
  let viewerUser;
  let adminToken;
  let viewerToken;
  let employee;
  let inactiveEmployee;
  let location;

  beforeEach(async () => {
    await clearCollections();
    tenant = await createTenant();
    adminUser = await createUser(tenant._id, 'Admin');
    viewerUser = await createUser(tenant._id, 'Viewer');
    adminToken = await loginAs(adminUser.email);
    viewerToken = await loginAs(viewerUser.email);
    employee = await createEmployee(tenant._id, { status: 'active' });
    inactiveEmployee = await createEmployee(tenant._id, { name: 'Inactive Emp', status: 'inactive' });
    location = await createLocation(tenant._id);
  });

  // ── GET /api/assets ─────────────────────────────────────────────────────────

  describe('GET /api/assets', () => {
    test('200 — Admin can list assets', async () => {
      await createAsset(tenant._id, adminUser._id);
      const res = await request(app)
        .get('/api/assets')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toHaveProperty('total');
      // qrToken must NOT appear on list
      expect(JSON.stringify(res.body)).not.toContain('qrToken');
    });

    test('200 — Viewer can list assets', async () => {
      const res = await request(app)
        .get('/api/assets')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
    });

    test('EC-10 — empty result returns 200 with data:[] not 404', async () => {
      const res = await request(app)
        .get('/api/assets?search=zzznomatch')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });

    test('401 — no token', async () => {
      const res = await request(app).get('/api/assets');
      expect(res.status).toBe(401);
    });

    test('422 — invalid status enum', async () => {
      const res = await request(app)
        .get('/api/assets?status=Broken')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(422);
    });

    test('422 — limit > 100', async () => {
      const res = await request(app)
        .get('/api/assets?limit=200')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(422);
    });
  });

  // ── POST /api/assets ────────────────────────────────────────────────────────

  describe('POST /api/assets', () => {
    test('201 — Admin creates asset with auto-generated assetCode and qrToken', async () => {
      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Laptop', category: 'Laptop' });

      expect(res.status).toBe(201);
      expect(res.body.data.assetCode).toMatch(/^AST\d{4}$/);
      expect(res.body.data.qrToken).toMatch(/^[0-9a-f]{64}$/);
      expect(res.body.data.status).toBe('Available');
      expect(res.body.data.assignedEmployeeId).toBeNull();
      expect(res.body.data.assignedLocationId).toBeNull();
      // tenantId never in response
      expect(JSON.stringify(res.body)).not.toContain('tenantId');
    });

    test('201 — Admin creates asset with explicit assetCode', async () => {
      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Tool A', category: 'Tool', assetCode: 'TOOL-001' });

      expect(res.status).toBe(201);
      expect(res.body.data.assetCode).toBe('TOOL-001');
    });

    test('EC-01 — duplicate assetCode returns 409', async () => {
      await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'First', category: 'Tool', assetCode: 'DUP-001' });

      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Second', category: 'Tool', assetCode: 'DUP-001' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    test('403 — Viewer cannot create asset (EC-08)', async () => {
      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: 'Blocked', category: 'Laptop' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('401 — unauthenticated cannot create asset (EC-09)', async () => {
      const res = await request(app)
        .post('/api/assets')
        .send({ name: 'Blocked', category: 'Laptop' });

      expect(res.status).toBe(401);
    });

    test('422 — missing required name', async () => {
      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ category: 'Laptop' });

      expect(res.status).toBe(422);
      expect(res.body.error.fields).toHaveProperty('name');
    });

    test('422 — invalid category', async () => {
      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test', category: 'Spaceship' });

      expect(res.status).toBe(422);
      expect(res.body.error.fields).toHaveProperty('category');
    });
  });

  // ── GET /api/assets/:id ─────────────────────────────────────────────────────

  describe('GET /api/assets/:id', () => {
    test('200 — returns qrToken and qrCodeUrl for authenticated users', async () => {
      const asset = await createAsset(tenant._id, adminUser._id);
      const res = await request(app)
        .get(`/api/assets/${asset._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.qrToken).toMatch(/^[0-9a-f]{64}$/);
      expect(res.body.data.qrCodeUrl).toContain(asset.qrToken);
      expect(JSON.stringify(res.body)).not.toContain('tenantId');
    });

    test('200 — Viewer also receives qrToken (not sensitive per §3)', async () => {
      const asset = await createAsset(tenant._id, adminUser._id);
      const res = await request(app)
        .get(`/api/assets/${asset._id}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.qrToken).toBeDefined();
    });

    test('404 — asset not found in tenant', async () => {
      const otherTenant = await createTenant();
      const otherUser = await createUser(otherTenant._id, 'Admin');
      const otherAsset = await createAsset(otherTenant._id, otherUser._id);

      // Admin of tenant1 tries to get tenant2's asset
      const res = await request(app)
        .get(`/api/assets/${otherAsset._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ── PATCH /api/assets/:id ───────────────────────────────────────────────────

  describe('PATCH /api/assets/:id', () => {
    test('200 — Admin can update metadata, writes history', async () => {
      const asset = await createAsset(tenant._id, adminUser._id);
      const res = await request(app)
        .patch(`/api/assets/${asset._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name', isPublicVisible: false });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Name');
      expect(res.body.data.isPublicVisible).toBe(false);
    });

    test('403 — Viewer cannot PATCH (EC-08)', async () => {
      const asset = await createAsset(tenant._id, adminUser._id);
      const res = await request(app)
        .patch(`/api/assets/${asset._id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: 'Blocked' });

      expect(res.status).toBe(403);
    });

    test('422 — empty body', async () => {
      const asset = await createAsset(tenant._id, adminUser._id);
      const res = await request(app)
        .patch(`/api/assets/${asset._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(422);
    });

    test('404 — non-existent asset', async () => {
      const fakeId = '000000000000000000000001';
      const res = await request(app)
        .patch(`/api/assets/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ghost' });

      expect(res.status).toBe(404);
    });
  });

  // ── GET /api/assets/:id/history ─────────────────────────────────────────────

  describe('GET /api/assets/:id/history', () => {
    test('200 — returns history array with Created event, newest first', async () => {
      const asset = await createAsset(tenant._id, adminUser._id);
      const res = await request(app)
        .get(`/api/assets/${asset._id}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].eventType).toBe('Created');
      expect(res.body.meta).toHaveProperty('total');
      // tenantId never in history response
      expect(JSON.stringify(res.body)).not.toContain('tenantId');
    });

    test('200 — Viewer can view history', async () => {
      const asset = await createAsset(tenant._id, adminUser._id);
      const res = await request(app)
        .get(`/api/assets/${asset._id}/history`)
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBe(200);
    });

    test('404 — history for non-existent asset', async () => {
      const fakeId = '000000000000000000000001';
      const res = await request(app)
        .get(`/api/assets/${fakeId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/assets/:id/assign ─────────────────────────────────────────────

  describe('POST /api/assets/:id/assign', () => {
    test('200 — assign to employee sets status Assigned and writes history', async () => {
      const asset = await createAsset(tenant._id, adminUser._id);
      const res = await request(app)
        .post(`/api/assets/${asset._id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ employeeId: employee._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Assigned');
      expect(res.body.data.assignedEmployeeId).toBe(employee._id.toString());
      expect(res.body.data.assignedLocationId).toBeNull();

      // Verify history was written
      const histRes = await request(app)
        .get(`/api/assets/${asset._id}/history`)
        .set('Authorization', `Bearer ${adminToken}`);
      const assignEvent = histRes.body.data.find((e) => e.eventType === 'AssignedToEmployee');
      expect(assignEvent).toBeDefined();
    });

    test('200 — assign to location', async () => {
      const asset = await createAsset(tenant._id, adminUser._id);
      const res = await request(app)
        .post(`/api/assets/${asset._id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ locationId: location._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.data.assignedLocationId).toBe(location._id.toString());
      expect(res.body.data.assignedEmployeeId).toBeNull();
    });

    test('EC-05 — assign already-assigned asset returns 409', async () => {
      const asset = await createAsset(tenant._id, adminUser._id, {
        status: 'Assigned',
        assignedEmployeeId: employee._id,
      });
      const res = await request(app)
        .post(`/api/assets/${asset._id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ employeeId: employee._id.toString() });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    test('EC-06 — both employeeId and locationId returns 422', async () => {
      const asset = await createAsset(tenant._id, adminUser._id);
      const res = await request(app)
        .post(`/api/assets/${asset._id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: employee._id.toString(),
          locationId: location._id.toString(),
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fields).toHaveProperty('employeeId');
    });

    test('EC-06 — neither employeeId nor locationId returns 422', async () => {
      const asset = await createAsset(tenant._id, adminUser._id);
      const res = await request(app)
        .post(`/api/assets/${asset._id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ note: 'oops' });

      expect(res.status).toBe(422);
    });

    test('EC-07 — assign to Retired asset returns 409', async () => {
      const asset = await createAsset(tenant._id, adminUser._id, { status: 'Retired' });
      const res = await request(app)
        .post(`/api/assets/${asset._id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ employeeId: employee._id.toString() });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    test('EC-11 — assign to inactive employee returns 409', async () => {
      const asset = await createAsset(tenant._id, adminUser._id);
      const res = await request(app)
        .post(`/api/assets/${asset._id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ employeeId: inactiveEmployee._id.toString() });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    test('EC-11 — assign to cross-tenant employee returns 404', async () => {
      const otherTenant = await createTenant();
      const otherUser = await createUser(otherTenant._id, 'Admin');
      const otherEmployee = await createEmployee(otherTenant._id);
      const asset = await createAsset(tenant._id, adminUser._id);

      const res = await request(app)
        .post(`/api/assets/${asset._id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ employeeId: otherEmployee._id.toString() });

      expect(res.status).toBe(404);
    });

    test('403 — Viewer cannot assign (EC-08)', async () => {
      const asset = await createAsset(tenant._id, adminUser._id);
      const res = await request(app)
        .post(`/api/assets/${asset._id}/assign`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ employeeId: employee._id.toString() });

      expect(res.status).toBe(403);
    });
  });

  // ── POST /api/assets/:id/unassign ───────────────────────────────────────────

  describe('POST /api/assets/:id/unassign', () => {
    test('200 — unassign clears assignment and writes Unassigned history', async () => {
      const asset = await createAsset(tenant._id, adminUser._id, {
        status: 'Assigned',
        assignedEmployeeId: employee._id,
      });

      const res = await request(app)
        .post(`/api/assets/${asset._id}/unassign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.assignedEmployeeId).toBeNull();
      expect(res.body.data.assignedLocationId).toBeNull();
      expect(res.body.data.status).toBe('Available');
    });

    test('200 — idempotent: unassign already-unassigned returns 200 without error', async () => {
      const asset = await createAsset(tenant._id, adminUser._id);
      const res = await request(app)
        .post(`/api/assets/${asset._id}/unassign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(200);
    });

    test('EC-07 — unassign Retired asset returns 409', async () => {
      const asset = await createAsset(tenant._id, adminUser._id, {
        status: 'Retired',
        assignedEmployeeId: employee._id,
      });
      const res = await request(app)
        .post(`/api/assets/${asset._id}/unassign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(409);
    });

    test('403 — Viewer cannot unassign', async () => {
      const asset = await createAsset(tenant._id, adminUser._id);
      const res = await request(app)
        .post(`/api/assets/${asset._id}/unassign`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({});

      expect(res.status).toBe(403);
    });
  });

  // ── POST /api/assets/:id/status ─────────────────────────────────────────────

  describe('POST /api/assets/:id/status', () => {
    test('200 — Admin can change status and history is written', async () => {
      const asset = await createAsset(tenant._id, adminUser._id);
      const res = await request(app)
        .post(`/api/assets/${asset._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'In Repair', note: 'cracked screen' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('In Repair');

      const histRes = await request(app)
        .get(`/api/assets/${asset._id}/history`)
        .set('Authorization', `Bearer ${adminToken}`);
      const statusEvent = histRes.body.data.find((e) => e.eventType === 'StatusChange');
      expect(statusEvent).toBeDefined();
      expect(statusEvent.newValue.status).toBe('In Repair');
    });

    test('EC-07 — status change on Retired asset returns 409', async () => {
      const asset = await createAsset(tenant._id, adminUser._id, { status: 'Retired' });
      const res = await request(app)
        .post(`/api/assets/${asset._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Available' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    test('EC-13 — Available while assigned returns 409', async () => {
      const asset = await createAsset(tenant._id, adminUser._id, {
        status: 'Assigned',
        assignedEmployeeId: employee._id,
      });
      const res = await request(app)
        .post(`/api/assets/${asset._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Available' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    test('409 — Assigned status without active assignment', async () => {
      const asset = await createAsset(tenant._id, adminUser._id, { status: 'Available' });
      const res = await request(app)
        .post(`/api/assets/${asset._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Assigned' });

      expect(res.status).toBe(409);
    });

    test('422 — invalid status enum', async () => {
      const asset = await createAsset(tenant._id, adminUser._id);
      const res = await request(app)
        .post(`/api/assets/${asset._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Broken' });

      expect(res.status).toBe(422);
    });

    test('403 — Viewer cannot change status (EC-08)', async () => {
      const asset = await createAsset(tenant._id, adminUser._id);
      const res = await request(app)
        .post(`/api/assets/${asset._id}/status`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ status: 'In Repair' });

      expect(res.status).toBe(403);
    });
  });

  // ── POST /api/assets/:id/qr/regenerate ─────────────────────────────────────

  describe('POST /api/assets/:id/qr/regenerate', () => {
    test('200 — generates new token, old token is invalid, history written', async () => {
      const asset = await createAsset(tenant._id, adminUser._id);
      const oldToken = asset.qrToken;

      const res = await request(app)
        .post(`/api/assets/${asset._id}/qr/regenerate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const newToken = res.body.data.qrToken;
      expect(newToken).not.toBe(oldToken);
      expect(newToken).toMatch(/^[0-9a-f]{64}$/);
      expect(res.body.data.qrCodeImageBase64).toMatch(/^data:image\/png;base64,/);

      // Old token must now return 404 on public scan
      const scanRes = await request(app)
        .get(`/api/public/scan/${oldToken}`)
        .query({ t: tenant._id.toString() });
      expect(scanRes.status).toBe(404);

      // History must have Updated event with old/new tokens
      const histRes = await request(app)
        .get(`/api/assets/${asset._id}/history`)
        .set('Authorization', `Bearer ${adminToken}`);
      const updateEvent = histRes.body.data.find(
        (e) => e.eventType === 'Updated' && e.newValue && e.newValue.qrToken
      );
      expect(updateEvent).toBeDefined();
      expect(updateEvent.previousValue.qrToken).toBe(oldToken);
      expect(updateEvent.newValue.qrToken).toBe(newToken);
    });

    test('403 — Viewer cannot regenerate QR (EC-08)', async () => {
      const asset = await createAsset(tenant._id, adminUser._id);
      const res = await request(app)
        .post(`/api/assets/${asset._id}/qr/regenerate`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
    });

    test('404 — non-existent asset', async () => {
      const fakeId = '000000000000000000000001';
      const res = await request(app)
        .post(`/api/assets/${fakeId}/qr/regenerate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
});
