import mongoose from 'mongoose';

const recurringScheduleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required for data isolation'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
      set: (val) => Math.round(Number(val) * 100) / 100,
    },
    type: {
      type: String,
      required: [true, 'Type is required'],
      enum: ['incoming', 'expense'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: ['Cash', 'UPI', 'Bank Transfer'],
    },
    frequency: {
      type: String,
      required: [true, 'Frequency is required'],
      enum: ['Daily', 'Weekly', 'Monthly', 'Yearly'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      default: null,
    },
    nextScheduledDate: {
      type: Date,
      required: [true, 'Next scheduled date is required'],
    },
    status: {
      type: String,
      enum: ['Active', 'Paused', 'Cancelled'],
      default: 'Active',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },
    completedTransactions: [
      {
        transactionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Transaction',
        },
        date: {
          type: Date,
          default: Date.now,
        },
        amount: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

recurringScheduleSchema.index({ userId: 1, status: 1, nextScheduledDate: 1 });

export const RecurringSchedule = mongoose.model('RecurringSchedule', recurringScheduleSchema);
