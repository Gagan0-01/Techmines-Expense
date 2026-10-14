import React from 'react';
import {
  Landmark,
  Wallet,
  ArrowLeftRight,
  BookOpen,
  TrendingUp,
  ShieldCheck,
  PlusCircle,
  DownloadCloud,
  UserCheck,
} from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: User | null;
  onSwitchUser: (email: string) => void;
  onOpenNewTransaction: () => void;
  onOpenImportExport: () => void;
}

const DEMO_USERS = [
  { email: 'treasurer@acme-corp.com', name: 'Victoria Vance', role: 'TREASURER', desc: 'Chief Treasurer (Full Dual-Control Approval)' },
  { email: 'manager@acme-corp.com', name: 'Marcus Sterling', role: 'FINANCE_MANAGER', desc: 'Finance Manager (Operations & Postings)' },
  { email: 'auditor@acme-corp.com', name: 'Elena Rostova', role: 'AUDITOR', desc: 'SOX Auditor (Compliance & Inspection)' },
  { email: 'operator@acme-corp.com', name: 'David Chen', role: 'OPERATOR', desc: 'Cash Operator (Initiations)' },
];

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  onSwitchUser,
  onOpenNewTransaction,
  onOpenImportExport,
}) => {
  const tabs = [
    { id: 'overview', label: 'Treasury Overview', icon: Landmark },
    { id: 'accounts', label: 'Cash Accounts', icon: Wallet },
    { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    { id: 'ledger', label: 'General Ledger', icon: BookOpen },
    { id: 'analytics', label: 'FX & Forecasts', icon: TrendingUp },
    { id: 'audit', label: 'Audit Trail', icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#080d1a]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-[1px] shadow-glow-blue flex items-center justify-center">
              <div className="w-full h-full bg-[#080d1a] rounded-[11px] flex items-center justify-center">
                <Landmark className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold tracking-tight text-white">Acme Treasury</span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                  Enterprise
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">Consolidated Financial Ledger</p>
            </div>
          </div>

          {/* Action Buttons & Persona Switcher */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenImportExport}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 hover:text-white border border-slate-700/60 rounded-lg transition-colors"
            >
              <DownloadCloud className="w-3.5 h-3.5 text-slate-400" />
              <span>Import / Export</span>
            </button>

            <button
              onClick={onOpenNewTransaction}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-sm rounded-lg transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Transaction</span>
            </button>

            {/* Persona Switcher Dropdown */}
            <div className="relative group">
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-850/80 border border-slate-700/60 rounded-lg cursor-pointer hover:border-blue-500/50 transition-colors">
                <div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-[11px] font-bold text-blue-400">
                  {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-slate-200 leading-tight">
                    {currentUser?.name || 'Victoria Vance'}
                  </div>
                  <div className="text-[10px] text-blue-400 font-mono leading-none">
                    {currentUser?.role || 'TREASURER'}
                  </div>
                </div>
                <UserCheck className="w-3.5 h-3.5 text-slate-400 ml-1" />
              </div>

              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-700 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 py-1.5 z-50">
                <div className="px-3 py-1.5 border-b border-slate-800 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Switch Active Persona
                </div>
                {DEMO_USERS.map((u) => (
                  <button
                    key={u.email}
                    onClick={() => onSwitchUser(u.email)}
                    className={`w-full text-left px-3 py-2 text-xs flex flex-col space-y-0.5 hover:bg-slate-800/80 transition-colors ${
                      currentUser?.email === u.email ? 'bg-blue-600/10 text-blue-400' : 'text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{u.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {u.role}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 truncate">{u.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <nav className="flex space-x-1 sm:space-x-4 border-t border-slate-800/70 overflow-x-auto py-2 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
