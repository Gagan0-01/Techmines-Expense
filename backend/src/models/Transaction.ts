import mongoose, { Document, Schema } from 'mongoose';

export type TransactionType =
  | 'INFLOW'
  | 'OUTFLOW'
  | 'INTERNAL_TRANSFER'
  | 'INTEREST_INCOME'
  | 'BANK_FEE'
  | 'TAX_SETTLEMENT'
  | 'FX_SWAP';

export type TransactionStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'FLAGGED';

export type ReconciliationStatus = 'UNRECONCILED' | 'MATCHED' | 'MANUALLY_ADJUSTED' | 'DISCREPANCY';

export interface ITransaction extends Document {
  referenceNumber: string;
  type: TransactionType;
  sourceAccountId: mongoose.Types.ObjectId;
  destinationAccountId?: mongoose.Types.ObjectId;
  counterpartyName: string;
  counterpartyAccount?: string;
  amountCents: number;
  feeCents: number;
  currency: string;
  destinationAmountCents?: number;
  destinationCurrency?: string;
  exchangeRate?: number;
  category: string;
  subcategory?: string;
  description: string;
  status: TransactionStatus;
  reconciliationStatus: ReconciliationStatus;
  initiatedBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  valueDate: Date;
  postingDate: Date;
  tags: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    referenceNumber: { type: String, required: true, unique: true, uppercase: true },
    type: {
      type: String,
      enum: [
        'INFLOW',
        'OUTFLOW',
        'INTERNAL_TRANSFER',
        'INTEREST_INCOME',
        'BANK_FEE',
        'TAX_SETTLEMENT',
        'FX_SWAP',
      ],
      required: true,
    },
    sourceAccountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    destinationAccountId: { type: Schema.Types.ObjectId, ref: 'Account' },
    counterpartyName: { type: String, required: true, trim: true },
    counterpartyAccount: { type: String, trim: true },
    amountCents: { type: Number, required: true },
    feeCents: { type: Number, default: 0 },
    currency: { type: String, required: true, uppercase: true, default: 'USD' },
    destinationAmountCents: { type: Number },
    destinationCurrency: { type: String, uppercase: true },
    exchangeRate: { type: Number, default: 1.0 },
    category: { type: String, required: true, default: 'General Operations' },
    subcategory: { type: String, default: '' },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING_APPROVAL', 'APPROVED', 'COMPLETED', 'REJECTED', 'FLAGGED'],
      default: 'COMPLETED',
    },
    reconciliationStatus: {
      type: String,
      enum: ['UNRECONCILED', 'MATCHED', 'MANUALLY_ADJUSTED', 'DISCREPANCY'],
      default: 'UNRECONCILED',
    },
    initiatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String },
    valueDate: { type: Date, required: true, default: Date.now },
    postingDate: { type: Date, required: true, default: Date.now },
    tags: [{ type: String }],
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

TransactionSchema.index({ valueDate: -1 });
TransactionSchema.index({ sourceAccountId: 1, postingDate: -1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ reconciliationStatus: 1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);
