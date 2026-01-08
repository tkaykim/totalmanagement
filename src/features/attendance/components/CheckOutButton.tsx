'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checkOut } from '../api';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CheckOutButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: checkOut,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-status'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-logs'] });
      setShowConfirm(false);
    },
  });

  const handleCheckOut = async () => {
    setIsLoading(true);
    try {
      await mutation.mutateAsync();
    } catch (error) {
      console.error('Check-out error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isLoading}
        className={cn(
          'flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all',
          'bg-slate-600 hover:bg-slate-500 active:scale-95',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'shadow-lg hover:shadow-slate-500/30'
        )}
      >
        <LogOut size={20} />
        퇴근하기
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut size={32} />
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-2">퇴근 하시겠습니까?</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
                오늘 하루도 수고하셨습니다!<br />
                정말 퇴근 처리할까요?
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors"
                >
                  취소
                </button>
                <button 
                  onClick={handleCheckOut}
                  disabled={isLoading || mutation.isPending}
                  className="flex-1 py-3 text-sm font-bold text-white bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isLoading || mutation.isPending ? '처리 중...' : '네, 퇴근합니다'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

