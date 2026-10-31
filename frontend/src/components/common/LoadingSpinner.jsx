import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ text = 'Loading records...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <Loader2 className="w-8 h-8 text-[#ff5e00] animate-spin mb-3" />
      <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">{text}</p>
    </div>
  );
};
