import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/layout/Layout';
import { SummaryCard } from '../components/common/SummaryCard';
import { TransactionTable } from '../components/transactions/TransactionTable';
import { TransactionFilters } from '../components/transactions/TransactionFilters';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { useLedger } from '../context/LedgerContext';
import { fetchTransactions } from '../services/api';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Scale,
  FileSpreadsheet,
} from 'lucide-react';
import { formatINR } from '../utils/currency';

export const OfficePage = () => {
  const {
    summary,
    openAddIncoming,
    openAddExpense,
    setIsOpeningBalanceModalOpen,
    setIsMonthlyComparisonModalOpen,
    setIsExportModalOpen,
    categories,
  } = useLedger();

  // Filters State (Search completely omitted from Office Page)
  const [range, setRange] = useState('this_month');
  const [type, setType] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Transactions State
  const [transactions, setTransactions] = useState([]);
  const [isLoadingTx, setIsLoadingTx] = useState(true);
  const [error, setError] = useState(null);

  const loadTransactionsList = useCallback(async () => {
    try {
      setIsLoadingTx(true);
      setError(null);
      const params = {
        range,
        sortBy,
        type: type !== 'all' ? type : undefined,
        paymentMethod: paymentMethod !== 'all' ? paymentMethod : undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        startDate: range === 'custom' ? startDate : undefined,
        endDate: range === 'custom' ? endDate : undefined,
      };

      const res = await fetchTransactions(params);
      if (res.success) {
        setTransactions(res.transactions);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err.message || 'Failed to load transactions');
    } finally {
      setIsLoadingTx(false);
    }
  }, [range, sortBy, type, paymentMethod, selectedCategory, startDate, endDate]);

  useEffect(() => {
    loadTransactionsList();
  }, [loadTransactionsList]);

  const handleCustomDateChange = (start, end) => {
    setStartDate(start);
    setEndDate(end);
  };

  const periodStats = summary?.period || {
    incoming: 0,
    expenses: 0,
    netCashFlow: 0,
  };

  const desktopHeaderActions = (
    <div className="hidden sm:flex items-center gap-2">
      <button
        onClick={() => setIsOpeningBalanceModalOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0d0d0d] text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <Layers className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
        <span>Opening Balance</span>
      </button>

      <button
        onClick={() => setIsMonthlyComparisonModalOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0d0d0d] text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <Scale className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
        <span>Comparison</span>
      </button>

      <button
        onClick={() => setIsExportModalOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0d0d0d] text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
        <span>Export</span>
      </button>
    </div>
  );

  return (
    <Layout
      title="Office"
      subtitle="Financial overview, balances, and recent ledger records"
      actions={desktopHeaderActions}
    >
      <div className="space-y-5 sm:space-y-6">
        {/* Mobile Page Title Indicator */}
        <div className="md:hidden flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Office</h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsOpeningBalanceModalOpen(true)}
              className="text-xs font-medium text-slate-700 dark:text-zinc-300 bg-white dark:bg-[#0d0d0d] border border-slate-200 dark:border-zinc-800 px-2.5 py-1.5 rounded-lg hover:border-slate-300 dark:hover:border-zinc-700 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Opening
            </button>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="text-xs font-medium text-slate-700 dark:text-zinc-300 bg-white dark:bg-[#0d0d0d] border border-slate-200 dark:border-zinc-800 px-2.5 py-1.5 rounded-lg hover:border-slate-300 dark:hover:border-zinc-700 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Export
            </button>
          </div>
        </div>

        {/* 
          Two Main Prominent Actions: Add Incoming & Add Expense
          Highly accessible, comfortable touch targets across mobile, tablet, and desktop
        */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => openAddIncoming()}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm shadow-sm transition-all"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>+ Add Incoming</span>
          </button>

          <button
            type="button"
            onClick={() => openAddExpense()}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-semibold text-sm shadow-sm transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>+ Add Expense</span>
          </button>
        </div>

        {/* 
          Four Financial Summary Cards:
          Office Balance, Total Incoming, Total Expenses, Net Cash Flow
        */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* 1. Office Balance */}
          <SummaryCard
            title="Office Balance"
            amount={summary?.officeBalance ?? 0}
            icon={Wallet}
            variant="brand"
            subtitle={`Opening: ${formatINR(summary?.openingBalance ?? 0)}`}
            action={
              <button
                onClick={() => setIsOpeningBalanceModalOpen(true)}
                className="text-[#ff5e00] hover:text-[#ff7b29] font-semibold underline decoration-zinc-700"
              >
                Set Opening
              </button>
            }
          />

          {/* 2. Total Incoming */}
          <SummaryCard
            title="Total Incoming"
            amount={periodStats.incoming}
            icon={ArrowDownLeft}
            variant="incoming"
            subtitle={`${range.replace('_', ' ')}: ${periodStats.incomingCount ?? 0} records`}
          />

          {/* 3. Total Expenses */}
          <SummaryCard
            title="Total Expenses"
            amount={periodStats.expenses}
            icon={ArrowUpRight}
            variant="expense"
            subtitle={`${range.replace('_', ' ')}: ${periodStats.expenseCount ?? 0} records`}
          />

          {/* 4. Net Cash Flow */}
          <SummaryCard
            title="Net Cash Flow"
            amount={periodStats.netCashFlow}
            icon={periodStats.netCashFlow >= 0 ? TrendingUp : TrendingDown}
            variant={periodStats.netCashFlow >= 0 ? 'incoming' : 'expense'}
            subtitle="Incoming minus expenses"
          />
        </div>

        {/* 
          Relevant Filters WITHOUT a search bar (per strict requirement)
        */}
        <TransactionFilters
          hideSearch={true}
          range={range}
          onRangeChange={setRange}
          type={type}
          onTypeChange={setType}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          sortBy={sortBy}
          onSortChange={setSortBy}
          startDate={startDate}
          endDate={endDate}
          onCustomDateChange={handleCustomDateChange}
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />

        {/* Recent Transactions List */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Recent Transactions{' '}
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 ml-1">
                ({transactions.length} records)
              </span>
            </h3>

            <button
              onClick={() => setIsMonthlyComparisonModalOpen(true)}
              className="text-xs font-semibold text-[#ff5e00] hover:text-[#ff7b29]"
            >
              Compare Months →
            </button>
          </div>

          {isLoadingTx ? (
            <LoadingSpinner text="Retrieving ledger records..." />
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium">
              {error}
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState
              title="No transactions for this period"
              description="Start recording incoming payments and office disbursements using the actions above."
              actionText="+ Add Incoming"
              onAction={() => openAddIncoming()}
              secondaryActionText="+ Add Expense"
              onSecondaryAction={() => openAddExpense()}
            />
          ) : (
            <TransactionTable
              transactions={transactions}
              onRefresh={loadTransactionsList}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};
