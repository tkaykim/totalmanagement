'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Loader2, Gift } from 'lucide-react';
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
import { createLeaveGrant } from '../api';
import type { LeaveType } from '../types';

const schema = z.object({
  grant_kind: z.enum(['annual', 'half', 'compensatory']),
  days: z.number().min(0.5, '최소 0.5일 이상 입력해주세요'),
  reason: z.string().min(1, '생성 사유를 입력해주세요'),
});

type FormValues = z.infer<typeof schema>;

interface GrantLeaveToUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  onSuccess: () => void;
}

export function GrantLeaveToUserModal({
  open,
  onOpenChange,
  userId,
  userName,
  onSuccess,
}: GrantLeaveToUserModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      grant_kind: 'annual',
      days: 1,
      reason: '',
    },
  });

  const grantKind = watch('grant_kind');

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    const leave_type: LeaveType = data.grant_kind === 'half' ? 'annual' : data.grant_kind === 'annual' ? 'annual' : 'compensatory';
    const days = data.grant_kind === 'half' ? 0.5 : data.days;

    try {
      await createLeaveGrant({
        user_id: userId,
        leave_type,
        days,
        reason: data.reason,
      });
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (e) {
      alert(e instanceof Error ? e.message : '휴가 생성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            휴가 생성 — {userName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>유형</Label>
            <Select
              value={grantKind}
              onValueChange={(v) => {
                setValue('grant_kind', v as FormValues['grant_kind']);
                if (v === 'half') setValue('days', 0.5);
                else if (watch('days') === 0.5) setValue('days', 1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="annual">연차</SelectItem>
                <SelectItem value="half">반차</SelectItem>
                <SelectItem value="compensatory">대체휴무</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="days">부여 일수</Label>
            <Input
              id="days"
              type="number"
              step="0.5"
              min="0.5"
              disabled={grantKind === 'half'}
              {...register('days', { valueAsNumber: true })}
            />
            {grantKind === 'half' && (
              <p className="text-xs text-slate-500">반차는 0.5일로 고정됩니다.</p>
            )}
            {errors.days && (
              <p className="text-sm text-red-500">{errors.days.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">생성 사유 (필수)</Label>
            <Textarea
              id="reason"
              placeholder="휴가 생성 사유를 입력하세요"
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
              생성
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
