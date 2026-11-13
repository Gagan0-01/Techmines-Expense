import multer from 'multer';
import path from 'path';
import { getStorageDirectory, generateSafeFileName } from '../services/storageService.js';

const ALLOWED_MIME_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const ALLOWED_EXTENSIONS = Object.freeze(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

// Configure disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, getStorageDirectory());
  },
  filename: (req, file, cb) => {
    cb(null, generateSafeFileName(file.originalname));
  },
});

// File filter enforcing both MIME type and extension
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype) || !ALLOWED_EXTENSIONS.includes(ext)) {
    const error = new Error(
      'Invalid file type. Only JPG, PNG, WebP, and PDF documents are supported.'
    );
    error.code = 'INVALID_FILE_TYPE';
    return cb(error, false);
  }

  cb(null, true);
};

// 15MB file size limit
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
    files: 1,
  },
});

/**
 * Express middleware wrapper for single document upload.
 * Catches Multer errors cleanly and responds with standard JSON format.
 */
export const documentUploadMiddleware = (req, res, next) => {
  const singleUpload = upload.single('file');

  singleUpload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size exceeds permitted limit of 15MB.',
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`,
        });
      }

      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }

      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to upload document.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file was provided. Please attach a document to upload.',
      });
    }

    next();
  });
};

