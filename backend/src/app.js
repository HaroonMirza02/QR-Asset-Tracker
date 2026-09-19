'use strict';

const express = require('express');
const app = express();

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────────────────────
const publicRouter = require('./routes/public.routes');
const authRouter = require('./routes/auth.routes');
const assetRouter = require('./routes/asset.routes');
const employeeRouter = require('./routes/employee.routes');
const locationRouter = require('./routes/location.routes');

app.use('/api/public', publicRouter);
app.use('/api/auth', authRouter);
app.use('/api/auth', require('./routes/signup.routes'));
app.use('/api/public', require('./routes/demo.routes'));
app.use('/api/assets', assetRouter);
app.use('/api/employees', employeeRouter);
app.use('/api/locations', locationRouter);

// ── 404 for unknown routes ───────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Route not found.', fields: {} },
  });
});

// ── Global error handler ─────────────────────────────────────────────────────
const { globalErrorHandler } = require('./middleware/errorHandler');
app.use(globalErrorHandler);

module.exports = app;
