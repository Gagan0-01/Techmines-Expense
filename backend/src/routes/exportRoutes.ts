import { Router } from 'express';
import {
  exportTransactionsCsv,
  exportTransactionsJson,
  importTransactionsCsv,
} from '../controllers/exportController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/transactions/csv', exportTransactionsCsv);
router.get('/transactions/json', exportTransactionsJson);
router.post('/transactions/csv', importTransactionsCsv);

export default router;
