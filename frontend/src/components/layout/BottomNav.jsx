import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import { PRIMARY_NAV_ITEMS } from './navigationConfig';
import { useNavigation } from '../../context/NavigationContext';

export const BottomNav = () => {
  const { isMobileToolsOpen, toggleMobileTools } = useNavigation();
  const location = useLocation();

  // Highlight "Tools" if current route is a management tool (e.g. /recurring) or drawer is open
  const isToolsActive = isMobileToolsOpen || location.pathname === '/recurring';

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-lg border-t border-slate-200/90 dark:border-zinc-800/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)] transition-colors select-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="grid grid-cols-5 h-16 items-center px-1 max-w-lg mx-auto">
        {PRIMARY_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all duration-200 cursor-pointer min-h-[48px] w-full overflow-hidden ${
                  isActive
                    ? 'text-[#ff5e00] font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`p-1 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-[#ff5e00]/15 text-[#ff5e00] border border-[#ff5e00]/30 shadow-sm scale-105'
                        : ''
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider mt-0.5 truncate max-w-full text-center">
                    {item.name}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}

        {/* 5th Navigation Item: Management Tools */}
        <button
          type="button"
          onClick={toggleMobileTools}
          aria-label="Management and Tools"
          title="Management Tools"
          aria-expanded={isMobileToolsOpen}
          className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all duration-200 cursor-pointer min-h-[48px] w-full overflow-hidden ${
            isToolsActive
              ? 'text-[#ff5e00] font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <div
            className={`p-1 rounded-xl transition-all duration-200 relative ${
              isToolsActive
                ? 'bg-[#ff5e00]/15 text-[#ff5e00] border border-[#ff5e00]/30 shadow-sm scale-105'
                : ''
            }`}
          >
            <SlidersHorizontal className="w-5 h-5 shrink-0" />
            {location.pathname === '/recurring' && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#ff5e00] ring-2 ring-white dark:ring-[#0a0a0a]" />
            )}
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider mt-0.5 truncate max-w-full text-center">
            Tools
          </span>
        </button>
      </div>
    </nav>
  );
};


