import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Edit2,
  Trash2,
  Share2,
  Eye,
} from 'lucide-react';
import { formatINR } from '../../utils/currency';
import { formatDateTime, formatDate } from '../../utils/date';
import { useLedger } from '../../context/LedgerContext';
import { useToast } from '../../context/ToastContext';
import { deleteTransaction } from '../../services/api';
import { ConfirmModal } from '../common/ConfirmModal';
import { ShareModal } from './ShareModal';
import { Modal } from '../common/Modal';

export const TransactionTable = ({ transactions = [], onRefresh }) => {
  const { openEditTransaction, refreshAll } = useLedger();
  const { addToast } = useToast();

  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sharingTx, setSharingTx] = useState(null);
  const [viewingTx, setViewingTx] = useState(null);

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    try {
      setIsDeleting(true);
      await deleteTransaction(deletingId);
      addToast('Transaction deleted successfully', 'success');
      setDeletingId(null);
      if (onRefresh) onRefresh();
      refreshAll();
    } catch (err) {
      addToast(err.message || 'Failed to delete transaction', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto bg-white dark:bg-[#0a0a0a] rounded-2xl border border-slate-200 dark:border-zinc-800/80 shadow-sm transition-colors duration-200">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-950 text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
              <th className="py-4 px-5">Transaction</th>
              <th className="py-4 px-5">Category</th>
              <th className="py-4 px-5">Payment Method</th>
              <th className="py-4 px-5">Date & Time</th>
              <th className="py-4 px-5 text-right">Amount (₹)</th>
              <th className="py-4 px-5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-900 text-sm">
            {transactions.map((tx) => {
              const isIncoming = tx.type === 'incoming';
              return (
                <tr
                  key={tx._id}
                  className="hover:bg-slate-50/80 dark:hover:bg-zinc-900/60 transition-colors group cursor-default"
                >
                  {/* Title & Icon */}
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
                          isIncoming
                            ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {isIncoming ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-[#111827] dark:text-white group-hover:text-[#ff5e00] transition-colors text-xs sm:text-sm">
                          {tx.title}
                        </div>
                        {tx.vendorRecipient && (
                          <div className="text-[11px] text-slate-500 dark:text-zinc-500">
                            {tx.vendorRecipient}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3.5 px-5 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800">
                      {tx.category}
                    </span>
                  </td>

                  {/* Method */}
                  <td className="py-3.5 px-5 whitespace-nowrap">
                    <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                      {tx.paymentMethod}
                    </span>
                    {tx.referenceNumber && (
                      <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono mt-0.5">
                        {tx.referenceNumber}
                      </div>
                    )}
                  </td>

                  {/* Date & Time */}
                  <td className="py-3.5 px-5 text-slate-600 dark:text-zinc-400 whitespace-nowrap text-xs">
                    <div>{formatDate(tx.date, 'dd MMM yyyy')}</div>
                    <div className="text-[11px] text-slate-400 dark:text-zinc-500">{formatDate(tx.date, 'hh:mm a')}</div>
                  </td>

                  {/* Amount in ₹ */}
                  <td className="py-3.5 px-5 text-right whitespace-nowrap">
                    <span
                      className={`font-bold text-sm tracking-tight ${
                        isIncoming ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isIncoming ? '+' : '−'} {formatINR(tx.amount)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-5 text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        title="View details"
                        onClick={() => setViewingTx(tx)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        title="Share transaction"
                        onClick={() => setSharingTx(tx)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-[#ff5e00] hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-[#ff5e00] dark:hover:bg-zinc-800 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        title="Edit transaction"
                        onClick={() => openEditTransaction(tx)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-[#ff5e00] hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-[#ff5e00] dark:hover:bg-zinc-800 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        title="Delete transaction"
                        onClick={() => setDeletingId(tx._id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-zinc-400 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {transactions.map((tx) => {
          const isIncoming = tx.type === 'incoming';
          return (
            <div
              key={tx._id}
              className="bg-white dark:bg-[#0a0a0a] rounded-2xl border border-slate-200 dark:border-zinc-800/80 p-4 shadow-sm space-y-3 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border mt-0.5 ${
                      isIncoming
                        ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20'
                    }`}
                  >
                    {isIncoming ? (
                      <ArrowDownLeft className="h-4 w-4" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#111827] dark:text-white leading-snug">
                      {tx.title}
                    </h4>
                    <div className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
                      {formatDateTime(tx.date)}
                    </div>
                  </div>
                </div>

                <div
                  className={`text-right font-bold text-sm whitespace-nowrap ${
                    isIncoming ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {isIncoming ? '+' : '−'} {formatINR(tx.amount)}
                </div>
              </div>

              {/* Tags & Meta */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-zinc-900 text-xs text-slate-500 dark:text-zinc-400">
                <span className="bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-2 py-0.5 rounded-full text-[10px] text-slate-700 dark:text-zinc-300">
                  {tx.category}
                </span>
                <span className="bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-2 py-0.5 rounded-full text-[10px] text-slate-500 dark:text-zinc-400">
                  {tx.paymentMethod}
                </span>
                {tx.referenceNumber && (
                  <span className="text-slate-400 dark:text-zinc-500 font-mono text-[10px]">
                    Ref: {tx.referenceNumber}
                  </span>
                )}
              </div>

              {/* Mobile Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-900">
                <button
                  onClick={() => setViewingTx(tx)}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-lg border border-slate-200 dark:border-zinc-800 cursor-pointer active:scale-95 transition-all"
                >
                  View
                </button>
                <button
                  onClick={() => setSharingTx(tx)}
                  className="px-2.5 py-1 text-xs font-semibold text-[#ff5e00] bg-[#ff5e00]/10 hover:bg-[#ff5e00]/20 rounded-lg border border-[#ff5e00]/30 cursor-pointer active:scale-95 transition-all"
                >
                  Share
                </button>
                <button
                  onClick={() => openEditTransaction(tx)}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-lg border border-slate-200 dark:border-zinc-800 cursor-pointer active:scale-95 transition-all"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeletingId(tx._id)}
                  className="px-2.5 py-1 text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 rounded-lg border border-rose-200 dark:border-rose-500/30 cursor-pointer active:scale-95 transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Transaction"
        message="Are you sure you want to delete this financial record? The office balance and reports will be recalculated immediately."
        confirmText="Yes, Delete Record"
        isLoading={isDeleting}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={Boolean(sharingTx)}
        onClose={() => setSharingTx(null)}
        transaction={sharingTx}
      />

      {/* View Details Modal */}
      {viewingTx && (
        <Modal
          isOpen={Boolean(viewingTx)}
          onClose={() => setViewingTx(null)}
          title="Transaction Details"
          maxWidth="max-w-md"
        >
          <div className="space-y-4 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  viewingTx.type === 'incoming'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                }`}
              >
                {viewingTx.type === 'incoming' ? 'Incoming Money' : 'Office Expense'}
              </span>
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                {formatINR(viewingTx.amount)}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider">Title</span>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{viewingTx.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider">Category</span>
                  <p className="font-medium text-slate-700 dark:text-zinc-300 mt-0.5">{viewingTx.category}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider">Payment Method</span>
                  <p className="font-medium text-slate-700 dark:text-zinc-300 mt-0.5">{viewingTx.paymentMethod}</p>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider">Date & Time</span>
                <p className="font-medium text-slate-700 dark:text-zinc-300 mt-0.5">{formatDateTime(viewingTx.date)}</p>
              </div>

              {viewingTx.vendorRecipient && (
                <div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider">
                    {viewingTx.type === 'incoming' ? 'Payer / Client' : 'Vendor / Recipient'}
                  </span>
                  <p className="font-medium text-slate-700 dark:text-zinc-300 mt-0.5">{viewingTx.vendorRecipient}</p>
                </div>
              )}

              {viewingTx.referenceNumber && (
                <div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider">Reference Number</span>
                  <p className="font-mono text-xs text-slate-600 dark:text-zinc-400 mt-0.5">{viewingTx.referenceNumber}</p>
                </div>
              )}

              {viewingTx.notes && (
                <div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider">Notes</span>
                  <p className="text-slate-700 dark:text-zinc-300 bg-slate-50 dark:bg-zinc-950 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 mt-0.5 text-xs">
                    {viewingTx.notes}
                  </p>
                </div>
              )}

              {/* Itemized Line Items */}
              {Array.isArray(viewingTx.items) && viewingTx.items.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider">
                    Purchased / Invoiced Items ({viewingTx.items.length})
                  </span>
                  <div className="mt-1 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-zinc-900 text-xs">
                    {viewingTx.items.map((it, idx) => (
                      <div key={idx} className="p-2 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-zinc-200">{it.name}</p>
                          <p className="text-[10px] text-slate-400">
                            Qty: {it.quantity} {it.price ? `@ ₹${it.price}` : ''}
                          </p>
                        </div>
                        <span className="font-bold text-slate-800 dark:text-zinc-200">
                          {formatINR(it.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subtotal & Tax Breakdown */}
              {(viewingTx.subtotal || viewingTx.tax) && (
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 p-2 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800">
                  {viewingTx.subtotal ? <span>Subtotal: <strong>{formatINR(viewingTx.subtotal)}</strong></span> : null}
                  {viewingTx.tax ? <span>GST/Tax: <strong>{formatINR(viewingTx.tax)}</strong></span> : null}
                </div>
              )}

              {/* Linked Receipt Attachment */}
              {viewingTx.documentId && (
                <div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider">
                    Scanned Receipt
                  </span>
                  <div className="mt-1 flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950">
                    <span className="text-xs text-slate-700 dark:text-zinc-300 font-medium truncate">
                      Linked Receipt File
                    </span>
                    <a
                      href={`/api/documents/${viewingTx.documentId}/download`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-[#ff5e00] hover:underline"
                    >
                      View Receipt ↗
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-zinc-800">
              <button
                onClick={() => {
                  const tx = viewingTx;
                  setViewingTx(null);
                  openEditTransaction(tx);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-transparent hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-xl cursor-pointer"
              >
                Edit
              </button>
              <button
                onClick={() => setViewingTx(null)}
                className="px-5 py-2 text-xs font-bold text-white bg-[#ff5e00] hover:bg-[#ff6f1a] rounded-xl shadow-md cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
