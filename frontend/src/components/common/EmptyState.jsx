import React from 'react';
import { Inbox, Plus } from 'lucide-react';

export const EmptyState = ({
  title = 'No transactions found',
  description = 'There are no financial records matching your current filter criteria.',
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  icon: Icon = Inbox,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-white dark:bg-[#0a0a0a] rounded-xl border border-dashed border-slate-200 dark:border-zinc-800">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 mb-4 border border-slate-200 dark:border-zinc-800">
        <Icon className="h-6 w-6 text-[#ff5e00]" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-sm mb-6 leading-relaxed">{description}</p>
      
      <div className="flex flex-wrap items-center justify-center gap-3">
        {actionText && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-2 rounded-lg bg-[#ff5e00] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#ff7b29] transition-all shadow-lg shadow-[#ff5e00]/20"
          >
            <Plus className="w-4 h-4" />
            {actionText}
          </button>
        )}
        {secondaryActionText && onSecondaryAction && (
          <button
            type="button"
            onClick={onSecondaryAction}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-[#0d0d0d] px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            {secondaryActionText}
          </button>
        )}
      </div>
    </div>
  );
};
