import React, { useState, useEffect } from 'react';
import { Calendar, RotateCcw, Check, AlertCircle } from 'lucide-react';

export const DateRangeFilterBar = ({
  range,
  onRangeChange,
  startDate,
  endDate,
  onCustomApply,
  onReset,
  totalDays,
}) => {
  const [localStart, setLocalStart] = useState(startDate || '');
  const [localEnd, setLocalEnd] = useState(endDate || '');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    setLocalStart(startDate || '');
    setLocalEnd(endDate || '');
  }, [startDate, endDate]);

  const presetOptions = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'Last 7 Days', value: 'last_7_days' },
    { label: 'Last 30 Days', value: 'last_30_days' },
    { label: 'This Month', value: 'this_month' },
    { label: 'Last Month', value: 'last_month' },
    { label: 'Custom Date Range', value: 'custom' },
  ];

  const handleApply = (e) => {
    if (e) e.preventDefault();
    setValidationError('');

    if (!localStart || !localEnd) {
      setValidationError('Please select both Start Date and End Date.');
      return;
    }

    if (localStart > localEnd) {
      setValidationError('Start date cannot be later than end date.');
      return;
    }

    onCustomApply(localStart, localEnd);
  };

  const handlePresetClick = (presetValue) => {
    setValidationError('');
    onRangeChange(presetValue);
  };

  return (
    <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 sm:p-5 shadow-sm transition-colors duration-200 space-y-4">
      {/* Top Filter Chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#ff5e00] shrink-0" />
          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
            Date Filter
          </span>
          {totalDays !== undefined && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800">
              {totalDays} {totalDays === 1 ? 'day' : 'days'} selected
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors self-end sm:self-auto cursor-pointer"
          title="Reset to default (This Month)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Filter</span>
        </button>
      </div>

      {/* Preset Buttons Grid / Flex */}
      <div className="flex flex-wrap gap-2">
        {presetOptions.map((opt) => {
          const isActive = range === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handlePresetClick(opt.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[#ff5e00] text-white shadow-md shadow-[#ff5e00]/25'
                  : 'bg-slate-50 dark:bg-zinc-900/80 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Custom Date Range Panel (Shown when Custom is selected or toggleable) */}
      {range === 'custom' && (
        <form
          onSubmit={handleApply}
          className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 animate-in fade-in duration-200"
        >
          <div className="flex flex-1 items-center gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Start Date
              </label>
              <input
                type="date"
                required
                value={localStart}
                onChange={(e) => {
                  setLocalStart(e.target.value);
                  setValidationError('');
                }}
                className="w-full font-medium text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs bg-slate-50 dark:bg-black focus:outline-none focus:border-[#ff5e00] transition-colors"
              />
            </div>

            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                End Date
              </label>
              <input
                type="date"
                required
                value={localEnd}
                onChange={(e) => {
                  setLocalEnd(e.target.value);
                  setValidationError('');
                }}
                className="w-full font-medium text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs bg-slate-50 dark:bg-black focus:outline-none focus:border-[#ff5e00] transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:self-end">
            <button
              type="submit"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#ff5e00] hover:bg-[#e05300] text-white text-xs font-bold transition-all shadow-md shadow-[#ff5e00]/20 cursor-pointer active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Filter</span>
            </button>

            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </form>
      )}

      {/* Validation Error banner */}
      {validationError && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
};
