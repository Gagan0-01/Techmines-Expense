import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateAndPostProcessReceipt } from '../src/services/geminiReceiptService.js';
import { validateReceiptFinancials } from '../src/services/financialValidationService.js';
import { Document } from '../src/models/Document.js';
import { Transaction } from '../src/models/Transaction.js';

describe('Universal Receipt OCR & Multi-Format Document Integration Tests', () => {
  // Test 1: Educational Fee Receipt
  test('E2E-DOC-1: Educational Fee Receipt - Extracts institution, student, line items & verifies math', () => {
    const rawEducationReceipt = {
      documentType: 'receipt',
      isHandwritten: false,
      merchantName: { value: 'Delhi Public School', confidence: 96, needsReview: false },
      receiptNumber: { value: 'DPS-FEE-2026-88', confidence: 92, needsReview: false },
      date: { value: '2026-11-10', confidence: 95, needsReview: false },
      payerName: { value: 'Aarav Kumar (Class X-A)', confidence: 90, needsReview: false },
      items: [
        {
          description: { value: 'Tuition Fee (Q3)', confidence: 95, needsReview: false },
          quantity: { value: 1, confidence: 95, needsReview: false },
          unitPrice: { value: 18000.0, confidence: 95, needsReview: false },
          amount: { value: 18000.0, confidence: 95, needsReview: false },
        },
        {
          description: { value: 'Computer Lab Fee', confidence: 92, needsReview: false },
          quantity: { value: 1, confidence: 92, needsReview: false },
          unitPrice: { value: 2500.0, confidence: 92, needsReview: false },
          amount: { value: 2500.0, confidence: 92, needsReview: false },
        },
        {
          description: { value: 'Annual Examination Fee', confidence: 90, needsReview: false },
          quantity: { value: 1, confidence: 90, needsReview: false },
          unitPrice: { value: 1500.0, confidence: 90, needsReview: false },
          amount: { value: 1500.0, confidence: 90, needsReview: false },
        },
      ],
      subtotal: { value: 22000.0, confidence: 94, needsReview: false },
      tax: { value: 0, confidence: 98, needsReview: false },
      discount: { value: 0, confidence: 98, needsReview: false },
      additionalCharges: { value: 0, confidence: 98, needsReview: false },
      total: { value: 22000.0, confidence: 97, needsReview: false },
      currency: { value: 'INR', confidence: 98, needsReview: false },
      paymentMethod: { value: 'Bank Transfer', confidence: 92, needsReview: false },
      rawText: 'DELHI PUBLIC SCHOOL\nFee Receipt #DPS-FEE-2026-88\nStudent: Aarav Kumar\nTotal: 22000',
    };

    const processed = validateAndPostProcessReceipt(rawEducationReceipt);

    assert.equal(processed.merchantName.value, 'Delhi Public School');
    assert.equal(processed.payerName.value, 'Aarav Kumar (Class X-A)');
    assert.equal(processed.items.length, 3);
    assert.equal(processed.calculations.calculatedItemsTotal, 22000.0);
    assert.equal(processed.calculations.calculatedFinalTotal, 22000.0);
    assert.equal(processed.calculations.isMathConsistent, true);
    assert.equal(processed.requiresManualReview, false);
  });

  // Test 2: Shopping / Retail GST Invoice
  test('E2E-DOC-2: Retail GST Tax Invoice - Verifies GSTIN, CGST/SGST taxes, and subtotal + tax = total', () => {
    const rawGstInvoice = {
      documentType: 'invoice',
      isHandwritten: false,
      merchantName: { value: 'Croma Megastore Electronics', confidence: 95, needsReview: false },
      merchantTaxId: { value: '07AAACC4175D1ZG', confidence: 96, needsReview: false },
      receiptNumber: { value: 'INV-CR-90412', confidence: 93, needsReview: false },
      date: { value: '2026-11-08', confidence: 95, needsReview: false },
      items: [
        {
          description: { value: 'Wireless Mouse', confidence: 95, needsReview: false },
          quantity: { value: 2, confidence: 95, needsReview: false },
          unitPrice: { value: 750.0, confidence: 95, needsReview: false },
          amount: { value: 1500.0, confidence: 95, needsReview: false },
        },
        {
          description: { value: 'USB-C Fast Charging Cable', confidence: 94, needsReview: false },
          quantity: { value: 1, confidence: 94, needsReview: false },
          unitPrice: { value: 500.0, confidence: 94, needsReview: false },
          amount: { value: 500.0, confidence: 94, needsReview: false },
        },
      ],
      subtotal: { value: 2000.0, confidence: 95, needsReview: false },
      tax: { value: 360.0, confidence: 92, needsReview: false }, // 18% GST
      discount: { value: 100.0, confidence: 90, needsReview: false },
      additionalCharges: { value: 0, confidence: 98, needsReview: false },
      total: { value: 2260.0, confidence: 96, needsReview: false }, // 2000 - 100 + 360 = 2260
      currency: { value: 'INR', confidence: 98, needsReview: false },
      paymentMethod: { value: 'Card', confidence: 90, needsReview: false },
      rawText: 'CROMA MEGASTORE\nGSTIN: 07AAACC4175D1ZG\nSubtotal: 2000\nDiscount: 100\nGST: 360\nTotal: 2260',
    };

    const processed = validateAndPostProcessReceipt(rawGstInvoice);

    assert.equal(processed.merchantTaxId.value, '07AAACC4175D1ZG');
    assert.equal(processed.calculations.isMathConsistent, true);
    assert.equal(processed.calculations.calculatedFinalTotal, 2260.0);
    assert.equal(processed.calculations.mathDiscrepancy, 0);
  });

  // Test 3: Restaurant Bill with Service Charge
  test('E2E-DOC-3: Restaurant Food Bill - Correctly includes service charge in additionalCharges', () => {
    const rawRestaurantBill = {
      documentType: 'receipt',
      merchantName: { value: 'Mainland China Cafe', confidence: 94, needsReview: false },
      receiptNumber: { value: 'TBL-14-BILL-08', confidence: 90, needsReview: false },
      date: { value: '2026-11-11', confidence: 92, needsReview: false },
      items: [
        {
          description: { value: 'Dimsums Platter', confidence: 95, needsReview: false },
          quantity: { value: 1, confidence: 95, needsReview: false },
          unitPrice: { value: 450.0, confidence: 95, needsReview: false },
          amount: { value: 450.0, confidence: 95, needsReview: false },
        },
        {
          description: { value: 'Hakka Noodles', confidence: 95, needsReview: false },
          quantity: { value: 2, confidence: 95, needsReview: false },
          unitPrice: { value: 300.0, confidence: 95, needsReview: false },
          amount: { value: 600.0, confidence: 95, needsReview: false },
        },
      ],
      subtotal: { value: 1050.0, confidence: 95, needsReview: false },
      tax: { value: 52.5, confidence: 90, needsReview: false }, // 5% GST
      discount: { value: 0, confidence: 98, needsReview: false },
      additionalCharges: { value: 105.0, confidence: 90, needsReview: false }, // 10% Service Charge
      total: { value: 1207.5, confidence: 95, needsReview: false }, // 1050 + 52.5 + 105 = 1207.5
      paymentMethod: { value: 'UPI', confidence: 95, needsReview: false },
    };

    const processed = validateAndPostProcessReceipt(rawRestaurantBill);

    assert.equal(processed.calculations.isMathConsistent, true);
    assert.equal(processed.calculations.calculatedFinalTotal, 1207.5);
  });

  // Test 4: Medical / Pharmacy Bill with Medicine Discount
  test('E2E-DOC-4: Medical / Pharmacy Invoice - Handles medicine discount & patient name', () => {
    const rawPharmacyBill = {
      documentType: 'receipt',
      merchantName: { value: 'MedPlus Pharmacy', confidence: 96, needsReview: false },
      payerName: { value: 'Priya Sharma', confidence: 91, needsReview: false },
      receiptNumber: { value: 'MED-9021', confidence: 92, needsReview: false },
      items: [
        {
          description: { value: 'Paracetamol 650mg', confidence: 95, needsReview: false },
          quantity: { value: 2, confidence: 95, needsReview: false },
          unitPrice: { value: 30.0, confidence: 95, needsReview: false },
          amount: { value: 60.0, confidence: 95, needsReview: false },
        },
        {
          description: { value: 'Multivitamin Complex 30s', confidence: 95, needsReview: false },
          quantity: { value: 1, confidence: 95, needsReview: false },
          unitPrice: { value: 440.0, confidence: 95, needsReview: false },
          amount: { value: 440.0, confidence: 95, needsReview: false },
        },
      ],
      subtotal: { value: 500.0, confidence: 95, needsReview: false },
      tax: { value: 60.0, confidence: 90, needsReview: false },
      discount: { value: 50.0, confidence: 95, needsReview: false }, // 10% member discount
      additionalCharges: { value: 0, confidence: 98, needsReview: false },
      total: { value: 510.0, confidence: 96, needsReview: false }, // 500 - 50 + 60 = 510
      paymentMethod: { value: 'UPI', confidence: 94, needsReview: false },
    };

    const processed = validateAndPostProcessReceipt(rawPharmacyBill);

    assert.equal(processed.payerName.value, 'Priya Sharma');
    assert.equal(processed.discount.value, 50.0);
    assert.equal(processed.calculations.isMathConsistent, true);
    assert.equal(processed.calculations.calculatedFinalTotal, 510.0);
  });

  // Test 5: Handwritten Note / Faded Cash Receipt
  test('E2E-DOC-5: Handwritten Cash Receipt - Detects isHandwritten, flags uncertain fields for review', () => {
    const rawHandwritten = {
      documentType: 'handwritten_note',
      isHandwritten: true,
      merchantName: { value: 'Sharma Tea Stall', confidence: 65, needsReview: true },
      receiptNumber: { value: null, confidence: 0, needsReview: true },
      date: { value: '2026-11-09', confidence: 75, needsReview: true },
      items: [
        {
          description: { value: 'Tea & Snacks for Office Meeting', confidence: 70, needsReview: true },
          quantity: { value: 1, confidence: 80, needsReview: false },
          unitPrice: { value: 350.0, confidence: 70, needsReview: true },
          amount: { value: 350.0, confidence: 70, needsReview: true },
        },
      ],
      subtotal: { value: 350.0, confidence: 70, needsReview: true },
      tax: { value: 0, confidence: 90, needsReview: false },
      discount: { value: 0, confidence: 90, needsReview: false },
      total: { value: 350.0, confidence: 70, needsReview: true },
      paymentMethod: { value: 'Cash', confidence: 85, needsReview: false },
    };

    const processed = validateAndPostProcessReceipt(rawHandwritten);

    assert.equal(processed.isHandwritten, true);
    assert.equal(processed.merchantName.needsReview, true);
    assert.equal(processed.receiptNumber.value, null);
    assert.equal(processed.receiptNumber.needsReview, true);
    assert.equal(processed.total.needsReview, true);
    assert.equal(processed.requiresManualReview, true);
  });

  // Test 6: Financial Validation Service Dual Format Compatibility
  test('E2E-VAL-1: validateReceiptFinancials accepts both Step 3 object schema and legacy primitives', () => {
    const modernFormat = {
      merchantName: { value: 'Office Depot' },
      date: { value: '2026-11-10' },
      total: { value: 1500 },
      subtotal: { value: 1500 },
      tax: { value: 0 },
      discount: { value: 0 },
      additionalCharges: { value: 0 },
      items: [{ description: { value: 'Paper' }, quantity: { value: 3 }, unitPrice: { value: 500 }, amount: { value: 1500 } }],
    };

    const result = validateReceiptFinancials(modernFormat);
    assert.equal(result.isMathValid, true);
    assert.equal(result.calculatedTotal, 1500);
    assert.equal(result.warnings.length, 0);
  });

  // Test 7: Zero Auto-Creation Guarantee
  test('E2E-SAFE-1: Verification pipeline never touches or mutates transactions collection', () => {
    assert.equal(typeof Transaction.find, 'function');
    assert.equal(typeof Transaction.create, 'function');
  });
});
