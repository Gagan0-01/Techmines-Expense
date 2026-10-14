import React, { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../services/api';

interface CreateAccountModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateAccountModal: React.FC<CreateAccountModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState('OPERATING');
  const [currency, setCurrency] = useState('USD');
  const [initialBalance, setInitialBalance] = useState('');
  const [institution, setInstitution] = useState('');
  const [entityName, setEntityName] = useState('Acme Global Holdings LLC');
  const [swiftBic, setSwiftBic] = useState('');
  const [iban, setIban] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !accountNumber || !institution) {
      setError('Please fill in Account Name, Account Number and Institution.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.createAccount({
        name,
        accountNumber,
        accountType,
        currency,
        initialBalance: initialBalance ? Number(initialBalance) : 0,
        institution,
        entityName,
        swiftBic,
        iban,
      });

      if (res.success) {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-card max-w-lg w-full rounded-2xl p-6 border border-slate-700 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-base font-bold text-white mb-1">Provision Treasury Bank Account</h3>
        <p className="text-xs text-slate-400 mb-5">
          Establish multi-currency account record with institution routing & entity ownership
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold text-[10px] uppercase mb-1">
              Account Name / Label
            </label>
            <input
              type="text"
              placeholder="e.g. Citi Bank - Treasury Operating USD"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold text-[10px] uppercase mb-1">
                Account Number
              </label>
              <input
                type="text"
                placeholder="US-CITI-1029384"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2 font-mono text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold text-[10px] uppercase mb-1">
                Banking Institution
              </label>
              <input
                type="text"
                placeholder="Citibank N.A."
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold text-[10px] uppercase mb-1">
                Account Type
              </label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="OPERATING">Operating</option>
                <option value="PAYROLL">Payroll</option>
                <option value="INVESTMENT">Investment</option>
                <option value="TAX_RESERVE">Tax Reserve</option>
                <option value="CLEARING">Clearing</option>
                <option value="ESCROW">Escrow</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold text-[10px] uppercase mb-1">
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
              <label className="block text-slate-400 font-semibold text-[10px] uppercase mb-1">
                Initial Balance
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2 font-mono text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold text-[10px] uppercase mb-1">
                SWIFT / BIC (Optional)
              </label>
              <input
                type="text"
                placeholder="CITIUS33XXX"
                value={swiftBic}
                onChange={(e) => setSwiftBic(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2 font-mono text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold text-[10px] uppercase mb-1">
                IBAN (Optional)
              </label>
              <input
                type="text"
                placeholder="GB29..."
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2 font-mono text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold text-[10px] uppercase mb-1">
              Corporate Entity
            </label>
            <input
              type="text"
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

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
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-glow-blue disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Provision Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
