import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { formatINR } from '../../utils/currency';
import { formatDateTime } from '../../utils/date';
import { Share2, Copy, Check } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const ShareModal = ({ isOpen, onClose, transaction }) => {
  const { addToast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!transaction) return null;

  const isIncoming = transaction.type === 'incoming';
  const formattedText = `TechMines Office Ledger
-----------------------------------
Type: ${isIncoming ? 'INCOMING MONEY (+)' : 'OFFICE EXPENSE (-)'}
Amount: ${formatINR(transaction.amount)}
Title: ${transaction.title}
Category: ${transaction.category}
Payment Method: ${transaction.paymentMethod}
Date & Time: ${formatDateTime(transaction.date)}
${transaction.referenceNumber ? `Reference: ${transaction.referenceNumber}\n` : ''}${
    transaction.vendorRecipient ? `Party: ${transaction.vendorRecipient}\n` : ''
  }${transaction.notes ? `Notes: ${transaction.notes}\n` : ''}-----------------------------------
Recorded in TechMines Office Ledger`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedText);
      setCopied(true);
      addToast('Transaction details copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      addToast('Failed to copy text', 'error');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Transaction: ${transaction.title}`,
          text: formattedText,
        });
        addToast('Shared successfully', 'success');
        onClose();
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Transaction Details" maxWidth="max-w-md">
      <div className="space-y-4">
        {/* Visual summary preview */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-[#0d0d0d] space-y-2">
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                isIncoming
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
              }`}
            >
              {isIncoming ? 'Incoming' : 'Expense'}
            </span>
            <span className="text-xs text-slate-500 dark:text-zinc-400">{formatDateTime(transaction.date)}</span>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {formatINR(transaction.amount)}
          </div>
          <p className="text-sm font-medium text-slate-800 dark:text-zinc-200">{transaction.title}</p>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-zinc-400 pt-1">
            <span className="bg-slate-200 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 px-2 py-0.5 rounded text-slate-700 dark:text-zinc-300">
              {transaction.category}
            </span>
            <span className="bg-slate-200 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 px-2 py-0.5 rounded text-slate-700 dark:text-zinc-300">
              {transaction.paymentMethod}
            </span>
          </div>
        </div>

        {/* Text representation */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
            Message Preview
          </label>
          <pre className="p-3 bg-slate-100 dark:bg-black rounded-lg text-xs text-slate-800 dark:text-zinc-300 whitespace-pre-wrap font-mono border border-slate-200 dark:border-zinc-800 max-h-40 overflow-y-auto">
            {formattedText}
          </pre>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-[#0d0d0d] text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-[#0d0d0d] text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-500 dark:text-zinc-400" />}
            {copied ? 'Copied' : 'Copy Text'}
          </button>

          <button
            type="button"
            onClick={handleNativeShare}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ff5e00] text-sm font-semibold text-white hover:bg-[#ff7b29] shadow-lg shadow-[#ff5e00]/20 transition-all"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>
    </Modal>
  );
};
