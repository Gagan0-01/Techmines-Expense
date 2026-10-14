import mongoose, { Document, Schema } from 'mongoose';

export type AccountType = 'OPERATING' | 'PAYROLL' | 'SAVINGS' | 'TAX_RESERVE' | 'ESCROW' | 'INVESTMENT' | 'CLEARING';
export type AccountStatus = 'ACTIVE' | 'FROZEN' | 'RESTRICTED' | 'CLOSED';

export interface IAccount extends Document {
  name: string;
  accountNumber: string;
  accountType: AccountType;
  currency: string;
  balanceCents: number;
  availableBalanceCents: number;
  institution: string;
  routingNumber?: string;
  swiftBic?: string;
  iban?: string;
  entityName: string;
  country: string;
  isMainTreasury: boolean;
  status: AccountStatus;
  creditLimitCents?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema<IAccount>(
  {
    name: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, unique: true, trim: true },
    accountType: {
      type: String,
      enum: ['OPERATING', 'PAYROLL', 'SAVINGS', 'TAX_RESERVE', 'ESCROW', 'INVESTMENT', 'CLEARING'],
      default: 'OPERATING',
    },
    currency: { type: String, required: true, uppercase: true, default: 'USD' },
    balanceCents: { type: Number, required: true, default: 0 },
    availableBalanceCents: { type: Number, required: true, default: 0 },
    institution: { type: String, required: true, trim: true },
    routingNumber: { type: String, trim: true },
    swiftBic: { type: String, trim: true },
    iban: { type: String, trim: true },
    entityName: { type: String, required: true, default: 'Acme Global Treasury LLC' },
    country: { type: String, default: 'USA' },
    isMainTreasury: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['ACTIVE', 'FROZEN', 'RESTRICTED', 'CLOSED'],
      default: 'ACTIVE',
    },
    creditLimitCents: { type: Number, default: 0 },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

AccountSchema.index({ entityName: 1, currency: 1 });
AccountSchema.index({ status: 1 });

export const Account = mongoose.model<IAccount>('Account', AccountSchema);
