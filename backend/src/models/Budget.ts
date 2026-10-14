import mongoose, { Document, Schema } from 'mongoose';

export interface IBudget extends Document {
  department: string;
  category: string;
  period: string; // e.g., '2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4', '2026-FY'
  allocatedCents: number;
  spentCents: number;
  currency: string;
  alertThresholdPercent: number; // e.g. 85%
  status: 'ACTIVE' | 'ARCHIVED';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BudgetSchema = new Schema<IBudget>(
  {
    department: { type: String, required: true },
    category: { type: String, required: true },
    period: { type: String, required: true },
    allocatedCents: { type: Number, required: true, default: 0 },
    spentCents: { type: Number, required: true, default: 0 },
    currency: { type: String, required: true, default: 'USD' },
    alertThresholdPercent: { type: Number, default: 85 },
    status: { type: String, enum: ['ACTIVE', 'ARCHIVED'], default: 'ACTIVE' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

BudgetSchema.index({ period: 1, department: 1, category: 1 }, { unique: true });

export const Budget = mongoose.model<IBudget>('Budget', BudgetSchema);
