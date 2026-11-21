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
  machineId?: string;
  mainContent: string;
  detailContent: string;
  targetDate: string; // YYYY-MM-DD
  assigneeId: string;
  status: TaskStatus;
  progress: number; // 0 - 100
  attachments: AttachmentItem[];
  notes: string;
}

export interface TaskFilter {
  status: 'all' | TaskStatus;
  assigneeId: string; // 'all' or member id
  machineId: string; // 'all' or machine id
  search: string;
}

export interface SummaryStats {
  total: number;
  inProgress: number;
  completed: number;
  paused: number;
  overdue: number;
  averageProgress: number;
}

export type AppSection =
  | 'machines'
  | 'workplan'
  | 'overtime'
  | 'materials'
  | 'incidents'
  | 'drive'
  | 'summary';

export type MachineStatus =
  | 'Đang triển khai'
  | 'Chạy thử FAT/SAT'
  | 'Đã bàn giao'
  | 'Tạm dừng';

export const MACHINE_STATUSES: readonly MachineStatus[] = [
  'Đang triển khai',
  'Chạy thử FAT/SAT',
  'Đã bàn giao',
  'Tạm dừng',
] as const;

export interface MachineProject {
  id: string;
  code: string;
  name: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  status: MachineStatus;
  updatedAt: string; // YYYY-MM-DD
}

export interface MachineFilter {
  status: 'all' | MachineStatus;
  search: string;
}

export interface MachineSummaryStats {
  total: number;
  inProgress: number;
  testing: number;
  delivered: number;
  paused: number;
}

export type OvertimeDayType = 'Ngày thường' | 'Cuối tuần' | 'Ngày lễ';

export const OVERTIME_DAY_TYPES: readonly OvertimeDayType[] = [
  'Ngày thường',
  'Cuối tuần',
  'Ngày lễ',
] as const;

export const OVERTIME_MULTIPLIERS: Record<OvertimeDayType, number> = {
  'Ngày thường': 1.5,
  'Cuối tuần': 2.0,
  'Ngày lễ': 3.0,
};

export interface OvertimeEntry {
  id: string;
  date: string; // YYYY-MM-DD
  memberId: string;
  hours: number;
  dayType: OvertimeDayType;
  content: string;
  notes: string;
  createdAt: string; // YYYY-MM-DD
}

export interface OvertimeFilter {
  memberId: string; // 'all' or member id
  month: string; // '' (all months) or 'YYYY-MM'
  search: string;
}

export interface OvertimeSummaryStats {
  count: number;
  totalHours: number;
  totalWeightedHours: number;
  regularHours: number;
  weekendHours: number;
  holidayHours: number;
}

export interface MemberSummaryRow {
  member: TeamMember;
  taskCount: number;
  averageTaskProgress: number;
  overtimeHours: number;
  weightedOvertimeHours: number;
}

export type MaterialStatus = 'Cần đặt' | 'Đã đặt' | 'Đã về kho';

export const MATERIAL_STATUSES: readonly MaterialStatus[] = [
  'Cần đặt',
  'Đã đặt',
  'Đã về kho',
] as const;

export interface MaterialItem {
  id: string;
  name: string;
  specCode: string;
  quantity: number;
  unit: string;
  machineId?: string;
  projectName: string;
  status: MaterialStatus;
  notes: string;
  updatedAt: string; // YYYY-MM-DD
}

export interface MaterialFilter {
  status: 'all' | MaterialStatus;
  machineId: string; // 'all', machineId, or 'name:<projectName>'
  search: string;
}

export interface MaterialSummaryStats {
  total: number;
  toOrder: number;
  ordered: number;
  inStock: number;
  totalQuantity: number;
}

export type IncidentStatus = 'Đang xử lý' | 'Theo dõi thêm' | 'Đã khắc phục';

export const INCIDENT_STATUSES: readonly IncidentStatus[] = [
  'Đang xử lý',
  'Theo dõi thêm',
  'Đã khắc phục',
] as const;

export interface IncidentEntry {
  id: string;
  occurredAt: string; // YYYY-MM-DD
  repairTime: string;
  machineId?: string;
  machineName: string;
  description: string;
  resolution: string;
  assigneeId: string;
  status: IncidentStatus;
  attachments: AttachmentItem[];
}

export interface IncidentFilter {
  status: 'all' | IncidentStatus;
  assigneeId: string; // 'all' or member id
  machineId: string; // 'all', machineId, or 'name:<machineName>'
  search: string;
}

export interface IncidentSummaryStats {
  total: number;
  inProgress: number;
  monitoring: number;
  resolved: number;
}

export interface WorkspaceBackupPayload {
  version: number;
  exportedAt: string;
  members: TeamMember[];
  machines?: MachineProject[];
  tasks: WorkTask[];
  overtimeEntries: OvertimeEntry[];
  materials?: MaterialItem[];
  incidents?: IncidentEntry[];
}

export interface DriveAuthProps {
  userEmail?: string | null;
  accessToken: string | null;
  isSigningIn: boolean;
  onSignIn: () => Promise<void>;
  onTokenExpired: () => void;
}


