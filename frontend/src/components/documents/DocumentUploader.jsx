import React, { useState, useRef } from 'react';
import { Upload, Camera, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { uploadDocument } from '../../services/documentService';

const DOCUMENT_TYPES = [
  { id: 'receipt', label: 'Receipt' },
  { id: 'invoice', label: 'Invoice' },
  { id: 'bill', label: 'Utility Bill' },
  { id: 'business_document', label: 'Business Document' },
  { id: 'handwritten_note', label: 'Handwritten Note' },
  { id: 'other', label: 'Other Document' },
];

export const DocumentUploader = ({ onDocumentUploaded }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('receipt');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const validateAndSetFile = (file) => {
    setError(null);
    setSuccess(null);

    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Unsupported file type. Please upload a JPG, PNG, WebP, or PDF file.');
      return;
    }

    const maxSize = 15 * 1024 * 1024; // 15MB
    if (file.size > maxSize) {
      setError('File size exceeds the 15MB limit.');
      return;
    }

    setSelectedFile(file);
    if (!title.trim()) {
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      setTitle(baseName);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select or capture a document to upload.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', title.trim() || selectedFile.name);
      formData.append('documentType', documentType);

      const result = await uploadDocument(formData, (percent) => {
        setUploadProgress(percent);
      });

      setSuccess('Document scanned and text extracted successfully!');
      setSelectedFile(null);
      setTitle('');
      if (onDocumentUploaded) {
        onDocumentUploaded(result.document);
      }
    } catch (err) {
      setError(err.message || 'Failed to upload and extract document text.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#0d0d0d] rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-[#ff5e00]">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Scan New Document</h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Upload or capture receipts, invoices, or bills for OCR extraction
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-center gap-2 p-3 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleUpload} className="space-y-4">
        {/* Document Title & Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
              Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Amazon Office Supplies Oct"
              maxLength={120}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121212] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff5e00]/20 focus:border-[#ff5e00]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
              Document Category
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121212] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ff5e00]/20 focus:border-[#ff5e00]"
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Drag and drop upload zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
            isDragging
              ? 'border-[#ff5e00] bg-orange-50/50 dark:bg-orange-950/20'
              : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => validateAndSetFile(e.target.files?.[0])}
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            className="hidden"
          />

          {/* Camera input with capture attribute for mobile devices */}
          <input
            type="file"
            ref={cameraInputRef}
            onChange={(e) => validateAndSetFile(e.target.files?.[0])}
            accept="image/*"
            capture="environment"
            className="hidden"
          />

          {selectedFile ? (
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-full bg-orange-50 dark:bg-orange-950/40 text-[#ff5e00]">
                <FileText className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {selectedFile.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || 'Document'}
              </p>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="mt-1 text-xs text-rose-500 hover:underline"
              >
                Change document
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-slate-100 dark:bg-zinc-800/60 text-slate-500 dark:text-zinc-400">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Drag and drop document here, or choose an option
                </p>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Supports JPG, PNG, WebP, and PDF up to 15MB
                </p>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Browse Files
                </button>

                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-orange-50 dark:bg-orange-950/30 text-[#ff5e00] hover:bg-orange-100 dark:hover:bg-orange-950/50 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Take Photo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Upload Progress Indicator */}
        {isUploading && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ff5e00]" />
                {uploadProgress < 100 ? 'Uploading document...' : 'Extracting text with OCR engine...'}
              </span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#ff5e00] h-2 transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          type="submit"
          disabled={!selectedFile || isUploading}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all shadow-sm ${
            !selectedFile || isUploading
              ? 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600 cursor-not-allowed'
              : 'bg-[#ff5e00] hover:bg-[#e05300] text-white cursor-pointer active:scale-[0.99]'
          }`}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing OCR...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              Upload & Extract Text
            </>
          )}
        </button>
      </form>
    </div>
  );
};

