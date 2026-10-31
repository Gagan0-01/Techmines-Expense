import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { X, LogOut, ChevronRight, SlidersHorizontal, Check } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { useLedger } from '../../context/LedgerContext';
import { useAuth } from '../../context/AuthContext';
import { getManagementTools } from './navigationConfig';
import { formatINR } from '../../utils/currency';

export const MobileToolsSheet = () => {
  const { isMobileToolsOpen, closeMobileTools } = useNavigation();
  const ledgerContext = useLedger();
  const { summary } = ledgerContext;
  const { user, logout } = useAuth();
  const location = useLocation();

  const tools = getManagementTools(ledgerContext);

  // Close sheet on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileToolsOpen) {
        closeMobileTools();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileToolsOpen, closeMobileTools]);

  // Prevent background body scroll when mobile sheet is open
  useEffect(() => {
    if (isMobileToolsOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileToolsOpen]);

  if (!isMobileToolsOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 md:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-tools-sheet-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={closeMobileTools}
        aria-hidden="true"
      />

      {/* Slide-up Bottom Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-10 max-h-[85vh] bg-white dark:bg-[#0f1115] rounded-t-3xl border-t border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Grab Handle */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 mb-1 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-zinc-800/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#ff5e00]/10 text-[#ff5e00]">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="mobile-tools-sheet-title"
                className="text-base font-bold text-slate-900 dark:text-white leading-tight tracking-tight"
              >
                Management & Tools
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Schedules, calculations & export reports
              </p>
            </div>
          </div>
          <button
            onClick={closeMobileTools}
            aria-label="Close menu"
            className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800/80 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 pb-8 safe-bottom">
          {/* Tools List */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest px-1">
              Features & Controls
            </div>

            <div className="space-y-1.5">
              {tools.map((tool) => {
                const Icon = tool.icon;
                const isRouteActive = tool.type === 'route' && location.pathname === tool.path;

                if (tool.type === 'route') {
                  return (
                    <NavLink
                      key={tool.id}
                      to={tool.path}
                      onClick={closeMobileTools}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                        isRouteActive
                          ? 'bg-[#ff5e00]/10 dark:bg-[#ff5e00]/15 border-[#ff5e00] text-[#ff5e00] shadow-sm'
                          : 'bg-slate-50 dark:bg-zinc-900/60 border-slate-200/80 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-xl shrink-0 ${
                            isRouteActive
                              ? 'bg-[#ff5e00] text-white'
                              : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {tool.name}
                            </span>
                            {isRouteActive && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#ff5e00] text-white uppercase tracking-wider">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                            {tool.description}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0 ml-2" />
                    </NavLink>
                  );
                }

                // Modal triggers
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => {
                      closeMobileTools();
                      tool.action?.();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-2xl border bg-slate-50 dark:bg-zinc-900/60 border-slate-200/80 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white transition-all text-left cursor-pointer active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                          {tool.name}
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                          {tool.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0 ml-2" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Balance & Account Details */}
          <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 space-y-3">
            {/* Balance Card */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-orange-500/10 via-[#ff5e00]/5 to-transparent border border-[#ff5e00]/20 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-[#ff5e00] uppercase tracking-wider">
                  Office Balance
                </div>
                <div className="text-base font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {formatINR(summary?.officeBalance ?? 0)}
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#ff5e00]/15 text-[#ff5e00]">
                Live Ledger
              </span>
            </div>

            {/* User Session Row */}
            {user && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#ff5e00]/20 text-[#ff5e00] border border-[#ff5e00]/30 flex items-center justify-center text-xs font-bold shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {user.name}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">
                      {user.email}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    closeMobileTools();
                    logout();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-xl transition-colors cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
