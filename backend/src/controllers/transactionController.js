import mongoose from 'mongoose';
import fs from 'fs';
import { Transaction } from '../models/Transaction.js';
import { Settings } from '../models/Settings.js';
import { Document } from '../models/Document.js';
import { getDateRange } from '../utils/dateUtils.js';
import { processReceiptWithGemini } from '../services/geminiReceiptService.js';
import { classifyReceiptTransaction } from '../services/classificationService.js';

/**
 * Get all transactions with flexible filtering, searching, and sorting
 * Strictly isolated by req.userId
 */
export const getTransactions = async (req, res) => {
  try {
    const {
      type,
      category,
      paymentMethod,
      range = 'this_month',
      startDate,
      endDate,
      search,
      sortBy = 'newest',
      page,
      limit,
    } = req.query;

    const filter = { userId: req.userId };

    // Transaction Type filter
    if (type && ['incoming', 'expense'].includes(type)) {
      filter.type = type;
    }

    // Category filter
    if (category && category !== 'all') {
      filter.category = category;
    }

    // Payment Method filter
    if (paymentMethod && paymentMethod !== 'all') {
      filter.paymentMethod = paymentMethod;
    }

    // Date Range filter
    const dateRange = getDateRange(range, startDate, endDate);
    if (dateRange) {
      filter.date = { $gte: dateRange.start, $lte: dateRange.end };
    }

    // Search query (only used on Incoming/Expenses/Reports, not on Office page)
    if (search && search.trim() !== '') {
      const trimmedSearch = search.trim();
      const numVal = parseFloat(trimmedSearch.replace(/[^0-9.]/g, ''));

      const searchConditions = [
        { title: { $regex: trimmedSearch, $options: 'i' } },
        { category: { $regex: trimmedSearch, $options: 'i' } },
        { notes: { $regex: trimmedSearch, $options: 'i' } },
        { referenceNumber: { $regex: trimmedSearch, $options: 'i' } },
        { vendorRecipient: { $regex: trimmedSearch, $options: 'i' } },
        { paymentMethod: { $regex: trimmedSearch, $options: 'i' } },
      ];

      if (!isNaN(numVal) && numVal > 0) {
        searchConditions.push({ amount: numVal });
      }

      filter.$or = searchConditions;
    }

    // Sorting
    let sortOptions = { date: -1, _id: -1 };
    if (sortBy === 'oldest') {
      sortOptions = { date: 1, _id: 1 };
    } else if (sortBy === 'highest') {
      sortOptions = { amount: -1, date: -1 };
    } else if (sortBy === 'lowest') {
      sortOptions = { amount: 1, date: -1 };
    }

    // Pagination & Bounded Query Protection to prevent memory exhaustion
    let totalCount = await Transaction.countDocuments(filter);
    let query = Transaction.find(filter).sort(sortOptions).lean();

    if (page && limit) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
    } else {
      // Safe upper cap for unpaginated queries to protect Node heap & MongoDB
      const defaultCap = Math.min(500, Math.max(1, parseInt(process.env.MAX_UNPAGINATED_TRANSACTIONS, 10) || 500));
      query = query.limit(defaultCap);
    }

    const transactions = await query.exec();

    res.json({
      success: true,
      count: transactions.length,
      totalCount,
      transactions,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions', error: error.message });
  }
};

/**
 * Get comprehensive Ledger Financial Summary isolated by user
 */
export const getLedgerSummary = async (req, res) => {
  try {
    const { range = 'this_month', startDate, endDate } = req.query;

    const userObjectId = new mongoose.Types.ObjectId(req.userId);

    // Get User Settings for Opening Balance
    let settings = await Settings.findOne({ userId: req.userId });
    if (!settings) {
      settings = await Settings.create({
        userId: req.userId,
        openingBalance: 0,
        currency: 'INR',
        companyName: 'TechMines',
      });
    }

    // Calculate All-Time totals for Office Balance
    const allTimeStats = await Transaction.aggregate([
      { $match: { userId: userObjectId } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    let allTimeIncoming = 0;
    let allTimeExpenses = 0;
    let allTimeCount = 0;

    allTimeStats.forEach((stat) => {
      if (stat._id === 'incoming') allTimeIncoming = Math.round(stat.total * 100) / 100;
      if (stat._id === 'expense') allTimeExpenses = Math.round(stat.total * 100) / 100;
      allTimeCount += stat.count;
    });

    const openingBalance = settings.openingBalance || 0;
    const currentOfficeBalance = Math.round((openingBalance + allTimeIncoming - allTimeExpenses) * 100) / 100;

    // Calculate Period-Specific totals
    const periodFilter = { userId: userObjectId };
    const dateRange = getDateRange(range, startDate, endDate);
    if (dateRange) {
      periodFilter.date = { $gte: dateRange.start, $lte: dateRange.end };
    }

    const periodStats = await Transaction.aggregate([
      { $match: periodFilter },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    let periodIncoming = 0;
    let periodExpenses = 0;
    let periodIncomingCount = 0;
    let periodExpenseCount = 0;

    periodStats.forEach((stat) => {
      if (stat._id === 'incoming') {
        periodIncoming = Math.round(stat.total * 100) / 100;
        periodIncomingCount = stat.count;
      }
      if (stat._id === 'expense') {
        periodExpenses = Math.round(stat.total * 100) / 100;
        periodExpenseCount = stat.count;
      }
    });

    const periodNetCashFlow = Math.round((periodIncoming - periodExpenses) * 100) / 100;

    // Today's numbers
    const todayRange = getDateRange('today');
    const todayStats = await Transaction.aggregate([
      { $match: { userId: userObjectId, date: { $gte: todayRange.start, $lte: todayRange.end } } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    let todayIncoming = 0;
    let todayExpenses = 0;
    let todayIncomingCount = 0;
    let todayExpenseCount = 0;

    todayStats.forEach((stat) => {
      if (stat._id === 'incoming') {
        todayIncoming = Math.round(stat.total * 100) / 100;
        todayIncomingCount = stat.count;
      }
      if (stat._id === 'expense') {
        todayExpenses = Math.round(stat.total * 100) / 100;
        todayExpenseCount = stat.count;
      }
    });

    // Month numbers
    const monthRange = getDateRange('this_month');
    const monthStats = await Transaction.aggregate([
      { $match: { userId: userObjectId, date: { $gte: monthRange.start, $lte: monthRange.end } } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    let monthIncoming = 0;
    let monthExpenses = 0;
    let monthIncomingCount = 0;
    let monthExpenseCount = 0;

    monthStats.forEach((stat) => {
      if (stat._id === 'incoming') {
        monthIncoming = Math.round(stat.total * 100) / 100;
        monthIncomingCount = stat.count;
      }
      if (stat._id === 'expense') {
        monthExpenses = Math.round(stat.total * 100) / 100;
        monthExpenseCount = stat.count;
      }
    });

    res.json({
      success: true,
      data: {
        officeBalance: currentOfficeBalance,
        openingBalance,
        allTimeIncoming,
        allTimeExpenses,
        allTimeCount,
        period: {
          range,
          incoming: periodIncoming,
          expenses: periodExpenses,
          netCashFlow: periodNetCashFlow,
          incomingCount: periodIncomingCount,
          expenseCount: periodExpenseCount,
          totalCount: periodIncomingCount + periodExpenseCount,
        },
        today: {
          incoming: todayIncoming,
          expenses: todayExpenses,
          netCashFlow: Math.round((todayIncoming - todayExpenses) * 100) / 100,
          incomingCount: todayIncomingCount,
          expenseCount: todayExpenseCount,
        },
        thisMonth: {
          incoming: monthIncoming,
          expenses: monthExpenses,
          netCashFlow: Math.round((monthIncoming - monthExpenses) * 100) / 100,
          incomingCount: monthIncomingCount,
          expenseCount: monthExpenseCount,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching ledger summary:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate ledger summary', error: error.message });
  }
};

/**
 * Get single transaction by ID scoped to user
 */
export const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    const transaction = await Transaction.findOne({ _id: id, userId: req.userId });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    res.json({ success: true, transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving transaction', error: error.message });
  }
};

/**
 * Create a new transaction with userId
 */
export const createTransaction = async (req, res) => {
  try {
    const {
      title,
      amount,
      type,
      category,
      paymentMethod,
      date,
      notes,
      referenceNumber,
      vendorRecipient,
      merchant,
      subtotal,
      tax,
      receiptTax,
      items,
      receiptImage,
      ocrStatus,
      documentId,
      recurringScheduleId,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Transaction title is required' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a valid positive number' });
    }

    if (!type || !['incoming', 'expense'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type must be incoming or expense' });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, message: 'Category is required' });
    }

    if (!paymentMethod || !['Cash', 'UPI', 'Bank Transfer'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Valid payment method is required (Cash, UPI, or Bank Transfer)' });
    }

    const transactionDate = date ? new Date(date) : new Date();
    if (isNaN(transactionDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid transaction date' });
    }

    // Document linking & duplicate prevention
    let linkedDoc = null;
    if (documentId) {
      if (!mongoose.Types.ObjectId.isValid(documentId)) {
        return res.status(400).json({ success: false, message: 'Invalid document ID format' });
      }

      linkedDoc = await Document.findOne({ _id: documentId, userId: req.userId });
      if (!linkedDoc) {
        return res.status(404).json({ success: false, message: 'Linked receipt document not found or unauthorized' });
      }

      // Check if already converted to prevent duplicate transactions
      if (linkedDoc.convertedToTransaction && linkedDoc.transactionId) {
        const existingTx = await Transaction.findOne({ _id: linkedDoc.transactionId, userId: req.userId });
        if (existingTx) {
          return res.status(409).json({
            success: false,
            message: 'This receipt has already been saved as a transaction.',
            transaction: existingTx,
          });
        }
      }
    }

    const finalMerchant = (merchant || vendorRecipient || '').trim();
    const finalTax = typeof tax === 'number' ? tax : (typeof receiptTax === 'number' ? receiptTax : null);
    const finalSubtotal = typeof subtotal === 'number' ? subtotal : null;
    const finalReceiptImage = (receiptImage || linkedDoc?.storedFileName || '').trim();
    const finalOcrStatus = ocrStatus || (linkedDoc ? 'completed' : 'none');

    const formattedItems = Array.isArray(items)
      ? items.map((it) => ({
          name: typeof it.name === 'string' ? it.name.trim() : (it.description || ''),
          quantity: typeof it.quantity === 'number' ? it.quantity : 1,
          price: typeof it.price === 'number' ? it.price : (it.unitPrice || 0),
          amount: typeof it.amount === 'number' ? it.amount : 0,
        }))
      : [];

    const newTransaction = new Transaction({
      userId: req.userId,
      title: title.trim(),
      amount: parsedAmount,
      type,
      category: category.trim(),
      paymentMethod,
      date: transactionDate,
      notes: notes ? notes.trim() : '',
      referenceNumber: referenceNumber ? referenceNumber.trim() : '',
      vendorRecipient: finalMerchant,
      merchant: finalMerchant,
      subtotal: finalSubtotal,
      tax: finalTax,
      receiptTax: finalTax,
      items: formattedItems,
      receiptImage: finalReceiptImage,
      ocrStatus: finalOcrStatus,
      documentId: linkedDoc ? linkedDoc._id : null,
      recurringScheduleId: recurringScheduleId || null,
    });

    const saved = await newTransaction.save();

    if (linkedDoc) {
      linkedDoc.convertedToTransaction = true;
      linkedDoc.transactionId = saved._id;
      await linkedDoc.save();
    }

    res.status(201).json({
      success: true,
      message: `${type === 'incoming' ? 'Incoming money' : 'Expense'} recorded successfully`,
      transaction: saved,
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ success: false, message: 'Failed to record transaction', error: error.message });
  }
};

/**
 * Update an existing transaction scoped to user
 */
export const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    const {
      title,
      amount,
      type,
      category,
      paymentMethod,
      date,
      notes,
      referenceNumber,
      vendorRecipient,
    } = req.body;

    const existing = await Transaction.findOne({ _id: id, userId: req.userId });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (title !== undefined) {
      if (!title.trim()) return res.status(400).json({ success: false, message: 'Title cannot be empty' });
      existing.title = title.trim();
    }

    if (amount !== undefined) {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
      }
      existing.amount = parsedAmount;
    }

    if (type !== undefined) {
      if (!['incoming', 'expense'].includes(type)) {
        return res.status(400).json({ success: false, message: 'Type must be incoming or expense' });
      }
      existing.type = type;
    }

    if (category !== undefined) {
      if (!category.trim()) return res.status(400).json({ success: false, message: 'Category cannot be empty' });
      existing.category = category.trim();
    }

    if (paymentMethod !== undefined) {
      if (!['Cash', 'UPI', 'Bank Transfer'].includes(paymentMethod)) {
        return res.status(400).json({ success: false, message: 'Invalid payment method' });
      }
      existing.paymentMethod = paymentMethod;
    }

    if (date !== undefined) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) return res.status(400).json({ success: false, message: 'Invalid date' });
      existing.date = parsedDate;
    }

    if (notes !== undefined) existing.notes = notes.trim();
    if (referenceNumber !== undefined) existing.referenceNumber = referenceNumber.trim();
    if (vendorRecipient !== undefined) existing.vendorRecipient = vendorRecipient.trim();

    const updated = await existing.save();

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      transaction: updated,
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ success: false, message: 'Failed to update transaction', error: error.message });
  }
};

/**
 * Delete a transaction scoped to user
 */
export const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Transaction not found or unauthorized' });
    }
    const deleted = await Transaction.findOneAndDelete({ _id: id, userId: req.userId });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Transaction not found or unauthorized' });
    }

    res.json({
      success: true,
      message: 'Transaction deleted successfully',
      deletedId: id,
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ success: false, message: 'Failed to delete transaction', error: error.message });
  }
};

/**
 * Quick Receipt Scan & Auto-Add Transaction
 *
 * Accepts a temporary receipt image, sends it to Gemini Vision for extraction,
 * classifies the transaction type, and either auto-creates the transaction or
 * returns extracted data for user confirmation.
 *
 * The temporary image file is ALWAYS deleted immediately after processing.
 * No image is stored permanently — only transaction data is saved to MongoDB.
 */
export const scanReceiptAndCreateTransaction = async (req, res) => {
  let tempFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No receipt image was uploaded.',
      });
    }

    tempFilePath = req.file.path;
    const mimeType = req.file.mimetype;

    // 1. Send image to Gemini Vision for extraction
    let geminiResult;
    try {
      geminiResult = await processReceiptWithGemini(tempFilePath, mimeType);
    } catch (geminiErr) {
      console.error('[ScanReceipt] Gemini processing error:', geminiErr.message);
      return res.status(422).json({
        success: false,
        message: 'Could not process receipt image. Please try again or enter the transaction manually.',
        error: geminiErr.message,
      });
    }

    if (!geminiResult?.success || !geminiResult?.data) {
      return res.status(422).json({
        success: false,
        message: 'Receipt image could not be read. Please try a clearer photo.',
      });
    }

    const data = geminiResult.data;

    // 2. Extract key fields from Gemini structured output
    const extractedMerchant = data.merchantName?.value || null;
    const extractedDateStr = data.date?.value || null;
    const extractedTotal = data.total?.value;
    const extractedSubtotal = data.subtotal?.value || null;
    const extractedTax = data.tax?.value || null;
    const extractedPaymentMethod = data.paymentMethod?.value || null;
    const extractedReceiptNumber = data.receiptNumber?.value || null;
    const extractedItems = Array.isArray(data.items)
      ? data.items.map((item, idx) => ({
          name: item.description?.value || `Item #${idx + 1}`,
          quantity: typeof item.quantity?.value === 'number' ? item.quantity.value : 1,
          price: typeof item.unitPrice?.value === 'number' ? item.unitPrice.value : 0,
          amount: typeof item.amount?.value === 'number' ? item.amount.value : 0,
        }))
      : [];

    // 3. Classify as income or expense
    const classification = classifyReceiptTransaction(data, data.rawText || '', []);
    const proposedType = classification.proposedType || 'expense';
    const suggestedCategory = classification.suggestedCategory || 'Office Supplies';

    // 4. Parse and validate amount
    const amount = typeof extractedTotal === 'number' && extractedTotal > 0
      ? Math.round(extractedTotal * 100) / 100
      : null;

    // 5. Parse and validate date
    let transactionDate = new Date();
    if (extractedDateStr) {
      const parsed = new Date(extractedDateStr);
      if (!isNaN(parsed.getTime())) {
        transactionDate = parsed;
      }
    }

    // 6. Normalize payment method to valid enum
    const validPaymentMethods = ['Cash', 'UPI', 'Bank Transfer'];
    let paymentMethod = 'Cash';
    if (extractedPaymentMethod) {
      const pmLower = extractedPaymentMethod.toLowerCase();
      if (pmLower.includes('upi') || pmLower.includes('gpay') || pmLower.includes('phonepe') || pmLower.includes('paytm')) {
        paymentMethod = 'UPI';
      } else if (pmLower.includes('bank') || pmLower.includes('transfer') || pmLower.includes('neft') || pmLower.includes('rtgs') || pmLower.includes('imps')) {
        paymentMethod = 'Bank Transfer';
      } else if (pmLower.includes('card') || pmLower.includes('credit') || pmLower.includes('debit')) {
        paymentMethod = 'Bank Transfer'; // Map card to Bank Transfer (closest valid option)
      } else if (validPaymentMethods.includes(extractedPaymentMethod)) {
        paymentMethod = extractedPaymentMethod;
      }
    }

    // 7. Build description
    const descParts = [];
    if (data.documentType && data.documentType !== 'other') {
      descParts.push(data.documentType.replace(/_/g, ' '));
    }
    if (extractedMerchant) {
      descParts.push(`from ${extractedMerchant}`);
    }
    const description = descParts.length > 0
      ? descParts.join(' ').trim()
      : 'Receipt scan transaction';

    // 8. Build title
    const title = extractedMerchant
      ? `${extractedMerchant}${extractedReceiptNumber ? ` #${extractedReceiptNumber}` : ''}`
      : `Scanned ${proposedType === 'incoming' ? 'Income' : 'Expense'}`;

    // 9. Determine if we can auto-save or need confirmation
    const needsConfirmation = (
      amount === null ||
      amount <= 0 ||
      data.total?.confidence < 70 ||
      data.requiresManualReview ||
      classification.confidence < 70
    );

    // Build extracted data response
    const extractedData = {
      merchant: extractedMerchant,
      date: transactionDate.toISOString().split('T')[0],
      amount,
      type: proposedType,
      category: suggestedCategory,
      paymentMethod,
      description,
      title,
      receiptNumber: extractedReceiptNumber,
      subtotal: extractedSubtotal,
      tax: extractedTax,
      items: extractedItems,
      confidence: classification.confidence,
      classificationReason: classification.reason,
      warnings: data.warnings || [],
      engine: geminiResult.engine,
    };

    if (needsConfirmation) {
      // Return extracted data for user to confirm/correct
      return res.status(200).json({
        success: true,
        autoSaved: false,
        needsConfirmation: true,
        extractedData,
        message: amount === null || amount <= 0
          ? 'Could not read the total amount. Please enter it manually.'
          : 'Please review and confirm the extracted details.',
      });
    }

    // 10. Auto-create transaction (confident extraction)
    const newTransaction = new Transaction({
      userId: req.userId,
      title: title.substring(0, 200),
      amount,
      type: proposedType,
      category: suggestedCategory,
      paymentMethod,
      date: transactionDate,
      notes: description,
      referenceNumber: extractedReceiptNumber || '',
      vendorRecipient: extractedMerchant || '',
      merchant: extractedMerchant || '',
      subtotal: typeof extractedSubtotal === 'number' ? extractedSubtotal : null,
      tax: typeof extractedTax === 'number' ? extractedTax : null,
      receiptTax: typeof extractedTax === 'number' ? extractedTax : null,
      items: extractedItems,
      // No receiptImage, no documentId, no ocrStatus — no image storage
    });

    const saved = await newTransaction.save();

    return res.status(201).json({
      success: true,
      autoSaved: true,
      needsConfirmation: false,
      transaction: saved,
      extractedData,
      message: `${proposedType === 'incoming' ? 'Income' : 'Expense'} of ₹${amount} auto-saved successfully.`,
    });
  } catch (error) {
    console.error('[ScanReceipt] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process receipt. Please try again.',
      error: error.message,
    });
  } finally {
    // ALWAYS delete temporary file, regardless of success or failure
    if (tempFilePath) {
      fs.promises.unlink(tempFilePath).catch((unlinkErr) => {
        console.warn('[ScanReceipt] Failed to delete temp file:', tempFilePath, unlinkErr.message);
      });
    }
  }
};
