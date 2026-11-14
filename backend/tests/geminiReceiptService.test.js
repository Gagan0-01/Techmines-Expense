import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import {
  normalizeField,
  validateAndPostProcessReceipt,
  validateImageInput,
  isGeminiConfigured,
  getGeminiModelName,
} from '../src/services/geminiReceiptService.js';
import { Transaction } from '../src/models/Transaction.js';

describe('Gemini Receipt OCR Service - Step 3 Unit & Validation Tests', () => {
  test('STEP3-NORM-1: normalizeField converts various inputs into consistent { value, confidence, needsReview }', () => {
    // 1. Full object input
    const full = normalizeField({ value: 'Apollo Pharmacy', confidence: 95, needsReview: false });
    assert.deepEqual(full, { value: 'Apollo Pharmacy', confidence: 95, needsReview: false });

    // 2. Raw primitive string
    const rawStr = normalizeField('TechMines Solutions');
    assert.equal(rawStr.value, 'TechMines Solutions');
    assert.equal(rawStr.confidence, 80);
    assert.equal(rawStr.needsReview, false);

    // 3. Null / unreadable value
    const nullField = normalizeField(null);
    assert.equal(nullField.value, null);
    assert.equal(nullField.confidence, 0);
    assert.equal(nullField.needsReview, true);

    // 4. Low confidence auto-flagging
    const lowConf = normalizeField({ value: 'Faint Text', confidence: 65, needsReview: false });
    assert.equal(lowConf.needsReview, true, 'Confidence < 80 must require review');
  });

  test('STEP3-MATH-1: Post-processing verifies exact mathematical calculation', () => {
    const rawReceiptJson = {
      documentType: 'receipt',
      isHandwritten: false,
      merchantName: { value: 'Metro Cash & Carry', confidence: 95, needsReview: false },
      receiptNumber: { value: 'REC-2026-99', confidence: 90, needsReview: false },
      date: { value: '2026-11-12', confidence: 90, needsReview: false },
      items: [
        {
          description: { value: 'Printer Paper A4', confidence: 95, needsReview: false },
          quantity: { value: 2, confidence: 95, needsReview: false },
          unitPrice: { value: 250.0, confidence: 95, needsReview: false },
          amount: { value: 500.0, confidence: 95, needsReview: false },
        },
        {
          description: { value: 'Ball Pens Box', confidence: 95, needsReview: false },
          quantity: { value: 1, confidence: 95, needsReview: false },
          unitPrice: { value: 150.0, confidence: 95, needsReview: false },
          amount: { value: 150.0, confidence: 95, needsReview: false },
        },
      ],
      subtotal: { value: 650.0, confidence: 95, needsReview: false },
      tax: { value: 58.5, confidence: 90, needsReview: false },
      discount: { value: 50.0, confidence: 90, needsReview: false },
      additionalCharges: { value: 0, confidence: 90, needsReview: false },
      total: { value: 658.5, confidence: 95, needsReview: false }, // 650 + 58.5 + 0 - 50 = 658.5
      currency: { value: 'INR', confidence: 95, needsReview: false },
      paymentMethod: { value: 'UPI', confidence: 90, needsReview: false },
    };

    const res = validateAndPostProcessReceipt(rawReceiptJson);

    assert.equal(res.calculations.isMathConsistent, true);
    assert.equal(res.calculations.mathDiscrepancy, 0);
    assert.equal(res.calculations.calculatedItemsTotal, 650.0);
    assert.equal(res.calculations.calculatedFinalTotal, 658.5);
    assert.equal(res.total.value, 658.5);
    assert.equal(res.requiresManualReview, false);
    assert.equal(res.warnings.length, 0);
  });

  test('STEP3-MATH-2: Calculation discrepancy is detected and flagged without mutating extracted values', () => {
    const rawReceiptWithDiscrepancy = {
      merchantName: { value: 'Office Hub' },
      items: [{ description: { value: 'Item 1' }, amount: { value: 500.0 } }],
      subtotal: { value: 500.0 },
      tax: { value: 50.0 },
      discount: { value: 0 },
      total: { value: 800.0 }, // Discrepancy: 500 + 50 = 550 != 800
    };

    const res = validateAndPostProcessReceipt(rawReceiptWithDiscrepancy);

    assert.equal(res.calculations.isMathConsistent, false);
    assert.equal(res.calculations.calculatedFinalTotal, 550.0);
    assert.equal(res.total.value, 800.0, 'Must preserve original printed total value');
    assert.equal(res.calculations.mathDiscrepancy, 250.0);
    assert.equal(res.requiresManualReview, true);
    assert.ok(res.warnings.some((w) => w.includes('Calculation Discrepancy')));
  });

  test('STEP3-MATH-3: Never calculates a missing printed total and presents it as printed', () => {
    const rawReceiptMissingTotal = {
      merchantName: { value: 'Grocery Corner' },
      items: [
        { description: { value: 'Milk' }, amount: { value: 60.0 } },
        { description: { value: 'Bread' }, amount: { value: 40.0 } },
      ],
      subtotal: { value: 100.0 },
      tax: { value: 5.0 },
      discount: { value: 0 },
      total: { value: null }, // Printed total is missing
    };

    const res = validateAndPostProcessReceipt(rawReceiptMissingTotal);

    // Printed total MUST remain null
    assert.equal(res.total.value, null, 'Must not invent a printed total value');
    assert.equal(res.total.needsReview, true);

    // Calculated total is kept strictly in calculations
    assert.equal(res.calculations.calculatedFinalTotal, 105.0);
    assert.ok(res.warnings.some((w) => w.includes('Printed receipt total is missing')));
  });

  test('STEP3-MATH-4: Line item quantity * unitPrice mismatch is caught', () => {
    const rawReceipt = {
      merchantName: { value: 'Stationery World' },
      items: [
        {
          description: { value: 'Markers' },
          quantity: { value: 4 },
          unitPrice: { value: 50.0 },
          amount: { value: 300.0 }, // 4 * 50 = 200 != 300
        },
      ],
      total: { value: 300.0 },
    };

    const res = validateAndPostProcessReceipt(rawReceipt);

    assert.equal(res.items[0].amount.needsReview, true);
    assert.ok(res.warnings.some((w) => w.includes('Qty (4) × Rate (50) = 200, but extracted amount is 300')));
  });

  test('STEP3-GUARD-1: Phone number mistaken as grand total is flagged with critical warning', () => {
    const rawReceipt = {
      merchantName: { value: 'City Cafe' },
      total: { value: 9845012345 }, // 10-digit mobile number
    };

    const res = validateAndPostProcessReceipt(rawReceipt);

    assert.equal(res.total.needsReview, true);
    assert.ok(res.warnings.some((w) => w.includes('10-digit mobile phone number format')));
  });

  test('STEP3-IMAGE-1: validateImageInput rejects missing, empty, or unsupported files', async () => {
    // 1. Missing file
    await assert.rejects(
      () => validateImageInput('non_existent_file_path.jpg', 'image/jpeg'),
      /not found/i
    );

    // 2. Unsupported MIME type
    const tempTestFile = path.resolve(process.cwd(), 'temp_test_image.txt');
    await fs.promises.writeFile(tempTestFile, 'Dummy content for validation');

    try {
      await assert.rejects(
        () => validateImageInput(tempTestFile, 'text/plain'),
        /unsupported file type/i
      );

      // 3. Supported MIME type passes
      const valid = await validateImageInput(tempTestFile, 'image/jpeg');
      assert.equal(valid, true);
    } finally {
      if (fs.existsSync(tempTestFile)) {
        await fs.promises.unlink(tempTestFile);
      }
    }
  });

  test('STEP3-CFG-1: Gemini configuration helpers behave reliably with env variables', () => {
    const originalKey = process.env.GEMINI_API_KEY;
    const originalModel = process.env.GEMINI_MODEL;

    try {
      delete process.env.GEMINI_API_KEY;
      assert.equal(isGeminiConfigured(), false);

      process.env.GEMINI_API_KEY = 'short';
      assert.equal(isGeminiConfigured(), false);

      process.env.GEMINI_API_KEY = 'AIzaSyAValidLengthApiKeyForGeminiVisionTesting123';
      assert.equal(isGeminiConfigured(), true);

      delete process.env.GEMINI_MODEL;
      assert.equal(getGeminiModelName(), 'gemini-3.8-flash');

      process.env.GEMINI_MODEL = 'gemini-1.5-flash';
      assert.equal(getGeminiModelName(), 'gemini-1.5-flash');
    } finally {
      process.env.GEMINI_API_KEY = originalKey;
      process.env.GEMINI_MODEL = originalModel;
    }
  });

  test('STEP3-SAFE-1: Receipt OCR processing NEVER automatically creates a Transaction in MongoDB', async () => {
    let transactionCreated = false;
    const originalCreate = Transaction.create;
    Transaction.create = async () => {
      transactionCreated = true;
      return {};
    };

    try {
      // Simulate raw receipt OCR extraction data post-processing
      const sampleReceipt = {
        documentType: 'receipt',
        merchantName: { value: 'Sample Vendor' },
        total: { value: 1500.0 },
      };

      const res = validateAndPostProcessReceipt(sampleReceipt);

      // Verify that OCR processing only produced analysis data and did NOT persist a transaction
      assert.equal(transactionCreated, false, 'OCR processing must NEVER auto-save a Transaction in MongoDB');
      assert.ok(res.total.value === 1500.0);
    } finally {
      Transaction.create = originalCreate;
    }
  });
});

