import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import {
  FileText,
  Copy,
  Check,
  Save,
  RefreshCw,
  Download,
  AlertTriangle,
  Loader2,
  FileCode,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Calendar,
  Receipt,
  CreditCard,
  CheckCircle2,
  Edit3,
  Plus,
  Trash2,
  HelpCircle,
  Hash,
} from 'lucide-react';
import { useLedger } from '../../context/LedgerContext';
import { formatINR } from '../../utils/currency';
import { toInputDateTimeFormat } from '../../utils/date';
import {
  updateDocument,
  reprocessDocument,
  downloadDocumentTxt,
} from '../../services/documentService';
import { ReceiptReviewModal } from './ReceiptReviewModal';

/**
 * Renders a color-coded confidence pill with review status
 */
const ConfidenceBadge = ({ field }) => {
  if (!field || typeof field !== 'object') return null;
  const val = field.value;
  const conf = typeof field.confidence === 'number' ? field.confidence : (val !== null && val !== undefined ? 80 : 0);
  const needsRev = Boolean(field.needsReview || conf < 80 || val === null || val === undefined);

  if (val === null || val === undefined || val === '') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md">
        <HelpCircle className="w-2.5 h-2.5 text-slate-400" />
        Unreadable / Missing
      </span>
    );
  }

  if (needsRev) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 px-1.5 py-0.5 rounded-md">
        <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
        {conf > 0 ? `${conf}% Review` : 'Needs Review'}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 px-1.5 py-0.5 rounded-md">
      <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
      {conf}% Verified
    </span>
  );
};

export const OCRTextEditor = ({ document, onDocumentUpdated }) => {
  const { openAddExpense, categories } = useLedger();

  const [activeTab, setActiveTab] = useState('structured'); // 'structured' | 'raw'
  const [text, setText] = useState('');
  const [structuredData, setStructuredData] = useState(null);
  const [isEditingFields, setIsEditingFields] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const handleTransactionSaved = (newTx, doc) => {
    if (onDocumentUpdated) {
      onDocumentUpdated({
        ...doc,
        convertedToTransaction: true,
        transactionId: newTx._id,
      });
    }
    setStatusMessage({
      type: 'success',
      text: `${newTx.type === 'incoming' ? 'Incoming money' : 'Office expense'} recorded and receipt linked.`,
    });
  };

  useEffect(() => {
    if (document) {
      setText(document.extractedText || '');
      setStructuredData(document.structuredData || null);
      setStatusMessage(null);
      setIsDirty(false);
      setIsEditingFields(false);
      setActiveTab(document.structuredData ? 'structured' : 'raw');
    }
  }, [document]);

  if (!document) {
    return (
      <div className="bg-white dark:bg-[#0d0d0d] rounded-2xl border border-slate-200 dark:border-zinc-800 p-8 text-center h-full min-h-[350px] flex flex-col items-center justify-center">
        <div className="p-4 rounded-full bg-slate-100 dark:bg-zinc-800/60 text-slate-400 mb-3">
          <FileCode className="w-8 h-8" />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
          No document selected
        </p>
        <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">
          Upload a receipt or invoice to view AI vision extraction, financial validation, and expense creation
        </p>
      </div>
    );
  }

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lineCount = text ? text.split('\n').length : 0;
  const charCount = text.length;

  // Count unverified / review fields
  const getReviewFieldsCount = () => {
    if (!structuredData) return 0;
    let count = 0;
    const fields = [
      structuredData.merchantName,
      structuredData.receiptNumber,
      structuredData.date,
      structuredData.total,
      structuredData.subtotal,
      structuredData.tax,
    ];
    fields.forEach((f) => {
      if (f && (f.needsReview || (typeof f.confidence === 'number' && f.confidence < 80) || f.value === null)) {
        count++;
      }
    });
    return count;
  };

  const reviewCount = getReviewFieldsCount();

  // Copy raw text
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  // Save changes to backend
  const handleSave = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await updateDocument(document._id, {
        extractedText: text,
        structuredData: structuredData,
      });
      setStatusMessage({ type: 'success', text: 'Document changes saved and re-validated successfully.' });
      setIsDirty(false);
      setIsEditingFields(false);
      if (onDocumentUpdated) onDocumentUpdated(res.document);
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save changes.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Re-scan with Gemini Vision
  const handleReprocess = async () => {
    setIsReprocessing(true);
    setStatusMessage(null);
    try {
      const res = await reprocessDocument(document._id);
      setText(res.document.extractedText || '');
      setStructuredData(res.document.structuredData || null);
      setStatusMessage({ type: 'success', text: 'Document re-scanned with Gemini Flash Vision.' });
      setIsDirty(false);
      if (onDocumentUpdated) onDocumentUpdated(res.document);
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to reprocess OCR.' });
    } finally {
      setIsReprocessing(false);
    }
  };

  // Export TXT
  const handleDownloadTxt = async () => {
    try {
      await downloadDocumentTxt(document._id, document.title);
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Failed to download TXT file.' });
    }
  };

  // Export PDF
  const handleDownloadPdf = () => {
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const safeTitle = document.title || 'Extracted Document Text';
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text('TECHMINES - EXTRACTED DOCUMENT TEXT', 15, 20);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(100);
      pdf.text(`Document: ${safeTitle}`, 15, 28);
      pdf.text(`Original File: ${document.originalFileName} | Category: ${document.documentType}`, 15, 33);
      pdf.text(`Extracted on: ${new Date().toLocaleString()}`, 15, 38);

      pdf.setDrawColor(220);
      pdf.line(15, 42, 195, 42);

      pdf.setFont('courier', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(20);

      const splitText = pdf.splitTextToSize(text || '(No text extracted)', 180);
      pdf.text(splitText, 15, 50);

      const cleanFileName = safeTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
      pdf.save(`${cleanFileName}_extracted.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      setStatusMessage({ type: 'error', text: 'Failed to generate PDF file.' });
    }
  };

  // Field updater
  const updateField = (fieldName, newVal) => {
    setStructuredData((prev) => {
      if (!prev) return prev;
      const current = prev[fieldName] || {};
      return {
        ...prev,
        [fieldName]: {
          ...current,
          value: newVal,
          needsReview: false, // Resolved by user!
          confidence: 100,
        },
      };
    });
    setIsDirty(true);
  };

  // Line item updater
  const updateLineItem = (index, fieldName, newVal) => {
    setStructuredData((prev) => {
      if (!prev || !Array.isArray(prev.items)) return prev;
      const items = [...prev.items];
      const item = { ...items[index] };
      item[fieldName] = {
        ...(typeof item[fieldName] === 'object' ? item[fieldName] : {}),
        value: newVal,
        needsReview: false,
        confidence: 100,
      };
      items[index] = item;
      return { ...prev, items };
    });
    setIsDirty(true);
  };

  const removeLineItem = (index) => {
    setStructuredData((prev) => {
      if (!prev || !Array.isArray(prev.items)) return prev;
      return {
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      };
    });
    setIsDirty(true);
  };

  const addLineItem = () => {
    setStructuredData((prev) => {
      const items = prev?.items ? [...prev.items] : [];
      items.push({
        description: { value: 'New Item', confidence: 100, needsReview: false },
        quantity: { value: 1, confidence: 100, needsReview: false },
        unitPrice: { value: 0, confidence: 100, needsReview: false },
        amount: { value: 0, confidence: 100, needsReview: false },
      });
      return { ...(prev || {}), items };
    });
    setIsDirty(true);
  };

  /**
   * Safe Expense Creation: Prefills the existing TechMines TransactionFormModal
   * and opens it for user review & confirmation before committing.
   */
  const handleCreateExpense = () => {
    const s = structuredData || {};
    const merchantName = s.merchantName?.value || s.merchant?.name || document.title || 'Scanned Expense';
    const amountVal = s.total?.value ?? s.financials?.grandTotal ?? '';
    const paymentMethodVal = s.paymentMethod?.value || s.payment?.method || 'UPI';
    const refNum = s.receiptNumber?.value || s.invoice?.receiptNumber || s.transactionReference?.value || '';

    if (amountVal === '' || amountVal === null || Number(amountVal) <= 0) {
      setStatusMessage({
        type: 'error',
        text: 'Please verify or enter a valid Grand Total amount before converting to an expense.',
      });
      return;
    }

    let txDate = toInputDateTimeFormat(new Date());
    const dateStr = s.date?.value || s.invoice?.date;
    if (dateStr) {
      try {
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          txDate = toInputDateTimeFormat(parsed);
        }
      } catch (e) {}
    }

    // Heuristically suggest an existing category if name matches
    let matchedCategory = '';
    if (categories && categories.length > 0) {
      const lowerType = (document.documentType || '').toLowerCase();
      const match = categories.find((c) =>
        c.name.toLowerCase().includes(lowerType) ||
        (lowerType === 'receipt' && c.name.toLowerCase().includes('office')) ||
        (lowerType === 'bill' && c.name.toLowerCase().includes('electricity'))
      );
      if (match) matchedCategory = match.name;
    }

    // Compose clear notes itemizing line items if available
    let notesSummary = `Scanned from "${document.title}". Reference: ${refNum || 'N/A'}. OCR Engine: ${document.ocrEngine || 'Gemini Vision'}.`;
    if (Array.isArray(s.items) && s.items.length > 0) {
      const itemsList = s.items
        .slice(0, 5)
        .map((it) => {
          const desc = it.description?.value || it.description || 'Item';
          const amt = it.amount?.value ?? it.amount ?? '';
          return `${desc}${amt !== '' ? ` (₹${amt})` : ''}`;
        })
        .join(', ');
      notesSummary += ` Items: ${itemsList}${s.items.length > 5 ? ` (+${s.items.length - 5} more)` : ''}`;
    }

    openAddExpense({
      title: merchantName,
      amount: String(amountVal),
      type: 'expense',
      category: matchedCategory,
      paymentMethod: ['Cash', 'UPI', 'Bank Transfer', 'Card'].includes(paymentMethodVal)
        ? (paymentMethodVal === 'Card' ? 'UPI' : paymentMethodVal)
        : 'UPI',
      date: txDate,
      notes: notesSummary,
      referenceNumber: refNum,
      vendorRecipient: merchantName,
      isFromOcr: true,
      documentId: document._id,
    });
  };

  const validation = document.financialValidation || {};
  const hasStructured = Boolean(structuredData);

  // Live calculation of financial math
  const currentTotal = structuredData?.total?.value ?? structuredData?.financials?.grandTotal ?? null;
  const currentSubtotal = structuredData?.subtotal?.value ?? structuredData?.financials?.subtotal ?? null;
  const currentTax = structuredData?.tax?.value ?? structuredData?.financials?.tax ?? 0;
  const currentDiscount = structuredData?.discount?.value ?? structuredData?.financials?.discount ?? 0;
  const currentCharges = structuredData?.additionalCharges?.value ?? 0;

  let lineItemsSum = 0;
  let hasValidItems = false;
  if (Array.isArray(structuredData?.items)) {
    structuredData.items.forEach((it) => {
      const amt = typeof it.amount?.value === 'number' ? it.amount.value : (typeof it.amount === 'number' ? it.amount : null);
      if (amt !== null && !isNaN(amt)) {
        lineItemsSum += amt;
        hasValidItems = true;
      }
    });
  }
  lineItemsSum = Math.round(lineItemsSum * 100) / 100;

  const baseSum = currentSubtotal !== null ? currentSubtotal : (hasValidItems ? lineItemsSum : null);
  const calculatedGrandTotal = baseSum !== null
    ? Math.round((baseSum - currentDiscount + currentTax + currentCharges) * 100) / 100
    : null;

  const mathDiscrepancy = (calculatedGrandTotal !== null && currentTotal !== null)
    ? Math.round(Math.abs(calculatedGrandTotal - currentTotal) * 100) / 100
    : 0;

  const isMathConsistent = (calculatedGrandTotal !== null && currentTotal !== null)
    ? mathDiscrepancy <= 1.5
    : (validation.isMathValid ?? true);

  return (
    <div className="bg-white dark:bg-[#0d0d0d] rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 flex flex-col h-full shadow-sm">
      {/* Top Header & Tab Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800/80 mb-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-zinc-900 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('structured')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'structured'
                ? 'bg-white dark:bg-[#1a1a1a] text-[#ff5e00] shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Receipt Review
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('raw')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'raw'
                ? 'bg-white dark:bg-[#1a1a1a] text-[#ff5e00] shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Raw Transcription
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5">
          {hasStructured && (
            document.convertedToTransaction ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Saved to Ledger
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#ff5e00] hover:bg-[#e05300] text-white shadow-xs transition-transform active:scale-95 cursor-pointer"
                title="Review & Save as Income or Expense in Ledger"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Review & Save Transaction
              </button>
            )
          )}

          {hasStructured && (
            <button
              type="button"
              onClick={() => setIsEditingFields(!isEditingFields)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-xl border transition-colors ${
                isEditingFields
                  ? 'border-[#ff5e00] bg-orange-50 dark:bg-orange-950/30 text-[#ff5e00]'
                  : 'border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              {isEditingFields ? 'Done Editing' : 'Edit Fields'}
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          <button
            type="button"
            onClick={handleDownloadTxt}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            TXT
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            PDF
          </button>

          <button
            type="button"
            onClick={handleReprocess}
            disabled={isReprocessing}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReprocessing ? 'animate-spin text-[#ff5e00]' : ''}`} />
            Re-scan
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50 ${
              isDirty
                ? 'bg-[#ff5e00] hover:bg-[#e05300] text-white shadow-xs animate-pulse'
                : 'bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white'
            }`}
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </button>
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div
          className={`mb-3 p-2.5 text-xs rounded-xl flex items-center gap-2 ${
            statusMessage.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40'
              : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40'
          }`}
        >
          {statusMessage.type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Tab Content */}
      {activeTab === 'structured' && (
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[520px]">
          {/* Review Alert Summary Banner */}
          {reviewCount > 0 ? (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900/40 rounded-xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>{reviewCount} field{reviewCount > 1 ? 's' : ''} flagged for review:</strong> Some extracted data has low confidence or missing values. Please verify before converting to expense.
                </span>
              </div>
              {!isEditingFields && (
                <button
                  type="button"
                  onClick={() => setIsEditingFields(true)}
                  className="px-2 py-1 text-[11px] font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors shrink-0"
                >
                  Edit Now
                </button>
              )}
            </div>
          ) : (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>High Quality Extraction:</strong> All primary receipt fields verified with high confidence.
              </span>
            </div>
          )}

          {/* Financial Validation Badge & Alerts */}
          {isMathConsistent ? (
            <div className="flex items-center gap-2 p-3 text-xs bg-emerald-50/60 dark:bg-emerald-950/15 border border-emerald-200/80 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Calculations Verified:</strong> Mathematical relationships between subtotal, taxes, discounts, and grand total match cleanly.
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2 p-3 text-xs bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold">Mathematical Discrepancy Detected:</span>
                <p className="text-[11px]">
                  Sum of items/subtotal with taxes and discounts yields {formatINR(calculatedGrandTotal)}, which differs from the extracted grand total ({formatINR(currentTotal)}) by {formatINR(mathDiscrepancy)}.
                </p>
                {validation.warnings && validation.warnings.length > 0 && (
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                    {validation.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {hasStructured ? (
            <>
              {/* Summary Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Merchant / Vendor Card */}
                <div className="p-3.5 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
                  <div className="flex items-center justify-between gap-2 text-slate-500 dark:text-zinc-400 text-xs mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#ff5e00]" />
                      <span className="font-semibold">Merchant / Issuer</span>
                    </div>
                    <ConfidenceBadge field={structuredData.merchantName} />
                  </div>

                  {isEditingFields ? (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={structuredData.merchantName?.value || ''}
                        onChange={(e) => updateField('merchantName', e.target.value)}
                        placeholder="Merchant Name"
                        className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 font-bold"
                      />
                      <input
                        type="text"
                        value={structuredData.merchantTaxId?.value || ''}
                        onChange={(e) => updateField('merchantTaxId', e.target.value)}
                        placeholder="GSTIN / Tax ID"
                        className="w-full text-[11px] p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 font-mono"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {structuredData.merchantName?.value || structuredData.merchant?.name || '—'}
                      </p>
                      {(structuredData.merchantTaxId?.value || structuredData.merchant?.taxId) && (
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                          GSTIN/Tax ID: <span className="font-mono">{structuredData.merchantTaxId?.value || structuredData.merchant?.taxId}</span>
                        </p>
                      )}
                      {(structuredData.merchantAddress?.value || structuredData.merchant?.address) && (
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                          {structuredData.merchantAddress?.value || structuredData.merchant?.address}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Receipt Details Card */}
                <div className="p-3.5 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
                  <div className="flex items-center justify-between gap-2 text-slate-500 dark:text-zinc-400 text-xs mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-sky-500" />
                      <span className="font-semibold">Receipt & Date</span>
                    </div>
                    <ConfidenceBadge field={structuredData.receiptNumber} />
                  </div>

                  {isEditingFields ? (
                    <div className="space-y-1.5">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={structuredData.receiptNumber?.value || ''}
                          onChange={(e) => updateField('receiptNumber', e.target.value)}
                          placeholder="Receipt / Invoice #"
                          className="flex-1 text-xs p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 font-bold"
                        />
                        <input
                          type="date"
                          value={structuredData.date?.value || ''}
                          onChange={(e) => updateField('date', e.target.value)}
                          className="w-36 text-xs p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950"
                        />
                      </div>
                      <select
                        value={structuredData.paymentMethod?.value || 'UPI'}
                        onChange={(e) => updateField('paymentMethod', e.target.value)}
                        className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950"
                      >
                        <option value="UPI">UPI</option>
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Card">Card</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {(structuredData.receiptNumber?.value || structuredData.invoice?.receiptNumber) ? `#${structuredData.receiptNumber?.value || structuredData.invoice?.receiptNumber}` : '—'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {structuredData.date?.value || structuredData.invoice?.date || 'Date not detected'}
                      </p>
                      {(structuredData.paymentMethod?.value || structuredData.payment?.method) && (
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                          <CreditCard className="w-3 h-3" />
                          Paid via: <strong className="text-slate-700 dark:text-zinc-300">{structuredData.paymentMethod?.value || structuredData.payment?.method}</strong>
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div className="rounded-xl border border-slate-100 dark:border-zinc-800 overflow-hidden">
                <div className="bg-slate-50 dark:bg-zinc-900 px-3 py-2 border-b border-slate-100 dark:border-zinc-800 text-[11px] font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>Itemized Line Details ({structuredData.items?.length || 0})</span>
                  {isEditingFields ? (
                    <button
                      type="button"
                      onClick={addLineItem}
                      className="inline-flex items-center gap-1 text-[10px] text-[#ff5e00] hover:underline cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Add Item
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-normal">Amount</span>
                  )}
                </div>

                <div className="divide-y divide-slate-100 dark:divide-zinc-800/80 max-h-[190px] overflow-y-auto">
                  {structuredData.items && structuredData.items.length > 0 ? (
                    structuredData.items.map((item, idx) => {
                      const desc = item.description?.value || item.description || `Item #${idx + 1}`;
                      const qty = item.quantity?.value ?? item.quantity ?? 1;
                      const price = item.unitPrice?.value ?? item.unitPrice ?? '';
                      const amt = item.amount?.value ?? item.amount ?? '';

                      return (
                        <div key={idx} className="p-2.5 text-xs flex items-center justify-between gap-2 hover:bg-slate-50/60 dark:hover:bg-zinc-900/40">
                          {isEditingFields ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={desc}
                                onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                                placeholder="Description"
                                className="flex-1 text-xs p-1 rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950"
                              />
                              <input
                                type="number"
                                value={qty}
                                onChange={(e) => updateLineItem(idx, 'quantity', parseFloat(e.target.value) || 1)}
                                placeholder="Qty"
                                className="w-14 text-xs p-1 rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950"
                              />
                              <input
                                type="number"
                                value={price}
                                onChange={(e) => updateLineItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                placeholder="Rate"
                                className="w-18 text-xs p-1 rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950"
                              />
                              <input
                                type="number"
                                value={amt}
                                onChange={(e) => updateLineItem(idx, 'amount', parseFloat(e.target.value) || 0)}
                                placeholder="Amount"
                                className="w-20 text-xs p-1 rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 font-bold"
                              />
                              <button
                                type="button"
                                onClick={() => removeLineItem(idx)}
                                className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                                title="Remove Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-slate-900 dark:text-white truncate">
                                  {desc}
                                </p>
                                {(qty || price) && (
                                  <p className="text-[10px] text-slate-400">
                                    Qty: {qty} {price ? `@ ₹${price}` : ''}
                                  </p>
                                )}
                              </div>
                              <span className="font-semibold text-slate-900 dark:text-white shrink-0">
                                {amt !== '' && amt !== null && amt !== undefined ? formatINR(amt) : '—'}
                              </span>
                            </>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-3 text-center text-[11px] text-slate-400">
                      No itemized lines detected.
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Calculation Summary Table */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121212] space-y-2">
                {/* Subtotal */}
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <span>Subtotal</span>
                    <ConfidenceBadge field={structuredData.subtotal} />
                  </div>
                  {isEditingFields ? (
                    <input
                      type="number"
                      step="any"
                      value={structuredData.subtotal?.value ?? ''}
                      onChange={(e) => updateField('subtotal', parseFloat(e.target.value) || 0)}
                      className="w-28 text-right text-xs p-1 rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 font-medium"
                    />
                  ) : (
                    <span className="font-medium text-slate-700 dark:text-zinc-200">
                      {(structuredData.subtotal?.value !== null && structuredData.subtotal?.value !== undefined)
                        ? formatINR(structuredData.subtotal.value)
                        : (structuredData.financials?.subtotal !== null && structuredData.financials?.subtotal !== undefined
                            ? formatINR(structuredData.financials.subtotal)
                            : '—')}
                    </span>
                  )}
                </div>

                {/* Discount */}
                {(isEditingFields || Boolean(structuredData.discount?.value || structuredData.financials?.discount)) && (
                  <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
                    <div className="flex items-center gap-1.5">
                      <span>Discount</span>
                      <ConfidenceBadge field={structuredData.discount} />
                    </div>
                    {isEditingFields ? (
                      <input
                        type="number"
                        step="any"
                        value={structuredData.discount?.value ?? ''}
                        onChange={(e) => updateField('discount', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-28 text-right text-xs p-1 rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 font-medium text-emerald-600"
                      />
                    ) : (
                      <span className="font-medium">- {formatINR(structuredData.discount?.value ?? structuredData.financials?.discount ?? 0)}</span>
                    )}
                  </div>
                )}

                {/* Tax / GST */}
                {(isEditingFields || Boolean(structuredData.tax?.value || structuredData.financials?.tax)) && (
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <span>Tax / GST</span>
                      <ConfidenceBadge field={structuredData.tax} />
                    </div>
                    {isEditingFields ? (
                      <input
                        type="number"
                        step="any"
                        value={structuredData.tax?.value ?? ''}
                        onChange={(e) => updateField('tax', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-28 text-right text-xs p-1 rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 font-medium"
                      />
                    ) : (
                      <span className="font-medium text-slate-700 dark:text-zinc-200">
                        + {formatINR(structuredData.tax?.value ?? structuredData.financials?.tax ?? 0)}
                      </span>
                    )}
                  </div>
                )}

                {/* Additional Charges */}
                {(isEditingFields || Boolean(structuredData.additionalCharges?.value)) && (
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <span>Additional Charges</span>
                      <ConfidenceBadge field={structuredData.additionalCharges} />
                    </div>
                    {isEditingFields ? (
                      <input
                        type="number"
                        step="any"
                        value={structuredData.additionalCharges?.value ?? ''}
                        onChange={(e) => updateField('additionalCharges', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-28 text-right text-xs p-1 rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 font-medium"
                      />
                    ) : (
                      <span className="font-medium text-slate-700 dark:text-zinc-200">
                        + {formatINR(structuredData.additionalCharges.value)}
                      </span>
                    )}
                  </div>
                )}

                {/* Grand Total */}
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Grand Total
                      </span>
                      <ConfidenceBadge field={structuredData.total} />
                    </div>
                    <span className="block text-[10px] text-slate-400">Final payable amount</span>
                  </div>
                  {isEditingFields ? (
                    <input
                      type="number"
                      step="any"
                      value={structuredData.total?.value ?? ''}
                      onChange={(e) => updateField('total', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-32 text-right text-base font-extrabold text-[#ff5e00] p-1.5 rounded-lg border border-[#ff5e00] bg-white dark:bg-zinc-950"
                    />
                  ) : (
                    <span className="text-lg font-extrabold text-[#ff5e00]">
                      {(structuredData.total?.value !== null && structuredData.total?.value !== undefined)
                        ? formatINR(structuredData.total.value)
                        : (structuredData.financials?.grandTotal !== null && structuredData.financials?.grandTotal !== undefined
                            ? formatINR(structuredData.financials.grandTotal)
                            : '—')}
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 px-4 text-slate-400">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#ff5e00]" />
              <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Gemini Vision structured extraction not generated yet
              </p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                Ensure GEMINI_API_KEY is configured in your backend .env file, then click Re-scan above to extract structured line items and financial validation.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Raw Transcription Tab Content */}
      {activeTab === 'raw' && (
        <div className="flex-1 min-h-[300px] flex flex-col">
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setIsDirty(true);
            }}
            placeholder="Extracted raw text will appear here. You can manually edit or correct any OCR results..."
            className="w-full flex-1 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#070707] text-slate-900 dark:text-white font-mono text-xs leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-[#ff5e00]/20 focus:border-[#ff5e00]"
          />
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{charCount} characters | {wordCount} words | {lineCount} lines</span>
            <span>Edits are saved when clicking Save above</span>
          </div>
        </div>
      )}

      {/* Receipt Review & Save Transaction Modal */}
      <ReceiptReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        document={document}
        onSaved={handleTransactionSaved}
      />
    </div>
  );
};
