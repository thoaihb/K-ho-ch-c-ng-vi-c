import {
  IncidentEntry,
  MAX_TEAM_MEMBERS,
  MaterialItem,
  MemberSummaryRow,
  OVERTIME_DAY_TYPES,
  OVERTIME_MULTIPLIERS,
  OvertimeDayType,
  OvertimeEntry,
  OvertimeFilter,
  OvertimeSummaryStats,
  TASK_STATUSES,
  TaskStatus,
  TeamMember,
  WorkTask,
  WorkspaceBackupPayload,
} from '../types/workplan';
import {
  normalizeStoredIncident,
  normalizeStoredMaterial,
} from './operations';
import {
  StorageLike,
  clampProgress,
  formatDateVi,
  getTodayIsoDate,
} from './workplan';

export const OVERTIME_STORAGE_KEY = 'automation_team_overtime_entries_v1';
export const SIDEBAR_COLLAPSED_KEY = 'automation_team_sidebar_collapsed_v1';

export const DEFAULT_OVERTIME_ENTRIES: OvertimeEntry[] = [
  {
    id: 'ot-1',
    date: '2026-11-18',
    memberId: 'mem-1',
    hours: 2.5,
    dayType: 'Ngày thường',
    content: 'Chạy thử liên động PLC S7-1500 sau giờ hành chính',
    notes: 'Đã hoàn thành test chu trình Auto/Manual trạm cấp phôi.',
    createdAt: '2026-11-18',
  },
  {
    id: 'ot-2',
    date: '2026-11-15',
    memberId: 'mem-2',
    hours: 4,
    dayType: 'Cuối tuần',
    content: 'Cập nhật giao diện cảnh báo SCADA WinCC theo phản hồi xưởng',
    notes: 'Hỗ trợ trực tiếp ca bảo trì cuối tuần.',
    createdAt: '2026-11-15',
  },
  {
    id: 'ot-3',
    date: '2026-11-12',
    memberId: 'mem-3',
    hours: 1.5,
    dayType: 'Ngày thường',
    content: 'Tinh chỉnh thông số phơi sáng camera kiểm tra nhãn',
    notes: 'Tối ưu tỷ lệ nhận diện sai xuống dưới 0.2%.',
    createdAt: '2026-11-12',
  },
  {
    id: 'ot-4',
    date: '2026-11-08',
    memberId: 'mem-4',
    hours: 3,
    dayType: 'Cuối tuần',
    content: 'Đấu nối bổ sung relay an toàn tủ điện phân phối MCC',
    notes: 'Đo thông mạch đạt chuẩn trước khi đóng điện.',
    createdAt: '2026-11-08',
  },
  {
    id: 'ot-5',
    date: '2026-10-30',
    memberId: 'mem-6',
    hours: 2,
    dayType: 'Ngày lễ',
    content: 'Xử lý đồng bộ OPC UA khi bảo trì máy chủ nhà máy',
    notes: 'Khởi động lại gateway và xác nhận không mất gói tin.',
    createdAt: '2026-10-30',
  },
];

export function getOvertimeMultiplier(dayType: OvertimeDayType): number {
  return OVERTIME_MULTIPLIERS[dayType] ?? 1.5;
}

export function roundHours(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function calculateWeightedHours(
  hours: number,
  dayType: OvertimeDayType
): number {
  if (!Number.isFinite(hours) || hours <= 0) return 0;
  return roundHours(hours * getOvertimeMultiplier(dayType));
}

export function formatHours(hours: number): string {
  const rounded = roundHours(hours);
  return `${rounded}h`;
}

export function getMonthKey(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}/.test(isoDate)) return '';
  return isoDate.slice(0, 7);
}

export function formatMonthVi(monthKey: string): string {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return monthKey || '—';
  const [year, month] = monthKey.split('-');
  return `Tháng ${month}/${year}`;
}

export function createOvertimeId(): string {
  return `ot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function filterOvertimeEntries(
  entries: OvertimeEntry[],
  filter: OvertimeFilter,
  members: TeamMember[] = []
): OvertimeEntry[] {
  const query = filter.search.trim().toLowerCase();
  const memberNameMap = new Map(
    members.map((m) => [m.id, m.name.toLowerCase()])
  );

  return entries.filter((entry) => {
    if (filter.memberId !== 'all' && entry.memberId !== filter.memberId) {
      return false;
    }
    if (filter.month && getMonthKey(entry.date) !== filter.month) {
      return false;
    }
    if (query) {
      const memberName = memberNameMap.get(entry.memberId) ?? '';
      const haystack = [
        entry.content,
        entry.notes,
        entry.dayType,
        memberName,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }
    return true;
  });
}

export function computeOvertimeStats(
  entries: OvertimeEntry[]
): OvertimeSummaryStats {
  let totalHours = 0;
  let totalWeightedHours = 0;
  let regularHours = 0;
  let weekendHours = 0;
  let holidayHours = 0;

  for (const entry of entries) {
    const h = Number.isFinite(entry.hours) && entry.hours > 0 ? entry.hours : 0;
    totalHours += h;
    totalWeightedHours += calculateWeightedHours(h, entry.dayType);

    if (entry.dayType === 'Ngày thường') regularHours += h;
    else if (entry.dayType === 'Cuối tuần') weekendHours += h;
    else if (entry.dayType === 'Ngày lễ') holidayHours += h;
  }

  return {
    count: entries.length,
    totalHours: roundHours(totalHours),
    totalWeightedHours: roundHours(totalWeightedHours),
    regularHours: roundHours(regularHours),
    weekendHours: roundHours(weekendHours),
    holidayHours: roundHours(holidayHours),
  };
}

export function computeMemberOvertimeBreakdown(
  members: TeamMember[],
  tasks: WorkTask[],
  overtimeEntries: OvertimeEntry[],
  monthKey: string
): MemberSummaryRow[] {
  return members.map((member) => {
    const memberTasks = tasks.filter((t) => t.assigneeId === member.id);
    const taskCount = memberTasks.length;
    const averageTaskProgress =
      taskCount > 0
        ? Math.round(
            memberTasks.reduce((acc, t) => acc + clampProgress(t.progress), 0) /
              taskCount
          )
        : 0;

    const monthOvertime = overtimeEntries.filter(
      (entry) =>
        entry.memberId === member.id &&
        (!monthKey || getMonthKey(entry.date) === monthKey)
    );

    const overtimeHours = roundHours(
      monthOvertime.reduce((acc, e) => acc + e.hours, 0)
    );
    const weightedOvertimeHours = roundHours(
      monthOvertime.reduce(
        (acc, e) => acc + calculateWeightedHours(e.hours, e.dayType),
        0
      )
    );

    return {
      member,
      taskCount,
      averageTaskProgress,
      overtimeHours,
      weightedOvertimeHours,
    };
  });
}

export function loadOvertimeFromStorage(storage: StorageLike): OvertimeEntry[] {
  try {
    const raw = storage.getItem(OVERTIME_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_OVERTIME_ENTRIES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return DEFAULT_OVERTIME_ENTRIES;
    }
    return parsed
      .map(normalizeStoredOvertime)
      .filter((item): item is OvertimeEntry => item !== null);
  } catch {
    return DEFAULT_OVERTIME_ENTRIES;
  }
}

function normalizeStoredOvertime(item: unknown): OvertimeEntry | null {
  if (!item || typeof item !== 'object') return null;
  const candidate = item as Record<string, unknown>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.date !== 'string' ||
    typeof candidate.memberId !== 'string' ||
    typeof candidate.hours !== 'number' ||
    !Number.isFinite(candidate.hours) ||
    candidate.hours <= 0 ||
    !OVERTIME_DAY_TYPES.includes(candidate.dayType as OvertimeDayType) ||
    typeof candidate.content !== 'string'
  ) {
    return null;
  }

  return {
    id: candidate.id,
    date: candidate.date,
    memberId: candidate.memberId,
    hours: roundHours(candidate.hours),
    dayType: candidate.dayType as OvertimeDayType,
    content: candidate.content,
    notes: typeof candidate.notes === 'string' ? candidate.notes : '',
    createdAt:
      typeof candidate.createdAt === 'string'
        ? candidate.createdAt
        : candidate.date,
  };
}

export function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '');
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildWorkplanCsv(
  tasks: WorkTask[],
  members: TeamMember[]
): string {
  const memberMap = new Map(members.map((m) => [m.id, m.name]));
  const headers = [
    'STT',
    'Ngày tạo',
    'Nội dung chính',
    'Nội dung chi tiết',
    'Kế hoạch hoàn thành',
    'Người đảm nhận',
    'Trạng thái',
    'Tiến độ (%)',
    'File đính kèm',
    'Ghi chú',
  ];

  const rows = tasks.map((task, idx) => [
    idx + 1,
    formatDateVi(task.createdAt),
    task.mainContent,
    task.detailContent,
    formatDateVi(task.targetDate),
    memberMap.get(task.assigneeId) ?? 'Chưa phân công',
    task.status,
    `${clampProgress(task.progress)}%`,
    task.attachments.map((a) => a.name).join('; '),
    task.notes,
  ]);

  const lines = [headers, ...rows].map((row) =>
    row.map(escapeCsvCell).join(',')
  );
  return `\uFEFF${lines.join('\r\n')}`;
}

export function buildOvertimeCsv(
  entries: OvertimeEntry[],
  members: TeamMember[]
): string {
  const memberMap = new Map(members.map((m) => [m.id, m.name]));
  const headers = [
    'STT',
    'Ngày tăng ca',
    'Người thực hiện',
    'Loại ngày',
    'Hệ số',
    'Số giờ thực tế',
    'Giờ quy đổi',
    'Nội dung công việc tăng ca',
    'Ghi chú',
  ];

  const rows = entries.map((entry, idx) => [
    idx + 1,
    formatDateVi(entry.date),
    memberMap.get(entry.memberId) ?? 'Không xác định',
    entry.dayType,
    `${getOvertimeMultiplier(entry.dayType)}x`,
    roundHours(entry.hours),
    calculateWeightedHours(entry.hours, entry.dayType),
    entry.content,
    entry.notes,
  ]);

  const lines = [headers, ...rows].map((row) =>
    row.map(escapeCsvCell).join(',')
  );
  return `\uFEFF${lines.join('\r\n')}`;
}

export function buildBackupJson(
  members: TeamMember[],
  tasks: WorkTask[],
  overtimeEntries: OvertimeEntry[],
  nowIso: string = getTodayIsoDate(),
  materials: MaterialItem[] = [],
  incidents: IncidentEntry[] = []
): string {
  const payload: WorkspaceBackupPayload = {
    version: 2,
    exportedAt: nowIso,
    members,
    tasks,
    overtimeEntries,
    materials,
    incidents,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseAndValidateBackupJson(rawText: string): {
  ok: boolean;
  data?: WorkspaceBackupPayload;
  error?: string;
} {
  try {
    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: 'Tệp sao lưu JSON không đúng định dạng.' };
    }

    if (
      !Array.isArray(parsed.members) ||
      !Array.isArray(parsed.tasks) ||
      !Array.isArray(parsed.overtimeEntries)
    ) {
      return {
        ok: false,
        error:
          'Tệp JSON thiếu dữ liệu bắt buộc (members, tasks, overtimeEntries).',
      };
    }

    const validMembers = parsed.members
      .filter((m): m is TeamMember => {
        if (!m || typeof m !== 'object') return false;
        const item = m as Record<string, unknown>;
        return (
          typeof item.id === 'string' &&
          typeof item.name === 'string' &&
          item.name.trim().length > 0 &&
          typeof item.role === 'string'
        );
      })
      .slice(0, MAX_TEAM_MEMBERS);

    if (validMembers.length === 0) {
      return {
        ok: false,
        error: 'Danh sách thành viên trong tệp sao lưu không hợp lệ hoặc trống.',
      };
    }

    const validTasks: WorkTask[] = [];
    for (const rawTask of parsed.tasks) {
      if (!rawTask || typeof rawTask !== 'object') continue;
      const t = rawTask as Record<string, unknown>;
      if (
        typeof t.id !== 'string' ||
        typeof t.createdAt !== 'string' ||
        typeof t.mainContent !== 'string' ||
        typeof t.detailContent !== 'string' ||
        typeof t.targetDate !== 'string' ||
        typeof t.assigneeId !== 'string' ||
        !TASK_STATUSES.includes(t.status as TaskStatus) ||
        !Array.isArray(t.attachments) ||
        typeof t.notes !== 'string'
      ) {
        continue;
      }
      const status = t.status as TaskStatus;
      const progress =
        typeof t.progress === 'number' && Number.isFinite(t.progress)
          ? clampProgress(t.progress)
          : status === 'Hoàn thành'
          ? 100
          : 0;
      validTasks.push({
        id: t.id,
        createdAt: t.createdAt,
        mainContent: t.mainContent,
        detailContent: t.detailContent,
        targetDate: t.targetDate,
        assigneeId: t.assigneeId,
        status,
        progress,
        attachments: t.attachments,
        notes: t.notes,
      });
    }

    const validOvertime = parsed.overtimeEntries
      .map(normalizeStoredOvertime)
      .filter((item): item is OvertimeEntry => item !== null);

    const validMaterials = Array.isArray(parsed.materials)
      ? parsed.materials
          .map(normalizeStoredMaterial)
          .filter((item): item is MaterialItem => item !== null)
      : undefined;

    const validIncidents = Array.isArray(parsed.incidents)
      ? parsed.incidents
          .map(normalizeStoredIncident)
          .filter((item): item is IncidentEntry => item !== null)
      : undefined;

    return {
      ok: true,
      data: {
        version: typeof parsed.version === 'number' ? parsed.version : 1,
        exportedAt:
          typeof parsed.exportedAt === 'string'
            ? parsed.exportedAt
            : getTodayIsoDate(),
        members: validMembers,
        tasks: validTasks,
        overtimeEntries: validOvertime,
        ...(validMaterials ? { materials: validMaterials } : {}),
        ...(validIncidents ? { incidents: validIncidents } : {}),
      },
    };
  } catch {
    return {
      ok: false,
      error: 'Không thể đọc tệp JSON. Vui lòng kiểm tra lại định dạng tệp.',
    };
  }
}

export function triggerTextDownload(
  filename: string,
  content: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
