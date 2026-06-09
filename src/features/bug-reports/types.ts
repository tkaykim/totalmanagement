export type BugReportStatus = 'pending' | 'on_hold' | 'resolved' | 'no_action';

export interface BugReport {
  id: number;
  reporter_id: string | null;
  title: string;
  situation: string;
  description: string | null;
  improvement_request: string | null;
  status: BugReportStatus;
  created_at: string;
  updated_at: string;
  reporter?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateBugReportPayload {
  title: string;
  situation: string;
  description?: string;
  improvement_request?: string;
}

export interface UpdateBugReportPayload {
  status?: BugReportStatus;
}

export const BUG_STATUS_LABELS: Record<BugReportStatus, string> = {
  pending: '접수됨',
  on_hold: '보류',
  resolved: '처리완료',
  no_action: '처리 불필요',
};

export const BUG_STATUS_COLORS: Record<BugReportStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
  on_hold: 'bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  no_action: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400',
};
