'use strict';

const mongoose = require('mongoose');
const { USER_ROLES } = require('../config/constants');

const userSchema = new mongoose.Schema(
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
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
      // Never returned in any response — see toJSON transform below
    },
    role: {
      type: String,
      required: true,
      enum: USER_ROLES,
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ tenantId: 1, role: 1 });

// Strip sensitive fields from serialised output
userSchema.set('toJSON', {
  virtuals: false,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash; // never exposed
    delete ret.tenantId;     // never exposed per field-level rules
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
