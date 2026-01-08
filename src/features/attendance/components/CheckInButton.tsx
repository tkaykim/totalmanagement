'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checkIn } from '../api';
import { LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CheckInButton() {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: checkIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-status'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-logs'] });
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

