import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/layout/Layout';
import { DocumentUploader } from '../components/documents/DocumentUploader';
import { DocumentList } from '../components/documents/DocumentList';
import { DocumentPreview } from '../components/documents/DocumentPreview';
import { OCRTextEditor } from '../components/documents/OCRTextEditor';
import { ReceiptReviewModal } from '../components/documents/ReceiptReviewModal';
import { fetchDocuments, deleteDocument } from '../services/documentService';
import { ScanText, Sparkles, RefreshCw } from 'lucide-react';

export const DocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [reviewModalDoc, setReviewModalDoc] = useState(null);

  const loadDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = {};
      if (filterType !== 'all') params.documentType = filterType;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await fetchDocuments(params);
      setDocuments(res.documents || []);

      // If selected doc is not set or not in list, pick the first one
      if (!selectedDocument && res.documents?.length > 0) {
        setSelectedDocument(res.documents[0]);
      } else if (selectedDocument) {
        // Keep updated state of current doc if present
        const updated = res.documents?.find((d) => d._id === selectedDocument._id);
        if (updated) setSelectedDocument(updated);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filterType, searchTerm, selectedDocument]);

  useEffect(() => {
    loadDocuments();
  }, [filterType, searchTerm]);

  const handleDocumentUploaded = (newDoc) => {
    setDocuments((prev) => [newDoc, ...prev]);
    setSelectedDocument(newDoc);
    setReviewModalDoc(newDoc);
  };

  const handleDocumentUpdated = (updatedDoc) => {
    setSelectedDocument(updatedDoc);
    setDocuments((prev) =>
      prev.map((doc) => (doc._id === updatedDoc._id ? updatedDoc : doc))
    );
  };

  const handleDeleteDocument = async (id) => {
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d._id !== id));
      if (selectedDocument?._id === id) {
        const remaining = documents.filter((d) => d._id !== id);
        setSelectedDocument(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 pb-12">
        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#0d0d0d] p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-[#ff5e00] shrink-0">
              <ScanText className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  Document Scanner & OCR Hub
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#ff5e00] bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3" />
                  AI Text Extraction
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Upload receipts, invoices, or utility bills to extract, edit, and export text directly.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadDocuments}
            title="Refresh documents list"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#ff5e00]' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Main Grid: Left (Uploader & List) / Right (Preview & Text Editor) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-6 flex flex-col">
            <DocumentUploader onDocumentUploaded={handleDocumentUploaded} />

            <div className="flex-1 min-h-[380px]">
              <DocumentList
                documents={documents}
                selectedDocId={selectedDocument?._id}
                onSelectDocument={(doc) => setSelectedDocument(doc)}
                onDeleteDocument={handleDeleteDocument}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                filterType={filterType}
                onFilterChange={setFilterType}
              />
            </div>
          </div>

          {/* Right Column (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-6 flex flex-col">
            <div className="flex-1 min-h-[360px]">
              <DocumentPreview document={selectedDocument} />
            </div>

            <div className="flex-1 min-h-[380px]">
              <OCRTextEditor
                document={selectedDocument}
                onDocumentUpdated={handleDocumentUpdated}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Immediate Review Modal right after upload */}
      {reviewModalDoc && (
        <ReceiptReviewModal
          isOpen={Boolean(reviewModalDoc)}
          onClose={() => setReviewModalDoc(null)}
          document={reviewModalDoc}
          onSaved={(newTx, doc) => {
            handleDocumentUpdated({
              ...doc,
              convertedToTransaction: true,
              transactionId: newTx._id,
            });
            setReviewModalDoc(null);
          }}
        />
      )}
    </Layout>
  );
};

export default DocumentsPage;

