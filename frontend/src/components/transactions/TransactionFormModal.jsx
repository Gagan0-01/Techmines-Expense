import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useLedger } from '../../context/LedgerContext';
import { useToast } from '../../context/ToastContext';
import { createTransaction, updateTransaction } from '../../services/api';
import { toInputDateTimeFormat } from '../../utils/date';
import { ArrowDownLeft, ArrowUpRight, Sparkles } from 'lucide-react';

export const TransactionFormModal = () => {
  const {
    transactionModal,
    closeTransactionModal,
    categories,
    refreshAll,
  } = useLedger();
  const { addToast } = useToast();

  const isEditing = Boolean(transactionModal.transaction);

  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    type: 'incoming',
    category: '',
    paymentMethod: 'UPI',
    date: toInputDateTimeFormat(new Date()),
    notes: '',
    referenceNumber: '',
    vendorRecipient: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Sync state when modal opens or editing changes
  useEffect(() => {
    if (transactionModal.isOpen) {
      setErrorMessage('');
      if (transactionModal.transaction) {
        const tx = transactionModal.transaction;
        setFormData({
          title: tx.title || '',
          amount: tx.amount ? tx.amount.toString() : '',
          type: tx.type || 'incoming',
          category: tx.category || '',
          paymentMethod: tx.paymentMethod || 'UPI',
          date: toInputDateTimeFormat(tx.date || new Date()),
          notes: tx.notes || '',
          referenceNumber: tx.referenceNumber || '',
          vendorRecipient: tx.vendorRecipient || '',
        });
      } else {
        // New transaction defaults
        const defaults = transactionModal.defaultValues || {};
        const availableCats = categories.filter(
          (c) => c.type === 'both' || c.type === transactionModal.type
        );
        const defaultCat = availableCats.length > 0 ? availableCats[0].name : '';

        let initialDate = toInputDateTimeFormat(new Date());
        if (defaults.date) {
          initialDate = defaults.date.includes('T') ? defaults.date : `${defaults.date}T10:00`;
        }

        setFormData({
          title: defaults.title || '',
          amount: defaults.amount ? defaults.amount.toString() : '',
          type: transactionModal.type || 'incoming',
          category: defaults.category || defaultCat,
          paymentMethod: defaults.paymentMethod || 'UPI',
          date: initialDate,
          notes: defaults.notes || '',
          referenceNumber: defaults.referenceNumber || '',
          vendorRecipient: defaults.vendorRecipient || '',
        });
      }
    }
  }, [transactionModal, categories]);

  const filteredCategories = categories.filter(
    (c) => c.type === 'both' || c.type === formData.type
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Validation
    if (!formData.title.trim()) {
      setErrorMessage('Please enter a transaction title or description.');
      return;
    }

    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMessage('Please enter a valid amount in Indian Rupees (₹) greater than zero.');
      return;
    }

    if (!formData.category.trim()) {
      setErrorMessage('Please select or specify a category.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        title: formData.title.trim(),
        amount: amt,
        type: formData.type,
        category: formData.category.trim(),
        paymentMethod: formData.paymentMethod,
        date: new Date(formData.date).toISOString(),
        notes: formData.notes.trim(),
        referenceNumber: formData.referenceNumber.trim(),
        vendorRecipient: formData.vendorRecipient.trim(),
      };

      if (isEditing) {
        await updateTransaction(transactionModal.transaction._id, payload);
        addToast('Transaction updated successfully', 'success');
      } else {
        await createTransaction(payload);
        addToast(
          `${formData.type === 'incoming' ? 'Incoming money' : 'Expense'} recorded successfully`,
          'success'
        );
      }

      refreshAll();
      closeTransactionModal();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalTitle = isEditing
    ? `Edit ${formData.type === 'incoming' ? 'Incoming' : 'Expense'}`
    : formData.type === 'incoming'
    ? 'Record Incoming Money'
    : 'Record Office Expense';

  return (
    <Modal
      isOpen={transactionModal.isOpen}
      onClose={closeTransactionModal}
      title={modalTitle}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-sans">
        {/* Type toggle (if not editing) */}
        {!isEditing && (
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'incoming' })}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                formData.type === 'incoming'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4 text-white" />
              Incoming
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'expense' })}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                formData.type === 'expense'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-white" />
              Expense
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs rounded-xl font-medium">
            {errorMessage}
          </div>
        )}

        {/* Scanned Receipt Pre-fill Banner */}
        {transactionModal.defaultValues?.isFromOcr && (
          <div className="p-3 bg-orange-500/10 border border-orange-500/30 text-slate-800 dark:text-zinc-200 text-xs rounded-xl flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-[#ff5e00] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-slate-900 dark:text-white">
                Scanned Receipt Pre-fill
              </span>
              <p className="text-[11px] text-slate-600 dark:text-zinc-400">
                Values have been pre-filled from your scanned document. Please review the amount, category, and date before confirming to save to your ledger.
              </p>
            </div>
          </div>
        )}

        {/* Amount Input */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
            Amount in ₹ (Rupees) <span className="text-rose-400">*</span>
          </label>
          <div className="relative rounded-xl">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <span className="text-lg font-bold text-[#ff5e00]">₹</span>
            </div>
            <input
              type="number"
              step="any"
              min="0.01"
              required
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="block w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 pl-9 pr-4 py-3 text-lg font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:border-[#ff5e00] focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Title / Description */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
            {formData.type === 'incoming' ? 'Title / Income Source' : 'Expense Title'}{' '}
            <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            required
            placeholder={
              formData.type === 'incoming'
                ? 'e.g., Client Payment / Student Fee'
                : 'e.g., Office Maintenance / Lab Tools'
            }
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="block w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:border-[#ff5e00] focus:outline-none transition-colors"
          />
        </div>

        {/* Category & Payment Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
              Category <span className="text-rose-400">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="block w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#ff5e00] focus:outline-none cursor-pointer"
            >
              {filteredCategories.map((c) => (
                <option key={c._id || c.name} value={c.name} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                  {c.name}
                </option>
              ))}
              {!filteredCategories.some((c) => c.name === formData.category) && formData.category && (
                <option value={formData.category} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">{formData.category}</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
              Payment Method <span className="text-rose-400">*</span>
            </label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              className="block w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#ff5e00] focus:outline-none cursor-pointer"
            >
              <option value="UPI" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">UPI</option>
              <option value="Cash" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Cash</option>
              <option value="Bank Transfer" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Bank Transfer</option>
            </select>
          </div>
        </div>

        {/* Date & Time */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
            Date & Time <span className="text-rose-400">*</span>
          </label>
          <input
            type="datetime-local"
            required
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="block w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#ff5e00] focus:outline-none"
          />
        </div>

        {/* Vendor/Recipient & Reference Number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
              {formData.type === 'incoming' ? 'Payer / Client' : 'Vendor / Recipient'} (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., Client / Vendor"
              value={formData.vendorRecipient}
              onChange={(e) => setFormData({ ...formData, vendorRecipient: e.target.value })}
              className="block w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:border-[#ff5e00] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
              Reference / Txn ID (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., UPI Ref / Invoice No."
              value={formData.referenceNumber}
              onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
              className="block w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:border-[#ff5e00] focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
            Notes / Memo (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="Add internal details or remarks..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="block w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:border-[#ff5e00] focus:outline-none transition-colors resize-none"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={closeTransactionModal}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-900 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all cursor-pointer disabled:opacity-50 ${
              formData.type === 'incoming'
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                : 'bg-[#ff5e00] hover:bg-[#ff6f1a] shadow-[#ff5e00]/25'
            }`}
          >
            {isSubmitting
              ? 'Saving...'
              : isEditing
              ? 'Update Transaction'
              : formData.type === 'incoming'
              ? 'Save Incoming'
              : 'Save Expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
