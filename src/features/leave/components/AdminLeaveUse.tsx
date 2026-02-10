'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, CalendarMinus } from 'lucide-react';
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
import { createClient } from '@/lib/supabase/client';
import { adminCreateLeaveRequest } from '../api';
import { LEAVE_REQUEST_TYPE_LABELS } from '../types';
import type { LeaveRequestType } from '../types';

const BU_DISPLAY_NAMES: Record<string, string> = {
  HEAD: '본사',
  GRIGO: '그리고엔터',
  FLOW: '플로우메이커',
  REACT: '리액트스튜디오',
  MODOO: '모두굿즈',
  AST: '아스트컴퍼니',
};

const schema = z.object({
  target_user_id: z.string().min(1, '대상자를 선택해주세요'),
  leave_type: z.enum(['annual', 'half_am', 'half_pm', 'compensatory', 'special']),
  start_date: z.string().min(1, '시작일을 입력해주세요'),
  end_date: z.string().min(1, '종료일을 입력해주세요'),
  reason: z.string().min(1, '사유를 입력해주세요'),
});

type FormData = z.infer<typeof schema>;

interface UserOption {
  id: string;
  name: string;
  bu_code: string | null;
  position: string | null;
}

interface AdminLeaveUseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  preselectedUser?: { id: string; name: string } | null;
}

export function AdminLeaveUse({ open, onOpenChange, onSuccess, preselectedUser }: AdminLeaveUseProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      target_user_id: '',
      leave_type: 'annual',
      start_date: '',
      end_date: '',
      reason: '',
    },
  });

  const leaveType = watch('leave_type');
  const startDate = watch('start_date');
  const isHalfDay = leaveType === 'half_am' || leaveType === 'half_pm';

  // 반차 선택 시 종료일 = 시작일 자동 설정
  useEffect(() => {
    if (isHalfDay && startDate) {
      setValue('end_date', startDate);
    }
  }, [isHalfDay, startDate, setValue]);

  useEffect(() => {
    const fetchUsers = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('app_users')
        .select('id, name, bu_code, position')
        .neq('role', 'artist')
        .order('name');

      if (data) {
        setUsers(data);
      }
      setLoadingUsers(false);
    };

    if (open) {
      fetchUsers();
    }
  }, [open]);

  useEffect(() => {
    if (open && preselectedUser?.id) {
      setValue('target_user_id', preselectedUser.id);
    }
  }, [open, preselectedUser?.id, setValue]);

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await adminCreateLeaveRequest({
        target_user_id: data.target_user_id,
        leave_type: data.leave_type,
        start_date: data.start_date,
        end_date: data.end_date,
        reason: data.reason,
      });
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      alert(error instanceof Error ? error.message : '대리 휴가 소진에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarMinus className="h-5 w-5" />
            관리자 대리 휴가 소진
            {preselectedUser?.name && (
              <span className="text-slate-500 font-normal">— {preselectedUser.name}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="target_user_id">대상자</Label>
            <Select
              value={watch('target_user_id')}
              onValueChange={(value) => setValue('target_user_id', value)}
              disabled={loadingUsers}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingUsers ? '로딩 중...' : '대상자를 선택하세요'} />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                    {user.bu_code && (
                      <span className="text-slate-500 ml-2">
                        ({BU_DISPLAY_NAMES[user.bu_code] || user.bu_code})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.target_user_id && (
              <p className="text-sm text-red-500">{errors.target_user_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="leave_type">휴가 유형</Label>
            <Select
              value={leaveType}
              onValueChange={(value) => setValue('leave_type', value as LeaveRequestType)}
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start_date">시작일</Label>
              <Input
                id="start_date"
                type="date"
                {...register('start_date')}
              />
              {errors.start_date && (
                <p className="text-sm text-red-500">{errors.start_date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">종료일</Label>
              <Input
                id="end_date"
                type="date"
                disabled={isHalfDay}
                {...register('end_date')}
              />
              {errors.end_date && (
                <p className="text-sm text-red-500">{errors.end_date.message}</p>
              )}
            </div>
          </div>

          {isHalfDay && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              반차는 시작일과 종료일이 동일하게 설정됩니다.
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">사유</Label>
            <Textarea
              id="reason"
              placeholder="대리 소진 사유를 입력하세요 (예: 특별휴가, 병가 등)"
              {...register('reason')}
            />
            {errors.reason && (
              <p className="text-sm text-red-500">{errors.reason.message}</p>
            )}
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              관리자 대리 소진 시 해당 사용자의 잔여 휴가에서 즉시 차감되며, 자동으로 승인 처리됩니다.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting} variant="destructive">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              대리 소진
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
