
import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction.js';
import { Settings } from '../models/Settings.js';
import {
  getSingleDayRange,
  getDateRange,
  parseLocalDate,
  formatLocalDate,
  getDaysBetweenDates,
} from '../utils/dateUtils.js';

/**
 * Get full Daily Ledger Report for a specific calendar date scoped to user
 */
export const getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    const { start, end, date: targetDate } = getSingleDayRange(date);

    // Fetch transactions for this single day and this user
    const transactions = await Transaction.find({
      userId: req.userId,
      date: { $gte: start, $lte: end },
    }).sort({ date: -1, _id: -1 });

    let totalIncoming = 0;
    let totalExpenses = 0;

    // Payment method breakdown
    const paymentMethods = {
      Cash: { incoming: 0, expenses: 0, net: 0, count: 0 },
      UPI: { incoming: 0, expenses: 0, net: 0, count: 0 },
      'Bank Transfer': { incoming: 0, expenses: 0, net: 0, count: 0 },
    };

    // Category summaries
    const incomingCategories = {};
    const expenseCategories = {};

    transactions.forEach((tx) => {
      const amount = tx.amount;
      const method = paymentMethods[tx.paymentMethod] ? tx.paymentMethod : 'Cash';

      if (tx.type === 'incoming') {
        totalIncoming += amount;
        paymentMethods[method].incoming += amount;
        paymentMethods[method].count += 1;

        if (!incomingCategories[tx.category]) {
          incomingCategories[tx.category] = { category: tx.category, total: 0, count: 0 };
        }
        incomingCategories[tx.category].total += amount;
        incomingCategories[tx.category].count += 1;
      } else {
        totalExpenses += amount;
        paymentMethods[method].expenses += amount;
        paymentMethods[method].count += 1;

        if (!expenseCategories[tx.category]) {
          expenseCategories[tx.category] = { category: tx.category, total: 0, count: 0 };
        }
        expenseCategories[tx.category].total += amount;
        expenseCategories[tx.category].count += 1;
      }
    });

    totalIncoming = Math.round(totalIncoming * 100) / 100;
    totalExpenses = Math.round(totalExpenses * 100) / 100;
    const netCashFlow = Math.round((totalIncoming - totalExpenses) * 100) / 100;

    Object.keys(paymentMethods).forEach((m) => {
      paymentMethods[m].incoming = Math.round(paymentMethods[m].incoming * 100) / 100;
      paymentMethods[m].expenses = Math.round(paymentMethods[m].expenses * 100) / 100;
      paymentMethods[m].net = Math.round((paymentMethods[m].incoming - paymentMethods[m].expenses) * 100) / 100;
    });

    const incomingCategoriesList = Object.values(incomingCategories)
      .map((c) => ({ ...c, total: Math.round(c.total * 100) / 100 }))
      .sort((a, b) => b.total - a.total);

    const expenseCategoriesList = Object.values(expenseCategories)
      .map((c) => ({ ...c, total: Math.round(c.total * 100) / 100 }))
      .sort((a, b) => b.total - a.total);

    res.json({
      success: true,
      date: targetDate.toISOString().split('T')[0],
      summary: {
        totalIncoming,
        totalExpenses,
        netCashFlow,
        transactionCount: transactions.length,
      },
      paymentMethodBreakdown: [
        { method: 'Cash', ...paymentMethods.Cash },
        { method: 'UPI', ...paymentMethods.UPI },
        { method: 'Bank Transfer', ...paymentMethods['Bank Transfer'] },
      ],
      categories: {
        incoming: incomingCategoriesList,
        expenses: expenseCategoriesList,
      },
      transactions,
    });
  } catch (error) {
    console.error('Error fetching daily report:', error);
    res.status(500).json({ success: false, message: 'Failed to generate daily report', error: error.message });
  }
};

/**
 * Get Monthly Comparison scoped to user
 */
export const getMonthlyComparison = async (req, res) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year, 10) || now.getFullYear();
    const month = parseInt(req.query.month, 10) !== undefined ? parseInt(req.query.month, 10) : now.getMonth();

    const userObjectId = new mongoose.Types.ObjectId(req.userId);

    const curStart = new Date(year, month, 1, 0, 0, 0, 0);
    const curEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const prevStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const prevEnd = new Date(year, month, 0, 23, 59, 59, 999);

    const curStats = await Transaction.aggregate([
      { $match: { userId: userObjectId, date: { $gte: curStart, $lte: curEnd } } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const prevStats = await Transaction.aggregate([
      { $match: { userId: userObjectId, date: { $gte: prevStart, $lte: prevEnd } } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    let curIncoming = 0,
      curExpenses = 0,
      curInCount = 0,
      curExpCount = 0;
    curStats.forEach((s) => {
      if (s._id === 'incoming') {
        curIncoming = Math.round(s.total * 100) / 100;
        curInCount = s.count;
      }
      if (s._id === 'expense') {
        curExpenses = Math.round(s.total * 100) / 100;
        curExpCount = s.count;
      }
    });

    let prevIncoming = 0,
      prevExpenses = 0,
      prevInCount = 0,
      prevExpCount = 0;
    prevStats.forEach((s) => {
      if (s._id === 'incoming') {
        prevIncoming = Math.round(s.total * 100) / 100;
        prevInCount = s.count;
      }
      if (s._id === 'expense') {
        prevExpenses = Math.round(s.total * 100) / 100;
        prevExpCount = s.count;
      }
    });

    const curNet = Math.round((curIncoming - curExpenses) * 100) / 100;
    const prevNet = Math.round((prevIncoming - prevExpenses) * 100) / 100;

    const calcChange = (cur, prev) => {
      const diff = Math.round((cur - prev) * 100) / 100;
      let pct = null;
      if (prev > 0) {
        pct = Math.round(((cur - prev) / prev) * 1000) / 10;
      } else if (prev === 0 && cur > 0) {
        pct = 100;
      } else if (prev === 0 && cur === 0) {
        pct = 0;
      }
      return { diff, pct };
    };

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const currentMonthLabel = `${monthNames[month]} ${year}`;
    const prevMonthDate = new Date(year, month - 1, 1);
    const previousMonthLabel = `${monthNames[prevMonthDate.getMonth()]} ${prevMonthDate.getFullYear()}`;

    res.json({
      success: true,
      currentPeriod: {
        year,
        month,
        label: currentMonthLabel,
        incoming: curIncoming,
        expenses: curExpenses,
        netCashFlow: curNet,
        count: curInCount + curExpCount,
      },
      previousPeriod: {
        year: prevMonthDate.getFullYear(),
        month: prevMonthDate.getMonth(),
        label: previousMonthLabel,
        incoming: prevIncoming,
        expenses: prevExpenses,
        netCashFlow: prevNet,
        count: prevInCount + prevExpCount,
      },
      comparison: {
        incoming: calcChange(curIncoming, prevIncoming),
        expenses: calcChange(curExpenses, prevExpenses),
        netCashFlow: calcChange(curNet, prevNet),
      },
    });
  } catch (error) {
    console.error('Error fetching monthly comparison:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate monthly comparison', error: error.message });
  }
};

/**
 * Get dataset for Report Export scoped to user
 */
export const getExportData = async (req, res) => {
  try {
    const { reportType, range = 'this_month', startDate, endDate, type, category, paymentMethod } = req.query;

    const filter = { userId: req.userId };
    if (type && ['incoming', 'expense'].includes(type)) filter.type = type;
    if (category && category !== 'all') filter.category = category;
    if (paymentMethod && paymentMethod !== 'all') filter.paymentMethod = paymentMethod;

    let dateRange = null;
    if (reportType === 'daily') {
      const dRange = getSingleDayRange(startDate);
      dateRange = { start: dRange.start, end: dRange.end };
    } else {
      dateRange = getDateRange(range, startDate, endDate);
    }

    if (dateRange) {
      filter.date = { $gte: dateRange.start, $lte: dateRange.end };
    }

    const transactions = await Transaction.find(filter).sort({ date: -1, _id: -1 });

    let totalIncoming = 0;
    let totalExpenses = 0;

    const methodSummary = {
      Cash: { incoming: 0, expenses: 0 },
      UPI: { incoming: 0, expenses: 0 },
      'Bank Transfer': { incoming: 0, expenses: 0 },
    };

    const categorySummary = {};

    transactions.forEach((tx) => {
      const amt = tx.amount;
      const m = methodSummary[tx.paymentMethod] ? tx.paymentMethod : 'Cash';

      if (tx.type === 'incoming') {
        totalIncoming += amt;
        methodSummary[m].incoming += amt;
      } else {
        totalExpenses += amt;
        methodSummary[m].expenses += amt;
      }

      if (!categorySummary[tx.category]) {
        categorySummary[tx.category] = { category: tx.category, incoming: 0, expenses: 0, count: 0 };
      }
      if (tx.type === 'incoming') categorySummary[tx.category].incoming += amt;
      else categorySummary[tx.category].expenses += amt;
      categorySummary[tx.category].count += 1;
    });

    totalIncoming = Math.round(totalIncoming * 100) / 100;
    totalExpenses = Math.round(totalExpenses * 100) / 100;

    const settings = await Settings.findOne({ userId: req.userId });

    res.json({
      success: true,
      meta: {
        appName: 'TechMines Office Ledger',
        currency: 'INR',
        currencySymbol: '₹',
        generatedAt: new Date(),
        filterCriteria: {
          range,
          startDate: dateRange ? dateRange.start : null,
          endDate: dateRange ? dateRange.end : null,
          type: type || 'all',
          category: category || 'all',
          paymentMethod: paymentMethod || 'all',
        },
        openingBalance: settings ? settings.openingBalance : 0,
      },
      summary: {
        totalIncoming,
        totalExpenses,
        netCashFlow: Math.round((totalIncoming - totalExpenses) * 100) / 100,
        transactionCount: transactions.length,
      },
      paymentMethods: methodSummary,
      categories: Object.values(categorySummary),
      transactions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate export data', error: error.message });
  }
};

/**
 * Get comprehensive Date Range & Daily Breakdown Tracker scoped to user
 */
export const getDateRangeBreakdown = async (req, res) => {
  try {
    const {
      range = 'this_month',
      startDate,
      endDate,
      timezoneOffset,
      sortBy = 'newest',
    } = req.query;

    // Validate custom date range
    if (range === 'custom') {
      if (startDate && endDate) {
        const pStart = parseLocalDate(startDate);
        const pEnd = parseLocalDate(endDate);
        if (isNaN(pStart.getTime()) || isNaN(pEnd.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid start or end date format. Please use YYYY-MM-DD.' });
        }
        if (pStart > pEnd) {
          return res.status(400).json({ success: false, message: 'Start date cannot be after end date.' });
        }
      }
    }

    const dateRange = getDateRange(range, startDate, endDate) || getDateRange('this_month');
    const start = dateRange.start;
    const end = dateRange.end;

    const userObjectId = new mongoose.Types.ObjectId(req.userId);

    // Fetch all transactions for this period and user
    const transactions = await Transaction.find({
      userId: userObjectId,
      date: { $gte: start, $lte: end },
    }).sort({ date: -1, _id: -1 });

    // Overall summary calculation
    let totalIncome = 0;
    let totalExpenses = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    transactions.forEach((tx) => {
      const amt = tx.amount;
      if (tx.type === 'incoming') {
        totalIncome += amt;
        incomeCount += 1;
      } else {
        totalExpenses += amt;
        expenseCount += 1;
      }
    });

    totalIncome = Math.round(totalIncome * 100) / 100;
    totalExpenses = Math.round(totalExpenses * 100) / 100;
    const netBalance = Math.round((totalIncome - totalExpenses) * 100) / 100;
    const totalTransactions = incomeCount + expenseCount;

    // Helper to determine transaction local calendar date key (YYYY-MM-DD)
    const getTxDateKey = (txDate) => {
      if (timezoneOffset !== undefined) {
        const offsetMin = parseInt(timezoneOffset, 10);
        if (!isNaN(offsetMin)) {
          const localEpoch = txDate.getTime() - offsetMin * 60000;
          return new Date(localEpoch).toISOString().split('T')[0];
        }
      }
      return formatLocalDate(txDate);
    };

    // Group transactions by dateKey
    const txByDate = {};
    transactions.forEach((tx) => {
      const key = getTxDateKey(tx.date);
      if (!txByDate[key]) {
        txByDate[key] = [];
      }
      txByDate[key].push(tx);
    });

    // Calendar days between start and end (newest to oldest)
    const calendarDays = getDaysBetweenDates(start, end, 'desc');

    const dayOfWeekNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const dailyBreakdown = calendarDays.map((day) => {
      const dateKey = formatLocalDate(day);
      const dayTxList = txByDate[dateKey] || [];

      let dayIncome = 0;
      let dayExpenses = 0;
      const incomeTransactions = [];
      const expenseTransactions = [];

      const paymentMethods = {
        Cash: { incoming: 0, expenses: 0, net: 0, count: 0 },
        UPI: { incoming: 0, expenses: 0, net: 0, count: 0 },
        'Bank Transfer': { incoming: 0, expenses: 0, net: 0, count: 0 },
      };

      dayTxList.forEach((tx) => {
        const amt = tx.amount;
        const method = paymentMethods[tx.paymentMethod] ? tx.paymentMethod : 'Cash';

        if (tx.type === 'incoming') {
          dayIncome += amt;
          incomeTransactions.push(tx);
          paymentMethods[method].incoming += amt;
          paymentMethods[method].count += 1;
        } else {
          dayExpenses += amt;
          expenseTransactions.push(tx);
          paymentMethods[method].expenses += amt;
          paymentMethods[method].count += 1;
        }
      });

      dayIncome = Math.round(dayIncome * 100) / 100;
      dayExpenses = Math.round(dayExpenses * 100) / 100;
      const dayNet = Math.round((dayIncome - dayExpenses) * 100) / 100;

      Object.keys(paymentMethods).forEach((m) => {
        paymentMethods[m].incoming = Math.round(paymentMethods[m].incoming * 100) / 100;
        paymentMethods[m].expenses = Math.round(paymentMethods[m].expenses * 100) / 100;
        paymentMethods[m].net = Math.round((paymentMethods[m].incoming - paymentMethods[m].expenses) * 100) / 100;
      });

      return {
        date: dateKey,
        formattedDate: `${monthNames[day.getMonth()]} ${day.getDate()}, ${day.getFullYear()}`,
        dayOfWeek: dayOfWeekNames[day.getDay()],
        totalIncome: dayIncome,
        totalExpenses: dayExpenses,
        netBalance: dayNet,
        transactionCount: dayTxList.length,
        incomeCount: incomeTransactions.length,
        expenseCount: expenseTransactions.length,
        incomeTransactions,
        expenseTransactions,
        allTransactions: dayTxList,
        paymentMethods,
      };
    });

    // Monthly overview & comparison
    const targetMonth = start.getMonth();
    const targetYear = start.getFullYear();

    const curMonthStart = new Date(targetYear, targetMonth, 1, 0, 0, 0, 0);
    const curMonthEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    const prevMonthStart = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0, 0);
    const prevMonthEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const [curMonthAgg, prevMonthAgg] = await Promise.all([
      Transaction.aggregate([
        { $match: { userId: userObjectId, date: { $gte: curMonthStart, $lte: curMonthEnd } } },
        { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Transaction.aggregate([
        { $match: { userId: userObjectId, date: { $gte: prevMonthStart, $lte: prevMonthEnd } } },
        { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    let curIn = 0, curExp = 0, curInCnt = 0, curExpCnt = 0;
    curMonthAgg.forEach((s) => {
      if (s._id === 'incoming') { curIn = Math.round(s.total * 100) / 100; curInCnt = s.count; }
      if (s._id === 'expense') { curExp = Math.round(s.total * 100) / 100; curExpCnt = s.count; }
    });

    let prevIn = 0, prevExp = 0, prevInCnt = 0, prevExpCnt = 0;
    prevMonthAgg.forEach((s) => {
      if (s._id === 'incoming') { prevIn = Math.round(s.total * 100) / 100; prevInCnt = s.count; }
      if (s._id === 'expense') { prevExp = Math.round(s.total * 100) / 100; prevExpCnt = s.count; }
    });

    const curNet = Math.round((curIn - curExp) * 100) / 100;
    const prevNet = Math.round((prevIn - prevExp) * 100) / 100;

    const safePct = (current, previous) => {
      if (previous > 0) {
        return Math.round(((current - previous) / previous) * 1000) / 10;
      }
      if (previous === 0 && current > 0) return 100;
      return 0;
    };

    const monthlyComparison = {
      currentMonth: {
        year: targetYear,
        month: targetMonth,
        label: `${monthNames[targetMonth]} ${targetYear}`,
        totalIncome: curIn,
        totalExpenses: curExp,
        netBalance: curNet,
        transactionCount: curInCnt + curExpCnt,
      },
      previousMonth: {
        year: prevMonthStart.getFullYear(),
        month: prevMonthStart.getMonth(),
        label: `${monthNames[prevMonthStart.getMonth()]} ${prevMonthStart.getFullYear()}`,
        totalIncome: prevIn,
        totalExpenses: prevExp,
        netBalance: prevNet,
        transactionCount: prevInCnt + prevExpCnt,
      },
      differences: {
        incomeDiff: Math.round((curIn - prevIn) * 100) / 100,
        incomePctDiff: safePct(curIn, prevIn),
        expenseDiff: Math.round((curExp - prevExp) * 100) / 100,
        expensePctDiff: safePct(curExp, prevExp),
        netDiff: Math.round((curNet - prevNet) * 100) / 100,
      },
    };

    // Sort transactions according to sortBy parameter
    const sortedTransactions = [...transactions].sort((a, b) => {
      if (sortBy === 'oldest') {
        return new Date(a.date) - new Date(b.date);
      }
      if (sortBy === 'highest') {
        return b.amount - a.amount;
      }
      if (sortBy === 'lowest') {
        return a.amount - b.amount;
      }
      return new Date(b.date) - new Date(a.date);
    });

    res.json({
      success: true,
      period: {
        range,
        startDate: formatLocalDate(start),
        endDate: formatLocalDate(end),
        totalDays: calendarDays.length,
      },
      summary: {
        totalIncome,
        totalExpenses,
        netBalance,
        totalTransactions,
        incomeCount,
        expenseCount,
      },
      dailyBreakdown,
      monthlyComparison,
      transactions: sortedTransactions,
    });
  } catch (error) {
    console.error('Error fetching date range breakdown:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch date range breakdown', error: error.message });
  }
};
