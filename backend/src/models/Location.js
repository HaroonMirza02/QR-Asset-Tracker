'use strict';

const mongoose = require('mongoose');
const { LOCATION_TYPES } = require('../config/constants');

const locationSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: LOCATION_TYPES,
    },
    address: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'locations',
  }
);

// Indexes
locationSchema.index({ tenantId: 1, type: 1 });

locationSchema.set('toJSON', {
  virtuals: false,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.tenantId;
    return ret;
  },
});

module.exports = mongoose.model('Location', locationSchema);
