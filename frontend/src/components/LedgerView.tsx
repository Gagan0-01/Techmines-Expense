import React, { useState, useEffect } from 'react';
import {
  Scale,
  Calendar,
  Search,
  Filter,
} from 'lucide-react';
import { LedgerEntry } from '../types';
import { api } from '../services/api';
import { formatCents, formatDate } from '../utils/formatters';

interface LedgerViewProps {
  entries: LedgerEntry[];
}

export const LedgerView: React.FC<LedgerViewProps> = ({ entries }) => {
  const [activeTab, setActiveTab] = useState<'ENTRIES' | 'TRIAL_BALANCE'>('ENTRIES');
  const [trialBalance, setTrialBalance] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [fiscalFilter, setFiscalFilter] = useState('ALL');

  useEffect(() => {
    api.getTrialBalance().then((res) => {
      if (res.success) setTrialBalance(res.data);
    }).catch(console.error);
  }, []);

  const fiscalPeriods = ['ALL', ...Array.from(new Set(entries.map((e) => e.fiscalPeriod).filter(Boolean)))];

  const filteredEntries = entries.filter((e) => {
    const matchesSearch =
      e.entryNumber.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.lines.some((l) => l.accountName.toLowerCase().includes(search.toLowerCase()));

    const matchesFiscal = fiscalFilter === 'ALL' || e.fiscalPeriod === fiscalFilter;
    return matchesSearch && matchesFiscal;
  });

  return (
    <div className="space-y-6">
      {/* Header and Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Double-Entry General Ledger</h2>
          <p className="text-xs text-slate-400">
            Immutable financial journal entries, dual-leg balance verification & trial balances
          </p>
        </div>

        <div className="flex items-center space-x-1.5 p-1 bg-slate-900 border border-slate-700/80 rounded-xl">
          <button
            onClick={() => setActiveTab('ENTRIES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'ENTRIES'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Journal Entries ({entries.length})
          </button>
          <button
            onClick={() => setActiveTab('TRIAL_BALANCE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'TRIAL_BALANCE'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Trial Balance
          </button>
        </div>
      </div>

      {/* Trial Balance Status Banner */}
      {trialBalance && (
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            trialBalance.isBalanced
              ? 'bg-emerald-950/20 border-emerald-500/30'
              : 'bg-rose-950/20 border-rose-500/30'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-xl ${
                trialBalance.isBalanced
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-white">General Ledger Equilibrium:</span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    trialBalance.isBalanced
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {trialBalance.isBalanced ? '✓ 100% Balanced' : '⚠ Out of Balance'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Total Debits exactly match Total Credits across all posted subsidiary ledgers.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-6 text-xs font-mono">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-sans">Total Debits</span>
              <span className="text-emerald-400 font-bold text-sm">
                {formatCents(trialBalance.grandDebitCents, 'USD')}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-sans">Total Credits</span>
              <span className="text-emerald-400 font-bold text-sm">
                {formatCents(trialBalance.grandCreditCents, 'USD')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Journal Entries */}
      {activeTab === 'ENTRIES' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="glass-panel rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search journal entry #, account name, memo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900/80 border border-slate-700/60 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center space-x-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={fiscalFilter}
                onChange={(e) => setFiscalFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {fiscalPeriods.map((period) => (
                  <option key={period} value={period}>
                    Period: {period}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Entries List */}
          <div className="space-y-4">
            {filteredEntries.map((entry) => (
              <div
                key={entry._id}
                className="glass-card rounded-2xl p-5 border border-slate-700/60 shadow-lg"
              >
                {/* Entry Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-800 gap-2">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-sm font-bold text-blue-400">
                      {entry.entryNumber}
                    </span>
                    <span className="text-xs text-slate-300 font-semibold">{entry.description}</span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs text-slate-400 font-mono">
                    <span className="flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1 text-slate-500" />
                      {formatDate(entry.postingDate)}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      Period: {entry.fiscalPeriod}
                    </span>
                  </div>
                </div>

                {/* Double Entry Lines Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800/80">
                        <th className="py-1.5 px-3">Account Code</th>
                        <th className="py-1.5 px-3">Account Name</th>
                        <th className="py-1.5 px-3">Memo</th>
                        <th className="py-1.5 px-3 text-right">Debit</th>
                        <th className="py-1.5 px-3 text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {entry.lines.map((line, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/20">
                          <td className="py-2 px-3 font-mono text-slate-400">{line.accountCode}</td>
                          <td className="py-2 px-3 font-medium text-slate-200">
                            {line.accountName}
                          </td>
                          <td className="py-2 px-3 text-slate-400 text-[11px] truncate max-w-xs">
                            {line.memo || '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                            {line.debitCents > 0
                              ? formatCents(line.debitCents, line.currency)
                              : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-rose-400">
                            {line.creditCents > 0
                              ? formatCents(line.creditCents, line.currency)
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-700 font-mono font-bold text-xs bg-slate-900/40">
                        <td colSpan={3} className="py-2 px-3 text-right uppercase tracking-wider text-slate-400 font-sans text-[10px]">
                          Total
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-400">
                          {formatCents(entry.totalDebitCents, 'USD')}
                        </td>
                        <td className="py-2 px-3 text-right text-rose-400">
                          {formatCents(entry.totalCreditCents, 'USD')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Trial Balance */}
      {activeTab === 'TRIAL_BALANCE' && trialBalance && (
        <div className="glass-card rounded-2xl border border-slate-700/60 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Account Code</th>
                  <th className="py-3 px-4">Account Title</th>
                  <th className="py-3 px-4">Currency</th>
                  <th className="py-3 px-4 text-right">Debit Total</th>
                  <th className="py-3 px-4 text-right">Credit Total</th>
                  <th className="py-3 px-4 text-right">Net Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {trialBalance.accounts.map((acc: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-4 font-semibold text-blue-400">{acc.accountCode}</td>
                    <td className="py-2.5 px-4 text-slate-200 font-sans">{acc.accountName}</td>
                    <td className="py-2.5 px-4 text-slate-400">{acc.currency}</td>
                    <td className="py-2.5 px-4 text-right text-emerald-400">
                      {formatCents(acc.totalDebitCents, acc.currency)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-rose-400">
                      {formatCents(acc.totalCreditCents, acc.currency)}
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-bold ${
                        acc.netBalanceCents >= 0 ? 'text-slate-100' : 'text-rose-400'
                      }`}
                    >
                      {formatCents(acc.netBalanceCents, acc.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
