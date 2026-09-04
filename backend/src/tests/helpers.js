'use strict';

/**
 * Test helpers — factory functions shared across test files.
 * Creates real DB documents; no mocking.
 */

const mongoose = require('mongoose');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Location = require('../models/Location');
const Asset = require('../models/Asset');
const AssetHistory = require('../models/AssetHistory');
const { hashPassword } = require('../services/authService');
const qrService = require('../services/qrService');

// ── Tenant ────────────────────────────────────────────────────────────────────

async function createTenant(overrides = {}) {
  const slug = `test-tenant-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return Tenant.create({
    name: 'Test Organisation',
    slug,
    isActive: true,
    ...overrides,
  });
}

// ── User ──────────────────────────────────────────────────────────────────────

async function createUser(tenantId, role = 'Admin', overrides = {}) {
  const email = `${role.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2)}@test.example`;
  const passwordHash = await hashPassword('Password1!');
  return User.create({
    tenantId,
    name: `${role} User`,
    email,
    passwordHash,
    role,
    ...overrides,
  });
}

// ── Employee ──────────────────────────────────────────────────────────────────

async function createEmployee(tenantId, overrides = {}) {
  return Employee.create({
    tenantId,
    name: 'Test Employee',
    title: 'Tester',
    department: 'QA',
    contactInfo: { email: 'emp@test.example', phone: '+1-555-9999' },
    status: 'active',
    ...overrides,
  });
}

// ── Location ──────────────────────────────────────────────────────────────────

async function createLocation(tenantId, overrides = {}) {
  return Location.create({
    tenantId,
    name: 'Test Location',
    type: 'building',
    address: '1 Test Street',
    ...overrides,
  });
}

// ── Asset ─────────────────────────────────────────────────────────────────────

let _assetSeq = 0;
async function createAsset(tenantId, userId, overrides = {}) {
  _assetSeq++;
  const assetCode = `TST${String(_assetSeq).padStart(4, '0')}`;
  const { qrToken } = await qrService.createTokenPair(tenantId.toString());
  const asset = await Asset.create({
    tenantId,
    qrToken,
    assetCode,
    name: 'Test Asset',
    category: 'Laptop',
    description: null,
    serialNumber: null,
    status: 'Available',
    assignedEmployeeId: null,
    assignedLocationId: null,
    isPublicVisible: true,
    ...overrides,
  });
  // Write Created history
  await AssetHistory.create({
    tenantId,
    assetId: asset._id,
    eventType: 'Created',
    previousValue: {},
    newValue: { assetCode, name: asset.name, status: asset.status },
    performedBy: userId,
  });
  return asset;
}

// ── Login helper ──────────────────────────────────────────────────────────────
// Returns a supertest agent pre-loaded with auth header
const request = require('supertest');
const app = require('../app');

async function loginAs(email, password = 'Password1!') {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  if (res.status !== 200) throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
  return res.body.data.token;
}

// ── Clear collections ─────────────────────────────────────────────────────────

async function clearCollections() {
  await Promise.all([
    Tenant.deleteMany({}),
    User.deleteMany({}),
    Employee.deleteMany({}),
    Location.deleteMany({}),
    Asset.deleteMany({}),
    AssetHistory.deleteMany({}),
  ]);
  _assetSeq = 0;
}

module.exports = {
  createTenant,
  createUser,
  createEmployee,
  createLocation,
  createAsset,
  loginAs,
  clearCollections,
};
