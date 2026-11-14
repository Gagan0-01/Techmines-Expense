import React, { useState, useRef, useCallback } from 'react';
import { useLedger } from '../../context/LedgerContext';
import { useToast } from '../../context/ToastContext';
import { scanReceiptAndAdd, createTransaction } from '../../services/api';
import {
  Camera,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Sparkles,
} from 'lucide-react';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

/**
 * QuickReceiptScan — Upload a receipt image → AI scans → auto-creates transaction
 * No image is permanently stored. Integrates with LedgerContext for dashboard refresh.
 */
export const QuickReceiptScan = ({ onTransactionCreated, defaultType = null, label = null }) => {
  const { refreshAll } = useLedger();
  const { addToast } = useToast();
  const fileInputRef = useRef(null);

  // Component state machine: idle | scanning | extracted | confirming | saved | error
  const [status, setStatus] = useState('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [savedTransaction, setSavedTransaction] = useState(null);

  // Confirmation form state (when auto-save is not possible)
  const [confirmForm, setConfirmForm] = useState({
    type: defaultType || 'expense',
    amount: '',
    category: '',
    title: '',
    paymentMethod: 'Cash',
    date: '',
    description: '',
  });

  const resetState = useCallback(() => {
    setStatus('idle');
    setIsProcessing(false);
    setExtractedData(null);
    setErrorMessage('');
    setSavedTransaction(null);
    setConfirmForm({
      type: defaultType || 'expense',
      amount: '',
      category: '',
      title: '',
      paymentMethod: 'Cash',
      date: '',
      description: '',
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [defaultType]);

  const validateFile = (file) => {
    if (!file) return 'No file selected.';
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload a JPG, PNG, or WebP image.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 15MB.`;
    }
    return null;
  };

  const handleFileSelect = async (file) => {
    const validationError = validateFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      setStatus('error');
      return;
    }

    // Guard against duplicate submissions
    if (isProcessing) return;

    setIsProcessing(true);
    setStatus('scanning');
    setErrorMessage('');
    setExtractedData(null);
    setSavedTransaction(null);

    try {
      const result = await scanReceiptAndAdd(file, defaultType);

      if (!result.success) {
        throw new Error(result.message || 'Scan failed.');
      }

      setExtractedData(result.extractedData);

      if (result.autoSaved && result.transaction) {
        // Transaction was auto-created on the server
        setSavedTransaction(result.transaction);
        setStatus('saved');
        addToast(result.message || 'Transaction auto-saved!', 'success');
        refreshAll();
        if (onTransactionCreated) {
          onTransactionCreated(result.transaction);
        }
      } else if (result.needsConfirmation) {
        // Need user to confirm/correct before saving
        const ed = result.extractedData;
        setConfirmForm({
          type: ed.type || 'expense',
          amount: ed.amount !== null && ed.amount > 0 ? ed.amount.toString() : '',
          category: ed.category || '',
          title: ed.title || '',
          paymentMethod: ed.paymentMethod || 'Cash',
          date: ed.date || new Date().toISOString().split('T')[0],
          description: ed.description || '',
        });
        setStatus('confirming');
        addToast(result.message || 'Please review the extracted details.', 'info');
      }
    } catch (err) {
      console.error('[QuickReceiptScan] Error:', err);
      setErrorMessage(err.message || 'Failed to scan receipt. Please try again.');
      setStatus('error');
      addToast('Receipt scan failed. ' + (err.message || ''), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setConfirmForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleConfirmSave = async () => {
    // Validate required fields
    const amount = parseFloat(confirmForm.amount);
    if (isNaN(amount) || amount <= 0) {
      setErrorMessage('Please enter a valid amount greater than 0.');
      return;
    }

    if (!confirmForm.title.trim()) {
      setErrorMessage('Please enter a title.');
      return;
    }

    if (!confirmForm.category.trim()) {
      setErrorMessage('Please select or enter a category.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const txData = {
        title: confirmForm.title.trim(),
        amount,
        type: confirmForm.type,
        category: confirmForm.category.trim(),
        paymentMethod: confirmForm.paymentMethod,
        date: confirmForm.date || new Date().toISOString(),
        notes: confirmForm.description || '',
        referenceNumber: extractedData?.receiptNumber || '',
        vendorRecipient: extractedData?.merchant || '',
      };

      const result = await createTransaction(txData);

      if (result.success) {
        setSavedTransaction(result.transaction);
        setStatus('saved');
        addToast(
          `${confirmForm.type === 'incoming' ? 'Income' : 'Expense'} of ₹${amount} saved successfully!`,
          'success'
        );
        refreshAll();
        if (onTransactionCreated) {
          onTransactionCreated(result.transaction);
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save transaction.');
      addToast('Failed to save transaction.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleClick = () => {
    if (status === 'idle' || status === 'error') {
      fileInputRef.current?.click();
    }
  };

  // ─── RENDER: Scanning State ───
  if (status === 'scanning') {
    return (
      <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-[#ff5e00]/40 bg-gradient-to-br from-[#ff5e00]/5 to-transparent dark:from-[#ff5e00]/10 p-6">
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <div className="relative">
            <Loader2 className="w-10 h-10 text-[#ff5e00] animate-spin" />
            <Sparkles className="w-4 h-4 text-amber-400 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              AI Scanning Receipt...
            </p>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Gemini Vision is extracting transaction details
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDER: Saved State ───
  if (status === 'saved' && savedTransaction) {
    return (
      <div className="relative rounded-xl border-2 border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-900/10 p-4">
        <button
          onClick={resetState}
          className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300"
          title="Scan another receipt"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              Transaction Saved!
            </p>
            <div className="mt-1.5 space-y-0.5">
              <p className="text-xs text-slate-700 dark:text-zinc-300 truncate">
                <span className="font-medium">{savedTransaction.title}</span>
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className={`inline-flex items-center gap-1 font-semibold ${
                  savedTransaction.type === 'incoming'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {savedTransaction.type === 'incoming' ? (
                    <ArrowDownLeft className="w-3 h-3" />
                  ) : (
                    <ArrowUpRight className="w-3 h-3" />
                  )}
                  ₹{savedTransaction.amount?.toLocaleString('en-IN')}
                </span>
                <span className="text-slate-400 dark:text-zinc-500">•</span>
                <span className="text-slate-500 dark:text-zinc-400">{savedTransaction.category}</span>
              </div>
            </div>
            <button
              onClick={resetState}
              className="mt-2.5 text-xs font-semibold text-[#ff5e00] hover:text-[#ff7b29] transition-colors"
            >
              Scan Another Receipt →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDER: Confirmation Form ───
  if (status === 'confirming' && extractedData) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0d0d0d] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#ff5e00]" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Confirm Transaction
            </h4>
          </div>
          <button
            onClick={resetState}
            className="text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {errorMessage}
          </div>
        )}

        {extractedData.warnings?.length > 0 && (
          <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
            ⚠️ {extractedData.warnings[0]}
          </div>
        )}

        {/* Type Toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setConfirmForm(prev => ({ ...prev, type: 'incoming' }))}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              confirmForm.type === 'incoming'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            Income
          </button>
          <button
            type="button"
            onClick={() => setConfirmForm(prev => ({ ...prev, type: 'expense' }))}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              confirmForm.type === 'expense'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Expense
          </button>
        </div>

        {/* Amount & Date */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1">
              Amount (₹) *
            </label>
            <input
              type="number"
              name="amount"
              value={confirmForm.amount}
              onChange={handleInputChange}
              placeholder="0.00"
              step="0.01"
              min="0.01"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:ring-2 focus:ring-[#ff5e00]/40 focus:border-[#ff5e00] outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1">
              Date
            </label>
            <input
              type="date"
              name="date"
              value={confirmForm.date}
              onChange={handleInputChange}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#ff5e00]/40 focus:border-[#ff5e00] outline-none transition-all"
            />
          </div>
        </div>

        {/* Title & Category */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1">
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={confirmForm.title}
              onChange={handleInputChange}
              placeholder="Transaction title"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:ring-2 focus:ring-[#ff5e00]/40 focus:border-[#ff5e00] outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1">
              Category *
            </label>
            <input
              type="text"
              name="category"
              value={confirmForm.category}
              onChange={handleInputChange}
              placeholder="e.g. Food, Travel"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:ring-2 focus:ring-[#ff5e00]/40 focus:border-[#ff5e00] outline-none transition-all"
            />
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1">
            Payment Method
          </label>
          <select
            name="paymentMethod"
            value={confirmForm.paymentMethod}
            onChange={handleInputChange}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#ff5e00]/40 focus:border-[#ff5e00] outline-none transition-all"
          >
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
        </div>

        {/* Save Button */}
        <button
          onClick={handleConfirmSave}
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#ff5e00] hover:bg-[#e05500] active:bg-[#cc4d00] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-sm transition-all"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Confirm & Save
            </>
          )}
        </button>
      </div>
    );
  }

  // ─── RENDER: Error State ───
  if (status === 'error') {
    return (
      <div className="rounded-xl border-2 border-dashed border-rose-300 dark:border-rose-800/50 bg-rose-50/50 dark:bg-rose-900/10 p-5">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <AlertCircle className="w-8 h-8 text-rose-500" />
          <p className="text-xs text-rose-600 dark:text-rose-400 font-medium max-w-[240px]">
            {errorMessage || 'Something went wrong.'}
          </p>
          <button
            onClick={resetState}
            className="mt-1 text-xs font-semibold text-[#ff5e00] hover:text-[#ff7b29] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ─── RENDER: Idle State (Upload Zone) ───
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
      className="group relative cursor-pointer rounded-xl border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-[#ff5e00]/60 dark:hover:border-[#ff5e00]/40 bg-gradient-to-br from-slate-50 to-white dark:from-zinc-900/50 dark:to-[#0d0d0d] p-5 transition-all hover:shadow-md hover:shadow-[#ff5e00]/5"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        onChange={handleFileInputChange}
        className="hidden"
      />

      <div className="flex flex-col items-center justify-center gap-2 text-center">
        <div className="relative">
          <div className="w-11 h-11 rounded-full bg-[#ff5e00]/10 dark:bg-[#ff5e00]/15 flex items-center justify-center group-hover:bg-[#ff5e00]/20 transition-colors">
            <Camera className="w-5 h-5 text-[#ff5e00]" />
          </div>
          <Sparkles className="w-3.5 h-3.5 text-amber-400 absolute -top-0.5 -right-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
            {label || (defaultType === 'expense' ? 'Quick Expense Scan' : defaultType === 'incoming' ? 'Quick Income Scan' : 'Quick Receipt Scan')}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5 leading-tight">
            Drop or tap to upload • AI auto-adds transaction
          </p>
        </div>

        <div className="flex items-center gap-1.5 mt-0.5">
          <Upload className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
          <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
            JPG, PNG, WebP • Max 15MB
          </span>
        </div>
      </div>
    </div>
  );
};

