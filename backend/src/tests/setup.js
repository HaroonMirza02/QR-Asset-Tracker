'use strict';

/**
 * Jest global setup/teardown for the test suite.
 *
 * Each test file imports helpers from here rather than duplicating DB
 * connection logic. The database is connected once before all tests and
 * disconnected after. Individual test files clear relevant collections
 * in beforeEach to guarantee isolation.
 */

const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/database');

// Set test environment before anything else
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-not-for-production';
process.env.JWT_EXPIRES_IN = '86400';
process.env.APP_BASE_URL = 'http://localhost:3000';
process.env.MONGODB_URI_TEST =
  process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/qr-asset-tracker-test';

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  // Drop the test database entirely after the full run
  await mongoose.connection.dropDatabase();
  await disconnectDB();
});
