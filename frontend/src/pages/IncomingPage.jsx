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
import { ArrowDownLeft, Calendar, Hash, Plus } from 'lucide-react';
export const IncomingPage = () => {
  const { summary, openAddIncoming, categories } = useLedger();
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

  const loadIncomingList = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = {
        type: 'incoming',
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
      console.error('Error fetching incoming transactions:', err);
      setError(err.message || 'Failed to load incoming transactions');
    } finally {
      setIsLoading(false);
    }
  }, [range, sortBy, paymentMethod, selectedCategory, search, startDate, endDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadIncomingList();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadIncomingList]); 

  const handleCustomDateChange = (start, end) => {
    setStartDate(start);
    setEndDate(end);
  };

  const incomingCategories = categories.filter((c) => c.type === 'both' || c.type === 'incoming');

  return (
    <Layout
      title="Incoming Money"
      subtitle="Track customer payments, retainers, advances, and office income"
      actions={
        <button
          onClick={() => openAddIncoming()}
          className="inline-flex items-center gap-2 px-4 py-2 
          rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white
           text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Incoming</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Simple Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard
            title="Total Incoming This Month"
            amount={summary?.thisMonth?.incoming ?? 0}
            icon={ArrowDownLeft}
            variant="incoming"
            subtitle={`${summary?.thisMonth?.incomingCount ?? 0} transactions this month`}
          />

          <SummaryCard
            title="Total Incoming Today"
            amount={summary?.today?.incoming ?? 0}
            icon={Calendar}
            variant="incoming"
            subtitle={`${summary?.today?.incomingCount ?? 0} transactions today`}/>

          <SummaryCard
            title="Number of Incoming Transactions"
            amount={transactions.length}
            icon={Hash}
            variant="brand"
            subtitle="Matching active filters"
            badge="Recorded"
          />
        </div>

        {/* Quick Receipt Scan — AI-powered instant income from receipt photo */}
        <QuickReceiptScan
          onTransactionCreated={() => {
            loadIncomingList();
            refreshAll();
          }}
          defaultType="incoming"
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
          categories={incomingCategories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />

        {/* Table & Records */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Incoming Transactions{' '}
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 ml-1">
                ({transactions.length} records)
              </span>
            </h2>

            <button
              onClick={() => openAddIncoming()}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
            >
              + Record Another
            </button>
          </div>

          {isLoading ? (
            <LoadingSpinner text="Loading incoming transactions..." />
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium">
              {error}
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState
              title="No incoming records found"
              description="No incoming payments match the selected date or search criteria."
              actionText="+ Record Incoming Money"
              onAction={() => openAddIncoming()}
              icon={ArrowDownLeft}
            />
          ) : (
            <TransactionTable
              transactions={transactions}
              onRefresh={loadIncomingList}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};    
  