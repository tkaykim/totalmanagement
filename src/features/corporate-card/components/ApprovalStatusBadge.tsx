'use client';

import { cn } from '@/lib/utils';
import { APPROVAL_STATUS_LABELS, APPROVAL_STATUS_COLORS, type GowidApprovalStatus } from '../types';

interface ApprovalStatusBadgeProps {
  status: GowidApprovalStatus;
  className?: string;
}

export function ApprovalStatusBadge({ status, className }: ApprovalStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        APPROVAL_STATUS_COLORS[status],
        className
      )}
    >
      {APPROVAL_STATUS_LABELS[status]}
    </span>
  );
}
