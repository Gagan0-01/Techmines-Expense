import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction.js';
import { Settings } from '../models/Settings.js';
import { getDateRange } from '../utils/dateUtils.js';

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

    // Pagination
    let query = Transaction.find(filter).sort(sortOptions);
    let totalCount = await Transaction.countDocuments(filter);

    if (page && limit) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
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
    const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.userId });
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
      vendorRecipient: vendorRecipient ? vendorRecipient.trim() : '',
      recurringScheduleId: recurringScheduleId || null,
    });

    const saved = await newTransaction.save();

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
