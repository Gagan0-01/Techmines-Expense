import React, { useState } from 'react';
import {
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Scale,
} from 'lucide-react';
import { formatINR } from '../../utils/currency';

export const MonthlyOverviewCard = ({ comparisonData }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!comparisonData || !comparisonData.currentMonth) return null;

  const { currentMonth, previousMonth, differences } = comparisonData;

  const renderDelta = (diff, pct, invertColors = false) => {
    if (diff === 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-500 dark:text-zinc-500">
          <Minus className="w-3 h-3" /> No change
        </span>
      );
    }

    const isPositive = diff > 0;
    // For expenses: decrease is good (green), increase is bad (rose)
    const isGood = invertColors ? !isPositive : isPositive;

    const Icon = isPositive ? ArrowUp : ArrowDown;
    const colorClass = isGood
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-rose-600 dark:text-rose-400';

    const formattedDiff = formatINR(Math.abs(diff));
    const sign = isPositive ? '+' : '−';
    const pctString = pct !== null && pct !== undefined ? ` (${sign}${Math.abs(pct)}%)` : '';

    return (
      <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${colorClass}`}>
        <Icon className="w-3 h-3" />
        {sign}{formattedDiff}{pctString}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm transition-colors duration-200 overflow-hidden">
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 dark:hover:bg-zinc-900/40 transition-colors select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#ff5e00]/10 text-[#ff5e00] border border-[#ff5e00]/20">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                Monthly Overview & Comparison
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800">
                {currentMonth.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Performance compared against previous month ({previousMonth.label})
            </p>
          </div>
        </div>

        <button
          type="button"
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-1 border-t border-slate-100 dark:border-zinc-800/80 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-3">
            {/* Monthly Total Income */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Monthly Income
              </div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                {formatINR(currentMonth.totalIncome)}
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-slate-200/60 dark:border-zinc-800/60 pt-2">
                <span className="text-[10px] text-slate-400 dark:text-zinc-500">vs Prev Month:</span>
                {renderDelta(differences?.incomeDiff ?? 0, differences?.incomePctDiff)}
              </div>
            </div>

            {/* Monthly Total Expenses */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Monthly Expenses
              </div>
              <div className="text-lg font-bold text-rose-600 dark:text-rose-400 font-mono mt-1">
                {formatINR(currentMonth.totalExpenses)}
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-slate-200/60 dark:border-zinc-800/60 pt-2">
                <span className="text-[10px] text-slate-400 dark:text-zinc-500">vs Prev Month:</span>
                {renderDelta(differences?.expenseDiff ?? 0, differences?.expensePctDiff, true)}
              </div>
            </div>

            {/* Monthly Net Balance */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Monthly Net Balance
              </div>
              <div
                className={`text-lg font-bold font-mono mt-1 ${
                  currentMonth.netBalance >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {currentMonth.netBalance >= 0 ? '+' : '−'}
                {formatINR(Math.abs(currentMonth.netBalance))}
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-slate-200/60 dark:border-zinc-800/60 pt-2">
                <span className="text-[10px] text-slate-400 dark:text-zinc-500">Net Delta:</span>
                {renderDelta(differences?.netDiff ?? 0, null)}
              </div>
            </div>

            {/* Total Transaction Count */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Monthly Transactions
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-1">
                {currentMonth.transactionCount}{' '}
                <span className="text-xs font-normal text-slate-400 dark:text-zinc-500">records</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-slate-200/60 dark:border-zinc-800/60 pt-2">
                <span className="text-[10px] text-slate-400 dark:text-zinc-500">Previous Month:</span>
                <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                  {previousMonth.transactionCount} records
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
