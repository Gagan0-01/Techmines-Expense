import React from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  PanelLeft,
  PanelLeftOpen,
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { useLedger } from '../../context/LedgerContext';
import { useNavigation } from '../../context/NavigationContext';
import { ThemeToggle } from '../common/ThemeToggle';
import { AdminProfileMenu } from './AdminProfileMenu';

export const Header = ({ title, subtitle, actions }) => {
  const { openAddIncoming, openAddExpense } = useLedger();
  const { isSidebarCollapsed, toggleSidebar } = useNavigation();

  return (
    <header className="sticky top-0 z-20 bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800/80 font-sans transition-colors duration-200">
      {/* 
        MOBILE HEADER (< md):
        Displays TechMines logo, brand title, ThemeToggle, and Admin Profile button.
      */}
      <div className="flex md:hidden items-center justify-between h-14 px-4 bg-white dark:bg-[#0a0a0a]">
        <div className="flex items-center gap-2.5 min-w-0">
          <Logo className="h-8 w-8 shrink-0" />
          <div className="flex flex-col leading-none min-w-0">
            <span className="font-bold text-sm tracking-wider text-[#111827] dark:text-white truncate">
              TECHMINES
            </span>
            <span className="text-[9px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mt-0.5 truncate">
              Office Ledger
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <AdminProfileMenu />
        </div>
      </div>

      {/* 
        DESKTOP & TABLET HEADER (>= md):
        Displays sidebar collapse toggle, section title, subtitle, relevant actions, and Admin Profile button.
      */}
      <div className="hidden md:flex items-center justify-between px-5 lg:px-8 py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          {/* Sidebar Toggle for Tablet and Desktop */}
          <button
            type="button"
            onClick={toggleSidebar}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-2 rounded-xl text-slate-500 dark:text-zinc-400 hover:text-[#ff5e00] dark:hover:text-[#ff5e00] hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-5 h-5 text-[#ff5e00]" />
            ) : (
              <PanelLeft className="w-5 h-5" />
            )}
          </button>

          <div className="min-w-0">
            <h1 className="text-xl lg:text-2xl font-bold text-[#111827] dark:text-white tracking-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs lg:text-sm text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <ThemeToggle />
          {actions}

          {/* Standard + Add Incoming Button */}
          <button
            type="button"
            onClick={() => openAddIncoming()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 cursor-pointer hover:scale-105 active:scale-95 shrink-0"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Add Incoming</span>
          </button>

          {/* Standard + Add Expense Button */}
          <button
            type="button"
            onClick={() => openAddExpense()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-rose-600/20 cursor-pointer hover:scale-105 active:scale-95 shrink-0"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span className="hidden sm:inline">Add Expense</span>
          </button>

          <div className="h-5 w-px bg-slate-200 dark:border-zinc-800 mx-1" />
          <AdminProfileMenu />
        </div>
      </div>
    </header>
  );
};
