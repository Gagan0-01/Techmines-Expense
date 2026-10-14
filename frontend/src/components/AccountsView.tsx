import React, { useState } from 'react';
import {
  Building,
  Globe,
  Plus,
  Search,
  Filter,
} from 'lucide-react';
import { Account } from '../types';
import { formatCents } from '../utils/formatters';

interface AccountsViewProps {
  accounts: Account[];
  onOpenCreateAccount: () => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  onOpenCreateAccount,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  const currencies = ['ALL', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', 'CHF'];
  const types = [
    'ALL',
    'OPERATING',
    'PAYROLL',
    'INVESTMENT',
    'TAX_RESERVE',
    'CLEARING',
  ];

  const filtered = accounts.filter((acc) => {
    const matchesSearch =
      acc.name.toLowerCase().includes(search.toLowerCase()) ||
      acc.accountNumber.toLowerCase().includes(search.toLowerCase()) ||
      acc.institution.toLowerCase().includes(search.toLowerCase()) ||
      acc.entityName.toLowerCase().includes(search.toLowerCase());

    const matchesCurr = selectedCurrency === 'ALL' || acc.currency === selectedCurrency;
    const matchesType = selectedType === 'ALL' || acc.accountType === selectedType;

    return matchesSearch && matchesCurr && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Treasury Cash & Bank Accounts</h2>
          <p className="text-xs text-slate-400">
            Real-time multi-currency bank accounts, liquidity sweeps, and reserve positions
          </p>
        </div>

        <button
          onClick={onOpenCreateAccount}
          className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-glow-blue"
        >
          <Plus className="w-4 h-4" />
          <span>Add Treasury Account</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by account name, number, institution, entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900/80 border border-slate-700/60 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Currency & Type Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
              Currency:
            </span>
            {currencies.map((curr) => (
              <button
                key={curr}
                onClick={() => setSelectedCurrency(curr)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  selectedCurrency === curr
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {curr}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0 border-l border-slate-800 pl-3">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  Type: {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((acc) => (
          <div
            key={acc._id}
            className="glass-card rounded-2xl p-5 border border-slate-700/60 glass-card-hover flex flex-col justify-between"
          >
            <div>
              {/* Card Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-blue-400">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-snug">{acc.name}</h3>
                    <p className="text-[11px] text-slate-400 font-mono">{acc.institution}</p>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider border ${
                    acc.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {acc.status}
                </span>
              </div>

              {/* Balance Section */}
              <div className="my-4 py-3 px-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
                  Available Balance
                </div>
                <div className="text-xl font-extrabold text-white font-mono tracking-tight">
                  {formatCents(acc.availableBalanceCents, acc.currency)}
                </div>
                {acc.isMainTreasury && (
                  <span className="inline-block mt-1 text-[10px] text-blue-400 font-semibold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    Main Treasury Clearing Hub
                  </span>
                )}
              </div>

              {/* Account Metadata */}
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Account Number:</span>
                  <span className="font-mono text-slate-200">{acc.accountNumber}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Account Type:</span>
                  <span className="font-semibold text-slate-200">{acc.accountType}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Operating Entity:</span>
                  <span className="text-slate-200 truncate max-w-[170px]">{acc.entityName}</span>
                </div>
                {acc.swiftBic && (
                  <div className="flex items-center justify-between text-slate-400">
                    <span>SWIFT / BIC:</span>
                    <span className="font-mono text-slate-300">{acc.swiftBic}</span>
                  </div>
                )}
                {acc.iban && (
                  <div className="flex items-center justify-between text-slate-400">
                    <span>IBAN:</span>
                    <span className="font-mono text-[11px] text-slate-300">{acc.iban}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Card Footer */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center">
                <Globe className="w-3 h-3 mr-1 text-slate-500" />
                {acc.country}
              </span>
              <span className="font-mono text-slate-400">Currency: {acc.currency}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
