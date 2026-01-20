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
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { createLeaveRequest } from '../api';
import type { LeaveRequestFormData, LeaveRequestType, LeaveBalanceSummary } from '../types';
import { LEAVE_REQUEST_TYPE_LABELS, getLeaveTypeFromRequestType, getDaysUsed } from '../types';

const schema = z.object({
  leave_type: z.enum(['annual', 'half_am', 'half_pm', 'compensatory', 'special']),
  start_date: z.string().min(1, '시작일을 선택해주세요'),
  end_date: z.string().min(1, '종료일을 선택해주세요'),
  reason: z.string().min(1, '사유를 입력해주세요'),
});

interface LeaveRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  balanceSummary: LeaveBalanceSummary;
}

export function LeaveRequestModal({
  open,
  onOpenChange,
  onSuccess,
  balanceSummary,
}: LeaveRequestModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<LeaveRequestFormData>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      leave_type: 'annual',
      start_date: '',
      end_date: '',
      reason: '',
    },
  });

  const leaveType = watch('leave_type');
  const startDate = watch('start_date');
  const endDate = watch('end_date');

  const isHalfDay = leaveType === 'half_am' || leaveType === 'half_pm';
  const daysUsed = startDate && endDate ? getDaysUsed(leaveType, startDate, endDate) : 0;

  const balanceType = getLeaveTypeFromRequestType(leaveType);
  const remaining = balanceSummary[balanceType].remaining;

  const onSubmit = async (data: LeaveRequestFormData) => {
    if (daysUsed > remaining) {
      alert(`잔여 휴가가 부족합니다. (잔여: ${remaining}일, 신청: ${daysUsed}일)`);
      return;
    }

    setIsSubmitting(true);
    try {
      await createLeaveRequest(data);
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      alert(error instanceof Error ? error.message : '휴가 신청에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeaveTypeChange = (value: LeaveRequestType) => {
    setValue('leave_type', value);
    if (value === 'half_am' || value === 'half_pm') {
      if (startDate) {
        setValue('end_date', startDate);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>휴가 신청</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="leave_type">휴가 유형</Label>
            <Select
              value={leaveType}
              onValueChange={handleLeaveTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="휴가 유형을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LEAVE_REQUEST_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.leave_type && (
              <p className="text-sm text-red-500">{errors.leave_type.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isHalfDay ? '날짜' : '시작일'}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(new Date(startDate), 'PPP', { locale: ko }) : '날짜 선택'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate ? new Date(startDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        setValue('start_date', dateStr);
                        if (isHalfDay || !endDate || new Date(endDate) < date) {
                          setValue('end_date', dateStr);
                        }
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.start_date && (
                <p className="text-sm text-red-500">{errors.start_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>종료일</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground',
                      isHalfDay && 'opacity-50'
                    )}
                    disabled={isHalfDay}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(new Date(endDate), 'PPP', { locale: ko }) : '날짜 선택'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate ? new Date(endDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setValue('end_date', format(date, 'yyyy-MM-dd'));
                      }
                    }}
                    disabled={(date) => {
                      if (!startDate) return false;
                      const start = new Date(startDate);
                      start.setHours(0, 0, 0, 0);
                      const current = new Date(date);
                      current.setHours(0, 0, 0, 0);
                      return current < start;
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.end_date && (
                <p className="text-sm text-red-500">{errors.end_date.message}</p>
              )}
            </div>
          </div>

          {startDate && endDate && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">사용 일수</span>
                <span className="font-semibold">{daysUsed}일</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-600 dark:text-slate-400">잔여 일수</span>
                <span className={cn(
                  'font-semibold',
                  daysUsed > remaining ? 'text-red-500' : 'text-emerald-600'
                )}>
                  {remaining}일
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">사유</Label>
            <Textarea
              id="reason"
              placeholder="휴가 사유를 입력하세요"
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
            <Button
              type="submit"
              disabled={isSubmitting || daysUsed > remaining}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              신청
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
