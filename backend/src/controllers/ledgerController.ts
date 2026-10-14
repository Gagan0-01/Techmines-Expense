import { Response } from 'express';
import { LedgerEntry } from '../models/LedgerEntry';
import { AuditLog } from '../models/AuditLog';
import { AuthRequest } from '../middleware/auth';

export const getLedgerEntries = async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '20', fiscalPeriod, search } = req.query;

  const query: any = {};
  if (fiscalPeriod) query.fiscalPeriod = fiscalPeriod;
  if (search) {
    query.$or = [
      { entryNumber: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = parseInt(limit as string, 10) || 20;
  const skip = (pageNum - 1) * limitNum;

  const [total, entries] = await Promise.all([
    LedgerEntry.countDocuments(query),
    LedgerEntry.find(query)
      .populate('transactionId', 'referenceNumber type amountCents currency')
      .populate('postedBy', 'name email role')
      .sort({ postingDate: -1 })
      .skip(skip)
      .limit(limitNum),
  ]);

  res.json({
    success: true,
    data: entries,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    },
  });
};

export const getTrialBalance = async (req: AuthRequest, res: Response): Promise<void> => {
  const entries = await LedgerEntry.find({ status: 'POSTED' });

  const accountMap: Record<
    string,
    {
      accountCode: string;
      accountName: string;
      currency: string;
      totalDebitCents: number;
      totalCreditCents: number;
      netBalanceCents: number;
    }
  > = {};

  let grandDebitCents = 0;
  let grandCreditCents = 0;

  for (const entry of entries) {
    for (const line of entry.lines) {
      const key = `${line.accountCode}-${line.currency}`;
      if (!accountMap[key]) {
        accountMap[key] = {
          accountCode: line.accountCode,
          accountName: line.accountName,
          currency: line.currency,
          totalDebitCents: 0,
          totalCreditCents: 0,
          netBalanceCents: 0,
        };
      }
      accountMap[key].totalDebitCents += line.debitCents;
      accountMap[key].totalCreditCents += line.creditCents;
      accountMap[key].netBalanceCents += line.debitCents - line.creditCents;

      grandDebitCents += line.debitCents;
      grandCreditCents += line.creditCents;
    }
  }

  res.json({
    success: true,
    data: {
      isBalanced: grandDebitCents === grandCreditCents,
      grandDebitCents,
      grandCreditCents,
      accounts: Object.values(accountMap),
    },
  });
};

export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '30', action, entityType } = req.query;

  const query: any = {};
  if (action) query.action = action;
  if (entityType) query.entityType = entityType;

  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = parseInt(limit as string, 10) || 30;
  const skip = (pageNum - 1) * limitNum;

  const [total, logs] = await Promise.all([
    AuditLog.countDocuments(query),
    AuditLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limitNum),
  ]);

  res.json({
    success: true,
    data: logs,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    },
  });
};
