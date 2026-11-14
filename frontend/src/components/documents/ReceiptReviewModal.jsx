import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useLedger } from '../../context/LedgerContext';
import { useToast } from '../../context/ToastContext';
import { createTransaction } from '../../services/api';
import { downloadOriginalDocument } from '../../services/documentService';
import { toInputDateTimeFormat } from '../../utils/date';
import { formatINR } from '../../utils/currency';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  Building2,
  Calendar,
  Receipt,
  CreditCard,
  Plus,
  Trash2,
  Loader2,
  ExternalLink,
  FileText,
  CheckCircle2,
} from 'lucide-react';

export const ReceiptReviewModal = ({ isOpen, onClose, document, onSaved }) => {
  const { categories, refreshAll } = useLedger();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    type: 'expense',
    title: '',
    amount: '',
    category: '',
    paymentMethod: 'UPI',
    date: toInputDateTimeFormat(new Date()),
    merchant: '',
    referenceNumber: '',
    subtotal: '',
    tax: '',
    notes: '',
    items: [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Populate form fields from document and OCR extraction
  useEffect(() => {
    if (document && isOpen) {
      setErrorMessage('');
      const st = document.suggestedTransaction || {};
      const sd = document.structuredData || {};

      const propType = st.type === 'incoming' ? 'incoming' : 'expense';
      const merchantVal = st.merchant || sd.merchantName?.value || sd.merchant?.name || document.title || 'Scanned Receipt';
      const amountVal = st.amount !== null && st.amount !== undefined ? String(st.amount) : (sd.total?.value !== null && sd.total?.value !== undefined ? String(sd.total.value) : '');
      const subtotalVal = st.subtotal !== null && st.subtotal !== undefined ? String(st.subtotal) : (sd.subtotal?.value !== null && sd.subtotal?.value !== undefined ? String(sd.subtotal.value) : '');
      const taxVal = st.tax !== null && st.tax !== undefined ? String(st.tax) : (sd.tax?.value !== null && sd.tax?.value !== undefined ? String(sd.tax.value) : '');
      const refVal = sd.receiptNumber?.value || sd.invoice?.receiptNumber || '';
      const payMethod = ['Cash', 'UPI', 'Bank Transfer'].includes(st.paymentMethod)
        ? st.paymentMethod
        : (['Cash', 'UPI', 'Bank Transfer'].includes(sd.paymentMethod?.value) ? sd.paymentMethod.value : 'UPI');

      // Date parsing
      let initialDate = toInputDateTimeFormat(new Date());
      const rawDate = st.date || sd.date?.value || sd.invoice?.date;
      if (rawDate) {
        try {
          const parsed = new Date(rawDate);
          if (!isNaN(parsed.getTime())) {
            initialDate = toInputDateTimeFormat(parsed);
          }
        } catch (e) {}
      }

      // Suggested category selection
      const availableCats = categories.filter((c) => c.type === 'both' || c.type === propType);
      let cat = st.category || '';
      if (!cat && availableCats.length > 0) {
        cat = availableCats[0].name;
      }

      // Format items
      const rawItems = Array.isArray(st.items) && st.items.length > 0 ? st.items : (Array.isArray(sd.items) ? sd.items : []);
      const formattedItems = rawItems.map((it, idx) => ({
        name: it.name || it.description?.value || it.description || `Item #${idx + 1}`,
        quantity: typeof it.quantity === 'number' ? it.quantity : (it.quantity?.value || 1),
        price: typeof it.price === 'number' ? it.price : (it.unitPrice?.value ?? it.unitPrice ?? 0),
        amount: typeof it.amount === 'number' ? it.amount : (it.amount?.value ?? it.amount ?? 0),
      }));

      // Auto-compose notes with items summary and reference
      let autoNotes = `Scanned receipt from "${document.title}". Reference: ${refVal || 'N/A'}. OCR: ${document.ocrEngine || 'Gemini Vision'}.`;
      if (formattedItems.length > 0) {
        const lineSummary = formattedItems.slice(0, 4).map((it) => `${it.name}${it.amount ? ` (₹${it.amount})` : ''}`).join(', ');
        autoNotes += ` Items: ${lineSummary}${formattedItems.length > 4 ? ` (+${formattedItems.length - 4} more)` : ''}`;
      }

      setFormData({
        type: propType,
        title: merchantVal,
        amount: amountVal,
        category: cat,
        paymentMethod: payMethod,
        date: initialDate,
        merchant: merchantVal,
        referenceNumber: refVal,
        subtotal: subtotalVal,
        tax: taxVal,
        notes: autoNotes,
        items: formattedItems,
      });
    }
  }, [document, isOpen, categories]);

  if (!document || !isOpen) return null;

  const filteredCategories = categories.filter(
    (c) => c.type === 'both' || c.type === formData.type
  );

  const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(document.mimeType);
  const downloadUrl = `/api/documents/${document._id}/download`;
  const st = document.suggestedTransaction || {};
  const sd = document.structuredData || {};
  const validation = document.financialValidation || {};

  // Uncertain field checks
  const isTotalUncertain = Boolean(sd.total?.needsReview || (typeof sd.total?.confidence === 'number' && sd.total.confidence < 80) || !formData.amount);
  const isMerchantUncertain = Boolean(sd.merchantName?.needsReview || (typeof sd.merchantName?.confidence === 'number' && sd.merchantName.confidence < 80) || !formData.merchant);
  const isDateUncertain = Boolean(sd.date?.needsReview || (typeof sd.date?.confidence === 'number' && sd.date.confidence < 80));

  // Line item helpers
  const handleUpdateItem = (index, field, value) => {
    const updated = [...formData.items];
    updated[index] = { ...updated[index], [field]: value };
    // Auto calculate line amount if qty & price change
    if (field === 'quantity' || field === 'price') {
      const q = field === 'quantity' ? Number(value) : updated[index].quantity;
      const p = field === 'price' ? Number(value) : updated[index].price;
      updated[index].amount = Math.round(q * p * 100) / 100;
    }
    setFormData({ ...formData, items: updated });
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { name: 'New Item', quantity: 1, price: 0, amount: 0 },
      ],
    });
  };

  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  // Submit and Save to MongoDB
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.title.trim()) {
      setErrorMessage('Please enter a transaction title or merchant description.');
      return;
    }

    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMessage('Please enter a valid amount in ₹ (Rupees) greater than zero.');
      return;
    }

    if (!formData.category.trim()) {
      setErrorMessage('Please select a category for this transaction.');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        type: formData.type,
        title: formData.title.trim(),
        amount: amt,
        category: formData.category.trim(),
        paymentMethod: formData.paymentMethod,
        date: new Date(formData.date).toISOString(),
        notes: formData.notes.trim(),
        referenceNumber: formData.referenceNumber.trim(),
        merchant: formData.merchant.trim(),
        vendorRecipient: formData.merchant.trim(),
        subtotal: formData.subtotal !== '' ? parseFloat(formData.subtotal) : null,
        tax: formData.tax !== '' ? parseFloat(formData.tax) : null,
        receiptTax: formData.tax !== '' ? parseFloat(formData.tax) : null,
        items: formData.items.map((it) => ({
          name: it.name.trim(),
          quantity: Number(it.quantity) || 1,
          price: Number(it.price) || 0,
          amount: Number(it.amount) || 0,
        })),
        receiptImage: document.storedFileName,
        documentId: document._id,
        ocrStatus: document.processingStatus || 'completed',
      };

      const res = await createTransaction(payload);

      addToast(
        `${formData.type === 'incoming' ? 'Incoming money' : 'Office expense'} recorded and receipt linked successfully`,
        'success'
      );

      // Refresh ledger totals, balances, recent transactions, and category metrics
      refreshAll();

      if (onSaved) {
        onSaved(res.transaction, document);
      }

      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review & Save Scanned Transaction"
      maxWidth="max-w-4xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-h-[80vh] overflow-y-auto pr-1 font-sans">
        {/* Left Column: Receipt Document Preview & OCR Inspection (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-[#ff5e00]" />
                Original Document
              </span>
              <a
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-[#ff5e00] hover:underline flex items-center gap-1"
              >
                <span>View Full</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Image / PDF Container */}
            <div className="w-full h-64 sm:h-72 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-black/5 dark:bg-black/40 flex items-center justify-center relative">
              {isImage ? (
                <img
                  src={downloadUrl}
                  alt={document.title}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-6 space-y-2">
                  <FileText className="w-12 h-12 text-[#ff5e00] mx-auto opacity-80" />
                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                    PDF Document
                  </p>
                  <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
                    {document.originalFileName}
                  </p>
                </div>
              )}
            </div>

            {/* OCR Engine & Confidence Metric */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-500 dark:text-zinc-400">
                Engine: <strong className="text-slate-800 dark:text-zinc-200">{document.ocrEngine || 'Gemini Vision'}</strong>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                <ShieldCheck className="w-3 h-3" />
                {document.confidence || 85}% Confident
              </span>
            </div>
          </div>

          {/* Validation Warnings / Uncertain Fields Notice */}
          {validation.warnings && validation.warnings.length > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>OCR Validation Notice</span>
              </div>
              <ul className="list-disc pl-4 text-[11px] text-amber-700 dark:text-amber-400 space-y-0.5">
                {validation.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* AI Financial Classification Rationale */}
          {st.classificationReason && (
            <div className="p-3 bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/30 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-zinc-200">
                <Sparkles className="w-3.5 h-3.5 text-[#ff5e00]" />
                <span>Document Direction Suggestion</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-zinc-400">
                {st.classificationReason} You can adjust or override this classification below.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Transaction Review & Edit Form (7 cols) */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs rounded-xl font-medium">
                {errorMessage}
              </div>
            )}

            {/* Income vs Expense Selection Toggle */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
                Transaction Direction (Confirm Type) <span className="text-rose-500">*</span>
              </label>
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
                  <ArrowDownLeft className="w-4 h-4" />
                  Income (Money Received)
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
                  <ArrowUpRight className="w-4 h-4" />
                  Expense (Money Paid)
                </button>
              </div>
            </div>

            {/* Amount & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                  <span>Amount in ₹ (Rupees) <span className="text-rose-500">*</span></span>
                  {isTotalUncertain && (
                    <span className="text-amber-600 text-[10px] font-semibold flex items-center gap-0.5">
                      <AlertTriangle className="w-2.5 h-2.5" /> Confirm
                    </span>
                  )}
                </label>
                <div className="relative rounded-xl">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <span className="text-base font-bold text-[#ff5e00]">₹</span>
                  </div>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className={`block w-full rounded-xl border pl-8 pr-3 py-2.5 text-sm font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-zinc-950 focus:border-[#ff5e00] focus:outline-none transition-colors ${
                      isTotalUncertain ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200 dark:border-zinc-800'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                  <span>Date & Time <span className="text-rose-500">*</span></span>
                  {isDateUncertain && (
                    <span className="text-amber-600 text-[10px] font-semibold flex items-center gap-0.5">
                      <AlertTriangle className="w-2.5 h-2.5" /> Check date
                    </span>
                  )}
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="block w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#ff5e00] focus:outline-none"
                />
              </div>
            </div>

            {/* Title / Description */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
                {formData.type === 'incoming' ? 'Income Title / Source' : 'Expense Title / Description'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Office Hardware / Client Settlement"
                className="block w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#ff5e00] focus:outline-none"
              />
            </div>

            {/* Category & Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="block w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#ff5e00] focus:outline-none cursor-pointer"
                >
                  {filteredCategories.map((c) => (
                    <option key={c._id || c.name} value={c.name} className="bg-white dark:bg-zinc-900">
                      {c.name}
                    </option>
                  ))}
                  {!filteredCategories.some((c) => c.name === formData.category) && formData.category && (
                    <option value={formData.category} className="bg-white dark:bg-zinc-900">
                      {formData.category}
                    </option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
                  Payment Method <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="block w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#ff5e00] focus:outline-none cursor-pointer"
                >
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
            </div>

            {/* Merchant / Payer & Receipt Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                  <span>{formData.type === 'incoming' ? 'Payer / Client' : 'Merchant / Vendor'}</span>
                  {isMerchantUncertain && (
                    <span className="text-amber-600 text-[10px] font-semibold flex items-center gap-0.5">
                      <AlertTriangle className="w-2.5 h-2.5" /> Check
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={formData.merchant}
                  onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                  placeholder="e.g. Croma, Reliance, John Doe"
                  className="block w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-[#ff5e00] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
                  Receipt / Invoice #
                </label>
                <input
                  type="text"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  placeholder="e.g. REC-2026-001"
                  className="block w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-[#ff5e00] focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Subtotal & Tax */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
                  Subtotal (Optional)
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.subtotal}
                  onChange={(e) => setFormData({ ...formData, subtotal: e.target.value })}
                  placeholder="0.00"
                  className="block w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-[#ff5e00] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
                  GST / Tax Amount (Optional)
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.tax}
                  onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                  placeholder="0.00"
                  className="block w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-[#ff5e00] focus:outline-none"
                />
              </div>
            </div>

            {/* Line Items Accordion / Table */}
            <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-zinc-900/30">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-800 dark:text-zinc-200">
                <span>Itemized Products ({formData.items.length})</span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1 text-[11px] text-[#ff5e00] hover:underline cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Add Item
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-zinc-800 max-h-36 overflow-y-auto p-1">
                {formData.items.length > 0 ? (
                  formData.items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-1.5 text-xs">
                      <input
                        type="text"
                        value={it.name}
                        onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                        placeholder="Item name"
                        className="flex-1 text-xs p-1 rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950"
                      />
                      <input
                        type="number"
                        value={it.quantity}
                        onChange={(e) => handleUpdateItem(idx, 'quantity', parseFloat(e.target.value) || 1)}
                        placeholder="Qty"
                        className="w-12 text-xs p-1 rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-center"
                      />
                      <input
                        type="number"
                        step="any"
                        value={it.price}
                        onChange={(e) => handleUpdateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                        placeholder="Price"
                        className="w-16 text-xs p-1 rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-right"
                      />
                      <span className="w-20 text-right font-semibold text-slate-800 dark:text-zinc-200">
                        {it.amount ? formatINR(it.amount) : '₹0'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-2 text-[11px] text-slate-400">
                    No individual items itemized. Total amount will be recorded directly.
                  </p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
                Ledger Notes
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes or context..."
                className="block w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 p-2.5 text-xs text-slate-900 dark:text-white focus:border-[#ff5e00] focus:outline-none resize-none"
              />
            </div>

            {/* Action Buttons: Cancel vs Confirm & Save */}
            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-[#ff5e00] hover:bg-[#e05300] text-white shadow-md transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving to Ledger...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Save to Ledger</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
};
