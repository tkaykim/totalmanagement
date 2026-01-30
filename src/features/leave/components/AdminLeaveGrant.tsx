'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { createClient } from '@/lib/supabase/client';
import { createLeaveGrant } from '../api';
import type { LeaveGrantFormData, LeaveType } from '../types';
import { LEAVE_TYPE_LABELS } from '../types';

const BU_DISPLAY_NAMES: Record<string, string> = {
  HEAD: '본사',
  GRIGO: '그리고엔터',
  FLOW: '플로우메이커',
  REACT: '리액트스튜디오',
  MODOO: '모두굿즈',
  AST: '아스트컴퍼니',
};

const schema = z.object({
  user_id: z.string().min(1, '대상자를 선택해주세요'),
  leave_type: z.enum(['annual', 'compensatory', 'special']),
  days: z.number().min(0.5, '최소 0.5일 이상 입력해주세요'),
  reason: z.string().min(1, '사유를 입력해주세요'),
});

interface PreselectedUser {
  id: string;
  name: string;
}

interface AdminLeaveGrantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  /** 이름 클릭으로 열었을 때 사전 지정된 대상자 */
  preselectedUser?: PreselectedUser | null;
}

interface UserOption {
  id: string;
  name: string;
  bu_code: string | null;
  position: string | null;
}

export function AdminLeaveGrant({ open, onOpenChange, onSuccess, preselectedUser }: AdminLeaveGrantProps) {
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
  } = useForm<LeaveGrantFormData>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      user_id: '',
      leave_type: 'special',
      days: 1,
      reason: '',
    },
  });

  const leaveType = watch('leave_type');

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
      setValue('user_id', preselectedUser.id);
    }
  }, [open, preselectedUser?.id, setValue]);

  const onSubmit = async (data: LeaveGrantFormData) => {
    setIsSubmitting(true);
    try {
      await createLeaveGrant(data);
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      alert(error instanceof Error ? error.message : '휴가 부여에 실패했습니다.');
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
            휴가 부여
            {preselectedUser?.name && (
              <span className="text-slate-500 font-normal">— {preselectedUser.name}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user_id">대상자</Label>
            <Select
              value={watch('user_id')}
              onValueChange={(value) => setValue('user_id', value)}
              disabled={loadingUsers}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingUsers ? '로딩 중...' : '대상자를 선택하세요'} />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                    {user.bu_code && <span className="text-slate-500 ml-2">({BU_DISPLAY_NAMES[user.bu_code] || user.bu_code})</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.user_id && (
              <p className="text-sm text-red-500">{errors.user_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="leave_type">휴가 유형</Label>
            <Select
              value={leaveType}
              onValueChange={(value) => setValue('leave_type', value as LeaveType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="휴가 유형을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => (
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

          <div className="space-y-2">
            <Label htmlFor="days">부여 일수</Label>
            <Input
              id="days"
              type="number"
              step="0.5"
              min="0.5"
              {...register('days', { valueAsNumber: true })}
            />
            {errors.days && (
              <p className="text-sm text-red-500">{errors.days.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">사유</Label>
            <Textarea
              id="reason"
              placeholder="휴가 부여 사유를 입력하세요"
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
              부여
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
