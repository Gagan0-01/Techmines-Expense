import express from 'express';
import {
  uploadDocument,
  getDocuments,
  getDocumentById,
  processDocument,
  updateDocument,
  deleteDocument,
  downloadOriginalDocument,
  exportDocumentTxt,
} from '../controllers/documentController.js';
import { documentUploadMiddleware } from '../middleware/upload.js';
import { documentOcrRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Upload document (multipart/form-data with rate limiting)
router.post('/upload', documentOcrRateLimiter, documentUploadMiddleware, uploadDocument);

// Document listings & detail
router.get('/', getDocuments);
router.get('/:id', getDocumentById);

// Document OCR re-processing & metadata updates
router.post('/:id/process', documentOcrRateLimiter, processDocument);
router.patch('/:id', updateDocument);

// Document deletion (cleans DB record & private disk file)
router.delete('/:id', deleteDocument);

// File downloads & text exports
router.get('/:id/download', downloadOriginalDocument);
router.get('/:id/export/txt', exportDocumentTxt);

export default router;

