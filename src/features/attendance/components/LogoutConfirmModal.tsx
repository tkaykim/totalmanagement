'use client';

import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LogoutConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
}: LogoutConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogOut size={32} />
          </div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-2">
            퇴근 하시겠습니까?
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
            오늘 하루도 수고하셨습니다!<br />
            정말 퇴근 처리할까요?
          </p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className={cn(
                'flex-1 py-3 text-sm font-bold text-slate-600 dark:text-slate-300',
                'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600',
                'rounded-xl transition-colors'
              )}
            >
              취소
            </button>
            <button
              onClick={onConfirm}
              className={cn(
                'flex-1 py-3 text-sm font-bold text-white',
                'bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200',
                'dark:text-slate-900 rounded-xl transition-colors'
              )}
            >
              네, 퇴근합니다
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

