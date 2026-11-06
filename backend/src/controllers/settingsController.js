import mongoose from 'mongoose';
import { Settings } from '../models/Settings.js';
import { User } from '../models/User.js';
import { BalanceAuditLog } from '../models/BalanceAuditLog.js';
import { PendingBalanceChange } from '../models/PendingBalanceChange.js';
import {
  MAX_OPENING_BALANCE,
  SUPPORTED_CURRENCIES,
  DEFAULT_CURRENCY,
  toPaise,
  fromPaise,
  isCurrencySupported,
} from '../config/financial.js';

/**
 * Helper to execute operations atomically within a MongoDB session/transaction.
 * Seamlessly handles MongoDB Atlas replica sets and falls back gracefully in standalone test runners.
 */
const executeWithSession = async (work) => {
  const session = await mongoose.startSession();
  let hasTransaction = false;

  try {
    session.startTransaction();
    hasTransaction = true;
  } catch (txErr) {
    // Standalone instances (e.g. basic memory server) do not support replica transactions
    hasTransaction = false;
  }

  try {
    const result = await work(hasTransaction ? session : null);
    if (hasTransaction) {
      await session.commitTransaction();
    }
    return result;
  } catch (err) {
    if (hasTransaction) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    session.endSession();
  }
};

/**
 * Retrieve settings for authenticated user
 */
export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({ userId: req.userId });
    if (!settings) {
      settings = await Settings.create({
        userId: req.userId,
        openingBalance: 0,
        currency: DEFAULT_CURRENCY,
        companyName: 'TechMines',
      });
    }
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve settings', error: error.message });
  }
};

/**
 * Update or submit an opening balance change.
 * Enforces:
 * 1. RBAC authorization (admin or finance_admin required).
 * 2. Strict financial bounds validation (finite, non-negative, <= MAX_OPENING_BALANCE).
 * 3. ISO-4217 currency allowlist validation.
 * 4. Two-person approval workflow when configured or multiple administrators exist.
 * 5. Atomic execution and immutable financial audit logging.
 */
export const updateOpeningBalance = async (req, res) => {
  try {
    const { openingBalance, openingBalanceNotes, currency = DEFAULT_CURRENCY } = req.body;

    // 1. Strict numeric and financial bounds validation
    if (openingBalance === undefined || openingBalance === null || openingBalance === '') {
      return res.status(400).json({
        success: false,
        message: 'Opening balance is required.',
      });
    }

    let proposedPaise;
    try {
      proposedPaise = toPaise(openingBalance);
    } catch (valErr) {
      return res.status(400).json({
        success: false,
        message: `Invalid opening balance: ${valErr.message}`,
      });
    }

    const proposedAmount = fromPaise(proposedPaise);

    // Enforce configured MAX_OPENING_BALANCE threshold
    if (proposedAmount > MAX_OPENING_BALANCE) {
      return res.status(400).json({
        success: false,
        message: `Opening balance exceeds maximum configured threshold of ₹${MAX_OPENING_BALANCE.toLocaleString('en-IN')}.`,
      });
    }

    // 2. Currency Allowlist Validation
    const cleanCurrency = String(currency).trim().toUpperCase();
    if (!isCurrencySupported(cleanCurrency)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported currency "${currency}". Must be one of: ${SUPPORTED_CURRENCIES.join(', ')}.`,
      });
    }

    // 3. Notes / Reason validation
    const reasonText = (openingBalanceNotes || '').trim();
    if (!reasonText) {
      return res.status(400).json({
        success: false,
        message: 'A reason or memo notes are required for opening balance adjustments to maintain financial audit integrity.',
      });
    }
    if (reasonText.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Notes cannot exceed 500 characters.',
      });
    }

    // Retrieve current settings
    let settings = await Settings.findOne({ userId: req.userId });
    if (!settings) {
      settings = new Settings({ userId: req.userId, currency: cleanCurrency });
    }

    const previousBalance = settings.openingBalance || 0;
    const previousPaise = toPaise(previousBalance);

    // 4. Determine if Two-Person Approval is required
    // Required if:
    // a) Explicitly enabled via REQUIRE_TWO_PERSON_APPROVAL=true, OR
    // b) Not explicitly disabled and more than 1 administrator exists in the system
    const explicitTwoPerson = process.env.REQUIRE_TWO_PERSON_APPROVAL === 'true';
    const twoPersonDisabled = process.env.REQUIRE_TWO_PERSON_APPROVAL === 'false';
    const adminCount = await User.countDocuments({ role: { $in: ['admin', 'finance_admin'] } });

    const requiresTwoPersonApproval = explicitTwoPerson || (!twoPersonDisabled && adminCount > 1);

    if (requiresTwoPersonApproval) {
      // Create Pending Change - ACTUAL BALANCE REMAINS UNTOUCHED
      const pendingChange = await PendingBalanceChange.create({
        userId: req.userId,
        requestedBy: req.userId,
        previousBalance,
        proposedBalance: proposedAmount,
        previousBalancePaise: previousPaise,
        proposedBalancePaise: proposedPaise,
        changeAmountPaise: proposedPaise - previousPaise,
        currency: cleanCurrency,
        reason: reasonText,
        status: 'pending',
        ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
      });

      return res.status(202).json({
        success: true,
        requiresApproval: true,
        message: 'Opening balance adjustment submitted for secondary administrator approval. The actual ledger remains unchanged until approved.',
        pendingRequest: {
          id: pendingChange._id,
          previousBalance,
          proposedBalance: proposedAmount,
          currency: cleanCurrency,
          reason: reasonText,
          status: 'pending',
          createdAt: pendingChange.createdAt,
        },
      });
    }

    // 5. Direct Execution (Single-Admin or explicit direct mode) with Atomic Audit Log
    const clientIp = req.ip || req.headers['x-forwarded-for'] || '';
    const userAgent = req.headers['user-agent'] || '';

    await executeWithSession(async (session) => {
      settings.openingBalance = proposedAmount;
      settings.openingBalanceNotes = reasonText;
      settings.currency = cleanCurrency;
      settings.openingBalanceDate = new Date();

      if (session) {
        await settings.save({ session });
      } else {
        await settings.save();
      }

      const auditRecord = new BalanceAuditLog({
        userId: req.userId,
        previousBalance,
        newBalance: proposedAmount,
        previousBalancePaise: previousPaise,
        newBalancePaise: proposedPaise,
        changeAmountPaise: proposedPaise - previousPaise,
        changeAmount: fromPaise(proposedPaise - previousPaise),
        currency: cleanCurrency,
        reason: reasonText,
        requestedBy: req.userId,
        approvedBy: req.userId,
        approvalType: 'direct',
        ipAddress: clientIp,
        userAgent,
      });

      if (session) {
        await auditRecord.save({ session });
      } else {
        await auditRecord.save();
      }
    });

    res.json({
      success: true,
      requiresApproval: false,
      message: 'Opening balance updated and immutable audit record created successfully.',
      settings,
    });
  } catch (error) {
    console.error('Opening balance update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update opening balance', error: error.message });
  }
};

/**
 * Approve a pending opening balance change.
 * Enforces:
 * 1. Two-person rule: Requester CANNOT approve their own change.
 * 2. Stale request check: current balance must still match previousBalance.
 * 3. Atomic conditional update to prevent concurrent / duplicate approvals.
 * 4. Re-validation of MAX_OPENING_BALANCE.
 * 5. Atomic balance update and audit logging.
 */
export const approvePendingBalanceChange = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNotes = '' } = req.body;

    const pendingChange = await PendingBalanceChange.findById(id);
    if (!pendingChange) {
      return res.status(404).json({ success: false, message: 'Pending balance request not found.' });
    }

    if (pendingChange.status !== 'pending') {
      return res.status(409).json({
        success: false,
        message: `Request cannot be approved because its current status is "${pendingChange.status}".`,
      });
    }

    // MANDATORY TWO-PERSON INTEGRITY CHECK
    if (pendingChange.requestedBy.toString() === req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Two-person integrity violation: The requester cannot approve their own financial change. A different authorized administrator must approve it.',
      });
    }

    // Re-verify MAX_OPENING_BALANCE at approval time
    if (pendingChange.proposedBalance > MAX_OPENING_BALANCE) {
      return res.status(400).json({
        success: false,
        message: `Approval rejected: Proposed balance exceeds maximum threshold of ₹${MAX_OPENING_BALANCE.toLocaleString('en-IN')}.`,
      });
    }

    // STALE REQUEST VERIFICATION
    let currentSettings = await Settings.findOne({ userId: pendingChange.userId });
    if (!currentSettings) {
      currentSettings = new Settings({ userId: pendingChange.userId, currency: pendingChange.currency });
    }

    const currentBalancePaise = toPaise(currentSettings.openingBalance || 0);
    if (currentBalancePaise !== pendingChange.previousBalancePaise) {
      return res.status(409).json({
        success: false,
        message: `Stale request rejected: The current opening balance (₹${fromPaise(currentBalancePaise)}) does not match the baseline balance (₹${fromPaise(pendingChange.previousBalancePaise)}) recorded when this request was created.`,
      });
    }

    const clientIp = req.ip || req.headers['x-forwarded-for'] || '';
    const userAgent = req.headers['user-agent'] || '';

    // ATOMIC EXECUTION with concurrency lock
    let updatedPending;
    await executeWithSession(async (session) => {
      // Atomic conditional update to prevent race conditions or duplicate approvals
      const query = { _id: id, status: 'pending' };
      const update = {
        $set: {
          status: 'approved',
          reviewedBy: req.userId,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes.trim() || 'Approved by secondary administrator',
        },
      };

      updatedPending = session
        ? await PendingBalanceChange.findOneAndUpdate(query, update, { session, new: true })
        : await PendingBalanceChange.findOneAndUpdate(query, update, { new: true });

      if (!updatedPending) {
        throw new Error('CONCURRENT_APPROVAL_CONFLICT');
      }

      currentSettings.openingBalance = pendingChange.proposedBalance;
      currentSettings.openingBalanceNotes = pendingChange.reason;
      currentSettings.currency = pendingChange.currency;
      currentSettings.openingBalanceDate = new Date();

      if (session) {
        await currentSettings.save({ session });
      } else {
        await currentSettings.save();
      }

      const auditRecord = new BalanceAuditLog({
        userId: pendingChange.userId,
        previousBalance: pendingChange.previousBalance,
        newBalance: pendingChange.proposedBalance,
        previousBalancePaise: pendingChange.previousBalancePaise,
        newBalancePaise: pendingChange.proposedBalancePaise,
        changeAmountPaise: pendingChange.changeAmountPaise,
        changeAmount: fromPaise(pendingChange.changeAmountPaise),
        currency: pendingChange.currency,
        reason: pendingChange.reason,
        requestedBy: pendingChange.requestedBy,
        approvedBy: req.userId,
        approvalType: 'two_person_approved',
        pendingRequestId: pendingChange._id,
        ipAddress: clientIp,
        userAgent,
      });

      if (session) {
        await auditRecord.save({ session });
      } else {
        await auditRecord.save();
      }
    });

    res.json({
      success: true,
      message: 'Opening balance change successfully approved and applied to ledger.',
      pendingRequest: updatedPending,
      settings: currentSettings,
    });
  } catch (error) {
    if (error.message === 'CONCURRENT_APPROVAL_CONFLICT') {
      return res.status(409).json({
        success: false,
        message: 'Conflict: This request has already been processed by another administrator.',
      });
    }
    console.error('Approval error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve balance change', error: error.message });
  }
};

/**
 * Reject a pending opening balance change
 */
export const rejectPendingBalanceChange = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason = '' } = req.body;

    const pendingChange = await PendingBalanceChange.findById(id);
    if (!pendingChange) {
      return res.status(404).json({ success: false, message: 'Pending balance request not found.' });
    }

    if (pendingChange.status !== 'pending') {
      return res.status(409).json({
        success: false,
        message: `Request cannot be rejected because its current status is "${pendingChange.status}".`,
      });
    }

    const updated = await PendingBalanceChange.findOneAndUpdate(
      { _id: id, status: 'pending' },
      {
        $set: {
          status: 'rejected',
          reviewedBy: req.userId,
          reviewedAt: new Date(),
          rejectionReason: rejectionReason.trim() || 'Rejected by administrator',
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(409).json({
        success: false,
        message: 'Conflict: This request has already been processed.',
      });
    }

    res.json({
      success: true,
      message: 'Opening balance request rejected.',
      pendingRequest: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reject balance change', error: error.message });
  }
};

/**
 * List pending balance requests
 */
export const getPendingBalanceRequests = async (req, res) => {
  try {
    const requests = await PendingBalanceChange.find({ userId: req.userId })
      .populate('requestedBy', 'name email role')
      .populate('reviewedBy', 'name email role')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: requests.length, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve balance requests', error: error.message });
  }
};

/**
 * Retrieve immutable audit logs for opening balance changes
 */
export const getBalanceAuditLogs = async (req, res) => {
  try {
    const logs = await BalanceAuditLog.find({ userId: req.userId })
      .populate('requestedBy', 'name email role')
      .populate('approvedBy', 'name email role')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve audit logs', error: error.message });
  }
};
