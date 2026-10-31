import React, { useState } from 'react';
import { Search, Filter, X, ArrowUpDown } from 'lucide-react';

export const TransactionFilters = ({
  search = '',
  onSearchChange,
  range,
  onRangeChange,
  type,
  onTypeChange,
  paymentMethod,
  onPaymentMethodChange,
  sortBy,
  onSortChange,
  startDate,
  endDate,
  onCustomDateChange,
  categories = [],
  selectedCategory,
  onCategoryChange,
  hideTypeFilter = false,
  hideSearch = false, // When true (Office Page), completely omits search bar
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const rangeOptions = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'Last 7 Days', value: 'last_7_days' },
    { label: 'Last 30 Days', value: 'last_30_days' },
    { label: 'This Month', value: 'this_month' },
    { label: 'Last Month', value: 'last_month' },
    { label: 'All', value: 'all' },
    { label: 'Custom', value: 'custom' },
  ];

  const typeOptions = [
    { label: 'All Types', value: 'all' },
    { label: 'Incoming', value: 'incoming' },
    { label: 'Expenses', value: 'expense' },
  ];

  const methodOptions = [
    { label: 'All Methods', value: 'all' },
    { label: 'UPI', value: 'UPI' },
    { label: 'Cash', value: 'Cash' },
    { label: 'Bank Transfer', value: 'Bank Transfer' },
  ];

  const sortOptions = [
    { label: 'Newest First', value: 'newest' },
    { label: 'Oldest First', value: 'oldest' },
    { label: 'Highest Amount', value: 'highest' },
    { label: 'Lowest Amount', value: 'lowest' },
  ];

  return (
    <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl border border-slate-200 dark:border-zinc-800/80 p-4 shadow-sm dark:shadow-lg space-y-4 mb-6 font-sans transition-colors duration-200">
      {/* Top Search Bar (Only shown if hideSearch is false) */}
      {!hideSearch && (
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-zinc-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search transactions, categories, notes, or amounts…"
              value={search}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-[#ff5e00] transition-colors"
            />
            {search && onSearchChange && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Sort dropdown & Filter toggle */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => onSortChange && onSortChange(e.target.value)}
                className="appearance-none bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 pr-8 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-900 focus:outline-none focus:border-[#ff5e00] cursor-pointer"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 dark:text-zinc-500">
                <ArrowUpDown className="w-3.5 h-3.5" />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                showAdvanced || paymentMethod !== 'all' || selectedCategory !== 'all'
                  ? 'bg-[#ff5e00]/15 border-[#ff5e00]/50 text-[#ff5e00]'
                  : 'border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 dark:border-zinc-800 dark:text-zinc-400 dark:bg-zinc-950 dark:hover:bg-zinc-900 dark:hover:text-white'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>
          </div>
        </div>
      )}

      {/* Date Range Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mr-1 hidden sm:inline">
            Period:
          </span>
          {rangeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onRangeChange(opt.value)}
              className={`px-3 py-1.5 text-xs rounded-xl font-semibold transition-all cursor-pointer ${
                range === opt.value
                  ? 'bg-[#ff5e00] text-white shadow-md shadow-[#ff5e00]/25'
                  : 'bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* When search is hidden, place Sort and Filter toggle here */}
        {hideSearch && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => onSortChange && onSortChange(e.target.value)}
                className="appearance-none bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 pr-8 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-900 focus:outline-none focus:border-[#ff5e00] cursor-pointer"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 dark:text-zinc-500">
                <ArrowUpDown className="w-3.5 h-3.5" />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                showAdvanced || paymentMethod !== 'all' || selectedCategory !== 'all' || (type && type !== 'all')
                  ? 'bg-[#ff5e00]/15 border-[#ff5e00]/50 text-[#ff5e00]'
                  : 'border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 dark:border-zinc-800 dark:text-zinc-400 dark:bg-zinc-950 dark:hover:bg-zinc-900 dark:hover:text-white'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Custom Date Pickers */}
      {range === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-600 dark:text-zinc-400 font-medium">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onCustomDateChange(e.target.value, endDate)}
              className="border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-white focus:outline-none focus:border-[#ff5e00]"
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-600 dark:text-zinc-400 font-medium">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onCustomDateChange(startDate, e.target.value)}
              className="border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-white focus:outline-none focus:border-[#ff5e00]"
            />
          </div>
        </div>
      )}

      {/* Advanced Filter Row (Payment Method, Category, Type) */}
      {showAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200 dark:border-zinc-900 animate-in fade-in">
          {!hideTypeFilter && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                Transaction Type
              </label>
              <select
                value={type}
                onChange={(e) => onTypeChange(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#ff5e00] cursor-pointer"
              >
                {typeOptions.map((t) => (
                  <option key={t.value} value={t.value} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => onPaymentMethodChange(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#ff5e00] cursor-pointer"
            >
              {methodOptions.map((m) => (
                <option key={m.value} value={m.value} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#ff5e00] cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">All Categories</option>
              {categories.map((c) => (
                <option key={c._id || c.name} value={c.name} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
