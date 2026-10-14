import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Check,
  X,
  FileText,
  RotateCw,
} from 'lucide-react';
import { Transaction, User } from '../types';
import { formatCents, formatDate } from '../utils/formatters';

interface TransactionsViewProps {
  transactions: Transaction[];
  currentUser: User | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRefresh: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  currentUser,
  onApprove,
  onReject,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      tx.referenceNumber.toLowerCase().includes(search.toLowerCase()) ||
      tx.counterpartyName.toLowerCase().includes(search.toLowerCase()) ||
      tx.description.toLowerCase().includes(search.toLowerCase()) ||
      tx.category.toLowerCase().includes(search.toLowerCase());

    const matchesType = selectedType === 'ALL' || tx.type === selectedType;
    const matchesStatus = selectedStatus === 'ALL' || tx.status === selectedStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'INFLOW':
      case 'INTEREST_INCOME':
        return <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />;
      case 'OUTFLOW':
      case 'BANK_FEE':
      case 'TAX_SETTLEMENT':
        return <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />;
      case 'INTERNAL_TRANSFER':
      case 'FX_SWAP':
        return <ArrowLeftRight className="w-3.5 h-3.5 text-blue-400" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
            <Clock className="w-3 h-3 mr-1" />
            Pending Senior Approval
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Treasury Cash Flow Transactions</h2>
          <p className="text-xs text-slate-400">
            Full audit log of disbursements, collections, internal capital transfers & approvals
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search reference #, counterparty, description, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900/80 border border-slate-700/60 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-900/80 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-900/80 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Transaction Types</option>
            <option value="INFLOW">Inflows (Collections)</option>
            <option value="OUTFLOW">Outflows (Disbursements)</option>
            <option value="INTERNAL_TRANSFER">Internal Transfers</option>
            <option value="INTEREST_INCOME">Interest & Yield</option>
            <option value="TAX_SETTLEMENT">Tax Settlements</option>
            <option value="BANK_FEE">Banking Fees</option>
          </select>

          <button
            onClick={onRefresh}
            title="Refresh Transactions"
            className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Transactions Data Table */}
      <div className="glass-card rounded-2xl border border-slate-700/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Ref Number</th>
                <th className="py-3 px-4">Value Date</th>
                <th className="py-3 px-4">Type & Category</th>
                <th className="py-3 px-4">Counterparty / Description</th>
                <th className="py-3 px-4">Account</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Dual-Control Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((tx) => {
                const isInflow =
                  tx.type === 'INFLOW' || tx.type === 'INTEREST_INCOME';
                const isOutflow =
                  tx.type === 'OUTFLOW' ||
                  tx.type === 'BANK_FEE' ||
                  tx.type === 'TAX_SETTLEMENT';

                return (
                  <tr
                    key={tx._id}
                    onClick={() => setSelectedTx(tx)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    {/* Reference # */}
                    <td className="py-3 px-4 font-mono font-medium text-blue-400 group-hover:underline">
                      {tx.referenceNumber}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 text-slate-300 font-mono whitespace-nowrap">
                      {formatDate(tx.valueDate)}
                    </td>

                    {/* Type & Category */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5">
                        <div className="p-1 rounded bg-slate-800 border border-slate-700/70">
                          {getTypeIcon(tx.type)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-200">
                            {tx.type.replace('_', ' ')}
                          </div>
                          <div className="text-[10px] text-slate-400">{tx.category}</div>
                        </div>
                      </div>
                    </td>

                    {/* Counterparty & Description */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-medium text-slate-200 truncate">{tx.counterpartyName}</div>
                      <div className="text-[11px] text-slate-400 truncate">{tx.description}</div>
                    </td>

                    {/* Account */}
                    <td className="py-3 px-4 text-slate-300">
                      <div className="truncate max-w-[150px] font-medium">
                        {tx.sourceAccountId?.name || 'Treasury Account'}
                      </div>
                      {tx.destinationAccountId && (
                        <div className="text-[10px] text-blue-400 truncate max-w-[150px]">
                          → {tx.destinationAccountId.name}
                        </div>
                      )}
                    </td>

                    {/* Amount */}
                    <td
                      className={`py-3 px-4 text-right font-mono font-bold whitespace-nowrap ${
                        isInflow
                          ? 'text-emerald-400'
                          : isOutflow
                          ? 'text-rose-400'
                          : 'text-slate-100'
                      }`}
                    >
                      {isInflow ? '+' : isOutflow ? '-' : ''}
                      {formatCents(tx.amountCents, tx.currency)}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {getStatusBadge(tx.status)}
                    </td>

                    {/* Actions */}
                    <td
                      className="py-3 px-4 text-center whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {tx.status === 'PENDING_APPROVAL' ? (
                        <div className="flex items-center justify-center space-x-1.5">
                          {currentUser && !['TREASURER', 'FINANCE_MANAGER'].includes(currentUser.role) ? (
                            <span
                              className="text-[10px] text-amber-400/80 font-mono italic"
                              title="Approval requires Treasurer or Finance Manager persona"
                            >
                              Dual-Control Restriced
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => onApprove(tx._id)}
                                title="Dual-Control Approve & Post"
                                className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onReject(tx._id)}
                                title="Reject Transaction"
                                className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-mono">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Details Drawer / Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full rounded-2xl p-6 border border-slate-700 shadow-2xl relative">
            <button
              onClick={() => setSelectedTx(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 mb-4">
              <span className="font-mono text-base font-bold text-blue-400">
                {selectedTx.referenceNumber}
              </span>
              {getStatusBadge(selectedTx.status)}
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-0.5">
                  Gross Amount
                </span>
                <span className="text-2xl font-extrabold font-mono text-white">
                  {formatCents(selectedTx.amountCents, selectedTx.currency)}
                </span>
                {selectedTx.feeCents > 0 && (
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">
                    Fee deducted: {formatCents(selectedTx.feeCents, selectedTx.currency)}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Transaction Type</span>
                  <span className="font-semibold text-slate-200">{selectedTx.type}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Value Date</span>
                  <span className="font-mono text-slate-200">{formatDate(selectedTx.valueDate)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Counterparty</span>
                  <span className="font-semibold text-slate-200">{selectedTx.counterpartyName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Category</span>
                  <span className="text-slate-200">{selectedTx.category}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Description</span>
                <p className="text-slate-200 mt-0.5">{selectedTx.description}</p>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Source Account</span>
                <p className="text-slate-200 font-mono">
                  {selectedTx.sourceAccountId?.name} ({selectedTx.sourceAccountId?.accountNumber})
                </p>
              </div>

              {selectedTx.destinationAccountId && (
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Destination Account</span>
                  <p className="text-slate-200 font-mono">
                    {selectedTx.destinationAccountId?.name} ({selectedTx.destinationAccountId?.accountNumber})
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg text-xs"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
