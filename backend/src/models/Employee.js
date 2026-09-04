'use strict';

const mongoose = require('mongoose');
const { EMPLOYEE_STATUSES } = require('../config/constants');

const contactInfoSchema = new mongoose.Schema(
  {
    email: { type: String, trim: true, default: null },
    phone: { type: String, trim: true, default: null },
  },
  { _id: false }
);

const employeeSchema = new mongoose.Schema(
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
    title: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
      default: null,
    },
    contactInfo: {
      type: contactInfoSchema,
      default: () => ({ email: null, phone: null }),
    },
    status: {
      type: String,
      required: true,
      enum: EMPLOYEE_STATUSES,
      default: 'active',
    },
  },
  {
    timestamps: true,
    collection: 'employees',
  }
);

// Indexes
employeeSchema.index({ tenantId: 1, status: 1 });
employeeSchema.index({ tenantId: 1, name: 1 });

employeeSchema.set('toJSON', {
  virtuals: false,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.tenantId;
    return ret;
  },
});

module.exports = mongoose.model('Employee', employeeSchema);
