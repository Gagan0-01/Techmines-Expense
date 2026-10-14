const BASE_URL = '/api';

export const TOKEN_KEY = 'treasury_auth_token';
export const USER_KEY = 'treasury_user';

export const setAuthData = (token: string, user: any) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const getCurrentUser = (): any | null => {
  const u = localStorage.getItem(USER_KEY);
  return u ? JSON.parse(u) : null;
};

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || `HTTP Error ${response.status}`);
  }

  return data;
}

export const api = {
  // Auth
  login: (email: string, password: string = 'password123') =>
    request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getMe: () => request<any>('/auth/me'),

  // Accounts
  getAccounts: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/accounts${qs}`);
  },

  getTreasurySummary: () => request<any>('/accounts/summary'),

  createAccount: (data: any) =>
    request<any>('/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAccount: (id: string, data: any) =>
    request<any>(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Transactions
  getTransactions: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/transactions${qs}`);
  },

  getTransactionStats: () => request<any>('/transactions/stats'),

  createTransaction: (data: any) =>
    request<any>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  approveTransaction: (id: string) =>
    request<any>(`/transactions/${id}/approve`, {
      method: 'POST',
    }),

  rejectTransaction: (id: string, reason?: string) =>
    request<any>(`/transactions/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // General Ledger
  getLedgerEntries: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/ledger/entries${qs}`);
  },

  getTrialBalance: () => request<any>('/ledger/trial-balance'),

  getAuditLogs: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/ledger/audit-logs${qs}`);
  },

  // Analytics
  getCashFlowForecast: () => request<any>('/analytics/cash-flow-forecast'),
  getFxExposure: () => request<any>('/analytics/fx-exposure'),
  getBudgetVariance: () => request<any>('/analytics/budget-variance'),

  // Import / Export
  importTransactionsCsv: (csvData: string) =>
    request<any>('/export/transactions/csv', {
      method: 'POST',
      body: JSON.stringify({ csvData }),
    }),
};
