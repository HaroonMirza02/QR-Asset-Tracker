'use strict';

const mongoose = require('mongoose');

async function connectDB() {
  const uri =
    process.env.NODE_ENV === 'test'
      ? process.env.MONGODB_URI_TEST
      : process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      'MongoDB URI not set. Define MONGODB_URI (or MONGODB_URI_TEST for tests) in .env'
    );
  }

  // Reuse existing connection if connected in serverless container
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  await mongoose.connect(uri);

  if (process.env.NODE_ENV !== 'test') {
    console.log(`[db] Connected to MongoDB: ${uri}`);
  }
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
