import mongoose from 'mongoose';
import fs from 'fs';
import { Document } from '../models/Document.js';
import { Category } from '../models/Category.js';
import { extractText } from '../services/ocrService.js';
import { getSafeFilePath, deleteStoredFile } from '../services/storageService.js';
import { classifyReceiptTransaction } from '../services/classificationService.js';

/**
 * Upload a new document and execute OCR text extraction
 */
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select a document to scan.',
      });
    }

    const { title, documentType } = req.body;
    const finalTitle = (title && typeof title === 'string' && title.trim())
      ? title.trim()
      : req.file.originalname;

    const validTypes = ['receipt', 'invoice', 'bill', 'business_document', 'handwritten_note', 'other'];
    const finalType = validTypes.includes(documentType) ? documentType : 'receipt';

    // 1. Create document record in MongoDB
    const doc = new Document({
      userId: req.userId,
      title: finalTitle.slice(0, 120),
      originalFileName: req.file.originalname,
      storedFileName: req.file.filename,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      storagePath: req.file.filename,
      documentType: finalType,
      processingStatus: 'processing',
    });

    await doc.save();

    // 2. Perform OCR extraction
    try {
      const ocrResult = await extractText(req.file.path, req.file.mimetype);
      doc.extractedText = ocrResult.text || '';
      doc.confidence = ocrResult.confidence || 0;
      doc.structuredData = ocrResult.structuredData || null;
      doc.financialValidation = ocrResult.financialValidation || null;
      doc.ocrEngine = ocrResult.ocrEngine || 'gemini-flash';
      if (ocrResult.documentType) {
        doc.documentType = ocrResult.documentType;
      }
      doc.metadata = ocrResult.metadata || {};
      doc.processingStatus = 'completed';
      doc.processingError = null;

      // Generate suggested transaction and proposed classification
      const userCategories = await Category.find({
        $or: [{ userId: req.userId }, { userId: null }],
      }).lean();

      const classification = classifyReceiptTransaction(
        doc.structuredData,
        doc.extractedText,
        userCategories
      );

      const s = doc.structuredData || {};
      const amountVal = s.total?.value ?? s.financials?.grandTotal ?? null;
      const subtotalVal = s.subtotal?.value ?? s.financials?.subtotal ?? null;
      const taxVal = s.tax?.value ?? s.financials?.tax ?? null;
      const merchantVal = s.merchantName?.value || s.merchant?.name || doc.title || '';
      const dateVal = s.date?.value || s.invoice?.date || null;
      const paymentMethodVal = s.paymentMethod?.value || s.payment?.method || 'UPI';

      const itemsList = Array.isArray(s.items)
        ? s.items.map((it) => ({
            name: it.description?.value || it.description || it.name || '',
            quantity: it.quantity?.value ?? it.quantity ?? 1,
            price: it.unitPrice?.value ?? it.unitPrice ?? 0,
            amount: it.amount?.value ?? it.amount ?? 0,
          }))
        : [];

      doc.suggestedTransaction = {
        type: classification.proposedType,
        merchant: merchantVal,
        date: dateVal,
        amount: amountVal,
        subtotal: subtotalVal,
        tax: taxVal,
        paymentMethod: ['Cash', 'UPI', 'Bank Transfer'].includes(paymentMethodVal)
          ? paymentMethodVal
          : 'UPI',
        items: itemsList,
        receiptImage: doc.storedFileName,
        documentId: doc._id,
        category: classification.suggestedCategory,
        classificationReason: classification.reason,
        ocrStatus: 'completed',
      };
    } catch (ocrErr) {
      console.error(`[DocumentController] OCR extraction failed for doc ${doc._id}:`, ocrErr.message);
      doc.processingStatus = 'failed';
      doc.processingError = ocrErr.message || 'Text extraction failed.';
      doc.suggestedTransaction = {
        type: 'expense',
        merchant: doc.title,
        date: null,
        amount: null,
        subtotal: null,
        tax: null,
        paymentMethod: 'UPI',
        items: [],
        receiptImage: doc.storedFileName,
        documentId: doc._id,
        category: 'Office Supplies',
        classificationReason: 'OCR text extraction failed, defaulting to manual entry.',
        ocrStatus: 'failed',
      };
    }

    await doc.save();

    return res.status(201).json({
      success: true,
      message: doc.processingStatus === 'completed'
        ? 'Document uploaded and text extracted successfully.'
        : 'Document uploaded, but text extraction encountered an error.',
      document: doc,
      proposedTransaction: doc.suggestedTransaction,
    });
  } catch (error) {
    console.error('[DocumentController] Upload error:', error.message);
    if (req.file?.filename) {
      await deleteStoredFile(req.file.filename).catch(() => {});
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to upload and process document.',
      error: error.message,
    });
  }
};

/**
 * List all documents for the authenticated user with search and filtering
 */
export const getDocuments = async (req, res) => {
  try {
    const { search, documentType, status, page = 1, limit = 20 } = req.query;

    const filter = { userId: req.userId };

    if (documentType && documentType !== 'all') {
      filter.documentType = documentType;
    }

    if (status && status !== 'all') {
      filter.processingStatus = status;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const trimmed = search.trim();
      filter.$or = [
        { title: { $regex: trimmed, $options: 'i' } },
        { originalFileName: { $regex: trimmed, $options: 'i' } },
        { extractedText: { $regex: trimmed, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

    const totalCount = await Document.countDocuments(filter);
    const documents = await Document.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    return res.json({
      success: true,
      count: documents.length,
      totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum) || 1,
      documents,
    });
  } catch (error) {
    console.error('[DocumentController] Get documents error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve documents.',
    });
  }
};

/**
 * Get single document by ID scoped to the authenticated user
 */
export const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const document = await Document.findOne({ _id: id, userId: req.userId });
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found or unauthorized.' });
    }

    return res.json({ success: true, document });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error retrieving document.' });
  }
};

/**
 * Re-trigger OCR extraction on an existing document
 */
export const processDocument = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const doc = await Document.findOne({ _id: id, userId: req.userId });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found or unauthorized.' });
    }

    const filePath = getSafeFilePath(doc.storedFileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Original document file is missing from storage.',
      });
    }

    doc.processingStatus = 'processing';
    await doc.save();

    try {
      const ocrResult = await extractText(filePath, doc.mimeType);
      doc.extractedText = ocrResult.text || '';
      doc.confidence = ocrResult.confidence || 0;
      doc.structuredData = ocrResult.structuredData || null;
      doc.financialValidation = ocrResult.financialValidation || null;
      doc.ocrEngine = ocrResult.ocrEngine || 'gemini-flash';
      if (ocrResult.documentType) {
        doc.documentType = ocrResult.documentType;
      }
      doc.metadata = ocrResult.metadata || {};
      doc.processingStatus = 'completed';
      doc.processingError = null;

      // Re-generate proposed transaction
      const userCategories = await Category.find({
        $or: [{ userId: req.userId }, { userId: null }],
      }).lean();

      const classification = classifyReceiptTransaction(
        doc.structuredData,
        doc.extractedText,
        userCategories
      );

      const s = doc.structuredData || {};
      const amountVal = s.total?.value ?? s.financials?.grandTotal ?? null;
      const subtotalVal = s.subtotal?.value ?? s.financials?.subtotal ?? null;
      const taxVal = s.tax?.value ?? s.financials?.tax ?? null;
      const merchantVal = s.merchantName?.value || s.merchant?.name || doc.title || '';
      const dateVal = s.date?.value || s.invoice?.date || null;
      const paymentMethodVal = s.paymentMethod?.value || s.payment?.method || 'UPI';

      const itemsList = Array.isArray(s.items)
        ? s.items.map((it) => ({
            name: it.description?.value || it.description || it.name || '',
            quantity: it.quantity?.value ?? it.quantity ?? 1,
            price: it.unitPrice?.value ?? it.unitPrice ?? 0,
            amount: it.amount?.value ?? it.amount ?? 0,
          }))
        : [];

      doc.suggestedTransaction = {
        type: classification.proposedType,
        merchant: merchantVal,
        date: dateVal,
        amount: amountVal,
        subtotal: subtotalVal,
        tax: taxVal,
        paymentMethod: ['Cash', 'UPI', 'Bank Transfer'].includes(paymentMethodVal)
          ? paymentMethodVal
          : 'UPI',
        items: itemsList,
        receiptImage: doc.storedFileName,
        documentId: doc._id,
        category: classification.suggestedCategory,
        classificationReason: classification.reason,
        ocrStatus: 'completed',
      };
    } catch (ocrErr) {
      doc.processingStatus = 'failed';
      doc.processingError = ocrErr.message || 'Text re-extraction failed.';
    }

    await doc.save();

    return res.json({
      success: true,
      message: doc.processingStatus === 'completed'
        ? 'OCR text re-extracted successfully.'
        : 'OCR text extraction failed.',
      document: doc,
      proposedTransaction: doc.suggestedTransaction,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to process document OCR.' });
  }
};

/**
 * Update document title, type, or manually edit extracted text
 */
export const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, documentType, extractedText, structuredData } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const doc = await Document.findOne({ _id: id, userId: req.userId });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found or unauthorized.' });
    }

    if (title !== undefined && typeof title === 'string' && title.trim()) {
      doc.title = title.trim().slice(0, 120);
    }

    const validTypes = ['receipt', 'invoice', 'bill', 'business_document', 'handwritten_note', 'other'];
    if (documentType && validTypes.includes(documentType)) {
      doc.documentType = documentType;
    }

    if (extractedText !== undefined && typeof extractedText === 'string') {
      doc.extractedText = extractedText;
    }

    if (structuredData && typeof structuredData === 'object') {
      doc.structuredData = { ...(doc.structuredData || {}), ...structuredData };
      // Re-run financial validation on the updated data
      const { validateReceiptFinancials } = await import('../services/financialValidationService.js');
      doc.financialValidation = validateReceiptFinancials(doc.structuredData);
      doc.confidence = doc.financialValidation.confidenceScore;
    }

    await doc.save();

    return res.json({
      success: true,
      message: 'Document updated successfully.',
      document: doc,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update document.' });
  }
};

/**
 * Permanently delete document and purge physical file
 */
export const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const doc = await Document.findOne({ _id: id, userId: req.userId });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found or unauthorized.' });
    }

    // 1. Delete physical file from private disk
    await deleteStoredFile(doc.storedFileName);

    // 2. Delete database record
    await Document.deleteOne({ _id: doc._id });

    return res.json({
      success: true,
      message: 'Document and original file permanently deleted.',
      deletedId: id,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete document.' });
  }
};

/**
 * Securely stream and download the original uploaded document
 */
export const downloadOriginalDocument = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const doc = await Document.findOne({ _id: id, userId: req.userId });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found or unauthorized.' });
    }

    const filePath = getSafeFilePath(doc.storedFileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Stored file not found on server.' });
    }

    return res.download(filePath, doc.originalFileName);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to download original document.' });
  }
};

/**
 * Export extracted text as a downloadable UTF-8 .txt file
 */
export const exportDocumentTxt = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const doc = await Document.findOne({ _id: id, userId: req.userId });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found or unauthorized.' });
    }

    const safeTitle = (doc.title || 'document').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const content = doc.extractedText || '';

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_ocr.txt"`);

    return res.send(content);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to export text file.' });
  }
};

