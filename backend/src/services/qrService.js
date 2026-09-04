'use strict';

/**
 * QRService
 *
 * Responsibilities:
 *  - Generate a cryptographically random, unique qrToken
 *    (crypto.randomBytes(32) → 64-char lowercase hex, per ARCHITECTURE.md §4)
 *  - Build the public scan URL that gets encoded into the QR image
 *    (per Assumption A-01: <APP_BASE_URL>/scan/<qrToken>?t=<tenantId>)
 *  - Generate a base64-encoded PNG QR code image (300×300, per Assumption A-11)
 *  - Handle the regenerate flow (new token, old token immediately invalid)
 */

const crypto = require('crypto');
const QRCode = require('qrcode');
const Asset = require('../models/Asset');

const QR_TOKEN_BYTES = 32; // → 64-char hex string → 256 bits entropy

/**
 * Generate a unique 64-char hex qrToken.
 * Retries up to 5 times on the (astronomically unlikely) collision event.
 *
 * @returns {Promise<string>}
 */
async function generateUniqueToken() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const token = crypto.randomBytes(QR_TOKEN_BYTES).toString('hex');
    const existing = await Asset.exists({ qrToken: token });
    if (!existing) return token;
  }
  // If we somehow hit 5 collisions, something is deeply wrong
  throw new Error('QRService: failed to generate a unique token after 5 attempts.');
}

/**
 * Build the scan URL that gets encoded in the QR image.
 *
 * @param {string} qrToken
 * @param {string} tenantId  MongoDB ObjectId string
 * @returns {string}
 */
function buildScanUrl(qrToken, tenantId) {
  const base = (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/scan/${qrToken}?t=${tenantId}`;
}

/**
 * Generate a base64-encoded PNG QR code image for a scan URL.
 *
 * @param {string} scanUrl
 * @returns {Promise<string>}  data:image/png;base64,<...>
 */
async function generateQrImage(scanUrl) {
  const dataUrl = await QRCode.toDataURL(scanUrl, {
    type: 'image/png',
    width: 300,
    margin: 2,
    errorCorrectionLevel: 'M',
  });
  return dataUrl; // already in data:image/png;base64,<...> format
}

/**
 * Create a fresh { qrToken, qrCodeUrl } pair for a new asset.
 * Does NOT persist anything — caller (AssetService) saves to DB.
 *
 * @param {string} tenantId
 * @returns {Promise<{ qrToken: string, qrCodeUrl: string }>}
 */
async function createTokenPair(tenantId) {
  const qrToken = await generateUniqueToken();
  const qrCodeUrl = buildScanUrl(qrToken, tenantId);
  return { qrToken, qrCodeUrl };
}

/**
 * Regenerate a QR token for an existing asset.
 * Returns the new token, URL, and base64 image.
 * Does NOT persist — caller (AssetService) saves and writes history.
 *
 * @param {string} tenantId
 * @returns {Promise<{ qrToken: string, qrCodeUrl: string, qrCodeImageBase64: string }>}
 */
async function regenerateToken(tenantId) {
  const qrToken = await generateUniqueToken();
  const qrCodeUrl = buildScanUrl(qrToken, tenantId);
  const qrCodeImageBase64 = await generateQrImage(qrCodeUrl);
  return { qrToken, qrCodeUrl, qrCodeImageBase64 };
}

module.exports = { generateUniqueToken, buildScanUrl, generateQrImage, createTokenPair, regenerateToken };
