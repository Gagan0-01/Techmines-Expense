import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Shield,
  Activity,
} from 'lucide-react';
import { api } from '../services/api';
import { BudgetVariance } from '../types';
import { formatCents } from '../utils/formatters';

export const AnalyticsView: React.FC = () => {
  const [fxExposure, setFxExposure] = useState<any>(null);
  const [budgetVariance, setBudgetVariance] = useState<BudgetVariance[]>([]);
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getFxExposure(),
      api.getBudgetVariance(),
      api.getCashFlowForecast(),
    ])
      .then(([fxRes, budgetRes, forecastRes]) => {
        if (fxRes.success) setFxExposure(fxRes.data);
        if (budgetRes.success) setBudgetVariance(budgetRes.data);
        if (forecastRes.success) setForecast(forecastRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 text-sm">
        Calculating financial analytics and risk metrics...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">
          Treasury Analytics, FX Risk & Variance
        </h2>
        <p className="text-xs text-slate-400">
          Value-at-Risk (VaR) exposures, departmental expenditure controls & cash flow projections
        </p>
      </div>

      {/* FX Exposure & VaR Section */}
      <div className="glass-card rounded-2xl p-6 border border-slate-700/60 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Foreign Exchange Currency Exposure & VaR</h3>
              <p className="text-xs text-slate-400">
                1-Day 95% Parametric Value at Risk on Multi-Currency Holdings
              </p>
            </div>
          </div>
          <span className="font-mono text-xs text-slate-400">
            Consolidated Base: <strong className="text-white">USD</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Currency</th>
                <th className="py-2.5 px-3 text-right">Holdings Balance</th>
                <th className="py-2.5 px-3 text-right">USD FX Rate</th>
                <th className="py-2.5 px-3 text-right">Consolidated USD Value</th>
                <th className="py-2.5 px-3 text-right">Portfolio Share</th>
                <th className="py-2.5 px-3 text-right">95% 1-Day VaR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-mono">
              {fxExposure?.holdings.map((h: any) => (
                <tr key={h.currency} className="hover:bg-slate-800/30">
                  <td className="py-3 px-3 font-bold text-blue-400 font-sans">{h.currency}</td>
                  <td className="py-3 px-3 text-right text-slate-200">
                    {formatCents(h.balanceCents, h.currency)}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-400">{h.rateToUsd.toFixed(4)}</td>
                  <td className="py-3 px-3 text-right font-bold text-white">
                    {formatCents(h.usdValueCents, 'USD')}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-300">
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                      {h.portfolioSharePercent}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-amber-400">
                    {h.var95Cents > 0 ? `±${formatCents(h.var95Cents, 'USD')}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 30-Day Cash Flow Forecast & Liquidity Run-Rate */}
      {forecast && (
        <div className="glass-card rounded-2xl p-6 border border-slate-700/60 shadow-xl">
          <div className="flex items-center space-x-2.5 mb-4">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">30-Day Projected Liquidity & Burn Velocity</h3>
              <p className="text-xs text-slate-400">
                Predictive simulation based on rolling transaction volume and scheduled payroll disbursements
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
                Avg Daily Inflow
              </span>
              <span className="text-lg font-bold font-mono text-emerald-400">
                {formatCents(forecast.avgDailyInflowCents, 'USD')}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
                Avg Daily Disbursement Burn
              </span>
              <span className="text-lg font-bold font-mono text-rose-400">
                {formatCents(forecast.avgDailyOutflowCents, 'USD')}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
                30-Day Projected Ending Balance
              </span>
              <span className="text-lg font-bold font-mono text-blue-400">
                {formatCents(
                  forecast.projection?.[forecast.projection.length - 1]?.projectedBalanceUsdCents ||
                    forecast.currentBalanceUsdCents,
                  'USD'
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Budget vs Actual Variance Report */}
      <div className="glass-card rounded-2xl p-6 border border-slate-700/60 shadow-xl">
        <div className="flex items-center space-x-2.5 mb-4">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Departmental Budget Variance & Run Rate</h3>
            <p className="text-xs text-slate-400">
              FY2026 committed capital allocations, actual spend & threshold alerts
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {budgetVariance.map((b) => (
            <div
              key={b.id}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-white">{b.department}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                      {b.period}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">{b.category}</span>
                </div>

                <div className="flex items-center space-x-4 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 text-[10px] block font-sans">Allocated</span>
                    <span className="text-slate-200">{formatCents(b.allocatedCents, b.currency)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-sans">Actual Spent</span>
                    <span className="text-white font-bold">{formatCents(b.spentCents, b.currency)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-sans">Remaining</span>
                    <span
                      className={`font-bold ${
                        b.varianceCents >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatCents(b.varianceCents, b.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-1.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    b.isExceeded
                      ? 'bg-rose-500'
                      : b.isNearLimit
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(b.utilizationPercent, 100)}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">
                  Utilization: <strong className="text-slate-200">{b.utilizationPercent}%</strong>
                </span>
                {b.isExceeded ? (
                  <span className="flex items-center text-rose-400 font-semibold">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Budget Cap Exceeded
                  </span>
                ) : b.isNearLimit ? (
                  <span className="flex items-center text-amber-400 font-semibold">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Approaching Alert Threshold
                  </span>
                ) : (
                  <span className="flex items-center text-emerald-400 font-semibold">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Within Target Range
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
