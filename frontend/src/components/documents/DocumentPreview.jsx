import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCw, RotateCcw, Download, FileText, Image as ImageIcon } from 'lucide-react';
import { downloadOriginalDocument } from '../../services/documentService';

export const DocumentPreview = ({ document }) => {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  if (!document) {
    return (
      <div className="bg-white dark:bg-[#0d0d0d] rounded-2xl border border-slate-200 dark:border-zinc-800 p-8 text-center h-full min-h-[350px] flex flex-col items-center justify-center">
        <div className="p-4 rounded-full bg-slate-100 dark:bg-zinc-800/60 text-slate-400 mb-3">
          <FileText className="w-8 h-8" />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
          No document selected
        </p>
        <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">
          Select a scanned document from the list or upload a new one to preview
        </p>
      </div>
    );
  }

  const isPdf = document.mimeType === 'application/pdf';

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 250));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleRotateCw = () => setRotation((prev) => (prev + 90) % 360);
  const handleRotateCcw = () => setRotation((prev) => (prev - 90 + 360) % 360);
  const handleReset = () => {
    setZoom(100);
    setRotation(0);
  };

  const handleDownload = () => {
    downloadOriginalDocument(document._id, document.originalFileName);
  };

  return (
    <div className="bg-white dark:bg-[#0d0d0d] rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 flex flex-col h-full shadow-sm">
      {/* Header with Title & Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-zinc-800/80 mb-4">
        <div className="min-w-0 flex items-center gap-2">
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
            {isPdf ? <FileText className="w-4 h-4 text-rose-500" /> : <ImageIcon className="w-4 h-4 text-sky-500" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {document.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              {document.originalFileName} • {(document.fileSize / 1024).toFixed(1)} KB
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1">
          {!isPdf && (
            <>
              <button
                type="button"
                onClick={handleZoomOut}
                title="Zoom Out"
                className="p-1.5 rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 px-1">
                {zoom}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                title="Zoom In"
                className="p-1.5 rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <div className="w-[1px] h-4 bg-slate-200 dark:bg-zinc-800 mx-1" />

              <button
                type="button"
                onClick={handleRotateCcw}
                title="Rotate Counter-Clockwise"
                className="p-1.5 rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRotateCw}
                title="Rotate Clockwise"
                className="p-1.5 rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {(zoom !== 100 || rotation !== 0) && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2 py-1 text-[11px] font-medium text-[#ff5e00] hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-lg ml-1"
                >
                  Reset
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={handleDownload}
            title="Download Original Document"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors ml-1"
          >
            <Download className="w-3.5 h-3.5" />
            Download Original
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 min-h-[300px] max-h-[500px] overflow-auto bg-slate-50 dark:bg-[#070707] rounded-xl border border-slate-100 dark:border-zinc-900 flex items-center justify-center p-4">
        {isPdf ? (
          <div className="text-center p-6 space-y-3">
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-500 inline-block">
              <FileText className="w-12 h-12" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                PDF Document ({document.metadata?.totalPages || 1} {document.metadata?.totalPages === 1 ? 'Page' : 'Pages'})
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
                PDF text stream has been processed. Download the original PDF to view formatted vector layouts.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors"
            >
              <Download className="w-4 h-4" />
              Download & View PDF
            </button>
          </div>
        ) : (
          <div
            className="transition-transform duration-200 origin-center flex items-center justify-center"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            }}
          >
            {/* The document is loaded via safe streaming URL */}
            <img
              src={`/api/documents/${document._id}/download`}
              alt={document.title}
              className="max-h-[420px] w-auto object-contain rounded-lg shadow-sm border border-slate-200 dark:border-zinc-800"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '';
                e.target.parentElement.innerHTML = `
                  <div class="p-6 text-center text-slate-400 text-xs">
                    <p>Image preview unavailable. Click Download Original to view.</p>
                  </div>
                `;
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

