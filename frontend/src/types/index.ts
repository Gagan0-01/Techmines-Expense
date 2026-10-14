export type UserRole = 'TREASURER' | 'FINANCE_MANAGER' | 'AUDITOR' | 'OPERATOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  avatar?: string;
}

export type AccountType =
  | 'OPERATING'
  | 'PAYROLL'
  | 'SAVINGS'
  | 'TAX_RESERVE'
  | 'ESCROW'
  | 'INVESTMENT'
  | 'CLEARING';

export type AccountStatus = 'ACTIVE' | 'FROZEN' | 'RESTRICTED' | 'CLOSED';

export interface Account {
  _id: string;
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
  createdAt: string;
  updatedAt: string;
}

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

export interface Transaction {
  _id: string;
  referenceNumber: string;
  type: TransactionType;
  sourceAccountId: Account;
  destinationAccountId?: Account;
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
  reconciliationStatus: string;
  initiatedBy: User;
  approvedBy?: User;
  rejectionReason?: string;
  valueDate: string;
  postingDate: string;
  tags: string[];
  notes?: string;
  createdAt: string;
}

export interface LedgerLine {
  accountId: string;
  accountName: string;
  accountCode: string;
  debitCents: number;
  creditCents: number;
  currency: string;
  memo?: string;
}

export interface LedgerEntry {
  _id: string;
  entryNumber: string;
  transactionId?: {
    _id: string;
    referenceNumber: string;
    type: string;
    amountCents: number;
    currency: string;
  };
  description: string;
  postingDate: string;
  lines: LedgerLine[];
  totalDebitCents: number;
  totalCreditCents: number;
  isBalanced: boolean;
  status: 'POSTED' | 'VOIDED';
  fiscalPeriod: string;
  postedBy: User;
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  action: string;
  entityType: string;
  entityId?: string;
  performedBy: string;
  userName: string;
  details: Record<string, any>;
  ipAddress: string;
  timestamp: string;
}

export interface BudgetVariance {
  id: string;
  department: string;
  category: string;
  period: string;
  allocatedCents: number;
  spentCents: number;
  varianceCents: number;
  utilizationPercent: number;
  isExceeded: boolean;
  isNearLimit: boolean;
  currency: string;
}

export interface TreasurySummary {
  totalConsolidatedUsdCents: number;
  activeAccountsCount: number;
  currencyBreakdown: Record<string, { totalCents: number; usdEquivalentCents: number; count: number }>;
  typeBreakdown: Record<string, number>;
  entityBreakdown: Record<string, number>;
}
