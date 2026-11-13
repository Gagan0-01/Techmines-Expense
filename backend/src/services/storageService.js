import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Resolve private uploads directory (isolated from public web server assets)
const DEFAULT_UPLOADS_DIR = path.resolve(process.cwd(), 'uploads', 'documents');
const UPLOADS_DIR = process.env.DOCUMENTS_STORAGE_PATH
  ? path.resolve(process.env.DOCUMENTS_STORAGE_PATH)
  : DEFAULT_UPLOADS_DIR;

// Ensure upload directory exists safely
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Returns the absolute path of the private storage directory
 */
export const getStorageDirectory = () => UPLOADS_DIR;

/**
 * Generates a cryptographically random, collision-resistant server filename
 */
export const generateSafeFileName = (originalName = '') => {
  const randomHex = crypto.randomBytes(16).toString('hex');
  const ext = path.extname(originalName).toLowerCase();
  const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'].includes(ext) ? ext : '.bin';
  return `${Date.now()}-${randomHex}${safeExt}`;
};

/**
 * Resolves the full path of a stored file, preventing path traversal
 */
export const getSafeFilePath = (storedFileName) => {
  const sanitized = path.basename(storedFileName);
  const fullPath = path.join(UPLOADS_DIR, sanitized);

  // Path traversal guard
  if (!fullPath.startsWith(UPLOADS_DIR)) {
    throw new Error('Access denied: Illegal file path traversal detected.');
  }

  return fullPath;
};

/**
 * Permanently deletes a stored file from disk
 */
export const deleteStoredFile = async (storedFileName) => {
  try {
    if (!storedFileName) return false;
    const filePath = getSafeFilePath(storedFileName);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return false;
  } catch (err) {
    console.error(`[StorageService] Failed to delete file ${storedFileName}:`, err.message);
    return false;
  }
};

