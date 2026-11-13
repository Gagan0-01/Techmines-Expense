import api from './api';

/**
 * Upload a document with multipart progress tracking
 */
export const uploadDocument = async (formData, onProgress) => {
  const res = await api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });
  return res.data;
};

/**
 * Fetch document list with optional filtering and search
 */
export const fetchDocuments = async (params = {}) => {
  const res = await api.get('/documents', { params });
  return res.data;
};

/**
 * Fetch single document by ID
 */
export const fetchDocumentById = async (id) => {
  const res = await api.get(`/documents/${id}`);
  return res.data;
};

/**
 * Re-trigger OCR processing on an existing document
 */
export const reprocessDocument = async (id) => {
  const res = await api.post(`/documents/${id}/process`);
  return res.data;
};

/**
 * Update document title, type, or manual text corrections
 */
export const updateDocument = async (id, data) => {
  const res = await api.patch(`/documents/${id}`, data);
  return res.data;
};

/**
 * Delete document and its stored physical file
 */
export const deleteDocument = async (id) => {
  const res = await api.delete(`/documents/${id}`);
  return res.data;
};

/**
 * Download the original document file
 */
export const downloadOriginalDocument = async (id, originalFileName) => {
  const res = await api.get(`/documents/${id}/download`, {
    responseType: 'blob',
  });

  const blob = new Blob([res.data]);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = originalFileName || 'document';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Download extracted text as a .txt file
 */
export const downloadDocumentTxt = async (id, title) => {
  const res = await api.get(`/documents/${id}/export/txt`, {
    responseType: 'blob',
  });

  const safeTitle = (title || 'document').replace(/[^a-zA-Z0-9_-]/g, '_');
  const blob = new Blob([res.data], { type: 'text/plain;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeTitle}_ocr.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

