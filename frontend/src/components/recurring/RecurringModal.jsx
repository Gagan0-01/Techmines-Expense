import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useLedger } from '../../context/LedgerContext';
import { useToast } from '../../context/ToastContext';
import { createRecurringSchedule, updateRecurringSchedule } from '../../services/api';
import { toInputDateFormat } from '../../utils/date';
import { ArrowDownLeft, ArrowUpRight, AlertCircle, Info } from 'lucide-react';

export const RecurringModal = ({ isOpen, onClose, schedule, onSaved }) => {
  const { categories } = useLedger();
  const { addToast } = useToast();

  const isEditing = Boolean(schedule);

  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    type: 'expense',
    category: '',
    paymentMethod: 'Bank Transfer',
    frequency: 'Monthly',
    startDate: toInputDateFormat(new Date()),
    endDate: '',
    nextScheduledDate: toInputDateFormat(new Date()),
    status: 'Active',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (schedule) {
        setFormData({
          title: schedule.title || '',
          amount: schedule.amount ? schedule.amount.toString() : '',
          type: schedule.type || 'expense',
          category: schedule.category || '',
          paymentMethod: schedule.paymentMethod || 'Bank Transfer',
          frequency: schedule.frequency || 'Monthly',
          startDate: toInputDateFormat(schedule.startDate || new Date()),
          endDate: schedule.endDate ? toInputDateFormat(schedule.endDate) : '',
          nextScheduledDate: toInputDateFormat(schedule.nextScheduledDate || new Date()),
          status: schedule.status || 'Active',
          notes: schedule.notes || '',
        });
      } else {
        const availableCats = categories.filter((c) => c.type === 'both' || c.type === 'expense');
        setFormData({
          title: '',
          amount: '',
          type: 'expense',
          category: availableCats.length > 0 ? availableCats[0].name : 'Office Rent',
          paymentMethod: 'Bank Transfer',
          frequency: 'Monthly',
          startDate: toInputDateFormat(new Date()),
          endDate: '',
          nextScheduledDate: toInputDateFormat(new Date()),
          status: 'Active',
          notes: '',
        });
      }
    }
  }, [isOpen, schedule, categories]);

  const filteredCategories = categories.filter(
    (c) => c.type === 'both' || c.type === formData.type
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Please provide a title for the recurring schedule.');
      return;
    }

    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid positive amount in ₹.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        title: formData.title.trim(),
        amount: amt,
        type: formData.type,
        category: formData.category,
        paymentMethod: formData.paymentMethod,
        frequency: formData.frequency,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        nextScheduledDate: new Date(formData.nextScheduledDate).toISOString(),
        status: formData.status,
        notes: formData.notes.trim(),
      };

      if (isEditing) {
        await updateRecurringSchedule(schedule._id, payload);
        addToast('Recurring schedule updated', 'success');
      } else {
        await createRecurringSchedule(payload);
        addToast('Recurring schedule created successfully', 'success');
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save recurring schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Recurring Schedule' : 'Create Recurring Schedule'}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-400 flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
          <span>
            <strong>Accounting Safety:</strong> Creating a recurring schedule does not immediately change your Office balance. Completed transactions are recorded only when explicitly confirmed as paid or received.
          </span>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Type toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, type: 'incoming' })}
            className={`flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              formData.type === 'incoming'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            Recurring Income
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, type: 'expense' })}
            className={`flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              formData.type === 'expense'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            Recurring Expense
          </button>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
            Schedule Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g., Office Rent / Monthly High-Speed Internet / Retainer"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full border border-slate-200 dark:border-zinc-700 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-black focus:outline-none focus:border-[#ff5e00]"
          />
        </div>

        {/* Amount & Frequency */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
              Amount in ₹ <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              required
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full border border-slate-200 dark:border-zinc-700 rounded-lg px-3.5 py-2 text-sm font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-black focus:outline-none focus:border-[#ff5e00]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
              Frequency <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              className="w-full border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-black focus:outline-none focus:border-[#ff5e00] cursor-pointer"
            >
              <option value="Daily" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Daily</option>
              <option value="Weekly" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Weekly</option>
              <option value="Monthly" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Monthly</option>
              <option value="Yearly" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Yearly</option>
            </select>
          </div>
        </div>

        {/* Category & Payment Method */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
              Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-black focus:outline-none focus:border-[#ff5e00] cursor-pointer"
            >
              {filteredCategories.map((c) => (
                <option key={c._id || c.name} value={c.name} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
              Payment Method <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              className="w-full border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-black focus:outline-none focus:border-[#ff5e00] cursor-pointer"
            >
              <option value="Bank Transfer" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Bank Transfer</option>
              <option value="UPI" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">UPI</option>
              <option value="Cash" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Cash</option>
            </select>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
              Next Due Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.nextScheduledDate}
              onChange={(e) => setFormData({ ...formData, nextScheduledDate: e.target.value })}
              className="w-full border border-slate-200 dark:border-zinc-700 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-black focus:outline-none focus:border-[#ff5e00]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
              End Date (Optional)
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full border border-slate-200 dark:border-zinc-700 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-black focus:outline-none focus:border-[#ff5e00]"
            />
          </div>
        </div>

        {/* Status (if editing) */}
        {isEditing && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-black focus:outline-none focus:border-[#ff5e00] cursor-pointer"
            >
              <option value="Active" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Active</option>
              <option value="Paused" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Paused</option>
              <option value="Cancelled" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Cancelled</option>
            </select>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
            Notes / Schedule Instructions (Optional)
          </label>
          <textarea
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="e.g., Pay before 5th of every month via NEFT"
            className="w-full border border-slate-200 dark:border-zinc-700 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-black focus:outline-none focus:border-[#ff5e00]"
          />
        </div>

        {/* Buttons */}
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
            className="px-5 py-2 rounded-lg bg-[#ff5e00] hover:bg-[#ff7b29] text-sm font-semibold text-white shadow-lg shadow-[#ff5e00]/20 transition-all"
          >
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Schedule' : 'Create Schedule'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
