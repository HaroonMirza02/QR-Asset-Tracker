'use strict';

require('./setup');
const request = require('supertest');
const app = require('../app');
const {
  createTenant,
  createUser,
  createLocation,
  loginAs,
  clearCollections,
} = require('./helpers');

describe('Locations', () => {
  let tenant;
  let adminUser;
  let viewerUser;
  let adminToken;
  let viewerToken;
  let location;

  beforeEach(async () => {
    await clearCollections();
    tenant = await createTenant();
    adminUser = await createUser(tenant._id, 'Admin');
    viewerUser = await createUser(tenant._id, 'Viewer');
    adminToken = await loginAs(adminUser.email);
    viewerToken = await loginAs(viewerUser.email);
    location = await createLocation(tenant._id, {
      name: 'Main Warehouse',
      type: 'building',
      address: '1 Warehouse Lane',
    });
  });

  describe('GET /api/locations', () => {
    test('200 — Admin can list locations', async () => {
      const res = await request(app)
        .get('/api/locations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(JSON.stringify(res.body)).not.toContain('tenantId');
    });

    test('200 — Viewer can list locations', async () => {
      const res = await request(app)
        .get('/api/locations')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBe(200);
    });

    test('EC-10 — no-match search returns 200 with empty array', async () => {
      const res = await request(app)
        .get('/api/locations?search=zzznowhere')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    test('401 — unauthenticated', async () => {
      const res = await request(app).get('/api/locations');
      expect(res.status).toBe(401);
    });

    test('422 — invalid type value', async () => {
      const res = await request(app)
        .get('/api/locations?type=spaceship')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/locations/:id', () => {
    test('200 — returns location with all fields', async () => {
      const res = await request(app)
        .get(`/api/locations/${location._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Main Warehouse');
      expect(res.body.data.type).toBe('building');
      expect(JSON.stringify(res.body)).not.toContain('tenantId');
    });

    test('200 — Viewer can get location detail', async () => {
      const res = await request(app)
        .get(`/api/locations/${location._id}`)
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBe(200);
    });

    test('404 — not found', async () => {
      const fakeId = '000000000000000000000001';
      const res = await request(app)
        .get(`/api/locations/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });

    test('404 — cross-tenant location returns 404', async () => {
      const otherTenant = await createTenant();
      const otherLoc = await createLocation(otherTenant._id);

      const res = await request(app)
        .get(`/api/locations/${otherLoc._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });
  });
});
