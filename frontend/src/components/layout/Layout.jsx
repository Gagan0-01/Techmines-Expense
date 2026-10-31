import React from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { Header } from './Header';
import { MobileToolsSheet } from './MobileToolsSheet';
import { TransactionFormModal } from '../transactions/TransactionFormModal';
import { OpeningBalanceModal } from '../office/OpeningBalanceModal';
import { MonthlyComparisonModal } from '../office/MonthlyComparisonModal';
import { ExportModal } from '../export/ExportModal';
import { CategoryManagerModal } from '../categories/CategoryManagerModal';
import { useLedger } from '../../context/LedgerContext';

export const Layout = ({ children, title = 'Office', subtitle, actions }) => {
  const { isCategoryModalOpen, setIsCategoryModalOpen } = useLedger();

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#000000] text-[#111827] dark:text-zinc-100 overflow-hidden font-sans transition-colors duration-250">
      {/* Sidebar Navigation for Desktop and Tablet */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F8FAFC] dark:bg-[#000000] transition-colors duration-250">
        <Header title={title} subtitle={subtitle} actions={actions} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 md:pb-8">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Fixed Mobile Bottom Navigation */}
      <BottomNav />

      {/* Mobile Tools Bottom Sheet / Drawer */}
      <MobileToolsSheet />

      {/* Global Modals */}
      <TransactionFormModal />
      <OpeningBalanceModal />
      <MonthlyComparisonModal />
      <ExportModal />
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />
    </div>
  );
};
