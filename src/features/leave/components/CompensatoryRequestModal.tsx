'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { createCompensatoryRequest } from '../api';
import type { CompensatoryRequestFormData } from '../types';

const schema = z.object({
  days: z.number().min(0.5, '최소 0.5일 이상 입력해주세요').max(10, '최대 10일까지 신청 가능합니다'),
  reason: z.string().min(1, '사유를 입력해주세요'),
  work_date: z.string().optional(),
});

interface CompensatoryRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CompensatoryRequestModal({
  open,
  onOpenChange,
  onSuccess,
}: CompensatoryRequestModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CompensatoryRequestFormData>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      days: 1,
      reason: '',
      work_date: '',
    },
  });

  const workDate = watch('work_date');

  const onSubmit = async (data: CompensatoryRequestFormData) => {
    setIsSubmitting(true);
    try {
      await createCompensatoryRequest(data);
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      alert(error instanceof Error ? error.message : '대체휴무 생성 신청에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>대체휴무 생성 신청</DialogTitle>
          <DialogDescription>
            휴일 근무 등으로 인한 대체휴무를 신청합니다.
            관리자 승인 후 대체휴무가 부여됩니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="days">신청 일수</Label>
            <Input
              id="days"
              type="number"
              step="0.5"
              min="0.5"
              max="10"
              {...register('days', { valueAsNumber: true })}
            />
            {errors.days && (
              <p className="text-sm text-red-500">{errors.days.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>휴일 근무일 (선택)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !workDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {workDate ? format(new Date(workDate), 'PPP', { locale: ko }) : '날짜 선택 (선택사항)'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={workDate ? new Date(workDate) : undefined}
                  onSelect={(date) => {
                    setValue('work_date', date ? format(date, 'yyyy-MM-dd') : '');
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">사유</Label>
            <Textarea
              id="reason"
              placeholder="예: 1월 15일 신정 연휴 긴급 촬영 근무"
              {...register('reason')}
            />
            {errors.reason && (
              <p className="text-sm text-red-500">{errors.reason.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              신청
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
