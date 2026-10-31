import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ConfirmModal } from '../common/ConfirmModal';

export const AdminProfileMenu = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmLogoutOpen, setIsConfirmLogoutOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Close menu on Escape key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleLogoutClick = () => {
    setIsOpen(false);
    setIsConfirmLogoutOpen(true);
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
      setIsConfirmLogoutOpen(false);
    }
  };

  const userInitial = user?.name ? user.name.trim().charAt(0).toUpperCase() : null;

  return (
    <div className="relative shrink-0" ref={menuRef}>
      {/* Profile Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Admin Profile menu"
        aria-haspopup="true"
        aria-expanded={isOpen}
        title="Admin Profile"
        className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ff5e00] focus:ring-offset-2 dark:focus:ring-offset-[#0a0a0a] hover:scale-105 active:scale-95 shadow-sm"
      >
        {userInitial ? (
          <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#ff5e00] to-orange-400 text-white font-bold text-xs flex items-center justify-center ring-2 ring-white dark:ring-[#0a0a0a]">
            {userInitial}
          </div>
        ) : (
          <div className="w-full h-full rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="admin-profile-button"
          className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white dark:bg-[#0f1115] border border-slate-200 dark:border-zinc-800 shadow-xl shadow-slate-900/10 dark:shadow-black/50 p-3 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Admin Information */}
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800/80">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#ff5e00] to-orange-400 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm ring-2 ring-white dark:ring-zinc-800">
              {userInitial || <User className="w-5 h-5 text-white" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {user?.name || 'Administrator'}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#ff5e00] bg-[#ff5e00]/10 dark:bg-[#ff5e00]/15 px-2 py-0.5 rounded-full border border-[#ff5e00]/20 uppercase tracking-wider">
                  <ShieldCheck className="w-3 h-3 text-[#ff5e00]" />
                  Admin
                </span>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:border-zinc-800/80 my-2" />

          {/* Menu Actions */}
          <div className="space-y-1">
            <button
              type="button"
              role="menuitem"
              onClick={handleLogoutClick}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer group"
            >
              <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmLogoutOpen}
        onClose={() => setIsConfirmLogoutOpen(false)}
        onConfirm={handleConfirmLogout}
        title="Log Out"
        message="Are you sure you want to log out of TechMines Office Ledger?"
        confirmText="Log Out"
        isDestructive={true}
        isLoading={isLoggingOut}
      />
    </div>
  );
};
