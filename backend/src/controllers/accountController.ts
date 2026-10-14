import { Response } from 'express';
import { z } from 'zod';
import { Account } from '../models/Account';
import { AuthRequest } from '../middleware/auth';
import { AuditLog } from '../models/AuditLog';
import { toCents } from '../utils/currency';

// Approximate FX conversion rates to USD for multi-currency treasury consolidation
const FX_TO_USD: Record<string, number> = {
  USD: 1.0,
  EUR: 1.085,
  GBP: 1.295,
  JPY: 0.0065,
  CHF: 1.13,
  CAD: 0.73,
  AUD: 0.66,
  INR: 0.0119,
  SGD: 0.76,
};

const accountSchema = z.object({
  name: z.string().min(2),
  accountNumber: z.string().min(3),
  accountType: z.enum([
    'OPERATING',
    'PAYROLL',
    'SAVINGS',
    'TAX_RESERVE',
    'ESCROW',
    'INVESTMENT',
    'CLEARING',
  ]),
  currency: z.string().length(3),
  initialBalance: z.union([z.number(), z.string()]).optional(),
  institution: z.string().min(2),
  routingNumber: z.string().optional(),
  swiftBic: z.string().optional(),
  iban: z.string().optional(),
  entityName: z.string().optional(),
  country: z.string().optional(),
  isMainTreasury: z.boolean().optional(),
  creditLimit: z.union([z.number(), z.string()]).optional(),
  notes: z.string().optional(),
});

export const getAccounts = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, currency, entityName, type, search } = req.query;

  const query: any = {};
  if (status) query.status = status;
  if (currency) query.currency = (currency as string).toUpperCase();
  if (entityName) query.entityName = entityName;
  if (type) query.accountType = type;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { accountNumber: { $regex: search, $options: 'i' } },
      { institution: { $regex: search, $options: 'i' } },
    ];
  }

  const accounts = await Account.find(query).sort({ isMainTreasury: -1, balanceCents: -1 });

  res.json({
    success: true,
    count: accounts.length,
    data: accounts,
  });
};

export const getAccountById = async (req: AuthRequest, res: Response): Promise<void> => {
  const account = await Account.findById(req.params.id);
  if (!account) {
    res.status(404).json({ success: false, message: 'Account not found.' });
    return;
  }

  res.json({
    success: true,
    data: account,
  });
};

export const createAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = accountSchema.parse(req.body);

  const cents = data.initialBalance ? toCents(data.initialBalance, data.currency) : 0;
  const creditLimitCents = data.creditLimit ? toCents(data.creditLimit, data.currency) : 0;

  const account = await Account.create({
    name: data.name,
    accountNumber: data.accountNumber,
    accountType: data.accountType,
    currency: data.currency.toUpperCase(),
    balanceCents: cents,
    availableBalanceCents: cents,
    institution: data.institution,
    routingNumber: data.routingNumber,
    swiftBic: data.swiftBic,
    iban: data.iban,
    entityName: data.entityName || 'Acme Global Treasury LLC',
    country: data.country || 'USA',
    isMainTreasury: data.isMainTreasury || false,
    creditLimitCents,
    notes: data.notes,
  });

  if (req.user) {
    await AuditLog.create({
      action: 'ACCOUNT_CREATED',
      entityType: 'ACCOUNT',
      entityId: account._id.toString(),
      performedBy: req.user._id,
      userName: req.user.name,
      details: {
        accountName: account.name,
        accountNumber: account.accountNumber,
        currency: account.currency,
        initialBalanceCents: cents,
      },
    });
  }

  res.status(201).json({
    success: true,
    data: account,
  });
};

export const updateAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  const account = await Account.findById(req.params.id);
  if (!account) {
    res.status(404).json({ success: false, message: 'Account not found.' });
    return;
  }

  const allowedUpdates = [
    'name',
    'institution',
    'status',
    'notes',
    'isMainTreasury',
    'entityName',
    'country',
    'swiftBic',
    'iban',
    'routingNumber',
  ];

  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) {
      (account as any)[key] = req.body[key];
    }
  }

  await account.save();

  if (req.user) {
    await AuditLog.create({
      action: 'ACCOUNT_UPDATED',
      entityType: 'ACCOUNT',
      entityId: account._id.toString(),
      performedBy: req.user._id,
      userName: req.user.name,
      details: req.body,
    });
  }

  res.json({
    success: true,
    data: account,
  });
};

export const getTreasurySummary = async (req: AuthRequest, res: Response): Promise<void> => {
  const accounts = await Account.find({ status: { $ne: 'CLOSED' } });

  let totalConsolidatedUsdCents = 0;
  const currencyBreakdown: Record<string, { totalCents: number; usdEquivalentCents: number; count: number }> = {};
  const typeBreakdown: Record<string, number> = {};
  const entityBreakdown: Record<string, number> = {};

  for (const acc of accounts) {
    const rate = FX_TO_USD[acc.currency] || 1.0;
    const usdEquiv = Math.round(acc.balanceCents * rate);
    totalConsolidatedUsdCents += usdEquiv;

    if (!currencyBreakdown[acc.currency]) {
      currencyBreakdown[acc.currency] = { totalCents: 0, usdEquivalentCents: 0, count: 0 };
    }
    currencyBreakdown[acc.currency].totalCents += acc.balanceCents;
    currencyBreakdown[acc.currency].usdEquivalentCents += usdEquiv;
    currencyBreakdown[acc.currency].count += 1;

    typeBreakdown[acc.accountType] = (typeBreakdown[acc.accountType] || 0) + usdEquiv;
    entityBreakdown[acc.entityName] = (entityBreakdown[acc.entityName] || 0) + usdEquiv;
  }

  res.json({
    success: true,
    data: {
      totalConsolidatedUsdCents,
      activeAccountsCount: accounts.length,
      currencyBreakdown,
      typeBreakdown,
      entityBreakdown,
    },
  });
};
