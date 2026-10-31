import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchLedgerSummary, fetchCategories, fetchSettings } from '../services/api';
import { useAuth } from './AuthContext';

const LedgerContext = createContext(null);

export const LedgerProvider = ({ children }) => {
  const { isAuthenticated, token } = useAuth();

  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [error, setError] = useState(null);

  // Global Modal States
  const [transactionModal, setTransactionModal] = useState({
    isOpen: false,
    type: 'incoming',
    transaction: null,
  });

  const [isOpeningBalanceModalOpen, setIsOpeningBalanceModalOpen] = useState(false);
  const [isMonthlyComparisonModalOpen, setIsMonthlyComparisonModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Load summary
  const loadSummary = useCallback(async (range = 'this_month') => {
    if (!localStorage.getItem('techmines_token')) return;
    try {
      setIsLoadingSummary(true);
      setError(null);
      const res = await fetchLedgerSummary({ range });
      if (res.success) {
        setSummary(res.data);
      }
    } catch (err) {
      console.error('Failed to load ledger summary:', err);
      setError(err.message);
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  // Load categories
  const loadCategories = useCallback(async () => {
    if (!localStorage.getItem('techmines_token')) return;
    try {
      const res = await fetchCategories();
      if (res.success) {
        setCategories(res.categories);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, []);

  // Load settings
  const loadSettings = useCallback(async () => {
    if (!localStorage.getItem('techmines_token')) return;
    try {
      const res = await fetchSettings();
      if (res.success) {
        setSettings(res.settings);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadSummary();
      loadCategories();
      loadSettings();
    } else {
      setSummary(null);
      setCategories([]);
      setSettings(null);
    }
  }, [isAuthenticated, token, loadSummary, loadCategories, loadSettings]);

  // Modal Triggers
  const openAddIncoming = (defaultValues = {}) => {
    setTransactionModal({
      isOpen: true,
      type: 'incoming',
      transaction: null,
      defaultValues,
    });
  };

  const openAddExpense = (defaultValues = {}) => {
    setTransactionModal({
      isOpen: true,
      type: 'expense',
      transaction: null,
      defaultValues,
    });
  };

  const openEditTransaction = (transaction) => {
    setTransactionModal({
      isOpen: true,
      type: transaction.type,
      transaction,
    });
  };

  const closeTransactionModal = () => {
    setTransactionModal({
      isOpen: false,
      type: 'incoming',
      transaction: null,
    });
  };

  const refreshAll = useCallback(() => {
    if (isAuthenticated) {
      loadSummary();
      loadCategories();
      loadSettings();
    }
  }, [isAuthenticated, loadSummary, loadCategories, loadSettings]);

  return (
    <LedgerContext.Provider
      value={{
        summary,
        categories,
        settings,
        isLoadingSummary,
        error,
        loadSummary,
        refreshAll,
        loadCategories,
        loadSettings,
        transactionModal,
        openAddIncoming,
        openAddExpense,
        openEditTransaction,
        closeTransactionModal,
        isOpeningBalanceModalOpen,
        setIsOpeningBalanceModalOpen,
        isMonthlyComparisonModalOpen,
        setIsMonthlyComparisonModalOpen,
        isExportModalOpen,
        setIsExportModalOpen,
        isCategoryModalOpen,
        setIsCategoryModalOpen,
      }}
    >
      {children}
    </LedgerContext.Provider>
  );
};

export const useLedger = () => {
  const context = useContext(LedgerContext);
  if (!context) {
    throw new Error('useLedger must be used within LedgerProvider');
  }
  return context;
};
