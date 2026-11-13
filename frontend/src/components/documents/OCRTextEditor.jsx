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
} from 'lucide-react';
import { useLedger } from '../../context/LedgerContext';
import { formatINR } from '../../utils/currency';
import { toInputDateTimeFormat } from '../../utils/date';
import {
  updateDocument,
  reprocessDocument,
  downloadDocumentTxt,
} from '../../services/documentService';

export const OCRTextEditor = ({ document, onDocumentUpdated }) => {
  const { openAddExpense, categories } = useLedger();

  const [activeTab, setActiveTab] = useState('structured'); // 'structured' | 'raw'
  const [text, setText] = useState('');
  const [structuredData, setStructuredData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    if (document) {
      setText(document.extractedText || '');
      setStructuredData(document.structuredData || null);
      setStatusMessage(null);
      // Auto-select structured tab if structuredData exists, else raw
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await updateDocument(document._id, {
        extractedText: text,
        structuredData: structuredData,
      });
      setStatusMessage({ type: 'success', text: 'Document changes saved successfully.' });
      if (onDocumentUpdated) onDocumentUpdated(res.document);
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save changes.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReprocess = async () => {
    setIsReprocessing(true);
    setStatusMessage(null);
    try {
      const res = await reprocessDocument(document._id);
      setText(res.document.extractedText || '');
      setStructuredData(res.document.structuredData || null);
      setStatusMessage({ type: 'success', text: 'Document re-scanned with Gemini Flash Vision.' });
      if (onDocumentUpdated) onDocumentUpdated(res.document);
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to reprocess OCR.' });
    } finally {
      setIsReprocessing(false);
    }
  };

  const handleDownloadTxt = async () => {
    try {
      await downloadDocumentTxt(document._id, document.title);
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Failed to download TXT file.' });
    }
  };

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

  /**
   * Safe Expense Creation: Prefills the existing TechMines TransactionFormModal
   * and opens it for user review & confirmation before committing.
   */
  const handleCreateExpense = () => {
    const s = structuredData || {};
    const merchantName = s.merchant?.name || document.title || 'Scanned Expense';
    const amountVal = s.financials?.grandTotal ?? '';
    const paymentMethodVal = s.payment?.method || 'UPI';
    const refNum = s.invoice?.receiptNumber || s.payment?.referenceNumber || '';

    let txDate = toInputDateTimeFormat(new Date());
    if (s.invoice?.date) {
      try {
        const parsed = new Date(s.invoice.date);
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

    openAddExpense({
      title: merchantName,
      amount: amountVal ? String(amountVal) : '',
      type: 'expense',
      category: matchedCategory,
      paymentMethod: ['Cash', 'UPI', 'Bank Transfer'].includes(paymentMethodVal)
        ? paymentMethodVal
        : 'UPI',
      date: txDate,
      notes: `Scanned from "${document.title}". Reference: ${refNum}. Extracted via ${document.ocrEngine || 'Gemini Vision'}.`,
      referenceNumber: refNum,
      vendorRecipient: merchantName,
    });
  };

  const validation = document.financialValidation || {};
  const hasStructured = Boolean(structuredData);

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
            AI Receipt Analysis
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
            <button
              type="button"
              onClick={handleCreateExpense}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-[#ff5e00] hover:bg-[#e05300] text-white shadow-xs transition-transform active:scale-95 cursor-pointer"
              title="Review & Confirm Expense in Ledger"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Convert to Expense
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
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white transition-colors cursor-pointer disabled:opacity-50"
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
          {statusMessage.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Tab Content */}
      {activeTab === 'structured' && (
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[520px]">
          {/* Financial Validation Badge & Alerts */}
          {validation.isMathValid ? (
            <div className="flex items-center gap-2 p-3 text-xs bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Calculations Verified:</strong> Mathematical relationships between subtotal, taxes, discounts, and total match successfully.
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2 p-3 text-xs bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold">Financial Calculation Notice:</span>
                {validation.warnings && validation.warnings.length > 0 ? (
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                    {validation.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px]">Discrepancy detected between items sum and extracted grand total.</p>
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
                  <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400 text-xs mb-1">
                    <Building2 className="w-3.5 h-3.5 text-[#ff5e00]" />
                    <span>Merchant / Issuer</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {structuredData.merchant?.name || '—'}
                  </p>
                  {structuredData.merchant?.taxId && (
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                      GSTIN/Tax ID: <span className="font-mono">{structuredData.merchant.taxId}</span>
                    </p>
                  )}
                  {structuredData.merchant?.phone && (
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Tel: {structuredData.merchant.phone}
                    </p>
                  )}
                </div>

                {/* Receipt Details Card */}
                <div className="p-3.5 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400 text-xs mb-1">
                    <Receipt className="w-3.5 h-3.5 text-sky-500" />
                    <span>Receipt & Date</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {structuredData.invoice?.receiptNumber ? `#${structuredData.invoice.receiptNumber}` : '—'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {structuredData.invoice?.date || 'Date not detected'}
                  </p>
                  {structuredData.payment?.method && (
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                      <CreditCard className="w-3 h-3" />
                      Paid via: <strong className="text-slate-700 dark:text-zinc-300">{structuredData.payment.method}</strong>
                    </p>
                  )}
                </div>
              </div>

              {/* Items Breakdown Table */}
              {structuredData.items && structuredData.items.length > 0 && (
                <div className="rounded-xl border border-slate-100 dark:border-zinc-800 overflow-hidden">
                  <div className="bg-slate-50 dark:bg-zinc-900 px-3 py-2 border-b border-slate-100 dark:border-zinc-800 text-[11px] font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                    <span>Itemized Line Details ({structuredData.items.length})</span>
                    <span className="text-[10px] text-slate-400 font-normal">Amount</span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-zinc-800/80 max-h-[180px] overflow-y-auto">
                    {structuredData.items.map((item, idx) => (
                      <div key={idx} className="p-2.5 text-xs flex items-center justify-between gap-2 hover:bg-slate-50/60 dark:hover:bg-zinc-900/40">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900 dark:text-white truncate">
                            {item.description || `Item #${idx + 1}`}
                          </p>
                          {(item.quantity || item.unitPrice) && (
                            <p className="text-[10px] text-slate-400">
                              Qty: {item.quantity || 1} {item.unitPrice ? `@ ₹${item.unitPrice}` : ''}
                            </p>
                          )}
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-white shrink-0">
                          {item.amount !== null ? formatINR(item.amount) : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Financial Calculation Summary Table */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121212] space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                  <span>Subtotal</span>
                  <span className="font-medium text-slate-700 dark:text-zinc-200">
                    {structuredData.financials?.subtotal !== null ? formatINR(structuredData.financials.subtotal) : '—'}
                  </span>
                </div>

                {Boolean(structuredData.financials?.discount) && (
                  <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
                    <span>Discount</span>
                    <span className="font-medium">- {formatINR(structuredData.financials.discount)}</span>
                  </div>
                )}

                {Boolean(structuredData.financials?.tax) && (
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                    <span>Tax / GST</span>
                    <span className="font-medium text-slate-700 dark:text-zinc-200">
                      + {formatINR(structuredData.financials.tax)}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Grand Total
                    </span>
                    <span className="block text-[10px] text-slate-400">Final payable amount</span>
                  </div>
                  <span className="text-lg font-extrabold text-[#ff5e00]">
                    {structuredData.financials?.grandTotal !== null
                      ? formatINR(structuredData.financials.grandTotal)
                      : '—'}
                  </span>
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
            onChange={(e) => setText(e.target.value)}
            placeholder="Extracted raw text will appear here. You can manually edit or correct any OCR results..."
            className="w-full flex-1 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#070707] text-slate-900 dark:text-white font-mono text-xs leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-[#ff5e00]/20 focus:border-[#ff5e00]"
          />
        </div>
      )}

      {/* Footer Metrics */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 pt-3 border-t border-slate-100 dark:border-zinc-800/80 mt-3">
        <div className="flex items-center gap-3">
          <span>Words: <strong className="text-slate-800 dark:text-zinc-200">{wordCount}</strong></span>
          <span>Characters: <strong className="text-slate-800 dark:text-zinc-200">{charCount}</strong></span>
          <span>Engine: <strong className="text-slate-800 dark:text-zinc-200">{document.ocrEngine || 'gemini-flash'}</strong></span>
        </div>

        <div className="flex items-center gap-2">
          {document.confidence > 0 && (
            <span className="inline-flex items-center gap-1">
              Confidence:
              <strong className={document.confidence >= 80 ? 'text-emerald-500' : 'text-amber-500'}>
                {document.confidence}%
              </strong>
            </span>
          )}
          <span className="capitalize px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
            {document.documentType?.replace('_', ' ')}
          </span>
        </div>
      </div>
    </div>
  );
};
