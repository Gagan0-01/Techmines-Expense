import React from 'react';
import {
  ChevronDown,
  ChevronUp,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Share2,
  Calendar,
  Edit2,
  Trash2,
} from 'lucide-react';
import { formatINR } from '../../utils/currency';
import { formatTime } from '../../utils/date';

export const DailyBreakdownItem = ({
  day,
  isExpanded,
  onToggle,
  onAddIncoming,
  onAddExpense,
  onEditTransaction,
  onDeleteTransaction,
  onShareDay,
}) => {
  const hasTransactions = day.transactionCount > 0;
  const isNetPositive = day.netBalance > 0;
  const isNetZero = day.netBalance === 0;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        hasTransactions
          ? 'bg-white dark:bg-[#0a0a0a] border-slate-200 dark:border-zinc-800 shadow-sm'
          : 'bg-slate-50/70 dark:bg-zinc-950/60 border-slate-200/60 dark:border-zinc-800/60 opacity-80 hover:opacity-100'
      }`}
    >
      {/* Date Header Accordion Bar */}
      <div
        onClick={onToggle}
        className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900/40 select-none transition-colors"
      >
        {/* Left: Date & Day */}
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl shrink-0 border ${
              hasTransactions
                ? 'bg-slate-100 dark:bg-zinc-900 text-[#ff5e00] border-slate-200 dark:border-zinc-800'
                : 'bg-slate-100 dark:bg-zinc-900/60 text-slate-400 dark:text-zinc-600 border-slate-200 dark:border-zinc-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                {day.formattedDate}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                — {day.dayOfWeek}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  hasTransactions
                    ? 'bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800'
                    : 'bg-slate-200/60 dark:bg-zinc-900/40 text-slate-400 dark:text-zinc-600'
                }`}
              >
                {day.transactionCount} {day.transactionCount === 1 ? 'txn' : 'txns'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Daily Totals & Controls */}
        <div className="flex items-center justify-between md:justify-end gap-2.5 flex-wrap">
          {/* Income badge */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold font-mono">
            <ArrowDownLeft className="w-3.5 h-3.5 shrink-0" />
            <span>+{formatINR(day.totalIncome)}</span>
          </div>

          {/* Expense badge */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold font-mono">
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
            <span>−{formatINR(day.totalExpenses)}</span>
          </div>

          {/* Net balance badge */}
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-bold font-mono ${
              isNetZero
                ? 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800'
                : isNetPositive
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
            }`}
          >
            <span className="text-[10px] uppercase font-sans font-semibold tracking-wider mr-0.5">
              Net:
            </span>
            <span>
              {isNetZero ? '' : isNetPositive ? '+' : '−'}
              {formatINR(Math.abs(day.netBalance))}
            </span>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onAddIncoming(day.date)}
              className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
              title={`Add incoming money on ${day.formattedDate}`}
            >
              <Plus className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onAddExpense(day.date)}
              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
              title={`Add expense on ${day.formattedDate}`}
            >
              <Plus className="w-4 h-4" />
            </button>

            {hasTransactions && (
              <button
                type="button"
                onClick={() => onShareDay(day)}
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                title="Share this day's report"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onToggle}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="p-4 pt-1 border-t border-slate-100 dark:border-zinc-800/80 space-y-4 animate-in fade-in duration-150">
          {/* Payment Methods breakdown summary for the day */}
          {hasTransactions && day.paymentMethods && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mr-1">
                Methods:
              </span>
              {Object.entries(day.paymentMethods).map(([mName, mStats]) => {
                if (mStats.count === 0) return null;
                return (
                  <div
                    key={mName}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs"
                  >
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">{mName}</span>
                    <span className="text-slate-400 dark:text-zinc-500 font-mono text-[10px]">
                      (In: +{formatINR(mStats.incoming)} | Exp: −{formatINR(mStats.expenses)})
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty day state */}
          {!hasTransactions ? (
            <div className="py-6 px-4 text-center rounded-xl bg-slate-50/50 dark:bg-zinc-950/40 border border-dashed border-slate-200 dark:border-zinc-800 space-y-2">
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                No financial transactions recorded on {day.formattedDate}.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onAddIncoming(day.date)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Incoming</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAddExpense(day.date)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Expense</span>
                </button>
              </div>
            </div>
          ) : (
            /* Transactions Breakdown: Two Columns (Income vs Expense) */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Income Column */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
                      Income Transactions
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    +{formatINR(day.totalIncome)} ({day.incomeCount})
                  </span>
                </div>

                {day.incomeTransactions.length === 0 ? (
                  <div className="text-xs text-slate-400 dark:text-zinc-500 italic py-3 text-center">
                    No income transactions on this day.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {day.incomeTransactions.map((tx) => (
                      <div
                        key={tx._id}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800/80 hover:border-emerald-500/40 transition-colors flex items-start justify-between gap-3 group"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                            {tx.title}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span className="px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold">
                              {tx.category}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold">
                              {tx.paymentMethod}
                            </span>
                            {tx.date && (
                              <span className="text-slate-400 dark:text-zinc-500">
                                {formatTime(tx.date)}
                              </span>
                            )}
                          </div>
                          {tx.notes && (
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-2 pt-0.5">
                              {tx.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                            +{formatINR(tx.amount)}
                          </span>
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => onEditTransaction(tx)}
                              className="p-1 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
                              title="Edit transaction"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteTransaction(tx._id)}
                              className="p-1 text-rose-500 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors cursor-pointer"
                              title="Delete transaction"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Expense Column */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
                      Expense Transactions
                    </span>
                  </div>
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 font-mono">
                    −{formatINR(day.totalExpenses)} ({day.expenseCount})
                  </span>
                </div>

                {day.expenseTransactions.length === 0 ? (
                  <div className="text-xs text-slate-400 dark:text-zinc-500 italic py-3 text-center">
                    No expense transactions on this day.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {day.expenseTransactions.map((tx) => (
                      <div
                        key={tx._id}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800/80 hover:border-rose-500/40 transition-colors flex items-start justify-between gap-3 group"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                            {tx.title}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span className="px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold">
                              {tx.category}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold">
                              {tx.paymentMethod}
                            </span>
                            {tx.date && (
                              <span className="text-slate-400 dark:text-zinc-500">
                                {formatTime(tx.date)}
                              </span>
                            )}
                          </div>
                          {tx.notes && (
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-2 pt-0.5">
                              {tx.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className="font-bold text-sm text-rose-600 dark:text-rose-400 font-mono">
                            −{formatINR(tx.amount)}
                          </span>
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => onEditTransaction(tx)}
                              className="p-1 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
                              title="Edit transaction"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteTransaction(tx._id)}
                              className="p-1 text-rose-500 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors cursor-pointer"
                              title="Delete transaction"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
