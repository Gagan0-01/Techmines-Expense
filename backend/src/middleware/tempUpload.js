import multer from 'multer';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { verifyFileMagicBytes } from './upload.js';
import fs from 'fs';

/**
 * Temporary Upload Middleware for Quick Receipt Scan
 * 
 * Stores files in the OS temp directory instead of permanent storage.
 * Files are meant to be deleted immediately after Gemini processing.
 * Enforces the same MIME type, extension, magic byte, and size limits
 * as the permanent document upload middleware.
 */

const ALLOWED_MIME_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const ALLOWED_EXTENSIONS = Object.freeze(['.jpg', '.jpeg', '.png', '.webp']);

// Temp directory for receipt scan uploads
const tempDir = path.join(os.tmpdir(), 'techmines-receipt-scan');

// Ensure temp directory exists
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure dir still exists at upload time
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(12).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `scan_${Date.now()}_${uniqueSuffix}${ext}`);
  },
});

const tempFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype) || !ALLOWED_EXTENSIONS.includes(ext)) {
    const error = new Error(
      'Invalid file type. Quick Scan only accepts JPG, PNG, and WebP images.'
    );
    error.code = 'INVALID_FILE_TYPE';
    return cb(error, false);
  }

  cb(null, true);
};

const tempUpload = multer({
  storage: tempStorage,
  fileFilter: tempFileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
    files: 1,
  },
});

/**
 * Express middleware for temporary single receipt image upload.
 * Validates MIME type, extension, file size, and binary magic bytes.
 * Stores file in OS temp directory for immediate processing and deletion.
 */
export const tempReceiptUploadMiddleware = (req, res, next) => {
  const singleUpload = tempUpload.single('file');

  singleUpload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size exceeds maximum limit of 15MB.',
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
        message: err.message || 'Failed to upload receipt image.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file was provided. Please attach a receipt image.',
      });
    }

    // Verify binary magic bytes match claimed MIME type
    verifyFileMagicBytes(req.file.path, req.file.mimetype)
      .then((isValid) => {
        if (!isValid) {
          fs.promises.unlink(req.file.path).catch(() => {});
          return res.status(400).json({
            success: false,
            message: 'Invalid file signature. File content does not match a genuine JPG, PNG, or WebP image.',
          });
        }
        next();
      })
      .catch(() => {
        fs.promises.unlink(req.file.path).catch(() => {});
        return res.status(400).json({
          success: false,
          message: 'Failed to verify file integrity.',
        });
      });
  });
};

