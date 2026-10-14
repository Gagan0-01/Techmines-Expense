import mongoose from 'mongoose';
import { Account } from '../models/Account';
import { ITransaction } from '../models/Transaction';
import { LedgerEntry, ILedgerLine } from '../models/LedgerEntry';
import { AuditLog } from '../models/AuditLog';

export class LedgerService {
  /**
   * Generates balanced double-entry journal lines for a completed transaction and updates accounts.
   */
  static async recordTransactionPosting(
    transaction: ITransaction,
    postedById: mongoose.Types.ObjectId,
    userName: string
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const sourceAccount = await Account.findById(transaction.sourceAccountId).session(session);
      if (!sourceAccount) {
        throw new Error('Source account not found.');
      }

      const lines: ILedgerLine[] = [];
      const now = new Date();
      const fiscalPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      if (transaction.type === 'INFLOW' || transaction.type === 'INTEREST_INCOME') {
        // Debit: Cash/Bank Account (Asset increases)
        // Credit: Revenue / Inflow Category (Equity/Revenue increases)
        lines.push({
          accountId: sourceAccount._id as mongoose.Types.ObjectId,
          accountName: sourceAccount.name,
          accountCode: `1000-${sourceAccount.currency}`,
          debitCents: transaction.amountCents,
          creditCents: 0,
          currency: sourceAccount.currency,
          memo: `${transaction.type}: ${transaction.description}`,
        });

        lines.push({
          accountId: sourceAccount._id as mongoose.Types.ObjectId,
          accountName: `Revenue - ${transaction.category}`,
          accountCode: `4000-${transaction.category.toUpperCase().replace(/\s+/g, '_')}`,
          debitCents: 0,
          creditCents: transaction.amountCents,
          currency: sourceAccount.currency,
          memo: `Counterparty: ${transaction.counterpartyName}`,
        });

        // Update Account Balance
        sourceAccount.balanceCents += transaction.amountCents;
        sourceAccount.availableBalanceCents += transaction.amountCents;
        await sourceAccount.save({ session });
      } else if (
        transaction.type === 'OUTFLOW' ||
        transaction.type === 'BANK_FEE' ||
        transaction.type === 'TAX_SETTLEMENT'
      ) {
        const totalOutflow = transaction.amountCents + (transaction.feeCents || 0);

        // Debit: Expense / Payable (Expense increases)
        lines.push({
          accountId: sourceAccount._id as mongoose.Types.ObjectId,
          accountName: `Expense - ${transaction.category}`,
          accountCode: `5000-${transaction.category.toUpperCase().replace(/\s+/g, '_')}`,
          debitCents: transaction.amountCents,
          creditCents: 0,
          currency: sourceAccount.currency,
          memo: `${transaction.type}: ${transaction.description}`,
        });

        if (transaction.feeCents > 0) {
          lines.push({
            accountId: sourceAccount._id as mongoose.Types.ObjectId,
            accountName: 'Bank Processing Fees',
            accountCode: '5900-BANK_FEES',
            debitCents: transaction.feeCents,
            creditCents: 0,
            currency: sourceAccount.currency,
            memo: `Transaction processing fee for ${transaction.referenceNumber}`,
          });
        }

        // Credit: Cash/Bank Account (Asset decreases)
        lines.push({
          accountId: sourceAccount._id as mongoose.Types.ObjectId,
          accountName: sourceAccount.name,
          accountCode: `1000-${sourceAccount.currency}`,
          debitCents: 0,
          creditCents: totalOutflow,
          currency: sourceAccount.currency,
          memo: `Payment to ${transaction.counterpartyName}`,
        });

        sourceAccount.balanceCents -= totalOutflow;
        sourceAccount.availableBalanceCents -= totalOutflow;
        await sourceAccount.save({ session });
      } else if (transaction.type === 'INTERNAL_TRANSFER' || transaction.type === 'FX_SWAP') {
        if (!transaction.destinationAccountId) {
          throw new Error('Destination account required for internal transfer.');
        }

        const destAccount = await Account.findById(transaction.destinationAccountId).session(session);
        if (!destAccount) {
          throw new Error('Destination account not found.');
        }

        const isCrossCurrency = sourceAccount.currency !== destAccount.currency;
        const totalOutflow = transaction.amountCents + (transaction.feeCents || 0);
        const destAmountCents = transaction.destinationAmountCents || transaction.amountCents;


        if (isCrossCurrency) {
          // Source Currency Leg: Credit Cash, Debit FX Clearing
          lines.push({
            accountId: sourceAccount._id as mongoose.Types.ObjectId,
            accountName: sourceAccount.name,
            accountCode: `1000-${sourceAccount.currency}`,
            debitCents: 0,
            creditCents: transaction.amountCents,
            currency: sourceAccount.currency,
            memo: `Cross-border transfer to ${destAccount.name}`,
          });

          lines.push({
            accountId: sourceAccount._id as mongoose.Types.ObjectId,
            accountName: `FX Clearing (${sourceAccount.currency})`,
            accountCode: `1999-FX_CLEARING_${sourceAccount.currency}`,
            debitCents: transaction.amountCents,
            creditCents: 0,
            currency: sourceAccount.currency,
            memo: `FX Clearing for ${transaction.referenceNumber}`,
          });

          // Destination Currency Leg: Debit Cash, Credit FX Clearing
          lines.push({
            accountId: destAccount._id as mongoose.Types.ObjectId,
            accountName: destAccount.name,
            accountCode: `1000-${destAccount.currency}`,
            debitCents: destAmountCents,
            creditCents: 0,
            currency: destAccount.currency,
            memo: `Cross-border funding from ${sourceAccount.name}`,
          });

          lines.push({
            accountId: destAccount._id as mongoose.Types.ObjectId,
            accountName: `FX Clearing (${destAccount.currency})`,
            accountCode: `1999-FX_CLEARING_${destAccount.currency}`,
            debitCents: 0,
            creditCents: destAmountCents,
            currency: destAccount.currency,
            memo: `FX Clearing for ${transaction.referenceNumber}`,
          });
        } else {
          // Single-Currency Domestic Transfer
          lines.push({
            accountId: sourceAccount._id as mongoose.Types.ObjectId,
            accountName: sourceAccount.name,
            accountCode: `1000-${sourceAccount.currency}`,
            debitCents: 0,
            creditCents: transaction.amountCents,
            currency: sourceAccount.currency,
            memo: `Transfer to ${destAccount.name}`,
          });

          lines.push({
            accountId: destAccount._id as mongoose.Types.ObjectId,
            accountName: destAccount.name,
            accountCode: `1000-${destAccount.currency}`,
            debitCents: destAmountCents,
            creditCents: 0,
            currency: destAccount.currency,
            memo: `Transfer from ${sourceAccount.name}`,
          });
        }

        if (transaction.feeCents > 0) {
          lines.push({
            accountId: sourceAccount._id as mongoose.Types.ObjectId,
            accountName: 'Wire Transfer Fees',
            accountCode: '5900-BANK_FEES',
            debitCents: transaction.feeCents,
            creditCents: 0,
            currency: sourceAccount.currency,
            memo: 'Transfer Wire Fee',
          });
          lines.push({
            accountId: sourceAccount._id as mongoose.Types.ObjectId,
            accountName: sourceAccount.name,
            accountCode: `1000-${sourceAccount.currency}`,
            debitCents: 0,
            creditCents: transaction.feeCents,
            currency: sourceAccount.currency,
            memo: 'Wire Fee deduction',
          });
        }

        // Update Balances
        sourceAccount.balanceCents -= totalOutflow;
        sourceAccount.availableBalanceCents -= totalOutflow;
        await sourceAccount.save({ session });

        destAccount.balanceCents += destAmountCents;
        destAccount.availableBalanceCents += destAmountCents;
        await destAccount.save({ session });
      }

      // Compute total debits and credits
      const totalDebitCents = lines.reduce((acc, curr) => acc + curr.debitCents, 0);
      const totalCreditCents = lines.reduce((acc, curr) => acc + curr.creditCents, 0);
      const isBalanced = totalDebitCents === totalCreditCents;

      const count = await LedgerEntry.countDocuments().session(session);
      const entryNumber = `JE-2026-${String(count + 1).padStart(5, '0')}`;

      const ledgerEntry = new LedgerEntry({
        entryNumber,
        transactionId: transaction._id,
        description: `Posting for ${transaction.referenceNumber}: ${transaction.description}`,
        postingDate: transaction.postingDate || now,
        lines,
        totalDebitCents,
        totalCreditCents,
        isBalanced,
        status: 'POSTED',
        fiscalPeriod,
        postedBy: postedById,
      });

      await ledgerEntry.save({ session });

      // Audit Log
      await AuditLog.create(
        [
          {
            action: 'TRANSACTION_POSTED',
            entityType: 'TRANSACTION',
            entityId: transaction._id?.toString(),
            performedBy: postedById,
            userName,
            details: {
              referenceNumber: transaction.referenceNumber,
              type: transaction.type,
              amountCents: transaction.amountCents,
              sourceAccount: sourceAccount.name,
              ledgerEntryNumber: entryNumber,
            },
          },
        ],
        { session }
      );

      await session.commitTransaction();
      return ledgerEntry;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
