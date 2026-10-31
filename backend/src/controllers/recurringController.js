import { RecurringSchedule } from '../models/RecurringSchedule.js';
import { Transaction } from '../models/Transaction.js';

const calculateNextDate = (currentDate, frequency) => {
  const d = new Date(currentDate);
  if (frequency === 'Daily') {
    d.setDate(d.getDate() + 1);
  } else if (frequency === 'Weekly') {
    d.setDate(d.getDate() + 7);
  } else if (frequency === 'Monthly') {
    d.setMonth(d.getMonth() + 1);
  } else if (frequency === 'Yearly') {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d;
};

export const getRecurringSchedules = async (req, res) => {
  try {
    const { status, type } = req.query;
    const filter = { userId: req.userId };
    if (status && status !== 'all') filter.status = status;
    if (type && ['incoming', 'expense'].includes(type)) filter.type = type;

    const schedules = await RecurringSchedule.find(filter)
      .sort({ nextScheduledDate: 1, createdAt: -1 })
      .populate('completedTransactions.transactionId');

    res.json({ success: true, count: schedules.length, schedules });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve recurring schedules', error: error.message });
  }
};

export const createRecurringSchedule = async (req, res) => {
  try {
    const {
      title,
      amount,
      type,
      category,
      paymentMethod,
      frequency,
      startDate,
      endDate,
      nextScheduledDate,
      notes,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
    }

    if (!['incoming', 'expense'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type must be incoming or expense' });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, message: 'Category is required' });
    }

    if (!['Cash', 'UPI', 'Bank Transfer'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Valid payment method required' });
    }

    if (!['Daily', 'Weekly', 'Monthly', 'Yearly'].includes(frequency)) {
      return res.status(400).json({ success: false, message: 'Valid frequency required' });
    }

    const start = startDate ? new Date(startDate) : new Date();
    const next = nextScheduledDate ? new Date(nextScheduledDate) : start;

    const schedule = new RecurringSchedule({
      userId: req.userId,
      title: title.trim(),
      amount: parsedAmount,
      type,
      category: category.trim(),
      paymentMethod,
      frequency,
      startDate: start,
      endDate: endDate ? new Date(endDate) : null,
      nextScheduledDate: next,
      status: 'Active',
      notes: notes ? notes.trim() : '',
    });

    const saved = await schedule.save();

    res.status(201).json({
      success: true,
      message: 'Recurring schedule created. Note: This schedule does not affect balances until confirmed.',
      schedule: saved,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create recurring schedule', error: error.message });
  }
};

export const updateRecurringSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      amount,
      type,
      category,
      paymentMethod,
      frequency,
      startDate,
      endDate,
      nextScheduledDate,
      status,
      notes,
    } = req.body;

    const schedule = await RecurringSchedule.findOne({ _id: id, userId: req.userId });
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Recurring schedule not found or unauthorized' });
    }

    if (title !== undefined) schedule.title = title.trim();
    if (amount !== undefined) {
      const p = parseFloat(amount);
      if (p > 0) schedule.amount = p;
    }
    if (type !== undefined && ['incoming', 'expense'].includes(type)) schedule.type = type;
    if (category !== undefined) schedule.category = category.trim();
    if (paymentMethod !== undefined && ['Cash', 'UPI', 'Bank Transfer'].includes(paymentMethod)) {
      schedule.paymentMethod = paymentMethod;
    }
    if (frequency !== undefined && ['Daily', 'Weekly', 'Monthly', 'Yearly'].includes(frequency)) {
      schedule.frequency = frequency;
    }
    if (startDate !== undefined) schedule.startDate = new Date(startDate);
    if (endDate !== undefined) schedule.endDate = endDate ? new Date(endDate) : null;
    if (nextScheduledDate !== undefined) schedule.nextScheduledDate = new Date(nextScheduledDate);
    if (status !== undefined && ['Active', 'Paused', 'Cancelled'].includes(status)) {
      schedule.status = status;
    }
    if (notes !== undefined) schedule.notes = notes.trim();

    const saved = await schedule.save();
    res.json({ success: true, message: 'Recurring schedule updated', schedule: saved });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update schedule', error: error.message });
  }
};

export const markOccurrenceCompleted = async (req, res) => {
  try {
    const { id } = req.params;
    const { actualAmount, actualDate, actualPaymentMethod, notes } = req.body;

    const schedule = await RecurringSchedule.findOne({ _id: id, userId: req.userId });
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found or unauthorized' });
    }

    if (schedule.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot execute a cancelled schedule' });
    }

    const txAmount = actualAmount ? parseFloat(actualAmount) : schedule.amount;
    const txDate = actualDate ? new Date(actualDate) : (schedule.nextScheduledDate || new Date());
    const txMethod = actualPaymentMethod || schedule.paymentMethod;

    // Create the actual real transaction scoped to userId
    const newTx = new Transaction({
      userId: req.userId,
      title: `${schedule.title} (${schedule.frequency} Recurring)`,
      amount: txAmount,
      type: schedule.type,
      category: schedule.category,
      paymentMethod: txMethod,
      date: txDate,
      notes: notes ? notes.trim() : (schedule.notes || `Generated from recurring schedule "${schedule.title}"`),
      recurringScheduleId: schedule._id,
    });

    const savedTx = await newTx.save();

    // Advance next scheduled date
    const nextDate = calculateNextDate(schedule.nextScheduledDate || new Date(), schedule.frequency);

    if (schedule.endDate && nextDate > new Date(schedule.endDate)) {
      schedule.status = 'Paused';
    }

    schedule.nextScheduledDate = nextDate;
    schedule.completedTransactions.push({
      transactionId: savedTx._id,
      date: txDate,
      amount: txAmount,
    });

    await schedule.save();

    res.status(201).json({
      success: true,
      message: `${schedule.type === 'incoming' ? 'Money marked as received' : 'Expense marked as paid'}! Actual ledger balance updated.`,
      transaction: savedTx,
      schedule,
    });
  } catch (error) {
    console.error('Error completing recurring transaction:', error);
    res.status(500).json({ success: false, message: 'Failed to complete recurring occurrence', error: error.message });
  }
};

export const deleteRecurringSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await RecurringSchedule.findOneAndDelete({ _id: id, userId: req.userId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Schedule not found or unauthorized' });
    }
    res.json({ success: true, message: 'Schedule deleted. Past completed transactions remain safe in ledger.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete schedule', error: error.message });
  }
};
