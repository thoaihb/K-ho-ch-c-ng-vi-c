import {
  AuditAction,
  AuditFilter,
  AuditLogEntry,
  AuditTargetType,
  TeamMember,
} from '../types/workplan';
import { escapeCsvCell } from './overtime';
import { StorageLike } from './workplan';

export const AUDIT_LOGS_STORAGE_KEY = 'automation_team_audit_logs_v1';
export const AUDIT_STORAGE_KEY = AUDIT_LOGS_STORAGE_KEY;

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  create: 'Thêm mới',
  update: 'Chỉnh sửa',
  delete: 'Xóa',
  status_change: 'Đổi trạng thái',
  progress_change: 'Cập nhật tiến độ',
  progress_update: 'Cập nhật tiến độ',
  assign: 'Phân công',
  permission_change: 'Đổi phân quyền',
  login: 'Đăng nhập',
  export: 'Đẩy dữ liệu / Xuất',
  import: 'Nhập dữ liệu',
};

export const AUDIT_TARGET_LABELS: Record<AuditTargetType, string> = {
  machine: 'Máy / Dự án',
  task: 'Kế hoạch công việc',
  material: 'Vật tư & Linh kiện',
  incident: 'Nhật ký sự cố',
  overtime: 'Báo giờ tăng ca',
  member: 'Tài khoản & Phân quyền',
  system: 'Hệ thống',
};

export function createAuditId(): string {
  return `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function formatAuditDateTime(date: Date = new Date()): {
  iso: string;
  formatted: string;
} {
  const pad = (n: number) => String(n).padStart(2, '0');
  const d = pad(date.getDate());
  const m = pad(date.getMonth() + 1);
  const y = date.getFullYear();
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return {
    iso: date.toISOString(),
    formatted: `${d}/${m}/${y} ${hh}:${mm}:${ss}`,
  };
}

export function createAuditEntry(
  userOrParams:
    | {
        user?: Pick<TeamMember, 'id' | 'name' | 'username'> | null;
        action: AuditAction;
        targetType: AuditTargetType;
        targetId: string;
        targetName: string;
        details: string;
        machineCode?: string;
        machineName?: string;
        customDate?: Date;
      }
    | (Pick<TeamMember, 'id' | 'name' | 'username'> | null | undefined),
  action?: AuditAction,
  targetType?: AuditTargetType,
  targetId?: string,
  targetName?: string,
  details?: string,
  machineCode?: string,
  machineName?: string,
  customDate?: Date
): AuditLogEntry {
  let user: Pick<TeamMember, 'id' | 'name' | 'username'> | null | undefined;
  let act: AuditAction;
  let tType: AuditTargetType;
  let tId: string;
  let tName: string;
  let dtl: string;
  let mCode: string | undefined;
  let mName: string | undefined;
  let dtVal: Date | undefined;

  if (userOrParams && typeof userOrParams === 'object' && 'action' in userOrParams) {
    user = userOrParams.user;
    act = userOrParams.action;
    tType = userOrParams.targetType;
    tId = userOrParams.targetId;
    tName = userOrParams.targetName;
    dtl = userOrParams.details;
    mCode = userOrParams.machineCode;
    mName = userOrParams.machineName;
    dtVal = userOrParams.customDate;
  } else {
    user = userOrParams as Pick<TeamMember, 'id' | 'name' | 'username'> | null | undefined;
    act = action!;
    tType = targetType!;
    tId = targetId!;
    tName = targetName!;
    dtl = details!;
    mCode = machineCode;
    mName = machineName;
    dtVal = customDate;
  }

  const dt = formatAuditDateTime(dtVal);
  const resolvedUser = user ?? {
    id: 'system',
    name: 'Hệ thống',
    username: 'system',
  };

  return {
    id: createAuditId(),
    timestamp: dt.iso,
    formattedTime: dt.formatted,
    userId: resolvedUser.id,
    userName: resolvedUser.name,
    userUsername: resolvedUser.username,
    action: act,
    targetType: tType,
    targetId: tId,
    targetName: tName,
    machineCode: mCode,
    machineName: mName,
    details: dtl,
  };
}

export const DEFAULT_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'aud-seed-1',
    timestamp: '2026-11-20T08:30:15.000Z',
    formattedTime: '20/11/2026 08:30:15',
    userId: 'mem-1',
    userName: 'Nguyễn Minh Tuấn',
    userUsername: 'admin',
    action: 'status_change',
    targetType: 'task',
    targetId: 'task-1',
    targetName: 'Lập trình PLC S7-1500 trạm cấp phôi tự động',
    machineCode: 'MAY-01',
    machineName: 'Lập trình PLC S7-1500 trạm cấp phôi tự động',
    details: 'Đổi trạng thái từ "Đang thực hiện" -> "Hoàn thành" (Tiến độ: 65% -> 100%)',
  },
  {
    id: 'aud-seed-2',
    timestamp: '2026-11-19T14:15:22.000Z',
    formattedTime: '19/11/2026 14:15:22',
    userId: 'mem-2',
    userName: 'Trần Thị Thu Hà',
    userUsername: 'ha.tran',
    action: 'progress_change',
    targetType: 'task',
    targetId: 'task-3',
    targetName: 'Hiệu chuẩn camera thị giác máy kiểm tra lỗi nhãn',
    machineCode: 'MAY-03',
    machineName: 'Hiệu chuẩn camera thị giác máy kiểm tra lỗi nhãn',
    details: 'Cập nhật tiến độ từ 30% -> 45%',
  },
  {
    id: 'aud-seed-3',
    timestamp: '2026-11-18T09:45:00.000Z',
    formattedTime: '18/11/2026 09:45:00',
    userId: 'mem-1',
    userName: 'Nguyễn Minh Tuấn',
    userUsername: 'admin',
    action: 'create',
    targetType: 'machine',
    targetId: 'mac-seed-1',
    targetName: 'Lập trình PLC S7-1500 trạm cấp phôi tự động',
    machineCode: 'MAY-01',
    machineName: 'Lập trình PLC S7-1500 trạm cấp phôi tự động',
    details: 'Tạo mới máy: MAY-01 - Lập trình PLC S7-1500 trạm cấp phôi tự động (Bắt đầu: 08/11/2026)',
  },
  {
    id: 'aud-seed-4',
    timestamp: '2026-11-17T16:20:10.000Z',
    formattedTime: '17/11/2026 16:20:10',
    userId: 'mem-3',
    userName: 'Lê Hoàng Nam',
    userUsername: 'nam.le',
    action: 'assign',
    targetType: 'task',
    targetId: 'task-3',
    targetName: 'Hiệu chuẩn camera thị giác máy kiểm tra lỗi nhãn',
    machineCode: 'MAY-03',
    machineName: 'Hiệu chuẩn camera thị giác máy kiểm tra lỗi nhãn',
    details: 'Phân công thêm người thực hiện: Lê Hoàng Nam, Trần Thị Thu Hà',
  },
];

export function normalizeStoredAuditLog(item: unknown): AuditLogEntry | null {
  if (!item || typeof item !== 'object') return null;
  const c = item as Record<string, unknown>;
  if (
    typeof c.id !== 'string' ||
    typeof c.timestamp !== 'string' ||
    typeof c.userId !== 'string' ||
    typeof c.userName !== 'string' ||
    typeof c.details !== 'string'
  ) {
    return null;
  }

  const action = (c.action as AuditAction) || 'update';
  const targetType = (c.targetType as AuditTargetType) || 'system';

  return {
    id: c.id,
    timestamp: c.timestamp,
    formattedTime:
      typeof c.formattedTime === 'string'
        ? c.formattedTime
        : formatAuditDateTime(new Date(c.timestamp)).formatted,
    userId: c.userId,
    userName: c.userName,
    userUsername: typeof c.userUsername === 'string' ? c.userUsername : 'user',
    action,
    targetType,
    targetId: typeof c.targetId === 'string' ? c.targetId : '',
    targetName: typeof c.targetName === 'string' ? c.targetName : '',
    machineCode: typeof c.machineCode === 'string' ? c.machineCode : undefined,
    machineName: typeof c.machineName === 'string' ? c.machineName : undefined,
    details: c.details,
  };
}

export function loadAuditLogsFromStorage(storage: StorageLike): AuditLogEntry[] {
  try {
    const raw = storage.getItem(AUDIT_LOGS_STORAGE_KEY);
    if (!raw) return DEFAULT_AUDIT_LOGS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_AUDIT_LOGS;
    const valid = parsed
      .map(normalizeStoredAuditLog)
      .filter((l): l is AuditLogEntry => l !== null);
    return valid.length > 0 ? valid : DEFAULT_AUDIT_LOGS;
  } catch {
    return DEFAULT_AUDIT_LOGS;
  }
}

export function saveAuditLogsToStorage(
  storage: StorageLike,
  logs: AuditLogEntry[]
): void {
  try {
    // Keep up to 500 recent logs to prevent local storage quota overflow
    storage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(logs.slice(0, 500)));
  } catch {
    // Ignore quota issues gracefully
  }
}

export function filterAuditLogs(
  logs: AuditLogEntry[],
  filter: AuditFilter
): AuditLogEntry[] {
  const query = filter.search.trim().toLowerCase();

  return logs.filter((log) => {
    if (filter.userId !== 'all' && log.userId !== filter.userId) {
      return false;
    }
    if (filter.targetType !== 'all' && log.targetType !== filter.targetType) {
      return false;
    }
    if (filter.action !== 'all' && log.action !== filter.action) {
      return false;
    }
    if (filter.machineId && filter.machineId !== 'all') {
      const matchMac =
        log.machineCode === filter.machineId ||
        log.machineName === filter.machineId ||
        log.targetId === filter.machineId;
      if (!matchMac) return false;
    }
    if (filter.startDate) {
      const logDay = log.timestamp.slice(0, 10);
      if (logDay < filter.startDate) return false;
    }
    if (filter.endDate) {
      const logDay = log.timestamp.slice(0, 10);
      if (logDay > filter.endDate) return false;
    }
    if (query) {
      const haystack = [
        log.userName,
        log.userUsername,
        log.targetName,
        log.details,
        log.machineCode ?? '',
        log.machineName ?? '',
        AUDIT_ACTION_LABELS[log.action] ?? '',
        AUDIT_TARGET_LABELS[log.targetType] ?? '',
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function buildAuditCsv(logs: AuditLogEntry[]): string {
  const headers = [
    'STT',
    'Thời gian thực hiện',
    'Người thực hiện',
    'Tài khoản (Username)',
    'Đối tượng',
    'Tên đối tượng',
    'Mã máy / Dự án',
    'Hành động',
    'Nội dung thay đổi chi tiết',
  ];

  const rows = logs.map((log, idx) => [
    idx + 1,
    log.formattedTime,
    log.userName,
    log.userUsername,
    AUDIT_TARGET_LABELS[log.targetType] ?? log.targetType,
    log.targetName,
    log.machineCode ?? '',
    AUDIT_ACTION_LABELS[log.action] ?? log.action,
    log.details,
  ]);

  const lines = [headers, ...rows].map((row) =>
    row.map(escapeCsvCell).join(',')
  );
  return `\uFEFF${lines.join('\r\n')}`;
}
