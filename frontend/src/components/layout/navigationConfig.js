import {
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Repeat,
  Scale,
  Layers,
  FileSpreadsheet,
  Tags,
  ScanText,
} from 'lucide-react';

/**
 * Primary navigation items for the Main Ledger.
 * Used identically across desktop sidebar, tablet rail, and mobile bottom navigation.
 */
export const PRIMARY_NAV_ITEMS = [
  {
    name: 'Office',
    path: '/',
    icon: Building2,
    color: 'text-slate-500 dark:text-zinc-400',
    description: 'Financial overview & ledger balances',
  },
  {
    name: 'Incoming',
    path: '/incoming',
    icon: ArrowDownLeft,
    color: 'text-emerald-500 dark:text-emerald-400',
    description: 'Client receipts & revenue entries',
  },
  {
    name: 'Expenses',
    path: '/expenses',
    icon: ArrowUpRight,
    color: 'text-rose-500 dark:text-rose-400',
    description: 'Disbursements, rent & operational costs',
  },
  {
    name: 'Daily',
    path: '/daily',
    icon: CalendarDays,
    color: 'text-sky-500 dark:text-sky-400',
    description: 'Day-by-day cash flow overview',
  },
];

/**
 * Management & Tools configuration.
 * Maps both routed tools (Recurring Schedules) and modal-based tools
 * (Monthly Comparison, Opening Balance, Export Reports, Category Manager).
 */
export const getManagementTools = (ledgerContext) => [
  {
    id: 'document-scanner',
    name: 'Document Scanner',
    path: '/documents',
    icon: ScanText,
    type: 'route',
    badge: 'OCR',
    description: 'Scan receipts, bills, and extract text',
  },
  {
    id: 'recurring',
    name: 'Recurring Schedules',
    path: '/recurring',
    icon: Repeat,
    type: 'route',
    badge: 'Automated',
    description: 'Monthly rent, retainers, salaries & subscriptions',
  },
  {
    id: 'monthly-comparison',
    name: 'Monthly Comparison',
    icon: Scale,
    type: 'modal',
    action: () => ledgerContext?.setIsMonthlyComparisonModalOpen?.(true),
    description: 'Analyze month-over-month performance & metrics',
  },
  {
    id: 'opening-balance',
    name: 'Opening Balance',
    icon: Layers,
    type: 'modal',
    action: () => ledgerContext?.setIsOpeningBalanceModalOpen?.(true),
    description: 'Set fiscal opening balance & ledger start totals',
  },
  {
    id: 'export-reports',
    name: 'Export Reports',
    icon: FileSpreadsheet,
    type: 'modal',
    action: () => ledgerContext?.setIsExportModalOpen?.(true),
    description: 'Generate Excel (.xlsx) and printable PDF reports',
  },
  {
    id: 'category-manager',
    name: 'Category Manager',
    icon: Tags,
    type: 'modal',
    action: () => ledgerContext?.setIsCategoryModalOpen?.(true),
    description: 'Configure income and expense classification tags',
  },
];
