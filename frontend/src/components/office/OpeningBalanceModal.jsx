import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useLedger } from '../../context/LedgerContext';
import { useToast } from '../../context/ToastContext';
import { updateOpeningBalance } from '../../services/api';
import { AlertCircle } from 'lucide-react';

export const OpeningBalanceModal = () => {
  const {
    isOpeningBalanceModalOpen,
    setIsOpeningBalanceModalOpen,
    settings,
    refreshAll,
  } = useLedger();
  const { addToast } = useToast();

  const [balance, setBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpeningBalanceModalOpen && settings) {
      setBalance(settings.openingBalance !== undefined ? settings.openingBalance.toString() : '0');
      setNotes(settings.openingBalanceNotes || '');
      setError('');
    }
  }, [isOpeningBalanceModalOpen, settings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const parsed = parseFloat(balance);
    if (isNaN(parsed)) {
      setError('Please enter a valid numeric amount for the opening balance.');
      return;
    }

    try {
      setIsSubmitting(true);
      await updateOpeningBalance({
        openingBalance: parsed,
        openingBalanceNotes: notes,
      });

      addToast('Opening balance updated successfully', 'success');
      refreshAll();
      setIsOpeningBalanceModalOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to update opening balance');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpeningBalanceModalOpen}
      onClose={() => setIsOpeningBalanceModalOpen(false)}
      title="Configure Office Opening Balance"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-sans">
        <div className="bg-[#ff5e00]/10 border border-[#ff5e00]/30 rounded-2xl p-3.5 text-xs text-amber-900 dark:text-orange-200 leading-relaxed">
          <strong className="text-[#ff5e00]">Accounting Safeguard:</strong> The opening balance acts as the baseline operating capital:
          <div className="mt-1.5 font-mono text-[11px] bg-slate-50 dark:bg-zinc-950 p-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-300">
            Office Balance = Opening Balance + All Incoming − All Expenses
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs rounded-xl font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
            Opening Balance Amount in ₹ <span className="text-rose-400">*</span>
          </label>
          <div className="relative rounded-xl">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <span className="text-lg font-bold text-[#ff5e00]">₹</span>
            </div>
            <input
              type="number"
              step="any"
              required
              placeholder="0.00"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="block w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 pl-9 pr-4 py-3 text-lg font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:border-[#ff5e00] focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
            Notes / Starting Period Memo (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g., Carried forward from previous fiscal period"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="block w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:border-[#ff5e00] focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setIsOpeningBalanceModalOpen(false)}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-900 text-xs font-semibold text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-[#ff5e00] hover:bg-[#ff6f1a] text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#ff5e00]/25 transition-all cursor-pointer"
          >
            {isSubmitting ? 'Saving...' : 'Save Opening Balance'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
