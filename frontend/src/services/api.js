import axios from 'axios';

const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL?.trim();
  if (!envUrl) {
    if (import.meta.env.PROD) {
      console.warn(
        '[TechMines API] ⚠️ VITE_API_URL is missing in Vercel environment variables! Falling back to /api, which causes 404s.'
      );
    }
    return '/api';
  }
  const cleanUrl = envUrl.replace(/\/+$/, '');
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('techmines_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response error handler helper
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // If unauthorized, remove token
      localStorage.removeItem('techmines_token');
    }
    const message =
      error.response?.data?.message || error.message || 'An unexpected network error occurred';
    return Promise.reject(new Error(message));
  }
);

// Transaction APIs
export const fetchTransactions = async (params = {}) => {
  const res = await api.get('/transactions', { params });
  return res.data;
};

export const fetchLedgerSummary = async (params = {}) => {
  const res = await api.get('/transactions/summary', { params });
  return res.data;
};

export const fetchTransactionById = async (id) => {
  const res = await api.get(`/transactions/${id}`);
  return res.data;
};

export const createTransaction = async (data) => {
  const res = await api.post('/transactions', data);
  return res.data;
};

export const updateTransaction = async (id, data) => {
  const res = await api.put(`/transactions/${id}`, data);
  return res.data;
};

export const deleteTransaction = async (id) => {
  const res = await api.delete(`/transactions/${id}`);
  return res.data;
};

// Category APIs
export const fetchCategories = async (params = {}) => {
  const res = await api.get('/categories', { params });
  return res.data;
};

export const createCategory = async (data) => {
  const res = await api.post('/categories', data);
  return res.data;
};

export const updateCategory = async (id, data) => {
  const res = await api.put(`/categories/${id}`, data);
  return res.data;
};

export const deleteCategory = async (id) => {
  const res = await api.delete(`/categories/${id}`);
  return res.data;
};

// Recurring Schedules APIs
export const fetchRecurringSchedules = async (params = {}) => {
  const res = await api.get('/recurring', { params });
  return res.data;
};

export const createRecurringSchedule = async (data) => {
  const res = await api.post('/recurring', data);
  return res.data;
};

export const updateRecurringSchedule = async (id, data) => {
  const res = await api.put(`/recurring/${id}`, data);
  return res.data;
};

export const markRecurringOccurrenceCompleted = async (id, data = {}) => {
  const res = await api.post(`/recurring/${id}/complete`, data);
  return res.data;
};

export const deleteRecurringSchedule = async (id) => {
  const res = await api.delete(`/recurring/${id}`);
  return res.data;
};

// Settings APIs
export const fetchSettings = async () => {
  const res = await api.get('/settings');
  return res.data;
};

export const updateOpeningBalance = async (data) => {
  const res = await api.put('/settings/opening-balance', data);
  return res.data;
};

// Report APIs
export const fetchDailyReport = async (date) => {
  const res = await api.get('/reports/daily', { params: { date } });
  return res.data;
};

export const fetchDateRangeBreakdown = async (params = {}) => {
  const res = await api.get('/reports/daily-breakdown', { params });
  return res.data;
};

export const fetchMonthlyComparison = async (year, month) => {
  const res = await api.get('/reports/monthly-comparison', { params: { year, month } });
  return res.data;
};

export const fetchExportData = async (params = {}) => {
  const res = await api.get('/reports/export', { params });
  return res.data;
};

// Quick Receipt Scan & Auto-Add
export const scanReceiptAndAdd = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/transactions/scan-receipt', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 45000, // Gemini Vision can take 10-25s for complex receipts
  });
  return res.data;
};

export default api;
