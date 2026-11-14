import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateReceiptFinancials } from '../src/services/financialValidationService.js';
import { isGeminiConfigured, getGeminiModelName } from '../src/services/geminiVisionService.js';

describe('Gemini Vision & Financial Validation Unit Tests', () => {
  test('GEMINI-VAL-1: Exact mathematical calculation is verified successfully', () => {
    const mockReceipt = {
      merchant: { name: 'Apollo Pharmacy', phone: '044-28290200', taxId: '33AABCA1234D1Z5' },
      invoice: { receiptNumber: 'INV-9821', date: '2026-11-12' },
      items: [
        { description: 'Paracetamol 650mg', quantity: 2, unitPrice: 30.0, amount: 60.0 },
        { description: 'Vitamin C Strip', quantity: 1, unitPrice: 140.0, amount: 140.0 },
      ],
      financials: {
        subtotal: 200.0,
        discount: 20.0,
        tax: 18.0,
        grandTotal: 198.0, // 200 - 20 + 18 = 198
        currency: 'INR',
      },
      payment: { method: 'UPI' },
    };

    const res = validateReceiptFinancials(mockReceipt);

    assert.equal(res.isMathValid, true);
    assert.equal(res.discrepancy, 0);
    assert.equal(res.calculatedTotal, 198.0);
    assert.ok(res.confidenceScore >= 80);
    assert.equal(res.warnings.length, 0);
  });

  test('GEMINI-VAL-2: Mathematical discrepancy is caught and reported', () => {
    const mockReceiptWithMathError = {
      merchant: { name: 'Metro Supermarket' },
      invoice: { receiptNumber: 'TX-4401', date: '2026-11-10' },
      items: [
        { description: 'A4 Paper Ream', quantity: 1, unitPrice: 250.0, amount: 250.0 },
        { description: 'Gel Pens Pack', quantity: 1, unitPrice: 100.0, amount: 100.0 },
      ],
      financials: {
        subtotal: 350.0,
        discount: 0,
        tax: 50.0,
        grandTotal: 999.0, // Error: 350 + 50 = 400, but receipt total says 999
        currency: 'INR',
      },
    };

    const res = validateReceiptFinancials(mockReceiptWithMathError);

    assert.equal(res.isMathValid, false);
    assert.equal(res.calculatedTotal, 400.0);
    assert.equal(res.discrepancy, 599.0);
    assert.ok(res.warnings.some((w) => w.includes('Grand total discrepancy')));
  });

  test('GEMINI-VAL-3: Line item quantity * unitPrice mismatch is flagged', () => {
    const mockReceipt = {
      merchant: { name: 'Tech Store' },
      invoice: { date: '2026-11-10' },
      items: [
        { description: 'USB Cable', quantity: 3, unitPrice: 100.0, amount: 500.0 }, // 3 * 100 != 500
      ],
      financials: {
        subtotal: 500.0,
        grandTotal: 500.0,
      },
    };

    const res = validateReceiptFinancials(mockReceipt);

    assert.ok(res.warnings.some((w) => w.includes('Line item #1')));
  });

  test('GEMINI-VAL-4: Phone number mistaken as grandTotal is flagged with critical warning', () => {
    const mockReceiptWithPhoneAsTotal = {
      merchant: { name: 'Local Cafe', phone: '9876543210' },
      invoice: { date: '2026-11-05' },
      financials: {
        grandTotal: 9876543210, // Common OCR error: 10-digit mobile number read as total
      },
    };

    const res = validateReceiptFinancials(mockReceiptWithPhoneAsTotal);

    assert.equal(res.isMathValid, false);
    assert.ok(res.warnings.some((w) => w.includes('10-digit mobile phone number')));
    assert.ok(res.warnings.some((w) => w.includes('matches the merchant phone number')));
  });

  test('GEMINI-VAL-5: Missing critical fields (merchant name, total) lower confidence score', () => {
    const incompleteReceipt = {
      merchant: { name: null },
      invoice: { date: null },
      financials: { grandTotal: null },
    };

    const res = validateReceiptFinancials(incompleteReceipt);

    assert.equal(res.isMathValid, false);
    assert.ok(res.confidenceScore <= 50);
    assert.ok(res.warnings.some((w) => w.includes('Merchant or institution name could not be identified')));
  });

  test('GEMINI-CFG-1: Gemini configuration helpers behave reliably with environment variables', () => {
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
});
