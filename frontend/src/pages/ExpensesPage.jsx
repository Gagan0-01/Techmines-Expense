import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/layout/Layout';
import { SummaryCard } from '../components/common/SummaryCard';
import { TransactionTable } from '../components/transactions/TransactionTable';
import { TransactionFilters } from '../components/transactions/TransactionFilters';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { QuickReceiptScan } from '../components/transactions/QuickReceiptScan';
import { useLedger } from '../context/LedgerContext';
import { fetchTransactions } from '../services/api';
import { ArrowUpRight, Calendar, Hash, Tags, Plus } from 'lucide-react';

export const ExpensesPage = () => {
  const { summary, openAddExpense, categories, setIsCategoryModalOpen } = useLedger();

  const [search, setSearch] = useState('');
  const [range, setRange] = useState('this_month');
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadExpensesList = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = {
        type: 'expense',
        range,
        sortBy,
        paymentMethod: paymentMethod !== 'all' ? paymentMethod : undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: search.trim() || undefined,
        startDate: range === 'custom' ? startDate : undefined,
        endDate: range === 'custom' ? endDate : undefined,
      };

      const res = await fetchTransactions(params);
      if (res.success) {
        setTransactions(res.transactions);
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setError(err.message || 'Failed to load expense transactions');
    } finally {
      setIsLoading(false);
    }
  }, [range, sortBy, paymentMethod, selectedCategory, search, startDate, endDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadExpensesList();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadExpensesList]);

  const handleCustomDateChange = (start, end) => {
    setStartDate(start);
    setEndDate(end);
  };

  const expenseCategories = categories.filter((c) => c.type === 'both' || c.type === 'expense');

  return (
    <Layout
      title="Office Expenses"
      subtitle="Manage rent, salaries, utilities, supplies, and office disbursements"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0d0d0d] text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <Tags className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
            <span>Categories</span>
          </button>
          <button
            onClick={() => openAddExpense()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Expense</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Simple Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard
            title="Total Expenses This Month"
            amount={summary?.thisMonth?.expenses ?? 0}
            icon={ArrowUpRight}
            variant="expense"
            subtitle={`${summary?.thisMonth?.expenseCount ?? 0} expense entries this month`}
          />

          <SummaryCard
            title="Total Expenses Today"
            amount={summary?.today?.expenses ?? 0}
            icon={Calendar}
            variant="expense"
            subtitle={`${summary?.today?.expenseCount ?? 0} expense entries today`}
          />

          <SummaryCard
            title="Number of Expense Transactions"
            amount={transactions.length}
            icon={Hash}
            variant="brand"
            subtitle="Matching active filters"
            badge="Recorded"
          />
        </div>

        {/* Quick Receipt Scan — AI-powered instant expense from receipt photo */}
        <QuickReceiptScan
          onTransactionCreated={() => {
            loadExpensesList();
            refreshAll();
          }}
          defaultType="expense"
        />

        {/* Filter Controls */}
        <TransactionFilters
          search={search}
          onSearchChange={setSearch}
          range={range}
          onRangeChange={setRange}
          hideTypeFilter={true}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          sortBy={sortBy}
          onSortChange={setSortBy}
          startDate={startDate}
          endDate={endDate}
          onCustomDateChange={handleCustomDateChange}
          categories={expenseCategories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />

        {/* Table & Records */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Expense Records{' '}
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 ml-1">
                ({transactions.length} records)
              </span>
            </h2>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white sm:hidden"
              >
                Manage Categories
              </button>
              <button
                onClick={() => openAddExpense()}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300"
              >
                + Record Another
              </button>
            </div>
          </div>

          {isLoading ? (
            <LoadingSpinner text="Loading expense transactions..." />
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium">
              {error}
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState
              title="No expense records found"
              description="No office expenses recorded for this filter range."
              actionText="+ Record Expense"
              onAction={() => openAddExpense()}
              icon={ArrowUpRight}
            />
          ) : (
            <TransactionTable
              transactions={transactions}
              onRefresh={loadExpensesList}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};
