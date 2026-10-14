import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  ShieldAlert,
  ArrowUpRight,
  Percent,
} from 'lucide-react';
import { TreasurySummary } from '../types';
import { formatCents } from '../utils/formatters';

interface KpiCardsProps {
  summary: TreasurySummary | null;
  stats: {
    totalInflowCents: number;
    totalOutflowCents: number;
    netFlowCents: number;
  } | null;
  pendingApprovalsCount: number;
  onViewPending: () => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  summary,
  stats,
  pendingApprovalsCount,
  onViewPending,
}) => {
  const consolidatedCents = summary?.totalConsolidatedUsdCents || 0;
  const inflowCents = stats?.totalInflowCents || 0;
  const outflowCents = stats?.totalOutflowCents || 0;
  const netCents = stats?.netFlowCents || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Consolidated Treasury */}
      <div className="glass-card rounded-2xl p-5 border border-slate-700/60 relative overflow-hidden group">
        <div className="absolute -right-8 -bottom-8 w-28 h-28 bg-blue-600/10 rounded-full blur-xl group-hover:bg-blue-600/20 transition-all duration-300"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Consolidated Treasury
          </span>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight font-mono mb-1">
          {formatCents(consolidatedCents, 'USD')}
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <span className="inline-flex items-center text-emerald-400 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
            +4.2% MoM
          </span>
          <span>across {summary?.activeAccountsCount || 0} accounts</span>
        </div>
      </div>

      {/* 30-Day Cash Inflows */}
      <div className="glass-card rounded-2xl p-5 border border-slate-700/60 relative overflow-hidden group">
        <div className="absolute -right-8 -bottom-8 w-28 h-28 bg-emerald-600/10 rounded-full blur-xl group-hover:bg-emerald-600/20 transition-all duration-300"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            30-Day Collections (Inflows)
          </span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl lg:text-3xl font-extrabold text-emerald-400 tracking-tight font-mono mb-1">
          {formatCents(inflowCents, 'USD')}
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <span className="text-emerald-400 font-medium">Enterprise recurring</span>
          <span>& customer contracts</span>
        </div>
      </div>

      {/* 30-Day Cash Disbursements */}
      <div className="glass-card rounded-2xl p-5 border border-slate-700/60 relative overflow-hidden group">
        <div className="absolute -right-8 -bottom-8 w-28 h-28 bg-rose-600/10 rounded-full blur-xl group-hover:bg-rose-600/20 transition-all duration-300"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            30-Day Disbursements (Outflows)
          </span>
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl lg:text-3xl font-extrabold text-slate-100 tracking-tight font-mono mb-1">
          {formatCents(outflowCents, 'USD')}
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <span className="text-slate-300">Payroll, Cloud, Tax & Operations</span>
        </div>
      </div>

      {/* Net Velocity & Approvals Queue */}
      <div className="glass-card rounded-2xl p-5 border border-slate-700/60 relative overflow-hidden group">
        <div className="absolute -right-8 -bottom-8 w-28 h-28 bg-amber-600/10 rounded-full blur-xl group-hover:bg-amber-600/20 transition-all duration-300"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Net Cash Flow & Approvals
          </span>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Percent className="w-4 h-4" />
          </div>
        </div>
        <div
          className={`text-2xl lg:text-3xl font-extrabold tracking-tight font-mono mb-1 ${
            netCents >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {netCents >= 0 ? '+' : ''}
          {formatCents(netCents, 'USD')}
        </div>
        <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-800">
          <span className="text-slate-400">Dual-Control Pending:</span>
          {pendingApprovalsCount > 0 ? (
            <button
              onClick={onViewPending}
              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-semibold hover:bg-amber-500/30 transition-colors animate-pulse"
            >
              <ShieldAlert className="w-3 h-3" />
              <span>{pendingApprovalsCount} Action Required</span>
            </button>
          ) : (
            <span className="text-slate-400 font-medium text-[11px]">All cleared</span>
          )}
        </div>
      </div>
    </div>
  );
};
