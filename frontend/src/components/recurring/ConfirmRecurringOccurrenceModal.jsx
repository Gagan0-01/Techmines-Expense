import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useLedger } from '../../context/LedgerContext';
import { useToast } from '../../context/ToastContext';
import { markRecurringOccurrenceCompleted } from '../../services/api';
import { toInputDateFormat } from '../../utils/date';
import { AlertCircle } from 'lucide-react';

export const ConfirmRecurringOccurrenceModal = ({
  isOpen,
  onClose,
  schedule,
  onConfirmed,
}) => {
  const { refreshAll } = useLedger();
  const { addToast } = useToast();

  const [actualAmount, setActualAmount] = useState('');
  const [actualDate, setActualDate] = useState(toInputDateFormat(new Date()));
  const [actualPaymentMethod, setActualPaymentMethod] = useState('UPI');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && schedule) {
      setError('');
      setActualAmount(schedule.amount ? schedule.amount.toString() : '');
      setActualDate(toInputDateFormat(schedule.nextScheduledDate || new Date()));
      setActualPaymentMethod(schedule.paymentMethod || 'UPI');
      setNotes(`Occurrence generated from recurring schedule "${schedule.title}"`);
    }
  }, [isOpen, schedule]);

  if (!schedule) return null;

  const isIncoming = schedule.type === 'incoming';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const amt = parseFloat(actualAmount);
    if (isNaN(amt) || amt <= 0) {
      setError('Please specify a valid positive amount in ₹.');
      return;
    }

    try {
      setIsSubmitting(true);
      await markRecurringOccurrenceCompleted(schedule._id, {
        actualAmount: amt,
        actualDate: new Date(actualDate).toISOString(),
        actualPaymentMethod,
        notes,
      });

      addToast(
        `${isIncoming ? 'Income marked as received' : 'Expense marked as paid'}! Office balance updated.`,
        'success'
      );

      refreshAll();
      if (onConfirmed) onConfirmed();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to complete occurrence');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isIncoming ? 'Mark Income as Received' : 'Mark Expense as Paid'}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-slate-50 dark:bg-[#0d0d0d] border border-slate-200 dark:border-zinc-800 rounded-lg text-xs text-slate-700 dark:text-zinc-300 space-y-1">
          <div className="font-semibold text-slate-900 dark:text-white">{schedule.title}</div>
          <div>Frequency: {schedule.frequency} | Category: {schedule.category}</div>
          <div className="text-slate-500 dark:text-zinc-400">
            Confirming this will create a real transaction record in your ledger and advance the next due date.
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs rounded-lg font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
            Actual Amount in ₹ <span className="text-rose-500">*</span>
          </label>
          <div className="relative rounded-lg shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-lg font-bold text-slate-400 dark:text-zinc-500">₹</span>
            </div>
            <input
              type="number"
              step="any"
              min="0.01"
              required
              value={actualAmount}
              onChange={(e) => setActualAmount(e.target.value)}
              className="w-full border border-slate-200 dark:border-zinc-700 rounded-lg pl-8 pr-4 py-2.5 text-lg font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-black focus:outline-none focus:border-[#ff5e00]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
              Payment Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={actualDate}
              onChange={(e) => setActualDate(e.target.value)}
              className="w-full border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-black focus:outline-none focus:border-[#ff5e00]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
              Payment Method <span className="text-rose-500">*</span>
            </label>
            <select
              value={actualPaymentMethod}
              onChange={(e) => setActualPaymentMethod(e.target.value)}
              className="w-full border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-black focus:outline-none focus:border-[#ff5e00] cursor-pointer"
            >
              <option value="UPI" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">UPI</option>
              <option value="Cash" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Cash</option>
              <option value="Bank Transfer" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Bank Transfer</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
            Transaction Notes (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-black focus:outline-none focus:border-[#ff5e00]"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-[#0d0d0d] text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-5 py-2 rounded-lg text-sm font-semibold text-white shadow-sm transition-all ${
              isIncoming
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {isSubmitting
              ? 'Processing...'
              : isIncoming
              ? 'Confirm Received (+)'
              : 'Confirm Paid (−)'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
