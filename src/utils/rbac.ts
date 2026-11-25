import {
  ModuleKey,
  PermissionAction,
  TeamMember,
  UserPermissions,
  WorkTask,
} from '../types/workplan';

export const ACTIVE_USER_STORAGE_KEY = 'automation_team_current_user_id_v1';

export const MODULE_KEYS: readonly ModuleKey[] = [
  'machines',
  'workplan',
  'overtime',
  'materials',
  'incidents',
  'audit',
  'drive',
  'summary',
] as const;

export const MODULE_NAMES: Record<ModuleKey, string> = {
  machines: 'Danh mục Máy / Dự án',
  workplan: 'Kế hoạch công việc',
  overtime: 'Báo giờ tăng ca',
  materials: 'Vật tư & Linh kiện',
  incidents: 'Nhật ký sự cố & Xử lý',
  audit: 'Lịch sử thay đổi',
  drive: 'Google Drive',
  summary: 'Tổng hợp & Xuất dữ liệu',
};

export const ACTION_NAMES: Record<PermissionAction, string> = {
  view: 'Xem',
  add: 'Thêm',
  edit: 'Sửa',
  delete: 'Xóa',
};

const AVATAR_COLORS = [
  '#2563EB', // Blue
  '#0D9488', // Teal
  '#D97706', // Amber
  '#7C3AED', // Purple
  '#DB2777', // Pink
  '#059669', // Emerald
  '#EA580C', // Orange
  '#4F46E5', // Indigo
];

export function getDefaultAdminPermissions(): UserPermissions {
  const perms: Partial<UserPermissions> = {};
  for (const mod of MODULE_KEYS) {
    perms[mod] = { view: true, add: true, edit: true, delete: true };
  }
  return perms as UserPermissions;
}

export function getDefaultMemberPermissions(): UserPermissions {
  return {
    machines: { view: true, add: false, edit: false, delete: false },
    workplan: { view: true, add: true, edit: true, delete: false },
    overtime: { view: true, add: true, edit: true, delete: false },
    materials: { view: true, add: true, edit: false, delete: false },
    incidents: { view: true, add: true, edit: true, delete: false },
    audit: { view: true, add: false, edit: false, delete: false },
    drive: { view: true, add: false, edit: false, delete: false },
    summary: { view: true, add: false, edit: false, delete: false },
  };
}

export function hasPermission(
  member: TeamMember | null | undefined,
  module: ModuleKey,
  action: PermissionAction
): boolean {
  if (!member) return false;
  if (member.isLocked) return false;
  if (member.isAdmin) return true;

  const modulePerm = member.permissions?.[module];
  if (!modulePerm) {
    // Fall back to default member permissions
    return getDefaultMemberPermissions()[module]?.[action] ?? false;
  }
  return Boolean(modulePerm[action]);
}

export function getTaskAssigneeIds(task: WorkTask): string[] {
  if (Array.isArray(task.assigneeIds) && task.assigneeIds.length > 0) {
    return task.assigneeIds;
  }
  if (task.assigneeId && task.assigneeId.trim()) {
    return [task.assigneeId.trim()];
  }
  return [];
}

export function getTaskAssignees(
  task: WorkTask,
  members: TeamMember[]
): TeamMember[] {
  const ids = new Set(getTaskAssigneeIds(task));
  return members.filter((m) => ids.has(m.id));
}

export function canEditTask(
  member: TeamMember | null | undefined,
  task: WorkTask
): boolean {
  if (!member || member.isLocked) return false;
  if (member.isAdmin) return true;
  if (!hasPermission(member, 'workplan', 'edit')) return false;

  const assignedIds = getTaskAssigneeIds(task);
  // If no assignee is designated yet, any member with edit permission can edit/assign
  if (assignedIds.length === 0) return true;
  return assignedIds.includes(member.id);
}

export function canChangeTaskStatusOrProgress(
  member: TeamMember | null | undefined,
  task: WorkTask
): boolean {
  return canEditTask(member, task);
}

export function canDeleteTask(
  member: TeamMember | null | undefined,
  task: WorkTask
): boolean {
  if (!member || member.isLocked) return false;
  if (member.isAdmin) return true;
  if (!hasPermission(member, 'workplan', 'delete')) return false;

  const assignedIds = getTaskAssigneeIds(task);
  if (assignedIds.length === 0) return true;
  return assignedIds.includes(member.id);
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function slugifyUsername(name: string, fallbackId: string): string {
  const clean = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '');
  return clean || `user.${fallbackId.slice(-4)}`;
}

export function normalizeTeamMember(
  raw: unknown,
  fallbackIndex = 0
): TeamMember | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  if (typeof c.id !== 'string' || typeof c.name !== 'string' || !c.name.trim()) {
    return null;
  }

  const name = c.name.trim();
  const id = c.id.trim();
  const role = typeof c.role === 'string' && c.role.trim() ? c.role.trim() : 'Kỹ sư Tự động hóa';
  const isAdmin =
    typeof c.isAdmin === 'boolean'
      ? c.isAdmin
      : id === 'mem-1' || fallbackIndex === 0;
  const isLocked = Boolean(c.isLocked);
  const username =
    typeof c.username === 'string' && c.username.trim()
      ? c.username.trim()
      : isAdmin
      ? 'admin'
      : slugifyUsername(name, id);
  const password =
    typeof c.password === 'string' && c.password.trim() ? c.password : '123';
  const email =
    typeof c.email === 'string' && c.email.trim()
      ? c.email.trim()
      : `${username}@automation.vn`;
  const avatarColor =
    typeof c.avatarColor === 'string' && c.avatarColor
      ? c.avatarColor
      : AVATAR_COLORS[fallbackIndex % AVATAR_COLORS.length];

  let permissions: Partial<UserPermissions>;
  if (isAdmin) {
    permissions = getDefaultAdminPermissions();
  } else if (c.permissions && typeof c.permissions === 'object') {
    permissions = c.permissions as Partial<UserPermissions>;
  } else {
    permissions = getDefaultMemberPermissions();
  }

  return {
    id,
    name,
    role,
    username,
    password,
    email,
    isAdmin,
    isLocked,
    avatarColor,
    permissions,
  };
}
