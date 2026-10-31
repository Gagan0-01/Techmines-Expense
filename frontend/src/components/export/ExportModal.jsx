import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useLedger } from '../../context/LedgerContext';
import { useToast } from '../../context/ToastContext';
import { fetchExportData } from '../../services/api';
import { exportToPDF, exportToCSV, exportToExcel } from '../../services/exportService';
import { FileText, FileSpreadsheet, Download, AlertCircle } from 'lucide-react';
import { toInputDateFormat } from '../../utils/date';

export const ExportModal = () => {
  const { isExportModalOpen, setIsExportModalOpen, categories } = useLedger();
  const { addToast } = useToast();

  const [reportType, setReportType] = useState('monthly'); // 'daily' | 'monthly' | 'incoming' | 'expense' | 'custom'
  const [format, setFormat] = useState('pdf'); // 'pdf' | 'csv' | 'excel'
  const [date, setDate] = useState(toInputDateFormat(new Date()));
  const [startDate, setStartDate] = useState(toInputDateFormat(new Date(new Date().setDate(1))));
  const [endDate, setEndDate] = useState(toInputDateFormat(new Date()));
  const [category, setCategory] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setIsExporting(true);

      const params = {
        category,
        paymentMethod,
      };

      if (reportType === 'daily') {
        params.reportType = 'daily';
        params.startDate = date;
      } else if (reportType === 'monthly') {
        params.range = 'this_month';
      } else if (reportType === 'incoming') {
        params.type = 'incoming';
        params.range = 'this_month';
      } else if (reportType === 'expense') {
        params.type = 'expense';
        params.range = 'this_month';
      } else if (reportType === 'custom') {
        params.range = 'custom';
        params.startDate = startDate;
        params.endDate = endDate;
      }

      // Fetch verified database records
      const exportData = await fetchExportData(params);

      if (!exportData.transactions || exportData.transactions.length === 0) {
        setError('No transactions found matching the selected export criteria.');
        setIsExporting(false);
        return;
      }

      let generatedName = '';
      const reportTitle = `${reportType.toUpperCase()} Financial Ledger Report`;

      if (format === 'pdf') {
        generatedName = exportToPDF(exportData, reportTitle);
      } else if (format === 'csv') {
        generatedName = exportToCSV(exportData.transactions, `TechMines_${reportType}_Ledger`);
      } else if (format === 'excel') {
        generatedName = exportToExcel(exportData, `TechMines_${reportType}_Ledger`);
      }

      addToast(`Report downloaded: ${generatedName}`, 'success');
      setIsExportModalOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal
      isOpen={isExportModalOpen}
      onClose={() => setIsExportModalOpen(false)}
      title="Export Financial Reports"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleExport} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Report Type */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
            Report Scope
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 'monthly', label: 'Monthly' },
              { id: 'daily', label: 'Daily' },
              { id: 'incoming', label: 'Incoming Only' },
              { id: 'expense', label: 'Expenses Only' },
              { id: 'custom', label: 'Custom Range' },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setReportType(r.id)}
                className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all cursor-pointer ${
                  reportType === r.id
                    ? 'bg-[#ff5e00]/15 border-[#ff5e00] text-[#ff5e00] font-semibold'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Controls */}
        {reportType === 'daily' && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
              Select Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-slate-200 dark:border-zinc-700 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-black focus:outline-none focus:border-[#ff5e00]"
            />
          </div>
        )}

        {reportType === 'custom' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                From Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-slate-200 dark:border-zinc-700 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-black focus:outline-none focus:border-[#ff5e00]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                To Date
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-slate-200 dark:border-zinc-700 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-black focus:outline-none focus:border-[#ff5e00]"
              />
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-black focus:outline-none focus:border-[#ff5e00] cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">All Categories</option>
              {categories.map((c) => (
                <option key={c._id || c.name} value={c.name} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-black focus:outline-none focus:border-[#ff5e00] cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">All Methods</option>
              <option value="UPI" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">UPI</option>
              <option value="Cash" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Cash</option>
              <option value="Bank Transfer" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Bank Transfer</option>
            </select>
          </div>
        </div>

        {/* Export Format */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
            File Format
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'pdf', label: 'PDF Document', icon: FileText },
              { id: 'excel', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
              { id: 'csv', label: 'CSV File', icon: FileSpreadsheet },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormat(f.id)}
                  className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1.5 text-xs font-medium transition-all cursor-pointer ${
                    format === f.id
                      ? 'bg-[#ff5e00]/15 border-[#ff5e00] text-[#ff5e00] font-semibold'
                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${format === f.id ? 'text-[#ff5e00]' : 'text-slate-400 dark:text-zinc-400'}`} />
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={() => setIsExportModalOpen(false)}
            disabled={isExporting}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-[#0d0d0d] text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#ff5e00] hover:bg-[#ff7b29] text-sm font-semibold text-white shadow-lg shadow-[#ff5e00]/20 transition-all"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Generating Report...' : 'Download Report'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
