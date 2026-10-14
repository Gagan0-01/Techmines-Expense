import { Response } from 'express';
import Papa from 'papaparse';
import { Transaction } from '../models/Transaction';
import { Account } from '../models/Account';
import { AuthRequest } from '../middleware/auth';
import { centsToDecimalString, toCents } from '../utils/currency';
import { LedgerService } from '../services/ledgerService';

export const exportTransactionsCsv = async (req: AuthRequest, res: Response): Promise<void> => {
  const transactions = await Transaction.find()
    .populate('sourceAccountId', 'name accountNumber')
    .populate('destinationAccountId', 'name accountNumber')
    .sort({ valueDate: -1 });

  const rows = transactions.map((t: any) => ({
    'Reference Number': t.referenceNumber,
    'Posting Date': t.postingDate ? t.postingDate.toISOString().split('T')[0] : '',
    'Value Date': t.valueDate ? t.valueDate.toISOString().split('T')[0] : '',
    Type: t.type,
    'Source Account': t.sourceAccountId?.name || '',
    'Source Account Number': t.sourceAccountId?.accountNumber || '',
    'Destination Account': t.destinationAccountId?.name || '',
    Counterparty: t.counterpartyName,
    Amount: centsToDecimalString(t.amountCents, t.currency),
    Currency: t.currency,
    'Fee': centsToDecimalString(t.feeCents, t.currency),
    Category: t.category,
    Status: t.status,
    Description: t.description,
  }));

  const csv = Papa.unparse(rows);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="treasury_transactions_export.csv"');
  res.status(200).send(csv);
};

export const exportTransactionsJson = async (req: AuthRequest, res: Response): Promise<void> => {
  const transactions = await Transaction.find()
    .populate('sourceAccountId', 'name accountNumber currency institution')
    .populate('destinationAccountId', 'name accountNumber currency institution')
    .sort({ valueDate: -1 });

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="treasury_transactions_export.json"');
  res.status(200).json({
    exportedAt: new Date().toISOString(),
    count: transactions.length,
    data: transactions,
  });
};

export const importTransactionsCsv = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const { csvData } = req.body;
  if (!csvData) {
    res.status(400).json({ success: false, message: 'csvData string is required.' });
    return;
  }

  const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    res.status(400).json({ success: false, message: 'CSV parse error', errors: parsed.errors });
    return;
  }

  const accounts = await Account.find();
  const accountMapByName = new Map(accounts.map((a) => [a.name.toLowerCase(), a]));
  const defaultAccount = accounts[0];

  if (!defaultAccount) {
    res.status(400).json({ success: false, message: 'No treasury accounts exist to import transactions into.' });
    return;
  }

  let importedCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const row: any = parsed.data[i];
    try {
      const type = (row['Type'] || row['type'] || 'INFLOW').toUpperCase();
      const counterparty = row['Counterparty'] || row['counterparty'] || 'Bulk Import';
      const category = row['Category'] || row['category'] || 'General';
      const description = row['Description'] || row['description'] || `Imported transaction #${i + 1}`;
      const currency = (row['Currency'] || row['currency'] || 'USD').toUpperCase();
      const amountStr = row['Amount'] || row['amount'] || '0';
      const amountCents = toCents(amountStr, currency);

      if (amountCents <= 0) {
        continue;
      }

      const sourceAccountName = (row['Source Account'] || row['source_account'] || '').toLowerCase();
      const sourceAccount = accountMapByName.get(sourceAccountName) || defaultAccount;

      const count = await Transaction.countDocuments();
      const refNum = `TX-IMP-${String(count + 1).padStart(5, '0')}`;

      const tx = new Transaction({
        referenceNumber: refNum,
        type,
        sourceAccountId: sourceAccount._id,
        counterpartyName: counterparty,
        amountCents,
        feeCents: 0,
        currency,
        category,
        description,
        status: 'COMPLETED',
        initiatedBy: req.user._id,
        valueDate: new Date(),
        postingDate: new Date(),
        tags: ['CSV_IMPORT'],
      });

      await tx.save();
      await LedgerService.recordTransactionPosting(tx, req.user._id, req.user.name);
      importedCount++;
    } catch (err: any) {
      errors.push(`Row ${i + 1}: ${err.message}`);
    }
  }

  res.json({
    success: true,
    importedCount,
    failedCount: errors.length,
    errors: errors.slice(0, 10),
  });
};
