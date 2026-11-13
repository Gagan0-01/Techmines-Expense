import React, { useState } from 'react';
import {
  Search,
  FileText,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';

const FILTER_TYPES = [
  { id: 'all', label: 'All' },
  { id: 'receipt', label: 'Receipts' },
  { id: 'invoice', label: 'Invoices' },
  { id: 'bill', label: 'Bills' },
  { id: 'business_document', label: 'Business' },
  { id: 'handwritten_note', label: 'Handwritten' },
  { id: 'other', label: 'Other' },
];

export const DocumentList = ({
  documents = [],
  selectedDocId,
  onSelectDocument,
  onDeleteDocument,
  searchTerm,
  onSearchChange,
  filterType,
  onFilterChange,
}) => {
  const [docToDelete, setDocToDelete] = useState(null);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            Extracted
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3 animate-spin" />
            Processing
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-full">
            <AlertCircle className="w-3 h-3" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
            Pending
          </span>
        );
    }
  };

  const confirmDelete = () => {
    if (docToDelete && onDeleteDocument) {
      onDeleteDocument(docToDelete._id);
      setDocToDelete(null);
    }
  };

  return (
    <div className="bg-white dark:bg-[#0d0d0d] rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm flex flex-col h-full">
      {/* Header & Search */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Saved Documents ({documents.length})
          </h3>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by title, filename, or text..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-[#121212] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff5e00]/20 focus:border-[#ff5e00]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {FILTER_TYPES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilterChange(f.id)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                filterType === f.id
                  ? 'bg-[#ff5e00] text-white'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Document Items List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[500px]">
        {documents.length === 0 ? (
          <div className="text-center py-10 px-4 text-slate-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-medium">No documents found</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Upload a document above to get started
            </p>
          </div>
        ) : (
          documents.map((doc) => {
            const isSelected = selectedDocId === doc._id;
            return (
              <div
                key={doc._id}
                onClick={() => onSelectDocument(doc)}
                className={`group p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                  isSelected
                    ? 'border-[#ff5e00] bg-orange-50/40 dark:bg-orange-950/20 shadow-sm'
                    : 'border-slate-100 dark:border-zinc-800/80 bg-white dark:bg-[#111111] hover:border-slate-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                      {doc.title}
                    </span>
                    {getStatusBadge(doc.processingStatus)}
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                    {doc.originalFileName}
                  </p>

                  <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400 dark:text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1 capitalize">
                      <Tag className="w-3 h-3" />
                      {doc.documentType?.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDocToDelete(doc);
                  }}
                  title="Delete document"
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={Boolean(docToDelete)}
        onClose={() => setDocToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Scanned Document"
        message={`Are you sure you want to permanently delete "${docToDelete?.title}"? Both the database record and original file will be removed.`}
        confirmText="Delete Document"
        confirmVariant="danger"
      />
    </div>
  );
};

