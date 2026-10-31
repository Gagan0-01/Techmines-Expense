import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useLedger } from '../../context/LedgerContext';
import { fetchMonthlyComparison } from '../../services/api';
import { formatINR } from '../../utils/currency';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { LoadingSpinner } from '../common/LoadingSpinner';

export const MonthlyComparisonModal = () => {
  const { isMonthlyComparisonModalOpen, setIsMonthlyComparisonModalOpen } = useLedger();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [comparisonData, setComparisonData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadData = async (targetDate) => {
    try {
      setIsLoading(true);
      setError(null);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      const res = await fetchMonthlyComparison(year, month);
      if (res.success) {
        setComparisonData(res);
      }
    } catch (err) {
      setError(err.message || 'Failed to load comparison data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isMonthlyComparisonModalOpen) {
      loadData(currentDate);
    }
  }, [isMonthlyComparisonModalOpen, currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleResetToCurrent = () => {
    setCurrentDate(new Date());
  };

  const renderDelta = (metric) => {
    if (!metric) return null;
    const { diff, pct } = metric;
    const isPositive = diff > 0;
    const isZero = diff === 0;

    return (
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        {isZero ? (
          <span className="text-zinc-500 flex items-center">
            <Minus className="w-3.5 h-3.5" /> No change
          </span>
        ) : isPositive ? (
          <span className="text-emerald-400 flex items-center gap-0.5">
            <ArrowUp className="w-3.5 h-3.5" />
            +{formatINR(diff)} {pct !== null ? `(+${pct}%)` : ''}
          </span>
        ) : (
          <span className="text-rose-400 flex items-center gap-0.5">
            <ArrowDown className="w-3.5 h-3.5" />
            −{formatINR(Math.abs(diff))} {pct !== null ? `(${pct}%)` : ''}
          </span>
        )}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isMonthlyComparisonModalOpen}
      onClose={() => setIsMonthlyComparisonModalOpen(false)}
      title="Monthly Financial Comparison"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5 font-sans">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-900 dark:text-white text-sm">
              {comparisonData?.currentPeriod?.label || 'Loading...'}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetToCurrent}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-xl cursor-pointer"
            >
              Current Month
            </button>
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner text="Computing monthly comparison..." />
        ) : error ? (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 rounded-xl text-sm">
            {error}
          </div>
        ) : comparisonData ? (
          <div className="space-y-4">
            <div className="text-xs text-slate-600 dark:text-zinc-400 flex items-center justify-between">
              <span>
                Comparing <strong className="text-slate-900 dark:text-white">{comparisonData.currentPeriod.label}</strong> against{' '}
                <strong className="text-slate-700 dark:text-zinc-300">{comparisonData.previousPeriod.label}</strong>
              </span>
              <span className="font-mono text-slate-500 dark:text-zinc-500 text-[11px]">
                {comparisonData.currentPeriod.count} transactions in {comparisonData.currentPeriod.label}
              </span>
            </div>

            {/* Metric Comparison Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Incoming Card */}
              <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-2">
                <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
                  Total Incoming
                </span>
                <div className="text-xl font-bold text-emerald-500 dark:text-emerald-400">
                  {formatINR(comparisonData.currentPeriod.incoming)}
                </div>
                <div className="text-xs text-slate-500 dark:text-zinc-500">
                  Prev: {formatINR(comparisonData.previousPeriod.incoming)}
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-zinc-900">
                  {renderDelta(comparisonData.comparison.incoming)}
                </div>
              </div>

              {/* Expenses Card */}
              <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-2">
                <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
                  Total Expenses
                </span>
                <div className="text-xl font-bold text-rose-500 dark:text-rose-400">
                  {formatINR(comparisonData.currentPeriod.expenses)}
                </div>
                <div className="text-xs text-slate-500 dark:text-zinc-500">
                  Prev: {formatINR(comparisonData.previousPeriod.expenses)}
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-zinc-900">
                  {renderDelta(comparisonData.comparison.expenses)}
                </div>
              </div>

              {/* Net Cash Flow Card */}
              <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-2">
                <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
                  Net Cash Flow
                </span>
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {formatINR(comparisonData.currentPeriod.netCashFlow)}
                </div>
                <div className="text-xs text-slate-500 dark:text-zinc-500">
                  Prev: {formatINR(comparisonData.previousPeriod.netCashFlow)}
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-zinc-900">
                  {renderDelta(comparisonData.comparison.netCashFlow)}
                </div>
              </div>
            </div>

            {/* Informational Guidance Notice */}
            <div className="text-[11px] text-slate-600 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-950 p-3 rounded-xl border border-slate-200 dark:border-zinc-800">
              * Note: Calculations are derived strictly from ledger records. Percentage changes are gracefully computed with zero division safeguards.
            </div>
          </div>
        ) : null}

        <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-zinc-800">
          <button
            onClick={() => setIsMonthlyComparisonModalOpen(false)}
            className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-[#ff5e00] hover:bg-[#ff6f1a] rounded-xl shadow-md cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
