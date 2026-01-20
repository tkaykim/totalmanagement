'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface UserHireDateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentHireDate: string | null;
  onSuccess: () => void;
}

export function UserHireDateModal({
  open,
  onOpenChange,
  userId,
  userName,
  currentHireDate,
  onSuccess,
}: UserHireDateModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hireDate, setHireDate] = useState<Date | undefined>(
    currentHireDate ? new Date(currentHireDate) : undefined
  );

  const handleSubmit = async () => {
    if (!hireDate) {
      alert('입사일을 선택해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hire_date: format(hireDate, 'yyyy-MM-dd'),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '입사일 설정에 실패했습니다.');
      }

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      alert(error instanceof Error ? error.message : '입사일 설정에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>입사일 설정</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-sm text-slate-500 dark:text-slate-400">대상자</p>
            <p className="font-semibold">{userName}</p>
          </div>

          <div className="space-y-2">
            <Label>입사일</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !hireDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {hireDate ? format(hireDate, 'PPP', { locale: ko }) : '날짜를 선택하세요'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={hireDate}
                  onSelect={setHireDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              입사일 기준으로 연차가 자동 계산됩니다.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !hireDate}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              저장
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
