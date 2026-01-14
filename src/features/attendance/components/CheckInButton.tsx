'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checkIn, type CheckInResponse } from '../api';
import { LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckInButtonProps {
  onAutoCheckoutWarning?: (logs: CheckInResponse['_warning']) => void;
}

export function CheckInButton({ onAutoCheckoutWarning }: CheckInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: checkIn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance-status'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-logs'] });
      
      // 강제 퇴근 이력이 있으면 경고 표시
      if (data._warning && data._warning.type === 'auto_checkout_history') {
        // 먼저 alert 표시
        window.alert(data._warning.message);
        
        // 정정 신청 모달 열기 콜백 호출
        if (onAutoCheckoutWarning) {
          onAutoCheckoutWarning(data._warning);
        }
      }
    },
  });

  const handleCheckIn = async () => {
    setIsLoading(true);
    try {
      await mutation.mutateAsync();
    } catch (error) {
      console.error('Check-in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckIn}
      disabled={isLoading || mutation.isPending}
      className={cn(
        'flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all',
        'bg-blue-600 hover:bg-blue-500 active:scale-95',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'shadow-lg hover:shadow-blue-500/30'
      )}
    >
      <LogIn size={20} />
      {isLoading || mutation.isPending ? '출근 처리 중...' : '출근하기'}
    </button>
  );
}

