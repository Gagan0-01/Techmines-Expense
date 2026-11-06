import mongoose from 'mongoose';
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } from '../config/financial.js';

const pendingBalanceChangeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    previousBalance: {
      type: Number,
      required: true,
    },
    proposedBalance: {
      type: Number,
      required: true,
    },
    previousBalancePaise: {
      type: Number,
      required: true,
    },
    proposedBalancePaise: {
      type: Number,
      required: true,
    },
    changeAmountPaise: {
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
      required: [true, 'Reason or business justification is required'],
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewNotes: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Review notes cannot exceed 500 characters'],
    },
    rejectionReason: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
    },
    ipAddress: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying pending requests per account
pendingBalanceChangeSchema.index({ userId: 1, status: 1 });

export const PendingBalanceChange = mongoose.model(
  'PendingBalanceChange',
  pendingBalanceChangeSchema
);

