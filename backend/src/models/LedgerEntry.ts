import mongoose, { Document, Schema } from 'mongoose';

export interface ILedgerLine {
  accountId: mongoose.Types.ObjectId;
  accountName: string;
  accountCode: string;
  debitCents: number;
  creditCents: number;
  currency: string;
  memo?: string;
}

export interface ILedgerEntry extends Document {
  entryNumber: string;
  transactionId?: mongoose.Types.ObjectId;
  description: string;
  postingDate: Date;
  lines: ILedgerLine[];
  totalDebitCents: number;
  totalCreditCents: number;
  isBalanced: boolean;
  status: 'POSTED' | 'VOIDED';
  fiscalPeriod: string; // e.g. "2026-10"
  postedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LedgerLineSchema = new Schema<ILedgerLine>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    accountName: { type: String, required: true },
    accountCode: { type: String, required: true },
    debitCents: { type: Number, required: true, default: 0 },
    creditCents: { type: Number, required: true, default: 0 },
    currency: { type: String, required: true, default: 'USD' },
    memo: { type: String },
  },
  { _id: false }
);

const LedgerEntrySchema = new Schema<ILedgerEntry>(
  {
    entryNumber: { type: String, required: true, unique: true, uppercase: true },
    transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
    description: { type: String, required: true },
    postingDate: { type: Date, required: true, default: Date.now },
    lines: [LedgerLineSchema],
    totalDebitCents: { type: Number, required: true },
    totalCreditCents: { type: Number, required: true },
    isBalanced: { type: Boolean, required: true, default: true },
    status: { type: String, enum: ['POSTED', 'VOIDED'], default: 'POSTED' },
    fiscalPeriod: { type: String, required: true },
    postedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

LedgerEntrySchema.index({ postingDate: -1 });
LedgerEntrySchema.index({ fiscalPeriod: 1 });

export const LedgerEntry = mongoose.model<ILedgerEntry>('LedgerEntry', LedgerEntrySchema);
