import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  action: string;
  entityType: string;
  entityId?: string;
  performedBy: mongoose.Types.ObjectId;
  userName: string;
  details: Record<string, any>;
  ipAddress?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true }, // e.g., 'TRANSACTION_CREATE', 'ACCOUNT_UPDATE', 'APPROVAL'
    entityType: { type: String, required: true }, // 'TRANSACTION', 'ACCOUNT', 'LEDGER_ENTRY', 'USER'
    entityId: { type: String },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    details: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: '127.0.0.1' },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
