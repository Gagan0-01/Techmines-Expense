import mongoose from 'mongoose';
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } from '../config/financial.js';

const balanceAuditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Account user ID is required for audit trail'],
      index: true,
    },
    previousBalance: {
      type: Number,
      required: true,
    },
    newBalance: {
      type: Number,
      required: true,
    },
    previousBalancePaise: {
      type: Number,
      required: true,
    },
    newBalancePaise: {
      type: Number,
      required: true,
    },
    changeAmountPaise: {
      type: Number,
      required: true,
    },
    changeAmount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      enum: SUPPORTED_CURRENCIES,
      default: DEFAULT_CURRENCY,
      required: true,
    },
    reason: {
      type: String,
      required: [true, 'Audit reason or business justification is required'],
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    approvalType: {
      type: String,
      enum: ['direct', 'two_person_approved'],
      required: true,
    },
    pendingRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PendingBalanceChange',
      default: null,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
      index: true,
    },
  },
  {
    timestamps: false, // Explicit immutable createdAt used
  }
);

/**
 * Application-level write-once protection:
 * Intercepts all update and delete Mongoose operations.
 *
 * NOTE: For complete defense-in-depth, configure MongoDB Atlas role privileges
 * to omit 'update' and 'delete' actions on the 'balanceauditlogs' collection.
 */
const blockMutation = function () {
  throw new Error('BalanceAuditLog records are strictly immutable. Updates and deletions are prohibited.');
};

balanceAuditLogSchema.pre('updateOne', blockMutation);
balanceAuditLogSchema.pre('updateMany', blockMutation);
balanceAuditLogSchema.pre('findOneAndUpdate', blockMutation);
balanceAuditLogSchema.pre('deleteOne', blockMutation);
balanceAuditLogSchema.pre('deleteMany', blockMutation);
balanceAuditLogSchema.pre('findOneAndDelete', blockMutation);

export const BalanceAuditLog = mongoose.model('BalanceAuditLog', balanceAuditLogSchema);

