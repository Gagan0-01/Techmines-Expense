import express from 'express';
import {
  getSettings,
  updateOpeningBalance,
  approvePendingBalanceChange,
  rejectPendingBalanceChange,
  getPendingBalanceRequests,
  getBalanceAuditLogs,
} from '../controllers/settingsController.js';
import { requireRole } from '../middleware/auth.js';
import { financialOpsRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// General user settings
router.get('/', getSettings);

// Opening Balance Management (Restricted to Finance Administrators & System Administrators)
router.put(
  '/opening-balance',
  requireRole('admin', 'finance_admin'),
  financialOpsRateLimiter,
  updateOpeningBalance
);

// Two-Person Approval Workflow Endpoints
router.get(
  '/opening-balance/requests',
  requireRole('admin', 'finance_admin'),
  getPendingBalanceRequests
);
router.post(
  '/opening-balance/requests/:id/approve',
  requireRole('admin', 'finance_admin'),
  financialOpsRateLimiter,
  approvePendingBalanceChange
);
router.post(
  '/opening-balance/requests/:id/reject',
  requireRole('admin', 'finance_admin'),
  financialOpsRateLimiter,
  rejectPendingBalanceChange
);

// Immutable Financial Audit Logs
router.get(
  '/opening-balance/audit-logs',
  requireRole('admin', 'finance_admin'),
  getBalanceAuditLogs
);

export default router;
