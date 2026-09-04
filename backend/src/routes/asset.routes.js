'use strict';

/**
 * Asset router — all routes require authentication.
 *
 * Middleware chain per route:
 *   authenticate  →  requireRole  →  validate  →  asyncWrapper(controller)
 *
 * Role requirements (ARCHITECTURE.md §3 permission matrix):
 *   GET  endpoints          → Admin or Viewer  (anyAuthenticated)
 *   POST / PATCH endpoints  → Admin only       (adminOnly)
 *
 * AssetHistory has NO update or delete routes registered here or anywhere
 * else (ARCHITECTURE.md append-only requirement, AC-3).
 */

const { Router } = require('express');
const { authenticate } = require('../middleware/authenticate');
const { adminOnly, anyAuthenticated } = require('../middleware/roleGuard');
const { validate } = require('../middleware/validate');
const { asyncWrapper } = require('../middleware/asyncWrapper');
const ctrl = require('../controllers/asset.controller');
const {
  assetListQuery,
  assetIdParams,
  assetGetQuery,
  createAssetBody,
  updateAssetBody,
  historyQuery,
  assignBody,
  unassignBody,
  changeStatusBody,
} = require('../validation/schemas');

const router = Router();

// All asset routes require a valid JWT
router.use(authenticate);

// ── GET /api/assets ───────────────────────────────────────────────────────────
router.get(
  '/',
  anyAuthenticated,
  validate(assetListQuery, 'query'),
  asyncWrapper(ctrl.listAssets)
);

// ── POST /api/assets ──────────────────────────────────────────────────────────
router.post(
  '/',
  adminOnly,
  validate(createAssetBody, 'body'),
  asyncWrapper(ctrl.createAsset)
);

// ── GET /api/assets/:id ───────────────────────────────────────────────────────
router.get(
  '/:id',
  anyAuthenticated,
  validate(assetIdParams, 'params'),
  validate(assetGetQuery, 'query'),
  asyncWrapper(ctrl.getAsset)
);

// ── PATCH /api/assets/:id ─────────────────────────────────────────────────────
router.patch(
  '/:id',
  adminOnly,
  validate(assetIdParams, 'params'),
  validate(updateAssetBody, 'body'),
  asyncWrapper(ctrl.updateAsset)
);

// ── GET /api/assets/:id/history ───────────────────────────────────────────────
router.get(
  '/:id/history',
  anyAuthenticated,
  validate(assetIdParams, 'params'),
  validate(historyQuery, 'query'),
  asyncWrapper(ctrl.getHistory)
);

// ── POST /api/assets/:id/assign ───────────────────────────────────────────────
router.post(
  '/:id/assign',
  adminOnly,
  validate(assetIdParams, 'params'),
  validate(assignBody, 'body'),
  asyncWrapper(ctrl.assignAsset)
);

// ── POST /api/assets/:id/unassign ─────────────────────────────────────────────
router.post(
  '/:id/unassign',
  adminOnly,
  validate(assetIdParams, 'params'),
  validate(unassignBody, 'body'),
  asyncWrapper(ctrl.unassignAsset)
);

// ── POST /api/assets/:id/status ───────────────────────────────────────────────
router.post(
  '/:id/status',
  adminOnly,
  validate(assetIdParams, 'params'),
  validate(changeStatusBody, 'body'),
  asyncWrapper(ctrl.changeStatus)
);

// ── POST /api/assets/:id/qr/regenerate ───────────────────────────────────────
router.post(
  '/:id/qr/regenerate',
  adminOnly,
  validate(assetIdParams, 'params'),
  asyncWrapper(ctrl.regenerateQr)
);

// ── No AssetHistory update or delete routes exist — enforced by omission ──────

module.exports = router;
