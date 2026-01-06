'use client';

import { X } from 'lucide-react';

export function ModalShell({
  title,
  onClose,
  children,
  actions,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="modal-container active fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white dark:bg-slate-800 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 dark:bg-slate-900/50 px-6 py-4 flex-shrink-0">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-300 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 px-6 py-5">{children}</div>
        </div>
        {actions && (
          <div className="flex-shrink-0 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

