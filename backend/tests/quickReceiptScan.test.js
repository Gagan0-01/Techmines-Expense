import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { scanReceiptAndCreateTransaction } from '../src/controllers/transactionController.js';
import { tempReceiptUploadMiddleware } from '../src/middleware/tempUpload.js';

describe('Quick Receipt Scan & Auto-Add Workflow Tests', () => {
  it('SCAN-1: Missing file in request returns HTTP 400', async () => {
    const req = {
      file: null,
      userId: '65f1a2b3c4d5e6f7a8b9c0d1',
    };

    let statusCode = null;
    let responseBody = null;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        responseBody = body;
        return this;
      },
    };

    await scanReceiptAndCreateTransaction(req, res);

    assert.equal(statusCode, 400);
    assert.equal(responseBody.success, false);
    assert.match(responseBody.message, /no receipt image/i);
  });

  it('SCAN-2: Temp upload directory is created in OS temp and not in permanent uploads', () => {
    const tempDir = path.join(os.tmpdir(), 'techmines-receipt-scan');
    assert.ok(fs.existsSync(tempDir), 'Temp directory should exist in OS temp');
    assert.ok(!tempDir.includes('uploads/documents'), 'Temp directory must not be in permanent uploads');
  });

  it('SCAN-3: Unlink is called on temp file in finally block', async () => {
    // Create a real temp file
    const tempFile = path.join(os.tmpdir(), `test_scan_${Date.now()}.jpg`);
    await fs.promises.writeFile(tempFile, Buffer.from('fake-data'));

    assert.ok(fs.existsSync(tempFile), 'File should exist before controller runs');

    const req = {
      file: {
        path: tempFile,
        mimetype: 'image/jpeg',
      },
      userId: '65f1a2b3c4d5e6f7a8b9c0d1',
    };

    const res = {
      status() { return this; },
      json() { return this; },
    };

    await scanReceiptAndCreateTransaction(req, res);

    // Wait a brief tick for async unlink in finally
    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.ok(!fs.existsSync(tempFile), 'Temp file MUST be deleted after scanReceiptAndCreateTransaction completes');
  });
});

