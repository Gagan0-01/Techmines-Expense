import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatINR } from '../utils/currency';
import { formatDateTime, formatDate } from '../utils/date';

/**
 * Generate PDF Report
 */
export const exportToPDF = (reportData, title = 'Financial Ledger Report') => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const meta = reportData.meta || {};
  const summary = reportData.summary || {};
  const transactions = reportData.transactions || [];

  // Header Branding
  doc.setFillColor(30, 64, 175); // TechMines primary blue
  doc.rect(0, 0, 210, 24, 'F');

  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('TECHMINES OFFICE LEDGER', 14, 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Professional Expense & Financial Recordkeeping', 14, 20);

  // Report Info
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 34);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated On: ${formatDateTime(new Date())}`, 14, 40);
  if (meta.filterCriteria) {
    const rangeText = `Period Filter: ${meta.filterCriteria.range || 'Custom'} | Type: ${meta.filterCriteria.type || 'All'}`;
    doc.text(rangeText, 14, 45);
  }

  // Summary Metrics Table
  const summaryRows = [
    [
      'Total Incoming',
      `Rs. ${formatINR(summary.totalIncoming, false)}`,
      'Total Expenses',
      `Rs. ${formatINR(summary.totalExpenses, false)}`,
    ],
    [
      'Net Cash Flow',
      `Rs. ${formatINR(summary.netCashFlow, false)}`,
      'Transaction Count',
      `${summary.transactionCount || transactions.length}`,
    ],
  ];

  autoTable(doc, {
    startY: 50,
    head: [['Financial Summary Metric', 'Amount', 'Metric', 'Value']],
    body: summaryRows,
    theme: 'grid',
    headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2.5 },
  });

  // Transactions Table
  const tableData = transactions.map((t) => [
    formatDate(t.date, 'dd MMM yyyy'),
    t.title,
    t.type.toUpperCase(),
    t.category,
    t.paymentMethod,
    `Rs. ${formatINR(t.amount, false)}`,
    t.referenceNumber || t.notes || '—',
  ]);

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    head: [['Date', 'Title', 'Type', 'Category', 'Method', 'Amount', 'Ref / Notes']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255] },
    styles: { fontSize: 8, cellPadding: 2.2 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 42 },
      2: { cellWidth: 18 },
      3: { cellWidth: 28 },
      4: { cellWidth: 22 },
      5: { cellWidth: 25, halign: 'right' },
      6: { cellWidth: 33 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        if (data.cell.raw === 'INCOMING') {
          data.cell.styles.textColor = [22, 101, 52];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  const filename = `TechMines_Report_${formatDate(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(filename);
  return filename;
};

/**
 * Generate CSV Report
 */
export const exportToCSV = (transactions = [], filenamePrefix = 'TechMines_Ledger') => {
  const headers = [
    'Date',
    'Time',
    'Title',
    'Type',
    'Category',
    'Payment Method',
    'Amount (INR)',
    'Reference Number',
    'Vendor / Recipient',
    'Notes',
  ];

  const rows = transactions.map((t) => [
    formatDate(t.date, 'yyyy-MM-dd'),
    formatDateTime(t.date),
    `"${(t.title || '').replace(/"/g, '""')}"`,
    t.type,
    `"${(t.category || '').replace(/"/g, '""')}"`,
    t.paymentMethod,
    t.amount,
    `"${(t.referenceNumber || '').replace(/"/g, '""')}"`,
    `"${(t.vendorRecipient || '').replace(/"/g, '""')}"`,
    `"${(t.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const filename = `${filenamePrefix}_${formatDate(new Date(), 'yyyy-MM-dd')}.csv`;
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return filename;
};

/**
 * Generate Excel (.xlsx) Report
 */
export const exportToExcel = (reportData, filenamePrefix = 'TechMines_Ledger') => {
  const transactions = reportData.transactions || [];
  const summary = reportData.summary || {};

  const txData = transactions.map((t) => ({
    Date: formatDate(t.date, 'yyyy-MM-dd'),
    Time: formatDateTime(t.date),
    Title: t.title,
    Type: t.type.toUpperCase(),
    Category: t.category,
    'Payment Method': t.paymentMethod,
    'Amount (INR)': t.amount,
    'Reference Number': t.referenceNumber || '',
    'Vendor/Recipient': t.vendorRecipient || '',
    Notes: t.notes || '',
  }));

  const summaryData = [
    { Metric: 'Report Title', Value: 'TechMines Office Ledger' },
    { Metric: 'Generated Date', Value: formatDateTime(new Date()) },
    { Metric: 'Total Incoming (INR)', Value: summary.totalIncoming || 0 },
    { Metric: 'Total Expenses (INR)', Value: summary.totalExpenses || 0 },
    { Metric: 'Net Cash Flow (INR)', Value: summary.netCashFlow || 0 },
    { Metric: 'Total Transactions', Value: transactions.length },
  ];

  const wb = XLSX.utils.book_new();
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  const wsTx = XLSX.utils.json_to_sheet(txData);

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
  XLSX.utils.book_append_sheet(wb, wsTx, 'Transactions');

  const filename = `${filenamePrefix}_${formatDate(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
};
