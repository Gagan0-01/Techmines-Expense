import { Router } from 'express';
import {
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  getTreasurySummary,
} from '../controllers/accountController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/summary', getTreasurySummary);
router.get('/', getAccounts);
router.get('/:id', getAccountById);
router.post('/', authorize('TREASURER', 'FINANCE_MANAGER'), createAccount);
router.put('/:id', authorize('TREASURER', 'FINANCE_MANAGER'), updateAccount);

export default router;
