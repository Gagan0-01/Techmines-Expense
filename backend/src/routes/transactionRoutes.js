import express from 'express';
import {
  getTransactions,
  getLedgerSummary,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  scanReceiptAndCreateTransaction,
} from '../controllers/transactionController.js';
import { tempReceiptUploadMiddleware } from '../middleware/tempUpload.js';
import { documentOcrRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.get('/summary', getLedgerSummary);
router.get('/', getTransactions);
router.get('/:id', getTransactionById);
router.post('/', createTransaction);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

// Quick Receipt Scan & Auto-Add (rate-limited, temp upload, no permanent image storage)
router.post(
  '/scan-receipt',
  documentOcrRateLimiter,
  tempReceiptUploadMiddleware,
  scanReceiptAndCreateTransaction
);

export default router;
