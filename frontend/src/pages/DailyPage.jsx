import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { SummaryCard } from '../components/common/SummaryCard';
import { TransactionTable } from '../components/transactions/TransactionTable';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { DateRangeFilterBar } from '../components/tracker/DateRangeFilterBar';
import { MonthlyOverviewCard } from '../components/tracker/MonthlyOverviewCard';
import { DailyBreakdownItem } from '../components/tracker/DailyBreakdownItem';
import { useLedger } from '../context/LedgerContext';
import { useToast } from '../context/ToastContext';
import { fetchDateRangeBreakdown, deleteTransaction } from '../services/api';
import { formatINR } from '../utils/currency';
import { formatDate } from '../utils/date';
import {
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Share2,
  Search,
  ArrowUpDown,
  ChevronsUpDown,
  ListFilter,
  CalendarDays,
  X,
} from 'lucide-react';

export const DailyPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { openAddIncoming, openAddExpense, openEditTransaction, refreshAll, categories } = useLedger();
  const { addToast } = useToast();

  // Date Range Filter State
  const initialRange = searchParams.get('range') || 'this_month';
  const initialStart = searchParams.get('startDate') || '';
  const initialEnd = searchParams.get('endDate') || '';

  const [range, setRange] = useState(initialRange);
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);

  // Daily Breakdown & Summary Data
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Expanded days tracker (Set of date strings)
  const [expandedDays, setExpandedDays] = useState(new Set());
  const [areAllExpanded, setAreAllExpanded] = useState(true);
  const [breakdownSortOrder, setBreakdownSortOrder] = useState('desc'); // 'desc' = newest first, 'asc' = oldest first

  // Transaction History Search & Filter State
  const [historySearch, setHistorySearch] = useState('');
  const [historyType, setHistoryType] = useState('all');
  const [historyCategory, setHistoryCategory] = useState('all');
  const [historyMethod, setHistoryMethod] = useState('all');
  const [historySort, setHistorySort] = useState('newest');

  // Deletion Modal State
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Active view tab (Breakdown vs All Transactions Table)
  const [activeTab, setActiveTab] = useState('breakdown'); // 'breakdown' | 'transactions'

  // Load tracker data from API
  const loadTrackerData = useCallback(
    async (targetRange, targetStart, targetEnd) => {
      try {
        setIsLoading(true);
        setError(null);

        const params = {
          range: targetRange,
          startDate: targetRange === 'custom' ? targetStart : undefined,
          endDate: targetRange === 'custom' ? targetEnd : undefined,
          timezoneOffset: new Date().getTimezoneOffset(),
        };

        const res = await fetchDateRangeBreakdown(params);
        if (res.success) {
          setReportData(res);

          // Update actual resolved start & end dates in state
          if (res.period?.startDate) setStartDate(res.period.startDate);
          if (res.period?.endDate) setEndDate(res.period.endDate);

          // Expand days that have transactions, or all days if fewer than 15 days
          const allDates = (res.dailyBreakdown || []).map((d) => d.date);
          const daysWithTx = (res.dailyBreakdown || []).filter((d) => d.transactionCount > 0).map((d) => d.date);

          if (allDates.length <= 14) {
            setExpandedDays(new Set(allDates));
            setAreAllExpanded(true);
          } else {
            setExpandedDays(new Set(daysWithTx));
            setAreAllExpanded(false);
          }
        }
      } catch (err) {
        console.error('Error fetching date range breakdown:', err);
        setError(err.message || 'Failed to load date range tracker');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadTrackerData(range, startDate, endDate);
  }, [range, loadTrackerData]);

  // Sync range to URL parameters
  useEffect(() => {
    const params = new URLSearchParams();
    if (range) params.set('range', range);
    if (range === 'custom' && startDate && endDate) {
      params.set('startDate', startDate);
      params.set('endDate', endDate);
    }
    setSearchParams(params, { replace: true });
  }, [range, startDate, endDate, setSearchParams]);

  // Handle preset range switch
  const handleRangeChange = (newRange) => {
    setRange(newRange);
  };

  // Handle custom date apply
  const handleCustomApply = (newStart, newEnd) => {
    setStartDate(newStart);
    setEndDate(newEnd);
    setRange('custom');
    loadTrackerData('custom', newStart, newEnd);
  };

  // Handle filter reset to default (This Month)
  const handleReset = () => {
    setRange('this_month');
    setStartDate('');
    setEndDate('');
    loadTrackerData('this_month', '', '');
  };

  // Toggle individual day expanded state
  const handleToggleDay = (dateKey) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  // Toggle expand / collapse all days
  const handleToggleExpandAll = () => {
    if (!reportData?.dailyBreakdown) return;
    if (areAllExpanded) {
      setExpandedDays(new Set());
      setAreAllExpanded(false);
    } else {
      const allDates = reportData.dailyBreakdown.map((d) => d.date);
      setExpandedDays(new Set(allDates));
      setAreAllExpanded(true);
    }
  };

  // Delete transaction with confirmation
  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    try {
      setIsDeleting(true);
      await deleteTransaction(deletingId);
      addToast('Transaction deleted successfully', 'success');
      setDeletingId(null);
      // Refresh current view & global ledger context
      loadTrackerData(range, startDate, endDate);
      refreshAll();
    } catch (err) {
      addToast(err.message || 'Failed to delete transaction', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Share specific day report
  const handleShareDay = async (day) => {
    let reportText = `TECHMINES — DAILY FINANCIAL REPORT
Date: ${day.formattedDate} (${day.dayOfWeek})
----------------------------------------
DAILY SUMMARY:
• Total Income:   ${formatINR(day.totalIncome)}
• Total Expenses: ${formatINR(day.totalExpenses)}
• Daily Net:      ${day.netBalance >= 0 ? '+' : '−'}${formatINR(Math.abs(day.netBalance))}
• Transactions:   ${day.transactionCount}

`;
    if (day.incomeTransactions.length > 0) {
      reportText += `INCOMING PAYMENTS (${day.incomeTransactions.length}):\n`;
      day.incomeTransactions.forEach((tx, idx) => {
        reportText += `${idx + 1}. [+] ${formatINR(tx.amount)} — ${tx.title} (${tx.category}, ${tx.paymentMethod})\n`;
      });
      reportText += '\n';
    }

    if (day.expenseTransactions.length > 0) {
      reportText += `EXPENSES (${day.expenseTransactions.length}):\n`;
      day.expenseTransactions.forEach((tx, idx) => {
        reportText += `${idx + 1}. [-] ${formatINR(tx.amount)} — ${tx.title} (${tx.category}, ${tx.paymentMethod})\n`;
      });
      reportText += '\n';
    }

    reportText += `----------------------------------------\nTechMines Office Ledger`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Daily Report - ${day.formattedDate}`,
          text: reportText,
        });
        addToast('Day report shared successfully', 'success');
      } catch (err) {
        if (err.name !== 'AbortError') {
          await navigator.clipboard.writeText(reportText);
          addToast('Day report copied to clipboard', 'success');
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(reportText);
        addToast('Day report copied to clipboard', 'success');
      } catch (err) {
        addToast('Failed to copy report', 'error');
      }
    }
  };

  // Share overall period report
  const handleSharePeriodReport = async () => {
    if (!reportData) return;
    const summary = reportData.summary;
    const period = reportData.period;

    let reportText = `TECHMINES — FINANCIAL REPORT
Period: ${period.startDate} to ${period.endDate} (${period.totalDays} Days)
----------------------------------------
SUMMARY:
• Total Income:       ${formatINR(summary.totalIncome)} (${summary.incomeCount} records)
• Total Expenses:     ${formatINR(summary.totalExpenses)} (${summary.expenseCount} records)
• Net Balance:        ${summary.netBalance >= 0 ? '+' : '−'}${formatINR(Math.abs(summary.netBalance))}
• Total Transactions: ${summary.totalTransactions}
----------------------------------------
TechMines Office Ledger`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Financial Report (${period.startDate} to ${period.endDate})`,
          text: reportText,
        });
        addToast('Report shared successfully', 'success');
      } catch (err) {
        if (err.name !== 'AbortError') {
          await navigator.clipboard.writeText(reportText);
          addToast('Report copied to clipboard', 'success');
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(reportText);
        addToast('Report copied to clipboard', 'success');
      } catch (err) {
        addToast('Failed to copy report', 'error');
      }
    }
  };

  // Summary figures
  const summary = reportData?.summary || {
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0,
    totalTransactions: 0,
    incomeCount: 0,
    expenseCount: 0,
  };

  // Daily breakdown sorted according to breakdownSortOrder
  const displayedDailyBreakdown = useMemo(() => {
    if (!reportData?.dailyBreakdown) return [];
    const list = [...reportData.dailyBreakdown];
    if (breakdownSortOrder === 'asc') {
      return list.reverse();
    }
    return list;
  }, [reportData?.dailyBreakdown, breakdownSortOrder]);

  // All transactions filtered for the Transaction History tab/section
  const filteredHistoryTransactions = useMemo(() => {
    if (!reportData?.transactions) return [];
    let list = [...reportData.transactions];

    // Search query
    if (historySearch.trim()) {
      const q = historySearch.trim().toLowerCase();
      list = list.filter((tx) => {
        const titleMatch = (tx.title || '').toLowerCase().includes(q);
        const catMatch = (tx.category || '').toLowerCase().includes(q);
        const notesMatch = (tx.notes || '').toLowerCase().includes(q);
        const methodMatch = (tx.paymentMethod || '').toLowerCase().includes(q);
        const refMatch = (tx.referenceNumber || '').toLowerCase().includes(q);
        const vendorMatch = (tx.vendorRecipient || '').toLowerCase().includes(q);
        const amtMatch = String(tx.amount || '').includes(q);
        return titleMatch || catMatch || notesMatch || methodMatch || refMatch || vendorMatch || amtMatch;
      });
    }

    // Type filter
    if (historyType !== 'all') {
      list = list.filter((tx) => tx.type === historyType);
    }

    // Category filter
    if (historyCategory !== 'all') {
      list = list.filter((tx) => tx.category === historyCategory);
    }

    // Payment Method filter
    if (historyMethod !== 'all') {
      list = list.filter((tx) => tx.paymentMethod === historyMethod);
    }

    // Sorting
    list.sort((a, b) => {
      if (historySort === 'oldest') {
        return new Date(a.date) - new Date(b.date);
      }
      if (historySort === 'highest') {
        return b.amount - a.amount;
      }
      if (historySort === 'lowest') {
        return a.amount - b.amount;
      }
      return new Date(b.date) - new Date(a.date); // newest
    });

    return list;
  }, [reportData?.transactions, historySearch, historyType, historyCategory, historyMethod, historySort]);

  const hasAnyTransactionsInPeriod = summary.totalTransactions > 0;

  return (
    <Layout
      title="Daily Reports & Period Tracker"
      subtitle={`Daily breakdown and tracking for ${
        reportData?.period
          ? `${formatDate(reportData.period.startDate, 'dd MMM yyyy')} – ${formatDate(
              reportData.period.endDate,
              'dd MMM yyyy'
            )} (${reportData.period.totalDays} days)`
          : 'selected period'
      }`}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSharePeriodReport}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-[#0d0d0d] text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white shadow-sm transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-[#ff5e00]" />
            <span className="hidden sm:inline">Share Report</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* 1. Date Range Filter Controls */}
        <DateRangeFilterBar
          range={range}
          onRangeChange={handleRangeChange}
          startDate={startDate}
          endDate={endDate}
          onCustomApply={handleCustomApply}
          onReset={handleReset}
          totalDays={reportData?.period?.totalDays}
        />

        {/* 2. Four Financial Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          <SummaryCard
            title="Total Income"
            amount={summary.totalIncome}
            icon={ArrowDownLeft}
            variant="incoming"
            subtitle={`${summary.incomeCount} income records in period`}
          />

          <SummaryCard
            title="Total Expenses"
            amount={summary.totalExpenses}
            icon={ArrowUpRight}
            variant="expense"
            subtitle={`${summary.expenseCount} expense records in period`}
          />

          <SummaryCard
            title="Net Balance"
            amount={summary.netBalance}
            icon={summary.netBalance >= 0 ? TrendingUp : TrendingDown}
            variant={summary.netBalance >= 0 ? 'incoming' : 'expense'}
            subtitle="Total Income minus Total Expenses"
          />

          <SummaryCard
            title="Total Transactions"
            amount={summary.totalTransactions}
            icon={Receipt}
            variant="brand"
            subtitle={`${summary.incomeCount} in • ${summary.expenseCount} out`}
            isCurrency={false}
          />
        </div>

        {/* 3. Monthly Overview & Comparison Banner */}
        {reportData?.monthlyComparison && (
          <MonthlyOverviewCard comparisonData={reportData.monthlyComparison} />
        )}

        {/* Navigation Tabs between Daily Breakdown & All Transactions History */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pt-1">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('breakdown')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                activeTab === 'breakdown'
                  ? 'border-[#ff5e00] text-[#ff5e00]'
                  : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Daily Breakdown ({displayedDailyBreakdown.length} Days)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('transactions')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                activeTab === 'transactions'
                  ? 'border-[#ff5e00] text-[#ff5e00]'
                  : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ListFilter className="w-4 h-4" />
              <span>All Transactions ({summary.totalTransactions})</span>
            </button>
          </div>

          {activeTab === 'breakdown' && (
            <div className="flex items-center gap-2 pb-1.5">
              <button
                type="button"
                onClick={() =>
                  setBreakdownSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))
                }
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0a0a0a] text-[11px] font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                title="Toggle date order"
              >
                <ArrowUpDown className="w-3 h-3" />
                <span>{breakdownSortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleExpandAll}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0a0a0a] text-[11px] font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <ChevronsUpDown className="w-3 h-3" />
                <span>{areAllExpanded ? 'Collapse All' : 'Expand All'}</span>
              </button>
            </div>
          )}
        </div>

        {/* 4. Tab 1: Daily Income and Expense Breakdown (The Core Feature) */}
        {activeTab === 'breakdown' && (
          <div className="space-y-4">
            {isLoading ? (
              <LoadingSpinner text="Retrieving daily breakdown..." />
            ) : error ? (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium">
                {error}
              </div>
            ) : !hasAnyTransactionsInPeriod && displayedDailyBreakdown.length === 0 ? (
              <EmptyState
                title="No transactions for this date range"
                description="There are no records in the selected period. Start by recording incoming money or office expenses."
                actionText="+ Add Incoming"
                onAction={() => openAddIncoming()}
                secondaryActionText="+ Add Expense"
                onSecondaryAction={() => openAddExpense()}
              />
            ) : (
              <div className="space-y-3">
                {displayedDailyBreakdown.map((day) => (
                  <DailyBreakdownItem
                    key={day.date}
                    day={day}
                    isExpanded={expandedDays.has(day.date)}
                    onToggle={() => handleToggleDay(day.date)}
                    onAddIncoming={(d) => openAddIncoming({ date: `${d}T10:00` })}
                    onAddExpense={(d) => openAddExpense({ date: `${d}T10:00` })}
                    onEditTransaction={openEditTransaction}
                    onDeleteTransaction={(id) => setDeletingId(id)}
                    onShareDay={handleShareDay}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. Tab 2: Transaction History with Search & Filters */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            {/* Search and Filters Bar */}
            <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                {/* Search Input */}
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-zinc-500">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by description, category, payment method, notes, or amount..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-[#ff5e00] transition-colors"
                  />
                  {historySearch && (
                    <button
                      type="button"
                      onClick={() => setHistorySearch('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Sort dropdown */}
                <div className="relative">
                  <select
                    value={historySort}
                    onChange={(e) => setHistorySort(e.target.value)}
                    className="appearance-none bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 pr-8 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-900 focus:outline-none focus:border-[#ff5e00] cursor-pointer"
                  >
                    <option value="newest" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Newest First</option>
                    <option value="oldest" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Oldest First</option>
                    <option value="highest" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Highest Amount</option>
                    <option value="lowest" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Lowest Amount</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 dark:text-zinc-500">
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Sub-Filters: Type, Category, Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1">
                    Type
                  </label>
                  <select
                    value={historyType}
                    onChange={(e) => setHistoryType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#ff5e00] cursor-pointer"
                  >
                    <option value="all">All Types</option>
                    <option value="incoming">Incoming Only</option>
                    <option value="expense">Expenses Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1">
                    Category
                  </label>
                  <select
                    value={historyCategory}
                    onChange={(e) => setHistoryCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#ff5e00] cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((c) => (
                      <option key={c._id || c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1">
                    Payment Method
                  </label>
                  <select
                    value={historyMethod}
                    onChange={(e) => setHistoryMethod(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#ff5e00] cursor-pointer"
                  >
                    <option value="all">All Methods</option>
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Transaction List */}
            {isLoading ? (
              <LoadingSpinner text="Retrieving transactions..." />
            ) : filteredHistoryTransactions.length === 0 ? (
              <EmptyState
                title="No matching transactions found"
                description={
                  historySearch || historyType !== 'all' || historyCategory !== 'all' || historyMethod !== 'all'
                    ? 'Try adjusting your search query or filters to find records.'
                    : 'No transactions recorded in this date range.'
                }
                actionText="+ Add Incoming"
                onAction={() => openAddIncoming()}
                secondaryActionText="+ Add Expense"
                onSecondaryAction={() => openAddExpense()}
              />
            ) : (
              <TransactionTable
                transactions={filteredHistoryTransactions}
                onRefresh={() => loadTrackerData(range, startDate, endDate)}
              />
            )}
          </div>
        )}

        {/* Global Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={Boolean(deletingId)}
          onClose={() => setDeletingId(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Transaction"
          message="Are you sure you want to delete this financial record? All affected daily totals and summary cards will be recalculated immediately."
          confirmText="Yes, Delete Record"
          isLoading={isDeleting}
        />
      </div>
    </Layout>
  );
};

export default DailyPage;
