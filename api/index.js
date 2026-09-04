'use strict';

const app = require('../backend/src/app');
const { connectDB } = require('../backend/src/config/database');

module.exports = async (req, res) => {
  try {
    await connectDB();
    return app(req, res);
  } catch (err) {
    console.error('[serverless] Database connection failure:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to connect to backend database.',
        details: err.message,
      },
    });
  }
};
