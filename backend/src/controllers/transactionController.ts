import { Response } from 'express';
import { z } from 'zod';
import { Transaction, TransactionStatus } from '../models/Transaction';
import { Account } from '../models/Account';
import { AuthRequest } from '../middleware/auth';
import { LedgerService } from '../services/ledgerService';
import { toCents } from '../utils/currency';
import { AuditLog } from '../models/AuditLog';

const transactionSchema = z.object({
  type: z.enum([
    'INFLOW',
    'OUTFLOW',
    'INTERNAL_TRANSFER',
    'INTEREST_INCOME',
    'BANK_FEE',
    'TAX_SETTLEMENT',
    'FX_SWAP',
  ]),
  sourceAccountId: z.string(),
  destinationAccountId: z.string().optional(),
  counterpartyName: z.string().min(2),
  counterpartyAccount: z.string().optional(),
  amount: z.union([z.number(), z.string()]),
  fee: z.union([z.number(), z.string()]).optional(),
  currency: z.string().length(3),
  destinationAmount: z.union([z.number(), z.string()]).optional(),
  destinationCurrency: z.string().length(3).optional(),
  exchangeRate: z.number().optional(),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  description: z.string().min(2),
  valueDate: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  requiresApproval: z.boolean().optional(),
});

export const getTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  const {
    page = '1',
    limit = '25',
    type,
    status,
    accountId,
    category,
    reconciliationStatus,
    startDate,
    endDate,
    search,
  } = req.query;

  const query: any = {};

  if (type) query.type = type;
  if (status) query.status = status;
  if (category) query.category = category;
  if (reconciliationStatus) query.reconciliationStatus = reconciliationStatus;

  if (accountId) {
    query.$or = [{ sourceAccountId: accountId }, { destinationAccountId: accountId }];
  }

  if (startDate || endDate) {
    query.valueDate = {};
    if (startDate) query.valueDate.$gte = new Date(startDate as string);
    if (endDate) query.valueDate.$lte = new Date(endDate as string);
  }

  if (search) {
    query.$or = [
      { referenceNumber: { $regex: search, $options: 'i' } },
      { counterpartyName: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
    ];
  }

  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = parseInt(limit as string, 10) || 25;
  const skip = (pageNum - 1) * limitNum;

  const [total, transactions] = await Promise.all([
    Transaction.countDocuments(query),
    Transaction.find(query)
      .populate('sourceAccountId', 'name accountNumber currency institution')
      .populate('destinationAccountId', 'name accountNumber currency institution')
      .populate('initiatedBy', 'name email role')
      .populate('approvedBy', 'name email role')
      .sort({ valueDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
  ]);

  res.json({
    success: true,
    data: transactions,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    },
  });
};

export const createTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const data = transactionSchema.parse(req.body);

  const sourceAccount = await Account.findById(data.sourceAccountId);
  if (!sourceAccount) {
    res.status(404).json({ success: false, message: 'Source account not found.' });
    return;
  }

  const amountCents = toCents(data.amount, data.currency);
  const feeCents = data.fee ? toCents(data.fee, data.currency) : 0;
  const destAmountCents = data.destinationAmount
    ? toCents(data.destinationAmount, data.destinationCurrency || data.currency)
    : undefined;

  // Validation: Outflows check available balance
  if (
    data.type === 'OUTFLOW' ||
    data.type === 'INTERNAL_TRANSFER' ||
    data.type === 'TAX_SETTLEMENT' ||
    data.type === 'BANK_FEE'
  ) {
    const requiredTotal = amountCents + feeCents;
    if (sourceAccount.availableBalanceCents < requiredTotal) {
      res.status(400).json({
        success: false,
        message: `Insufficient funds in source account ${sourceAccount.name}. Available: ${sourceAccount.availableBalanceCents} cents, Required: ${requiredTotal} cents.`,
      });
      return;
    }
  }

  // Generate Reference Number: e.g. TX-2026-00123
  const count = await Transaction.countDocuments();
  const referenceNumber = `TX-2026-${String(count + 1).padStart(5, '0')}`;

  // If amount > $50,000 (5,000,000 cents) or explicit request, route to PENDING_APPROVAL
  const needsApproval = data.requiresApproval || amountCents >= 5000000;
  const initialStatus: TransactionStatus = needsApproval ? 'PENDING_APPROVAL' : 'COMPLETED';

  const transaction = new Transaction({
    referenceNumber,
    type: data.type,
    sourceAccountId: data.sourceAccountId,
    destinationAccountId: data.destinationAccountId,
    counterpartyName: data.counterpartyName,
    counterpartyAccount: data.counterpartyAccount,
    amountCents,
    feeCents,
    currency: data.currency.toUpperCase(),
    destinationAmountCents: destAmountCents,
    destinationCurrency: data.destinationCurrency?.toUpperCase(),
    exchangeRate: data.exchangeRate || 1.0,
    category: data.category,
    subcategory: data.subcategory,
    description: data.description,
    status: initialStatus,
    initiatedBy: req.user._id,
    valueDate: data.valueDate ? new Date(data.valueDate) : new Date(),
    postingDate: new Date(),
    tags: data.tags || [],
    notes: data.notes,
  });

  await transaction.save();

  // If immediately completed, post to Ledger atomically
  if (initialStatus === 'COMPLETED') {
    await LedgerService.recordTransactionPosting(transaction, req.user._id, req.user.name);
  }

  res.status(201).json({
    success: true,
    data: transaction,
    message: needsApproval
      ? 'Transaction created and submitted for Senior Treasury approval.'
      : 'Transaction created and posted to general ledger.',
  });
};

export const approveTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const transaction = await Transaction.findById(req.params.id);
  if (!transaction) {
    res.status(404).json({ success: false, message: 'Transaction not found.' });
    return;
  }

  if (transaction.status !== 'PENDING_APPROVAL') {
    res.status(400).json({
      success: false,
      message: `Transaction is already in status: ${transaction.status}`,
    });
    return;
  }

  // Dual-control verification: Initiator cannot approve their own high-value transaction
  if (transaction.initiatedBy.toString() === req.user._id.toString() && req.user.role !== 'TREASURER') {
    res.status(403).json({
      success: false,
      message: 'Dual-control violation: You cannot approve a transaction you initiated yourself.',
    });
    return;
  }

  transaction.status = 'COMPLETED';
  transaction.approvedBy = req.user._id;
  await transaction.save();

  // Post to General Ledger
  await LedgerService.recordTransactionPosting(transaction, req.user._id, req.user.name);

  res.json({
    success: true,
    message: `Transaction ${transaction.referenceNumber} approved and ledger posted.`,
    data: transaction,
  });
};

export const rejectTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const { reason } = req.body;
  const transaction = await Transaction.findById(req.params.id);
  if (!transaction) {
    res.status(404).json({ success: false, message: 'Transaction not found.' });
    return;
  }

  transaction.status = 'REJECTED';
  transaction.rejectionReason = reason || 'Rejected by treasury management';
  transaction.approvedBy = req.user._id;
  await transaction.save();

  await AuditLog.create({
    action: 'TRANSACTION_REJECTED',
    entityType: 'TRANSACTION',
    entityId: transaction._id.toString(),
    performedBy: req.user._id,
    userName: req.user.name,
    details: { reason: transaction.rejectionReason },
  });

  res.json({
    success: true,
    message: `Transaction ${transaction.referenceNumber} rejected.`,
    data: transaction,
  });
};

export const getTransactionStats = async (req: AuthRequest, res: Response): Promise<void> => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const transactions = await Transaction.find({
    status: 'COMPLETED',
    valueDate: { $gte: thirtyDaysAgo },
  }).sort({ valueDate: 1 });

  let totalInflowCents = 0;
  let totalOutflowCents = 0;
  const dailyFlow: Record<string, { date: string; inflow: number; outflow: number; net: number }> = {};

  for (const tx of transactions) {
    const day = tx.valueDate.toISOString().split('T')[0];
    if (!dailyFlow[day]) {
      dailyFlow[day] = { date: day, inflow: 0, outflow: 0, net: 0 };
    }

    if (tx.type === 'INFLOW' || tx.type === 'INTEREST_INCOME') {
      totalInflowCents += tx.amountCents;
      dailyFlow[day].inflow += tx.amountCents;
      dailyFlow[day].net += tx.amountCents;
    } else if (
      tx.type === 'OUTFLOW' ||
      tx.type === 'BANK_FEE' ||
      tx.type === 'TAX_SETTLEMENT'
    ) {
      totalOutflowCents += tx.amountCents + (tx.feeCents || 0);
      dailyFlow[day].outflow += tx.amountCents + (tx.feeCents || 0);
      dailyFlow[day].net -= tx.amountCents + (tx.feeCents || 0);
    }
  }

  res.json({
    success: true,
    data: {
      totalInflowCents,
      totalOutflowCents,
      netFlowCents: totalInflowCents - totalOutflowCents,
      dailyTrend: Object.values(dailyFlow),
    },
  });
};
