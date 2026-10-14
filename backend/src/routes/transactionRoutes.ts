import { Router } from 'express';
import {
  getTransactions,
  createTransaction,
  approveTransaction,
  rejectTransaction,
  getTransactionStats,
} from '../controllers/transactionController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/stats', getTransactionStats);
router.get('/', getTransactions);
router.post('/', authorize('TREASURER', 'FINANCE_MANAGER', 'OPERATOR'), createTransaction);
router.post('/:id/approve', authorize('TREASURER', 'FINANCE_MANAGER'), approveTransaction);
router.post('/:id/reject', authorize('TREASURER', 'FINANCE_MANAGER'), rejectTransaction);

export default router;
