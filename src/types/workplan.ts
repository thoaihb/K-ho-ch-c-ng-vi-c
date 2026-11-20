export type TaskStatus = 'Đang thực hiện' | 'Hoàn thành' | 'Tạm dừng';

export const TASK_STATUSES: readonly TaskStatus[] = [
  'Đang thực hiện',
  'Hoàn thành',
  'Tạm dừng',
] as const;

export const MAX_TEAM_MEMBERS = 10;

export interface AttachmentItem {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  dataUrl?: string;
  externalUrl?: string;
  addedAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
}

export interface WorkTask {
  id: string;
  createdAt: string; // YYYY-MM-DD
  mainContent: string;
  detailContent: string;
  targetDate: string; // YYYY-MM-DD
  assigneeId: string;
  status: TaskStatus;
  attachments: AttachmentItem[];
  notes: string;
}

export interface TaskFilter {
  status: 'all' | TaskStatus;
  assigneeId: string; // 'all' or member id
  search: string;
}

export interface SummaryStats {
  total: number;
  inProgress: number;
  completed: number;
  paused: number;
  overdue: number;
}
