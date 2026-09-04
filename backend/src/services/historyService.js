'use strict';

/**
 * HistoryService — APPEND-ONLY log writer.
 *
 * This is the ONLY place in the codebase that creates AssetHistory documents.
 * It exposes no update or delete methods. Any future developer who wants to
 * modify history must justify it explicitly — the architecture prohibits it.
 *
 * Event types and previousValue/newValue shapes follow ARCHITECTURE.md §A-09.
 */

const AssetHistory = require('../models/AssetHistory');

/**
 * Append a single history record.
 *
 * @param {object} params
 * @param {string} params.tenantId
 * @param {string} params.assetId
 * @param {string} params.eventType     One of HISTORY_EVENT_TYPES
 * @param {object} params.previousValue Snapshot before the change
 * @param {object} params.newValue      Snapshot after the change
 * @param {string} params.performedBy   userId of the actor
 * @param {string} [params.note]        Optional free-text note
 * @returns {Promise<import('../models/AssetHistory').default>}
 */
async function append({ tenantId, assetId, eventType, previousValue, newValue, performedBy, note = null }) {
  const record = await AssetHistory.create({
    tenantId,
    assetId,
    eventType,
    previousValue: previousValue ?? {},
    newValue: newValue ?? {},
    performedBy,
    note: note || null,
  });
  return record;
}

// ── Convenience wrappers (keep call-sites clean) ──────────────────────────────

async function recordCreated({ tenantId, assetId, performedBy, asset }) {
  return append({
    tenantId,
    assetId,
    eventType: 'Created',
    previousValue: {},
    newValue: { assetCode: asset.assetCode, name: asset.name, status: asset.status },
    performedBy,
  });
}

async function recordStatusChange({ tenantId, assetId, performedBy, oldStatus, newStatus, note }) {
  return append({
    tenantId,
    assetId,
    eventType: 'StatusChange',
    previousValue: { status: oldStatus },
    newValue: { status: newStatus },
    performedBy,
    note,
  });
}

async function recordAssignedToEmployee({ tenantId, assetId, performedBy, previousEmployeeId, previousLocationId, newEmployeeId, note }) {
  return append({
    tenantId,
    assetId,
    eventType: 'AssignedToEmployee',
    previousValue: { assignedEmployeeId: previousEmployeeId, assignedLocationId: previousLocationId },
    newValue: { assignedEmployeeId: newEmployeeId, assignedLocationId: null },
    performedBy,
    note,
  });
}

async function recordAssignedToLocation({ tenantId, assetId, performedBy, previousEmployeeId, previousLocationId, newLocationId, note }) {
  return append({
    tenantId,
    assetId,
    eventType: 'AssignedToLocation',
    previousValue: { assignedEmployeeId: previousEmployeeId, assignedLocationId: previousLocationId },
    newValue: { assignedEmployeeId: null, assignedLocationId: newLocationId },
    performedBy,
    note,
  });
}

async function recordUnassigned({ tenantId, assetId, performedBy, previousEmployeeId, previousLocationId, note }) {
  return append({
    tenantId,
    assetId,
    eventType: 'Unassigned',
    previousValue: { assignedEmployeeId: previousEmployeeId, assignedLocationId: previousLocationId },
    newValue: { assignedEmployeeId: null, assignedLocationId: null },
    performedBy,
    note,
  });
}

async function recordUpdated({ tenantId, assetId, performedBy, previousValue, newValue, note }) {
  return append({
    tenantId,
    assetId,
    eventType: 'Updated',
    previousValue,
    newValue,
    performedBy,
    note,
  });
}

module.exports = {
  append,
  recordCreated,
  recordStatusChange,
  recordAssignedToEmployee,
  recordAssignedToLocation,
  recordUnassigned,
  recordUpdated,
};
