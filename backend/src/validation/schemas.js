'use strict';

/**
 * Zod validation schemas for every endpoint.
 *
 * Each schema validates exactly the part of the request it owns (body, query,
 * or params). The validate() middleware runs these and returns 422 with a
 * populated fields object on failure.
 *
 * Special cases:
 *  - EC-03: qrToken format (64-char hex). The public scan route returns 404
 *    (not 422) for a malformed token, so the route handler intercepts the
 *    validation error and converts it. See public.routes.js.
 *  - EC-06: Both employeeId + locationId → 422 enforced via .refine().
 */

const { z } = require('zod');
const {
  ASSET_STATUSES,
  ASSET_CATEGORIES,
  LOCATION_TYPES,
  EMPLOYEE_STATUSES,
  HISTORY_EVENT_TYPES,
} = require('../config/constants');

// ── Shared primitives ─────────────────────────────────────────────────────────

const objectIdString = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid 24-character ObjectId');

const pageSchema = z.coerce
  .number()
  .int()
  .min(1, 'Must be >= 1')
  .default(1);

const limitSchema = z.coerce
  .number()
  .int()
  .min(1, 'Must be >= 1')
  .max(100, 'Must be <= 100')
  .default(20);

// 64-char lowercase hex — the valid qrToken format (§4, EC-03)
const qrTokenFormat = z
  .string()
  .min(1, 'qrToken is required')
  .regex(/^[0-9a-f]{64}$/, 'Invalid token format');

// ── 2.1  Public scan ──────────────────────────────────────────────────────────

const publicScanParams = z.object({
  qrToken: qrTokenFormat,
});

const publicScanQuery = z.object({
  t: z
    .string()
    .min(1, 'tenantId query parameter (t) is required')
    .regex(/^[0-9a-fA-F]{24}$/, 'tenantId must be a valid ObjectId'),
});

// ── 2.2  Auth login ───────────────────────────────────────────────────────────

const loginBody = z.object({
  email: z.string().email('Must be a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ── 2.3  Asset list query ─────────────────────────────────────────────────────

const assetListQuery = z.object({
  page: pageSchema,
  limit: limitSchema,
  status: z.enum(ASSET_STATUSES).optional(),
  category: z.enum(ASSET_CATEGORIES).optional(),
  assignedEmployeeId: objectIdString.optional(),
  assignedLocationId: objectIdString.optional(),
  search: z.string().max(200).optional(),
  isPublicVisible: z
    .string()
    .optional()
    .transform((v) => v === undefined ? undefined : v === 'true'),
});

// ── 2.3  Asset params (:id) ───────────────────────────────────────────────────

const assetIdParams = z.object({
  id: objectIdString,
});

// ── 2.3  GET /api/assets/:id query (optional QR image flag) ──────────────────

const assetGetQuery = z.object({
  includeQrImage: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});

// ── 2.3  POST /api/assets ─────────────────────────────────────────────────────

const createAssetBody = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  category: z.enum(ASSET_CATEGORIES, {
    errorMap: () => ({
      message: `category must be one of: ${ASSET_CATEGORIES.join(', ')}`,
    }),
  }),
  description: z.string().max(1000).optional(),
  serialNumber: z.string().max(100).optional(),
  isPublicVisible: z.boolean().optional().default(true),
  assetCode: z
    .string()
    .regex(
      /^[A-Z0-9-]{3,20}$/,
      'assetCode must be 3–20 uppercase alphanumeric characters or hyphens'
    )
    .optional(),
});

// ── 2.3  PATCH /api/assets/:id ────────────────────────────────────────────────

const updateAssetBody = z
  .object({
    name: z.string().min(1).max(200).optional(),
    category: z
      .enum(ASSET_CATEGORIES, {
        errorMap: () => ({
          message: `category must be one of: ${ASSET_CATEGORIES.join(', ')}`,
        }),
      })
      .optional(),
    description: z.string().max(1000).optional(),
    serialNumber: z.string().max(100).optional(),
    isPublicVisible: z.boolean().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update' }
  );

// ── 2.3  GET /api/assets/:id/history query ────────────────────────────────────

const historyQuery = z.object({
  page: pageSchema,
  limit: limitSchema,
  eventType: z.enum(HISTORY_EVENT_TYPES).optional(),
});

// ── 2.3  POST /api/assets/:id/assign ─────────────────────────────────────────

const assignBody = z
  .object({
    employeeId: objectIdString.optional(),
    locationId: objectIdString.optional(),
    note: z.string().max(500).optional(),
  })
  .refine(
    (data) => Boolean(data.employeeId) !== Boolean(data.locationId),
    {
      // EC-06: exactly one of the two must be supplied
      message: 'Provide either employeeId or locationId, not both.',
      path: ['employeeId'],
    }
  );

// ── 2.3  POST /api/assets/:id/unassign ───────────────────────────────────────

const unassignBody = z.object({
  note: z.string().max(500).optional(),
});

// ── 2.3  POST /api/assets/:id/status ─────────────────────────────────────────

const changeStatusBody = z.object({
  status: z.enum(ASSET_STATUSES, {
    errorMap: () => ({
      message: `status must be one of: ${ASSET_STATUSES.join(', ')}`,
    }),
  }),
  note: z.string().max(500).optional(),
});

// ── 2.4  Employee list query ──────────────────────────────────────────────────

const employeeListQuery = z.object({
  page: pageSchema,
  limit: limitSchema,
  status: z.enum(EMPLOYEE_STATUSES).optional(),
  department: z.string().max(200).optional(),
  search: z.string().max(200).optional(),
});

// ── 2.4  Employee params (:id) ────────────────────────────────────────────────

const employeeIdParams = z.object({
  id: objectIdString,
});

// ── 2.5  Location list query ──────────────────────────────────────────────────

const locationListQuery = z.object({
  page: pageSchema,
  limit: limitSchema,
  type: z.enum(LOCATION_TYPES).optional(),
  search: z.string().max(200).optional(),
});

// ── 2.5  Location params (:id) ────────────────────────────────────────────────

const locationIdParams = z.object({
  id: objectIdString,
});

module.exports = {
  // public
  publicScanParams,
  publicScanQuery,
  // auth
  loginBody,
  // assets
  assetListQuery,
  assetIdParams,
  assetGetQuery,
  createAssetBody,
  updateAssetBody,
  historyQuery,
  assignBody,
  unassignBody,
  changeStatusBody,
  // employees
  employeeListQuery,
  employeeIdParams,
  // locations
  locationListQuery,
  locationIdParams,
};
