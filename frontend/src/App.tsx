import React, { useState, useEffect } from 'react';
import './App.css';
import {
  Navbar,
} from './components/Navbar';
import { KpiCards } from './components/KpiCards';
import { CashFlowCharts } from './components/CashFlowCharts';
import { AccountsView } from './components/AccountsView';
import { TransactionsView } from './components/TransactionsView';
import { LedgerView } from './components/LedgerView';
import { AnalyticsView } from './components/AnalyticsView';
import { AuditTrailView } from './components/AuditTrailView';
import { NewTransactionModal } from './components/NewTransactionModal';
import { ImportExportModal } from './components/ImportExportModal';
import { CreateAccountModal } from './components/CreateAccountModal';
import { api, setAuthData, getAuthToken, getCurrentUser } from './services/api';
import { Account, Transaction, LedgerEntry, TreasurySummary, User } from './types';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(getCurrentUser());
  const [currentTab, setCurrentTab] = useState<string>('overview');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<TreasurySummary | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isNewTxOpen, setIsNewTxOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loginUser = async (email: string) => {
    try {
      const res = await api.login(email, 'password123');
      if (res.success) {
        setAuthData(res.data.token, res.data.user);
        setCurrentUser(res.data.user);
        showToast(`Switched active persona to ${res.data.user.name} (${res.data.user.role})`);
        loadAllData();
      }
    } catch (err: any) {
      console.error('Login error:', err);
    }
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [accRes, sumRes, txRes, statsRes, ledRes, fcRes] = await Promise.all([
        api.getAccounts(),
        api.getTreasurySummary(),
        api.getTransactions({ limit: '100' }),
        api.getTransactionStats(),
        api.getLedgerEntries({ limit: '50' }),
        api.getCashFlowForecast(),
      ]);

      if (accRes.success) setAccounts(accRes.data);
      if (sumRes.success) setSummary(sumRes.data);
      if (txRes.success) setTransactions(txRes.data);
      if (statsRes.success) setStats(statsRes.data);
      if (ledRes.success) setLedgerEntries(ledRes.data);
      if (fcRes.success) setForecast(fcRes.data);
    } catch (err: any) {
      console.error('Error loading treasury data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial authentication & load
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      if (!getAuthToken()) {
        try {
          const res = await api.login('treasurer@acme-corp.com', 'password123');
          if (res.success && isMounted) {
            setAuthData(res.data.token, res.data.user);
            setCurrentUser(res.data.user);
            await loadAllData();
          }
        } catch (err) {
          console.error('Initial login error:', err);
        }
      } else {
        await loadAllData();
      }
    };
    void init();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const res = await api.approveTransaction(id);
      if (res.success) {
        showToast(res.message);
        loadAllData();
      }
    } catch (err: any) {
      showToast(`Approval failed: ${err.message}`);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const res = await api.rejectTransaction(id);
      if (res.success) {
        showToast(res.message);
        loadAllData();
      }
    } catch (err: any) {
      showToast(`Rejection failed: ${err.message}`);
    }
  };

  const pendingCount = transactions.filter((t) => t.status === 'PENDING_APPROVAL').length;

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-blue-500/40 text-blue-300 shadow-2xl text-xs animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        onSwitchUser={loginUser}
        onOpenNewTransaction={() => setIsNewTxOpen(true)}
        onOpenImportExport={() => setIsImportExportOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 font-mono">
              Loading enterprise treasury and ledger balances...
            </p>
          </div>
        ) : (
          <>
            {/* Tab: Overview */}
            {currentTab === 'overview' && (
              <div>
                <KpiCards
                  summary={summary}
                  stats={stats}
                  pendingApprovalsCount={pendingCount}
                  onViewPending={() => setCurrentTab('transactions')}
                />

                <CashFlowCharts
                  stats={stats}
                  forecast={forecast}
                  currencyBreakdown={summary?.currencyBreakdown || null}
                />

                {/* Split Quick Overview of Recent Activity and Accounts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Transactions Snippet */}
                  <div className="glass-card rounded-2xl p-5 border border-slate-700/60 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-white">Recent Ledger Postings</h3>
                      <button
                        onClick={() => setCurrentTab('transactions')}
                        className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center space-x-1"
                      >
                        <span>View All Transactions</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="divide-y divide-slate-800/80">
                      {transactions.slice(0, 5).map((tx) => (
                        <div key={tx._id} className="py-3 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-semibold text-slate-200">{tx.counterpartyName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {tx.referenceNumber} • {tx.type}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold text-slate-100">
                              {tx.type === 'INFLOW' ? '+' : tx.type === 'OUTFLOW' ? '-' : ''}
                              {(tx.amountCents / 100).toLocaleString('en-US', {
                                style: 'currency',
                                currency: tx.currency,
                              })}
                            </div>
                            <div className="text-[10px] text-slate-400 capitalize">
                              {tx.status.toLowerCase().replace('_', ' ')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Treasury Accounts Snippet */}
                  <div className="glass-card rounded-2xl p-5 border border-slate-700/60 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-white">Key Liquidity Accounts</h3>
                      <button
                        onClick={() => setCurrentTab('accounts')}
                        className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center space-x-1"
                      >
                        <span>Manage Accounts</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="divide-y divide-slate-800/80">
                      {accounts.slice(0, 5).map((acc) => (
                        <div key={acc._id} className="py-3 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-semibold text-slate-200">{acc.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {acc.institution} • {acc.currency}
                            </div>
                          </div>
                          <div className="text-right font-mono">
                            <div className="font-bold text-slate-100">
                              {(acc.availableBalanceCents / 100).toLocaleString('en-US', {
                                style: 'currency',
                                currency: acc.currency,
                              })}
                            </div>
                            <div className="text-[10px] text-blue-400">{acc.accountType}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Accounts */}
            {currentTab === 'accounts' && (
              <AccountsView
                accounts={accounts}
                onOpenCreateAccount={() => setIsCreateAccountOpen(true)}
              />
            )}

            {/* Tab: Transactions */}
            {currentTab === 'transactions' && (
              <TransactionsView
                transactions={transactions}
                currentUser={currentUser}
                onApprove={handleApprove}
                onReject={handleReject}
                onRefresh={loadAllData}
              />
            )}

            {/* Tab: General Ledger */}
            {currentTab === 'ledger' && <LedgerView entries={ledgerEntries} />}

            {/* Tab: Analytics & FX */}
            {currentTab === 'analytics' && <AnalyticsView />}

            {/* Tab: Audit Trail */}
            {currentTab === 'audit' && <AuditTrailView />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#080d1a] py-6 text-center text-xs text-slate-500 font-mono">
        <p>Enterprise Treasury & Financial Ledger Suite • High-Frequency Liquidity Management</p>
      </footer>

      {/* Modals */}
      {isNewTxOpen && (
        <NewTransactionModal
          accounts={accounts}
          onClose={() => setIsNewTxOpen(false)}
          onSuccess={() => {
            showToast('Transaction posted successfully');
            loadAllData();
          }}
        />
      )}

      {isImportExportOpen && (
        <ImportExportModal
          onClose={() => setIsImportExportOpen(false)}
          onSuccess={() => {
            showToast('CSV Transactions imported successfully');
            loadAllData();
          }}
        />
      )}

      {isCreateAccountOpen && (
        <CreateAccountModal
          onClose={() => setIsCreateAccountOpen(false)}
          onSuccess={() => {
            showToast('Treasury account provisioned successfully');
            loadAllData();
          }}
        />
      )}
    </div>
  );
}
