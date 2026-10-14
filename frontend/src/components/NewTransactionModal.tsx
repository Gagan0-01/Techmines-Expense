import React, { useState } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import { Account } from '../types';
import { api } from '../services/api';
import { formatCents } from '../utils/formatters';

interface NewTransactionModalProps {
  accounts: Account[];
  onClose: () => void;
  onSuccess: () => void;
}

export const NewTransactionModal: React.FC<NewTransactionModalProps> = ({
  accounts,
  onClose,
  onSuccess,
}) => {
  const [type, setType] = useState('INFLOW');
  const [sourceAccountId, setSourceAccountId] = useState(accounts[0]?._id || '');
  const [destinationAccountId, setDestinationAccountId] = useState(accounts[1]?._id || '');
  const [amount, setAmount] = useState('');
  const [fee, setFee] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [counterpartyName, setCounterpartyName] = useState('');
  const [category, setCategory] = useState('Customer Collections');
  const [description, setDescription] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSourceAccount = accounts.find((a) => a._id === sourceAccountId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Please enter a valid positive transaction amount.');
      return;
    }

    if (!counterpartyName.trim()) {
      setError('Please provide a counterparty name.');
      return;
    }

    if (!description.trim()) {
      setError('Please provide a description.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        type,
        sourceAccountId,
        counterpartyName,
        amount: Number(amount),
        fee: fee ? Number(fee) : 0,
        currency,
        category,
        description,
        requiresApproval,
      };

      if (type === 'INTERNAL_TRANSFER' || type === 'FX_SWAP') {
        payload.destinationAccountId = destinationAccountId;
      }

      const res = await api.createTransaction(payload);
      if (res.success) {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-card max-w-xl w-full rounded-2xl p-6 border border-slate-700 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-base font-bold text-white mb-1">Record Treasury Transaction</h3>
        <p className="text-xs text-slate-400 mb-5">
          Atomic double-entry posting with dual-control policy compliance
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center">
            <ShieldAlert className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Type Selector */}
          <div>
            <label className="block text-slate-400 uppercase font-semibold text-[10px] mb-1.5">
              Transaction Classification
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'INFLOW', label: 'Inflow (Collection)' },
                { id: 'OUTFLOW', label: 'Outflow (Disbursement)' },
                { id: 'INTERNAL_TRANSFER', label: 'Internal Transfer' },
                { id: 'INTEREST_INCOME', label: 'Interest / Yield' },
                { id: 'TAX_SETTLEMENT', label: 'Tax Settlement' },
                { id: 'BANK_FEE', label: 'Banking Fee' },
              ].map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => {
                    setType(t.id);
                    if (t.id === 'INFLOW') setCategory('Customer Collections');
                    if (t.id === 'OUTFLOW') setCategory('General Operations');
                    if (t.id === 'INTERNAL_TRANSFER') setCategory('Internal Liquidity Sweep');
                  }}
                  className={`py-2 px-2.5 rounded-lg border text-center font-medium transition-all ${
                    type === t.id
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-sm'
                      : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Accounts selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 uppercase font-semibold text-[10px] mb-1">
                Source Treasury Account
              </label>
              <select
                value={sourceAccountId}
                onChange={(e) => {
                  setSourceAccountId(e.target.value);
                  const acc = accounts.find((a) => a._id === e.target.value);
                  if (acc) setCurrency(acc.currency);
                }}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {accounts.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name} ({a.currency} - {formatCents(a.availableBalanceCents, a.currency)})
                  </option>
                ))}
              </select>
              {selectedSourceAccount && (
                <div className="text-[10px] text-slate-400 mt-1 font-mono">
                  Available: {formatCents(selectedSourceAccount.availableBalanceCents, selectedSourceAccount.currency)}
                </div>
              )}
            </div>

            {(type === 'INTERNAL_TRANSFER' || type === 'FX_SWAP') && (
              <div>
                <label className="block text-slate-400 uppercase font-semibold text-[10px] mb-1">
                  Destination Treasury Account
                </label>
                <select
                  value={destinationAccountId}
                  onChange={(e) => setDestinationAccountId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  {accounts
                    .filter((a) => a._id !== sourceAccountId)
                    .map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.name} ({a.currency})
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {/* Amount, Currency & Optional Fee */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 uppercase font-semibold text-[10px] mb-1">
                Amount
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2 font-mono text-slate-100 font-bold focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 uppercase font-semibold text-[10px] mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2 font-mono text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {['USD', 'EUR', 'GBP', 'JPY', 'SGD', 'CHF', 'CAD', 'AUD'].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 uppercase font-semibold text-[10px] mb-1">
                Fee (Optional)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2 font-mono text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Counterparty & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 uppercase font-semibold text-[10px] mb-1">
                Counterparty Name
              </label>
              <input
                type="text"
                placeholder="e.g. Stripe, AWS, Customer Corp"
                value={counterpartyName}
                onChange={(e) => setCounterpartyName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 uppercase font-semibold text-[10px] mb-1">
                Category
              </label>
              <input
                type="text"
                placeholder="e.g. Cloud Infrastructure, Payroll"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-400 uppercase font-semibold text-[10px] mb-1">
              Description & Purpose
            </label>
            <input
              type="text"
              placeholder="e.g. Monthly cloud server compute invoice payment"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Dual control approval checkbox */}
          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="requireApproval"
              checked={requiresApproval}
              onChange={(e) => setRequiresApproval(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
            />
            <label htmlFor="requireApproval" className="text-slate-300 text-xs cursor-pointer">
              Submit to Senior Treasury Dual-Control Approval queue (automatic if &gt; $50,000)
            </label>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-slate-800 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-glow-blue transition-all disabled:opacity-50"
            >
              {submitting ? 'Posting Transaction...' : 'Commit Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
