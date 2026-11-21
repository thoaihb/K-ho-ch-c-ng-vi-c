import {
  MAX_TEAM_MEMBERS,
  MachineProject,
  SummaryStats,
  TASK_STATUSES,
  TaskFilter,
  TaskStatus,
  TeamMember,
  WorkTask,
} from '../types/workplan';
import { matchesMachineFilter } from './machines';

export const TASKS_STORAGE_KEY = 'automation_team_workplan_tasks_v1';
export const MEMBERS_STORAGE_KEY = 'automation_team_workplan_members_v1';

export const DEFAULT_TEAM_MEMBERS: TeamMember[] = [
  { id: 'mem-1', name: 'Nguyễn Minh Tuấn', role: 'Trưởng nhóm PLC' },
  { id: 'mem-2', name: 'Trần Thị Thu Hà', role: 'Kỹ sư SCADA / HMI' },
  { id: 'mem-3', name: 'Lê Hoàng Nam', role: 'Kỹ sư Robot & Thị giác máy' },
  { id: 'mem-4', name: 'Phạm Quốc Bảo', role: 'Kỹ sư Điện & Tủ điều khiển' },
  { id: 'mem-5', name: 'Võ Ngọc Linh', role: 'Kỹ sư Kiểm thử FAT / SAT' },
  { id: 'mem-6', name: 'Đặng Hữu Phước', role: 'Kỹ sư Tích hợp IIoT' },
];

export const DEFAULT_WORK_TASKS: WorkTask[] = [
  {
    id: 'task-1',
    createdAt: '2026-11-08',
    mainContent: 'Lập trình PLC S7-1500 trạm cấp phôi tự động',
    detailContent:
      'Viết khối hàm FB điều khiển xi-lanh khí nén, đồng bộ tín hiệu cảm biến tiệm cận và xử lý liên động an toàn cửa bảo vệ.',
    targetDate: '2026-11-24',
    assigneeId: 'mem-1',
    status: 'Đang thực hiện',
    progress: 65,
    attachments: [
      {
        id: 'att-1',
        name: 'SoDo_LienDong_S71500.pdf',
        size: 184320,
        mimeType: 'application/pdf',
        addedAt: '2026-11-08',
      },
    ],
    notes: 'Ưu tiên hoàn thành chu trình Auto/Manual trước buổi chạy thử nội bộ.',
  },
  {
    id: 'task-2',
    createdAt: '2026-11-05',
    mainContent: 'Thiết kế giao diện WinCC Unified giám sát dây chuyền',
    detailContent:
      'Xây dựng màn hình tổng quan OEE, bảng cảnh báo lỗi theo thời gian thực và trang cài đặt thông số tốc độ băng tải.',
    targetDate: '2026-11-18',
    assigneeId: 'mem-2',
    status: 'Hoàn thành',
    progress: 100,
    attachments: [
      {
        id: 'att-2',
        name: 'HMI_Screen_Layout_v2.png',
        size: 96240,
        mimeType: 'image/png',
        addedAt: '2026-11-12',
      },
    ],
    notes: 'Đã nghiệm thu giao diện với bộ phận vận hành xưởng.',
  },
  {
    id: 'task-3',
    createdAt: '2026-11-10',
    mainContent: 'Hiệu chuẩn camera thị giác máy kiểm tra lỗi nhãn',
    detailContent:
      'Thiết lập vùng ROI nhận diện lệch tem, cân chỉnh đèn vòng LED và đồng bộ xung trigger từ encoder băng tải.',
    targetDate: '2026-11-26',
    assigneeId: 'mem-3',
    status: 'Đang thực hiện',
    progress: 45,
    attachments: [],
    notes: 'Đang kiểm tra độ ổn định ánh sáng ở tốc độ 60 sản phẩm/phút.',
  },
  {
    id: 'task-4',
    createdAt: '2026-11-04',
    mainContent: 'Đấu nối tủ điện phân phối MCC và kiểm tra cách điện',
    detailContent:
      'Lắp đặt aptomat, biến tần G120C, bấm đầu cốt dây động lực và đo thông mạch toàn bộ ngõ vào/ra I/O.',
    targetDate: '2026-11-15',
    assigneeId: 'mem-4',
    status: 'Tạm dừng',
    progress: 30,
    attachments: [
      {
        id: 'att-3',
        name: 'BanVe_TuDien_MCC_Rev3.xlsx',
        size: 142500,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        addedAt: '2026-11-06',
      },
    ],
    notes: 'Tạm chờ nhà cung cấp giao bổ sung module truyền thông Profinet.',
  },
  {
    id: 'task-5',
    createdAt: '2026-11-12',
    mainContent: 'Lập bộ kịch bản kiểm thử FAT cụm đóng gói cuối line',
    detailContent:
      'Soạn danh mục kiểm tra dừng khẩn cấp E-Stop, thử nghiệm mất kết nối mạng công nghiệp và đo thời gian chu kỳ.',
    targetDate: '2026-11-28',
    assigneeId: 'mem-5',
    status: 'Đang thực hiện',
    progress: 25,
    attachments: [
      {
        id: 'att-4',
        name: 'Checklist_FAT_DongGoi.docx',
        size: 78400,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        addedAt: '2026-11-12',
      },
    ],
    notes: 'Phối hợp cùng anh Tuấn chạy test mô phỏng I/O vào thứ Năm.',
  },
  {
    id: 'task-6',
    createdAt: '2026-11-01',
    mainContent: 'Kết nối gateway OPC UA đẩy dữ liệu sản lượng lên server',
    detailContent:
      'Cấu hình tag đọc dữ liệu từ PLC chính, thiết lập bộ đệm lưu trữ cục bộ khi rớt mạng và kiểm tra định dạng JSON.',
    targetDate: '2026-11-16',
    assigneeId: 'mem-6',
    status: 'Hoàn thành',
    progress: 100,
    attachments: [],
    notes: 'Dữ liệu đồng bộ ổn định với độ trễ dưới 500ms.',
  },
];

export function getTodayIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateVi(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return isoDate || '—';
  }
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

export function isTaskOverdue(
  task: Pick<WorkTask, 'targetDate' | 'status'>,
  todayIso: string = getTodayIsoDate()
): boolean {
  if (!task.targetDate || task.status === 'Hoàn thành') {
    return false;
  }
  return task.targetDate < todayIso;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return 'Liên kết';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function filterTasks(
  tasks: WorkTask[],
  filter: TaskFilter,
  members: TeamMember[] = [],
  machines: MachineProject[] = []
): WorkTask[] {
  const normalizedQuery = filter.search.trim().toLowerCase();
  const memberNameMap = new Map(members.map((m) => [m.id, m.name.toLowerCase()]));

  return tasks.filter((task) => {
    if (filter.status !== 'all' && task.status !== filter.status) {
      return false;
    }
    if (filter.assigneeId !== 'all' && task.assigneeId !== filter.assigneeId) {
      return false;
    }
    if (
      filter.machineId &&
      filter.machineId !== 'all' &&
      !matchesMachineFilter(
        filter.machineId,
        machines,
        task.machineId,
        task.mainContent
      )
    ) {
      return false;
    }
    if (normalizedQuery) {
      const assigneeName = memberNameMap.get(task.assigneeId) ?? '';
      const haystack = [
        task.mainContent,
        task.detailContent,
        task.notes,
        assigneeName,
        ...task.attachments.map((att) => att.name),
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(normalizedQuery)) {
        return false;
      }
    }
    return true;
  });
}

export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function resolveProgressForStatus(
  currentProgress: number,
  nextStatus: TaskStatus
): number {
  if (nextStatus === 'Hoàn thành') {
    return 100;
  }
  return clampProgress(currentProgress);
}

export function computeSummaryStats(
  tasks: WorkTask[],
  todayIso: string = getTodayIsoDate()
): SummaryStats {
  let inProgress = 0;
  let completed = 0;
  let paused = 0;
  let overdue = 0;
  let sumProgress = 0;

  for (const task of tasks) {
    if (task.status === 'Đang thực hiện') inProgress += 1;
    else if (task.status === 'Hoàn thành') completed += 1;
    else if (task.status === 'Tạm dừng') paused += 1;

    if (isTaskOverdue(task, todayIso)) {
      overdue += 1;
    }

    sumProgress += clampProgress(task.progress);
  }

  return {
    total: tasks.length,
    inProgress,
    completed,
    paused,
    overdue,
    averageProgress:
      tasks.length > 0 ? Math.round(sumProgress / tasks.length) : 0,
  };
}

export interface AddMemberResult {
  ok: boolean;
  members: TeamMember[];
  error?: string;
}

export function addTeamMember(
  members: TeamMember[],
  name: string,
  role: string,
  idGenerator: () => string = () => `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
): AddMemberResult {
  const trimmedName = name.trim();
  const trimmedRole = role.trim() || 'Kỹ sư Tự động hóa';

  if (members.length >= MAX_TEAM_MEMBERS) {
    return {
      ok: false,
      members,
      error: `Nhóm đã đạt giới hạn tối đa ${MAX_TEAM_MEMBERS} thành viên.`,
    };
  }
  if (!trimmedName) {
    return {
      ok: false,
      members,
      error: 'Vui lòng nhập họ tên thành viên.',
    };
  }
  const exists = members.some(
    (m) => m.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );
  if (exists) {
    return {
      ok: false,
      members,
      error: 'Thành viên này đã có trong danh sách nhóm.',
    };
  }

  const nextMember: TeamMember = {
    id: idGenerator(),
    name: trimmedName,
    role: trimmedRole,
  };

  return {
    ok: true,
    members: [...members, nextMember],
  };
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadTasksFromStorage(storage: StorageLike): WorkTask[] {
  try {
    const raw = storage.getItem(TASKS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_WORK_TASKS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return DEFAULT_WORK_TASKS;
    }
    return parsed
      .map(normalizeStoredTask)
      .filter((item): item is WorkTask => item !== null);
  } catch {
    return DEFAULT_WORK_TASKS;
  }
}

export function loadMembersFromStorage(storage: StorageLike): TeamMember[] {
  try {
    const raw = storage.getItem(MEMBERS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_TEAM_MEMBERS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return DEFAULT_TEAM_MEMBERS;
    }
    const valid = parsed.filter(isValidTeamMember).slice(0, MAX_TEAM_MEMBERS);
    return valid.length > 0 ? valid : DEFAULT_TEAM_MEMBERS;
  } catch {
    return DEFAULT_TEAM_MEMBERS;
  }
}

export function saveToStorage(
  storage: StorageLike,
  key: string,
  value: unknown
): { ok: boolean; error?: string } {
  try {
    storage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch {
    return {
      ok: false,
      error:
        'Dung lượng lưu trữ trình duyệt (localStorage) đã đầy. Vui lòng xóa bớt file đính kèm dung lượng lớn.',
    };
  }
}

function isValidTeamMember(item: unknown): item is TeamMember {
  if (!item || typeof item !== 'object') return false;
  const candidate = item as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    candidate.name.trim().length > 0 &&
    typeof candidate.role === 'string'
  );
}

function normalizeStoredTask(item: unknown): WorkTask | null {
  if (!item || typeof item !== 'object') return null;
  const candidate = item as Record<string, unknown>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.createdAt !== 'string' ||
    typeof candidate.mainContent !== 'string' ||
    typeof candidate.detailContent !== 'string' ||
    typeof candidate.targetDate !== 'string' ||
    typeof candidate.assigneeId !== 'string' ||
    !TASK_STATUSES.includes(candidate.status as TaskStatus) ||
    !Array.isArray(candidate.attachments) ||
    typeof candidate.notes !== 'string'
  ) {
    return null;
  }

  const status = candidate.status as TaskStatus;
  const progress =
    typeof candidate.progress === 'number' && Number.isFinite(candidate.progress)
      ? clampProgress(candidate.progress)
      : status === 'Hoàn thành'
      ? 100
      : 0;

  return {
    id: candidate.id,
    createdAt: candidate.createdAt,
    ...(typeof candidate.machineId === 'string' && candidate.machineId
      ? { machineId: candidate.machineId }
      : {}),
    mainContent: candidate.mainContent,
    detailContent: candidate.detailContent,
    targetDate: candidate.targetDate,
    assigneeId: candidate.assigneeId,
    status,
    progress,
    attachments: candidate.attachments,
    notes: candidate.notes,
  };
}

export function createTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
