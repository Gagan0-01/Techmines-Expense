import { Router } from 'express';
import {
  getLedgerEntries,
  getTrialBalance,
  getAuditLogs,
} from '../controllers/ledgerController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/entries', getLedgerEntries);
router.get('/trial-balance', getTrialBalance);
router.get('/audit-logs', getAuditLogs);

export default router;
