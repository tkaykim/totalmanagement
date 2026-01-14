export type BugReportStatus = 'pending' | 'resolved';

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
  resolved: '개선완료',
};

export const BUG_STATUS_COLORS: Record<BugReportStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
};
