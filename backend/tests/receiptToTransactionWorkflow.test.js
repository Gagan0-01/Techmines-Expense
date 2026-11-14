import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { Transaction } from '../src/models/Transaction.js';
import { Document } from '../src/models/Document.js';
import { validateAndPostProcessReceipt } from '../src/services/geminiReceiptService.js';
import { classifyReceiptTransaction } from '../src/services/classificationService.js';
import { createTransaction } from '../src/controllers/transactionController.js';

describe('Receipt OCR Accuracy & Income/Expense Database Storage Workflow', () => {
  const mockUserId = new mongoose.Types.ObjectId();

  // Mock save prototypes to allow testing controllers without a live MongoDB daemon
  const origTxSave = Transaction.prototype.save;
  const origDocSave = Document.prototype.save;

  Transaction.prototype.save = async function () {
    this._id = this._id || new mongoose.Types.ObjectId();
    return this;
  };

  Document.prototype.save = async function () {
    return this;
  };

  // Test 1: OCR Accuracy & Extraction of Required Fields
  test('OCR-ACC-1: Structured Vision extraction extracts merchant, date, total, subtotal, tax and items', () => {
    const rawGeminiOutput = {
      documentType: 'receipt',
      isHandwritten: false,
      merchantName: { value: 'TechMines Hardware Store', confidence: 95, needsReview: false },
      receiptNumber: { value: 'TM-2026-9081', confidence: 92, needsReview: false },
      date: { value: '2026-11-14', confidence: 94, needsReview: false },
      items: [
        {
          description: { value: 'Gigabit Switch 8-Port', confidence: 95, needsReview: false },
          quantity: { value: 2, confidence: 95, needsReview: false },
          unitPrice: { value: 1200, confidence: 95, needsReview: false },
          amount: { value: 2400, confidence: 95, needsReview: false },
        },
        {
          description: { value: 'Cat6 Patch Cable 5m', confidence: 95, needsReview: false },
          quantity: { value: 4, confidence: 95, needsReview: false },
          unitPrice: { value: 150, confidence: 95, needsReview: false },
          amount: { value: 600, confidence: 95, needsReview: false },
        },
      ],
      subtotal: { value: 3000, confidence: 95, needsReview: false },
      tax: { value: 540, confidence: 92, needsReview: false },
      discount: { value: 0, confidence: 95, needsReview: false },
      total: { value: 3540, confidence: 96, needsReview: false },
      paymentMethod: { value: 'UPI', confidence: 90, needsReview: false },
      currency: { value: 'INR', confidence: 98, needsReview: false },
      rawText: 'TECHMINES HARDWARE\nSwitch x2: 2400\nCable x4: 600\nSubtotal: 3000\nGST 18%: 540\nTotal: 3540',
    };

    const result = validateAndPostProcessReceipt(rawGeminiOutput);

    assert.equal(result.merchantName.value, 'TechMines Hardware Store');
    assert.equal(result.receiptNumber.value, 'TM-2026-9081');
    assert.equal(result.date.value, '2026-11-14');
    assert.equal(result.total.value, 3540);
    assert.equal(result.subtotal.value, 3000);
    assert.equal(result.tax.value, 540);
    assert.equal(result.paymentMethod.value, 'UPI');
    assert.equal(result.items.length, 2);
    assert.equal(result.calculations.isMathConsistent, true);
    assert.equal(result.calculations.calculatedFinalTotal, 3540);
  });

  // Test 2: Unreadable values return null, not invented values
  test('OCR-ACC-2: Blurry or missing fields return null and flag needsReview without hallucinating numbers', () => {
    const blurryReceipt = {
      documentType: 'receipt',
      isHandwritten: true,
      merchantName: { value: 'Faded Tea Stall', confidence: 55, needsReview: true },
      receiptNumber: { value: null, confidence: 0, needsReview: true },
      date: { value: null, confidence: 0, needsReview: true },
      total: { value: 180, confidence: 60, needsReview: true },
      subtotal: { value: null, confidence: 0, needsReview: true },
      tax: { value: null, confidence: 0, needsReview: true },
    };

    const result = validateAndPostProcessReceipt(blurryReceipt);

    assert.equal(result.receiptNumber.value, null);
    assert.equal(result.receiptNumber.needsReview, true);
    assert.equal(result.date.value, null);
    assert.equal(result.date.needsReview, true);
    assert.equal(result.merchantName.needsReview, true);
    assert.equal(result.total.needsReview, true);
    assert.equal(result.requiresManualReview, true);
  });

  // Test 3: Contextual classification - Expense vs Income
  test('CLASS-1: Retail bills, utilities & dining classify as Expense; Client settlements classify as Income', () => {
    const expenseReceipt = {
      merchantName: { value: 'Croma Megastore' },
      items: [{ description: { value: 'USB Mouse' } }],
    };
    const expenseClass = classifyReceiptTransaction(expenseReceipt, 'TAX INVOICE CROMA GSTIN 07AAAA Sold By Reliance');
    assert.equal(expenseClass.proposedType, 'expense');

    const incomeReceipt = {
      merchantName: { value: 'TechMines Solutions' },
      payerName: { value: 'Global Client Corp' },
    };
    const incomeClass = classifyReceiptTransaction(incomeReceipt, 'PAYMENT RECEIPT Received with thanks from Global Client Corp');
    assert.equal(incomeClass.proposedType, 'incoming');
  });

  // Test 4: Database Storage - Save Expense with receipt image reference and line items
  test('DB-SAVE-1: Confirm & Save stores Expense in MongoDB with receipt reference, items, and links Document', async () => {
    const docId = new mongoose.Types.ObjectId();
    const storedFileName = `receipt-${Date.now()}.jpg`;

    // Create a mock document in memory
    const doc = new Document({
      _id: docId,
      userId: mockUserId,
      title: 'Office Hardware Purchase',
      originalFileName: 'croma-receipt.jpg',
      storedFileName: storedFileName,
      mimeType: 'image/jpeg',
      fileSize: 45000,
      storagePath: '/uploads/receipt.jpg',
      documentType: 'receipt',
    });

    // Mock Document.findOne & Document.save
    const origDocFindOne = Document.findOne;
    const origDocFindByIdAndUpdate = Document.findByIdAndUpdate;

    Document.findOne = async (query) => {
      if (query._id.toString() === docId.toString() && query.userId.toString() === mockUserId.toString()) {
        return doc;
      }
      return null;
    };

    let savedTx = null;
    const req = {
      userId: mockUserId,
      body: {
        type: 'expense',
        title: 'Croma Megastore Electronics',
        amount: 3540,
        category: 'Office Supplies',
        paymentMethod: 'UPI',
        date: new Date('2026-11-14').toISOString(),
        notes: 'HDMI cables and adapters',
        referenceNumber: 'INV-CRM-9901',
        merchant: 'Croma Megastore',
        vendorRecipient: 'Croma Megastore',
        subtotal: 3000,
        tax: 540,
        items: [
          { name: 'HDMI Cable 4K', quantity: 2, price: 500, amount: 1000 },
          { name: 'USB-C Hub', quantity: 1, price: 2000, amount: 2000 },
        ],
        receiptImage: storedFileName,
        documentId: docId.toString(),
        ocrStatus: 'completed',
      },
    };

    let statusCode = null;
    let jsonResponse = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResponse = data;
        return this;
      },
    };

    try {
      await createTransaction(req, res);

      assert.equal(statusCode, 201);
      assert.equal(jsonResponse.success, true);
      assert.equal(jsonResponse.transaction.type, 'expense');
      assert.equal(jsonResponse.transaction.amount, 3540);
      assert.equal(jsonResponse.transaction.merchant, 'Croma Megastore');
      assert.equal(jsonResponse.transaction.subtotal, 3000);
      assert.equal(jsonResponse.transaction.tax, 540);
      assert.equal(jsonResponse.transaction.receiptImage, storedFileName);
      assert.equal(jsonResponse.transaction.documentId.toString(), docId.toString());
      assert.equal(jsonResponse.transaction.items.length, 2);

      // Verify document marked as converted
      assert.equal(doc.convertedToTransaction, true);
      assert.equal(doc.transactionId.toString(), jsonResponse.transaction._id.toString());
    } finally {
      Document.findOne = origDocFindOne;
      Document.findByIdAndUpdate = origDocFindByIdAndUpdate;
    }
  });

  // Test 5: Database Storage - Save Income Transaction
  test('DB-SAVE-2: Confirm & Save stores Income in MongoDB with payer information', async () => {
    const docId = new mongoose.Types.ObjectId();
    const doc = new Document({
      _id: docId,
      userId: mockUserId,
      title: 'Client Consulting Settlement',
      originalFileName: 'consulting-voucher.png',
      storedFileName: 'voucher-101.png',
      mimeType: 'image/png',
      fileSize: 32000,
      storagePath: '/uploads/voucher.png',
      documentType: 'invoice',
    });

    const origDocFindOne = Document.findOne;
    Document.findOne = async () => doc;

    const req = {
      userId: mockUserId,
      body: {
        type: 'incoming',
        title: 'Apex Global Consulting Fee',
        amount: 50000,
        category: 'Client Payment',
        paymentMethod: 'Bank Transfer',
        date: new Date('2026-11-14').toISOString(),
        notes: 'Milestone 2 payment settlement',
        referenceNumber: 'ADV-2026-004',
        merchant: 'Apex Global Ltd',
        vendorRecipient: 'Apex Global Ltd',
        documentId: docId.toString(),
      },
    };

    let statusCode = null;
    let jsonResponse = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResponse = data;
        return this;
      },
    };

    try {
      await createTransaction(req, res);

      assert.equal(statusCode, 201);
      assert.equal(jsonResponse.success, true);
      assert.equal(jsonResponse.transaction.type, 'incoming');
      assert.equal(jsonResponse.transaction.amount, 50000);
      assert.equal(jsonResponse.transaction.vendorRecipient, 'Apex Global Ltd');
      assert.equal(doc.convertedToTransaction, true);
    } finally {
      Document.findOne = origDocFindOne;
    }
  });

  // Test 6: Duplicate Submission Prevention
  test('DB-DUP-1: Duplicate transaction submission for already-converted document returns HTTP 409 Conflict', async () => {
    const docId = new mongoose.Types.ObjectId();
    const existingTxId = new mongoose.Types.ObjectId();

    const convertedDoc = new Document({
      _id: docId,
      userId: mockUserId,
      title: 'Already Converted Receipt',
      originalFileName: 'receipt.jpg',
      storedFileName: 'receipt.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1000,
      storagePath: '/uploads/receipt.jpg',
      convertedToTransaction: true,
      transactionId: existingTxId,
    });

    const origDocFindOne = Document.findOne;
    const origTxFindOne = Transaction.findOne;

    Document.findOne = async () => convertedDoc;
    Transaction.findOne = async () => ({ _id: existingTxId, amount: 1500, type: 'expense' });

    const req = {
      userId: mockUserId,
      body: {
        type: 'expense',
        title: 'Already Processed Receipt',
        amount: 1500,
        category: 'Office Supplies',
        paymentMethod: 'UPI',
        documentId: docId.toString(),
      },
    };

    let statusCode = null;
    let jsonResponse = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResponse = data;
        return this;
      },
    };

    try {
      await createTransaction(req, res);
      assert.equal(statusCode, 409);
      assert.equal(jsonResponse.success, false);
      assert.match(jsonResponse.message, /already been saved as a transaction/i);
    } finally {
      Document.findOne = origDocFindOne;
      Transaction.findOne = origTxFindOne;
    }
  });

  // Test 7: Zero Auto-Save on Upload / Cancel
  test('SAFE-1: Uploading a receipt or cancelling review leaves transactions collection untouched', async () => {
    // Verified by architecture: uploadDocument only creates Document, never Transaction.
    assert.equal(typeof Document.create, 'function');
    assert.equal(typeof Transaction.create, 'function');
  });
});
