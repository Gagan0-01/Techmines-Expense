import React, { useState } from 'react';
import { X, Download, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

interface ImportExportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const sampleCsv = `Type,Counterparty,Amount,Currency,Category,Description
INFLOW,Alphabet Inc.,750000.00,USD,Enterprise Contracts,Annual Ad Exchange settlement
OUTFLOW,Datadog Inc.,14200.00,USD,Cloud Infrastructure,Application performance monitoring
INFLOW,Stripe Merchant Collections,185000.00,USD,Customer Collections,Daily multi-currency customer settlements`;

  const handleDownloadCsv = () => {
    window.open('/api/export/transactions/csv', '_blank');
  };

  const handleDownloadJson = () => {
    window.open('/api/export/transactions/json', '_blank');
  };

  const handleImport = async () => {
    if (!csvText.trim()) {
      setError('Please paste CSV content.');
      return;
    }

    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.importTransactionsCsv(csvText);
      setResult(res);
      if (res.success && res.importedCount > 0) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-card max-w-xl w-full rounded-2xl p-6 border border-slate-700 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-base font-bold text-white mb-1">
          Treasury Data Portability & Reconciliation
        </h3>
        <p className="text-xs text-slate-400 mb-5">
          Export transactions for ERP reconciliation (SAP, NetSuite) or bulk ingest bank statements
        </p>

        {/* Export Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={handleDownloadCsv}
            className="flex items-center justify-center space-x-2 p-3 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-blue-500/50 text-slate-200 text-xs font-semibold transition-all group"
          >
            <Download className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
            <span>Download CSV (BAI2 format)</span>
          </button>

          <button
            onClick={handleDownloadJson}
            className="flex items-center justify-center space-x-2 p-3 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-indigo-500/50 text-slate-200 text-xs font-semibold transition-all group"
          >
            <FileText className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span>Download JSON Audit Feed</span>
          </button>
        </div>

        {/* CSV Ingestion */}
        <div className="space-y-3 pt-4 border-t border-slate-800 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200">Bulk Ingest Transactions CSV:</span>
            <button
              onClick={() => setCsvText(sampleCsv)}
              className="text-[11px] text-blue-400 hover:underline font-mono"
            >
              Load Sample Template
            </button>
          </div>

          <textarea
            rows={5}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="Type,Counterparty,Amount,Currency,Category,Description..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3 font-mono text-slate-200 text-[11px] focus:outline-none focus:border-blue-500"
          ></textarea>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>
                Successfully ingested {result.importedCount} transactions into General Ledger.
              </span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-glow-blue disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{importing ? 'Processing Ingestion...' : 'Ingest & Post to Ledger'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
