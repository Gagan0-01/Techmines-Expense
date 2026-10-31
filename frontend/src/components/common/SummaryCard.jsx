import React from 'react';
import { formatINR } from '../../utils/currency';

export const SummaryCard = ({
  title,
  amount,
  subtitle,
  icon: Icon,
  variant = 'default', // 'default' | 'incoming' | 'expense' | 'brand'
  badge,
  action,
  isCurrency = true,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'incoming':
        return {
          iconBg: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20',
          amountColor: 'text-emerald-600 dark:text-emerald-400',
          border: 'border-slate-200 dark:border-zinc-800/80 hover:border-emerald-500/40',
        };
      case 'expense':
        return {
          iconBg: 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20',
          amountColor: 'text-rose-600 dark:text-rose-400',
          border: 'border-slate-200 dark:border-zinc-800/80 hover:border-rose-500/40',
        };
      case 'brand':
        return {
          iconBg: 'bg-[#ff5e00]/15 text-[#ff5e00] border-[#ff5e00]/30',
          amountColor: 'text-[#111827] dark:text-white',
          border: 'border-[#ff5e00]/40 bg-gradient-to-b from-[#ff5e00]/10 to-transparent shadow-[0_0_25px_rgba(255,94,0,0.1)] hover:border-[#ff5e00]/70',
        };
      default:
        return {
          iconBg: 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700',
          amountColor: 'text-[#111827] dark:text-white',
          border: 'border-slate-200 dark:border-zinc-800/80 hover:border-slate-400 dark:hover:border-zinc-600',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={`bg-white dark:bg-[#0a0a0a] rounded-2xl border ${styles.border} p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 font-sans group`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">{title}</span>
        {Icon && (
          <div className={`p-2 rounded-xl border ${styles.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div className={`text-2xl lg:text-3xl font-extrabold tracking-tight ${styles.amountColor}`}>
          {isCurrency ? formatINR(amount) : amount}
        </div>
        {badge && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800">
            {badge}
          </span>
        )}
      </div>

      {(subtitle || action) && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-900 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
          <span>{subtitle}</span>
          {action && <div>{action}</div>}
        </div>
      )}
    </div>
  );
};
