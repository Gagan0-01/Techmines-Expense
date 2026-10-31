import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { useLedger } from '../../context/LedgerContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { PRIMARY_NAV_ITEMS, getManagementTools } from './navigationConfig';
import { formatINR } from '../../utils/currency';

export const Sidebar = () => {
  const ledgerContext = useLedger();
  const { summary } = ledgerContext;
  const { user, logout } = useAuth();
  const { isSidebarCollapsed, toggleSidebar } = useNavigation();
  const location = useLocation();

  const managementTools = getManagementTools(ledgerContext);

  return (
    <aside
      className={`hidden md:flex flex-col h-screen sticky top-0 bg-white dark:bg-[#0a0a0a] border-r border-slate-200 dark:border-zinc-800/80 shrink-0 select-none font-sans transition-[width] duration-300 ease-in-out z-30 ${
        isSidebarCollapsed ? 'w-[72px]' : 'w-64'
      }`}
      aria-label="Sidebar Navigation"
    >
      {/* Brand Header */}
      <div
        className={`flex items-center h-16 border-b border-slate-100 dark:border-zinc-800/80 px-4 shrink-0 transition-all ${
          isSidebarCollapsed ? 'justify-center' : 'justify-between'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Logo className="h-9 w-9 shrink-0" />
          {!isSidebarCollapsed && (
            <div className="flex flex-col min-w-0 animate-in fade-in duration-200">
              <span className="font-bold text-base tracking-wide text-[#111827] dark:text-white leading-none truncate">
                TECHMINES
              </span>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mt-1">
                Office Ledger
              </span>
            </div>
          )}
        </div>

        {/* Sidebar Collapse Toggle Button */}
        <button
          type="button"
          onClick={toggleSidebar}
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer ${
            isSidebarCollapsed ? 'hidden' : 'block'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Expand Button for Collapsed Rail */}
      {isSidebarCollapsed && (
        <div className="flex justify-center pt-2 pb-1 border-b border-slate-100 dark:border-zinc-800/60">
          <button
            type="button"
            onClick={toggleSidebar}
            title="Expand sidebar"
            aria-label="Expand sidebar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#ff5e00] dark:text-zinc-500 dark:hover:text-[#ff5e00] hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Middle Navigation Section - Scrollable independently */}
      <div className="px-3 py-4 flex-1 space-y-5 overflow-y-auto overflow-x-hidden scrollbar-thin">
        {/* Section 1: Main Ledger */}
        <div>
          {!isSidebarCollapsed ? (
            <div className="px-3 mb-2 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
              Main Ledger
            </div>
          ) : (
            <div className="w-6 h-px bg-slate-200 dark:border-zinc-800 mx-auto my-1.5" />
          )}

          <nav className="space-y-1" aria-label="Main Ledger">
            {PRIMARY_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  end={item.path === '/'}
                  title={isSidebarCollapsed ? item.name : undefined}
                  className={({ isActive }) =>
                    `group relative flex items-center rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                      isSidebarCollapsed
                        ? 'justify-center p-2.5 mx-auto w-11 h-11'
                        : 'gap-3 px-3 py-2.5'
                    } ${
                      isActive
                        ? 'bg-[#ff5e00] text-white shadow-lg shadow-[#ff5e00]/25'
                        : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900 hover:text-[#111827] dark:hover:text-white'
                    } ${!isSidebarCollapsed && isActive ? 'translate-x-1' : ''}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform ${
                          isActive
                            ? 'text-white'
                            : item.color || 'text-slate-500 dark:text-zinc-400'
                        }`}
                      />
                      {!isSidebarCollapsed && (
                        <span className="truncate">{item.name}</span>
                      )}

                      {/* Tooltip for Collapsed State */}
                      {isSidebarCollapsed && (
                        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white dark:bg-zinc-800 text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity pointer-events-none z-50 flex items-center gap-1.5">
                          <span>{item.name}</span>
                        </div>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Section 2: Management & Tools */}
        <div>
          {!isSidebarCollapsed ? (
            <div className="px-3 mb-2 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
              Management & Tools
            </div>
          ) : (
            <div className="w-6 h-px bg-slate-200 dark:border-zinc-800 mx-auto my-2" />
          )}

          <div className="space-y-1" aria-label="Management & Tools">
            {managementTools.map((tool) => {
              const Icon = tool.icon;
              const isRouteActive =
                tool.type === 'route' && location.pathname === tool.path;

              if (tool.type === 'route') {
                return (
                  <NavLink
                    key={tool.id}
                    to={tool.path}
                    title={isSidebarCollapsed ? tool.name : undefined}
                    className={({ isActive }) =>
                      `group relative flex items-center rounded-xl text-xs font-semibold transition-all duration-200 ${
                        isSidebarCollapsed
                          ? 'justify-center p-2.5 mx-auto w-11 h-11'
                          : 'gap-3 px-3 py-2'
                      } ${
                        isActive
                          ? 'bg-[#ff5e00] text-white shadow-lg shadow-[#ff5e00]/25 translate-x-1'
                          : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900 hover:text-[#111827] dark:hover:text-white hover:translate-x-1'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-transform ${
                            isActive
                              ? 'text-white'
                              : 'text-slate-400 dark:text-zinc-500'
                          }`}
                        />
                        {!isSidebarCollapsed && (
                          <span className="truncate">{tool.name}</span>
                        )}

                        {/* Tooltip for Collapsed State */}
                        {isSidebarCollapsed && (
                          <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white dark:bg-zinc-800 text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity pointer-events-none z-50 flex items-center gap-1.5">
                            <span>{tool.name}</span>
                            {tool.badge && (
                              <span className="px-1 py-0.2 bg-[#ff5e00]/20 text-[#ff5e00] text-[9px] rounded font-bold">
                                {tool.badge}
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              }

              // Modal triggers
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={tool.action}
                  title={isSidebarCollapsed ? tool.name : undefined}
                  className={`group relative w-full flex items-center rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900 hover:text-[#111827] dark:hover:text-white transition-all duration-200 text-left cursor-pointer ${
                    isSidebarCollapsed
                      ? 'justify-center p-2.5 mx-auto w-11 h-11'
                      : 'gap-3 px-3 py-2 hover:translate-x-1'
                  }`}
                >
                  <Icon className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0" />
                  {!isSidebarCollapsed && (
                    <span className="truncate">{tool.name}</span>
                  )}

                  {/* Tooltip for Collapsed State */}
                  {isSidebarCollapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white dark:bg-zinc-800 text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity pointer-events-none z-50">
                      {tool.name}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* User Session & Balance Footer */}
      <div className="p-3 border-t border-slate-100 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-950 shrink-0">
        {!isSidebarCollapsed ? (
          <div className="space-y-3">
            {user && (
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-[#ff5e00]/20 text-[#ff5e00] border border-[#ff5e00]/30 flex items-center justify-center text-xs font-bold shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#111827] dark:text-white truncate">
                      {user.name}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">
                      {user.email}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  title="Logout"
                  aria-label="Sign out"
                  className="p-1.5 text-slate-500 dark:text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors shrink-0 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 px-1">
              <div className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
                Office Balance
              </div>
              <div className="text-lg font-bold text-[#111827] dark:text-white tracking-tight mt-0.5">
                {formatINR(summary?.officeBalance ?? 0)}
              </div>
            </div>
          </div>
        ) : (
          /* Collapsed Footer */
          <div className="flex flex-col items-center space-y-2">
            {user && (
              <div className="group relative">
                <div className="w-8 h-8 rounded-full bg-[#ff5e00]/20 text-[#ff5e00] border border-[#ff5e00]/30 flex items-center justify-center text-xs font-bold cursor-pointer">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                {/* User Tooltip */}
                <div className="absolute left-full ml-3 bottom-0 px-3 py-2 bg-slate-900 text-white dark:bg-zinc-800 text-xs rounded-xl shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  <div className="font-bold">{user.name}</div>
                  <div className="text-[10px] text-slate-400">{user.email}</div>
                  <div className="text-[10px] text-[#ff5e00] font-semibold mt-1">
                    Balance: {formatINR(summary?.officeBalance ?? 0)}
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={logout}
              title="Logout"
              aria-label="Sign out"
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
