'use strict';

/**
 * Public scan endpoint tests.
 * Covers all three QR scan outcomes from ARCHITECTURE.md §4 and
 * edge cases EC-02, EC-03, EC-04.
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
  clearCollections,
} = require('./helpers');

describe('Public — GET /api/public/scan/:qrToken', () => {
  let tenant;
  let adminUser;
  let visibleAsset;
  let hiddenAsset;
  let retiredVisibleAsset;
  let assignedEmpAsset;
  let assignedLocAsset;
  let employee;
  let location;

  beforeEach(async () => {
    await clearCollections();
    tenant = await createTenant();
    adminUser = await createUser(tenant._id, 'Admin');
    employee = await createEmployee(tenant._id);
    location = await createLocation(tenant._id);

    visibleAsset = await createAsset(tenant._id, adminUser._id, {
      name: 'Visible Laptop',
      isPublicVisible: true,
      status: 'Available',
    });

    hiddenAsset = await createAsset(tenant._id, adminUser._id, {
      name: 'Hidden Asset',
      isPublicVisible: false,
    });

    retiredVisibleAsset = await createAsset(tenant._id, adminUser._id, {
      name: 'Retired but Visible',
      isPublicVisible: true,
      status: 'Retired',
    });

    assignedEmpAsset = await createAsset(tenant._id, adminUser._id, {
      name: 'Employee Assigned Asset',
      isPublicVisible: true,
      status: 'Assigned',
      assignedEmployeeId: employee._id,
    });

    assignedLocAsset = await createAsset(tenant._id, adminUser._id, {
      name: 'Location Assigned Asset',
      isPublicVisible: true,
      status: 'Assigned',
      assignedLocationId: location._id,
    });
  });

  // ── QR scan outcome 1: valid, visible asset ─────────────────────────────────
  test('200 — valid token + visible asset returns public profile', async () => {
    const res = await request(app)
      .get(`/api/public/scan/${visibleAsset.qrToken}`)
      .query({ t: tenant._id.toString() });

    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.assetCode).toBe(visibleAsset.assetCode);
    expect(d.name).toBe('Visible Laptop');
    expect(d.status).toBe('Available');
    expect(d.assignedTo).toBeNull();

    // AC-1: no internal IDs, no qrToken, no tenantId in public response
    expect(JSON.stringify(res.body)).not.toContain('_id');
    expect(JSON.stringify(res.body)).not.toContain('"id"');
    expect(JSON.stringify(res.body)).not.toContain('qrToken');
    expect(JSON.stringify(res.body)).not.toContain('tenantId');
  });

  // ── QR scan outcome 2: retired asset (still visible) returns status Retired ──
  test('200 — retired asset with isPublicVisible:true returns Retired status', async () => {
    const res = await request(app)
      .get(`/api/public/scan/${retiredVisibleAsset.qrToken}`)
      .query({ t: tenant._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Retired');
  });

  // ── Assigned to employee: shows displayName/title, no contactInfo, no id ────
  test('200 — assigned to employee: returns displayName + title, no contactInfo', async () => {
    const res = await request(app)
      .get(`/api/public/scan/${assignedEmpAsset.qrToken}`)
      .query({ t: tenant._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.data.assignedTo.type).toBe('employee');
    expect(res.body.data.assignedTo.displayName).toBe(employee.name);
    expect(res.body.data.assignedTo.title).toBe(employee.title);
    expect(res.body.data.assignedTo).not.toHaveProperty('contactInfo');
    expect(res.body.data.assignedTo).not.toHaveProperty('id');
  });

  // ── Assigned to location ─────────────────────────────────────────────────────
  test('200 — assigned to location: returns name + locationType', async () => {
    const res = await request(app)
      .get(`/api/public/scan/${assignedLocAsset.qrToken}`)
      .query({ t: tenant._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.data.assignedTo.type).toBe('location');
    expect(res.body.data.assignedTo.name).toBe(location.name);
    expect(res.body.data.assignedTo.locationType).toBe(location.type);
  });

  // ── EC-02: token does not exist ───────────────────────────────────────────────
  test('EC-02 — token not found returns 404 (not 422)', async () => {
    const fakeToken = 'a'.repeat(64);
    const res = await request(app)
      .get(`/api/public/scan/${fakeToken}`)
      .query({ t: tenant._id.toString() });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  // ── EC-03: malformed token (not 64-char hex) ──────────────────────────────────
  test('EC-03 — malformed token returns 404 (not 422)', async () => {
    const malformed = 'not-a-valid-qr-token';
    const res = await request(app)
      .get(`/api/public/scan/${malformed}`)
      .query({ t: tenant._id.toString() });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    // Must not reveal that the format was wrong (no 422)
    expect(res.body.error.code).not.toBe('VALIDATION_ERROR');
  });

  // ── EC-03 variant: short token ────────────────────────────────────────────────
  test('EC-03 — short token (32 chars) returns 404', async () => {
    const res = await request(app)
      .get(`/api/public/scan/${'ab'.repeat(16)}`)
      .query({ t: tenant._id.toString() });

    expect(res.status).toBe(404);
  });

  // ── EC-03 variant: uppercase token (not lowercase hex) ───────────────────────
  test('EC-03 — uppercase hex token returns 404 (tokens are lowercase only)', async () => {
    const upperToken = 'A'.repeat(64);
    const res = await request(app)
      .get(`/api/public/scan/${upperToken}`)
      .query({ t: tenant._id.toString() });

    expect(res.status).toBe(404);
  });

  // ── EC-04: isPublicVisible false → 404 ────────────────────────────────────────
  test('EC-04 — isPublicVisible:false returns 404 (same shape as not-found)', async () => {
    const res = await request(app)
      .get(`/api/public/scan/${hiddenAsset.qrToken}`)
      .query({ t: tenant._id.toString() });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  // ── Missing tenantId param → 422 ─────────────────────────────────────────────
  test('422 — missing ?t= query param', async () => {
    const res = await request(app)
      .get(`/api/public/scan/${visibleAsset.qrToken}`);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── Unknown tenant → 404 (not 403) ───────────────────────────────────────────
  test('404 — unknown tenantId returns 404 (not 403)', async () => {
    const unknownId = '000000000000000000000000';
    const res = await request(app)
      .get(`/api/public/scan/${visibleAsset.qrToken}`)
      .query({ t: unknownId });

    expect(res.status).toBe(404);
  });
});
