'use strict';

/**
 * AssetHistory — APPEND-ONLY
 *
 * No update or delete routes are ever registered for this collection.
 * The HistoryService is the only writer; it only ever calls .create().
 * Do not add .findOneAndUpdate(), .updateOne(), .deleteOne(), etc. to this model
 * or to any service that touches it.
 */

const mongoose = require('mongoose');
const { HISTORY_EVENT_TYPES } = require('../config/constants');

const assetHistorySchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: HISTORY_EVENT_TYPES,
    },
    // Free subdocuments — shape documented per event type in ARCHITECTURE.md §A-09
    previousValue: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    note: {
      type: String,
      maxlength: 500,
      default: null,
    },
    // createdAt is managed by the schema option below; there is intentionally
    // no updatedAt on this collection.
  },
  {
    // Custom timestamps: only createdAt, no updatedAt (immutable log)
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'assethistories',
  }
);

// Indexes — as specified in ARCHITECTURE.md §2.6
assetHistorySchema.index({ tenantId: 1, assetId: 1, createdAt: -1 });
assetHistorySchema.index({ tenantId: 1, createdAt: -1 });

assetHistorySchema.set('toJSON', {
  virtuals: false,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.tenantId;
    if (ret.assetId) ret.assetId = ret.assetId.toString();
    if (ret.performedBy) ret.performedBy = ret.performedBy.toString();
    return ret;
  },
});

module.exports = mongoose.model('AssetHistory', assetHistorySchema);
