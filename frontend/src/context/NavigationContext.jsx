import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const NavigationContext = createContext(null);

const STORAGE_KEY = 'techmines_sidebar_collapsed';

export const NavigationProvider = ({ children }) => {
  const location = useLocation();

  // Initialize sidebar collapsed state based on localStorage or viewport width (<1024px defaults to collapsed)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        return saved === 'true';
      }
      if (typeof window !== 'undefined') {
        return window.innerWidth < 1024;
      }
    } catch {
      // Ignore localStorage errors (e.g. private mode)
    }
    return false;
  });

  // Mobile tools drawer/sheet visibility state
  const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false);

  // Automatically close mobile tools sheet on any route navigation
  useEffect(() => {
    setIsMobileToolsOpen(false);
  }, [location.pathname]);

  // Adjust sidebar state on resize if user has not stored an explicit preference
  useEffect(() => {
    const handleResize = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === null) {
          // Automatic responsive adaptation for tablet screens
          setIsSidebarCollapsed(window.innerWidth < 1024);
        }
      } catch {
        // Fallback
        setIsSidebarCollapsed(window.innerWidth < 1024);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const setSidebarCollapsedState = useCallback((collapsed) => {
    setIsSidebarCollapsed(collapsed);
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // Ignore
    }
  }, []);

  const openMobileTools = useCallback(() => {
    setIsMobileToolsOpen(true);
  }, []);

  const closeMobileTools = useCallback(() => {
    setIsMobileToolsOpen(false);
  }, []);

  const toggleMobileTools = useCallback(() => {
    setIsMobileToolsOpen((prev) => !prev);
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        isSidebarCollapsed,
        setIsSidebarCollapsed: setSidebarCollapsedState,
        toggleSidebar,
        isMobileToolsOpen,
        setIsMobileToolsOpen,
        openMobileTools,
        closeMobileTools,
        toggleMobileTools,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
};
