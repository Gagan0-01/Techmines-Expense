import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required for data isolation'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Transaction title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
      set: (val) => Math.round(Number(val) * 100) / 100, // round to 2 decimal places to avoid floating issues
    },
    type: {
      type: String,
      required: [true, 'Transaction type is required'],
      enum: {
        values: ['incoming', 'expense'],
        message: 'Type must be either incoming or expense',
      },
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: {
        values: ['Cash', 'UPI', 'Bank Transfer'],
        message: 'Payment method must be Cash, UPI, or Bank Transfer',
      },
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },
    referenceNumber: {
      type: String,
      trim: true,
      maxlength: [100, 'Reference number cannot exceed 100 characters'],
      default: '',
    },
    vendorRecipient: {
      type: String,
      trim: true,
      maxlength: [120, 'Vendor/Recipient cannot exceed 120 characters'],
      default: '',
    },
    merchant: {
      type: String,
      trim: true,
      maxlength: [120, 'Merchant cannot exceed 120 characters'],
      default: '',
    },
    subtotal: {
      type: Number,
      default: null,
    },
    tax: {
      type: Number,
      default: null,
    },
    receiptTax: {
      type: Number,
      default: null,
    },
    receiptImage: {
      type: String,
      default: '',
    },
    ocrStatus: {
      type: String,
      enum: ['none', 'pending', 'completed', 'failed'],
      default: 'none',
    },
    items: [
      {
        name: { type: String, trim: true, default: '' },
        quantity: { type: Number, default: 1 },
        price: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
      },
    ],
    recurringScheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecurringSchedule',
      default: null,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast ledger lookups & search scoped to user
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1 });
transactionSchema.index({ userId: 1, paymentMethod: 1 });
transactionSchema.index({
  title: 'text',
  notes: 'text',
  referenceNumber: 'text',
  category: 'text',
  vendorRecipient: 'text',
});

export const Transaction = mongoose.model('Transaction', transactionSchema);
