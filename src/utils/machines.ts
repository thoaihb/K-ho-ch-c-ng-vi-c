import {
  IncidentEntry,
  MACHINE_STATUSES,
  MachineFilter,
  MachineProject,
  MachineStatus,
  MachineSummaryStats,
  MaterialItem,
  WorkTask,
} from '../types/workplan';
import { escapeCsvCell } from './overtime';
import {
  StorageLike,
  clampProgress,
  formatDateVi,
  getTodayIsoDate,
} from './workplan';

export const MACHINES_STORAGE_KEY = 'automation_team_machines_v1';

export function createMachineId(): string {
  return `mac-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function normalizeMachineName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function generateNextMachineCode(
  existing: Pick<MachineProject, 'code'>[]
): string {
  const used = new Set(existing.map((m) => m.code.trim().toUpperCase()));
  let idx = existing.length + 1;
  while (used.has(`MAY-${String(idx).padStart(2, '0')}`)) {
    idx += 1;
  }
  return `MAY-${String(idx).padStart(2, '0')}`;
}

export function extractMachinesFromTasks(
  tasks: WorkTask[],
  nowIso: string = getTodayIsoDate()
): MachineProject[] {
  const groups = new Map<
    string,
    {
      name: string;
      tasks: WorkTask[];
    }
  >();

  for (const task of tasks) {
    const rawName = task.mainContent.trim();
    if (!rawName) continue;
    const key = normalizeMachineName(rawName);
    const existing = groups.get(key);
    if (existing) {
      existing.tasks.push(task);
    } else {
      groups.set(key, { name: rawName, tasks: [task] });
    }
  }

  const extracted: MachineProject[] = [];
  let seq = 1;

  for (const group of groups.values()) {
    const code = `MAY-${String(seq).padStart(2, '0')}`;
    const earliestDate =
      group.tasks
        .map((t) => t.createdAt)
        .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
        .sort()[0] ?? nowIso;

    const allCompleted = group.tasks.every((t) => t.status === 'Hoàn thành');
    const allPaused = group.tasks.every((t) => t.status === 'Tạm dừng');
    const status: MachineStatus = allCompleted
      ? 'Đã bàn giao'
      : allPaused
      ? 'Tạm dừng'
      : 'Đang triển khai';

    const firstDetail =
      group.tasks.find((t) => t.detailContent.trim())?.detailContent.trim() ??
      '';

    const existingId = group.tasks.find((t) => t.machineId)?.machineId;

    extracted.push({
      id: existingId || `mac-seed-${seq}`,
      code,
      name: group.name,
      description: firstDetail,
      startDate: earliestDate,
      status,
      updatedAt: nowIso,
    });
    seq += 1;
  }

  return extracted;
}

export function normalizeStoredMachine(item: unknown): MachineProject | null {
  if (!item || typeof item !== 'object') return null;
  const c = item as Record<string, unknown>;
  if (
    typeof c.id !== 'string' ||
    typeof c.name !== 'string' ||
    !c.name.trim() ||
    !MACHINE_STATUSES.includes(c.status as MachineStatus)
  ) {
    return null;
  }

  return {
    id: c.id,
    code:
      typeof c.code === 'string' && c.code.trim()
        ? c.code.trim().toUpperCase()
        : 'MAY-00',
    name: c.name.trim(),
    description: typeof c.description === 'string' ? c.description : '',
    startDate:
      typeof c.startDate === 'string' && c.startDate
        ? c.startDate
        : getTodayIsoDate(),
    status: c.status as MachineStatus,
    updatedAt:
      typeof c.updatedAt === 'string' && c.updatedAt
        ? c.updatedAt
        : getTodayIsoDate(),
  };
}

export function loadMachinesFromStorage(
  storage: StorageLike,
  tasks: WorkTask[]
): MachineProject[] {
  try {
    const raw = storage.getItem(MACHINES_STORAGE_KEY);
    if (!raw) {
      return extractMachinesFromTasks(tasks);
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return extractMachinesFromTasks(tasks);
    }
    return parsed
      .map(normalizeStoredMachine)
      .filter((item): item is MachineProject => item !== null);
  } catch {
    return extractMachinesFromTasks(tasks);
  }
}

export function findMachineForRecord(
  machines: MachineProject[],
  machineId?: string,
  fallbackName?: string
): MachineProject | undefined {
  if (machineId) {
    const byId = machines.find((m) => m.id === machineId);
    if (byId) return byId;
  }
  if (fallbackName && fallbackName.trim()) {
    const norm = normalizeMachineName(fallbackName);
    return machines.find((m) => normalizeMachineName(m.name) === norm);
  }
  return undefined;
}

export function isRecordLinkedToMachine(
  machine: MachineProject,
  recordMachineId?: string,
  recordFallbackName?: string
): boolean {
  if (recordMachineId) {
    return recordMachineId === machine.id;
  }
  if (recordFallbackName && recordFallbackName.trim()) {
    return (
      normalizeMachineName(recordFallbackName) ===
      normalizeMachineName(machine.name)
    );
  }
  return false;
}

export function matchesMachineFilter(
  filterMachineId: string,
  machines: MachineProject[],
  recordMachineId?: string,
  recordFallbackName?: string
): boolean {
  if (!filterMachineId || filterMachineId === 'all') {
    return true;
  }
  if (filterMachineId.startsWith('name:')) {
    const targetName = filterMachineId.slice(5);
    return (
      normalizeMachineName(recordFallbackName ?? '') ===
      normalizeMachineName(targetName)
    );
  }
  const machine = machines.find((m) => m.id === filterMachineId);
  if (!machine) {
    return recordMachineId === filterMachineId;
  }
  return isRecordLinkedToMachine(machine, recordMachineId, recordFallbackName);
}

export function filterMachines(
  machines: MachineProject[],
  filter: MachineFilter
): MachineProject[] {
  const query = filter.search.trim().toLowerCase();
  return machines.filter((machine) => {
    if (filter.status !== 'all' && machine.status !== filter.status) {
      return false;
    }
    if (query) {
      const haystack = [
        machine.code,
        machine.name,
        machine.description,
        machine.status,
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

export function computeMachineStats(
  machines: MachineProject[]
): MachineSummaryStats {
  let inProgress = 0;
  let testing = 0;
  let delivered = 0;
  let paused = 0;

  for (const m of machines) {
    if (m.status === 'Đang triển khai') inProgress += 1;
    else if (m.status === 'Chạy thử FAT/SAT') testing += 1;
    else if (m.status === 'Đã bàn giao') delivered += 1;
    else if (m.status === 'Tạm dừng') paused += 1;
  }

  return {
    total: machines.length,
    inProgress,
    testing,
    delivered,
    paused,
  };
}

export interface MachineProfileData {
  machine: MachineProject;
  tasks: WorkTask[];
  averageProgress: number;
  completedTasks: number;
  materials: MaterialItem[];
  materialToOrder: number;
  materialOrdered: number;
  materialInStock: number;
  incidents: IncidentEntry[];
  openIncidents: number;
  resolvedIncidents: number;
}

export function computeMachineProfile(
  machine: MachineProject,
  allTasks: WorkTask[],
  allMaterials: MaterialItem[],
  allIncidents: IncidentEntry[]
): MachineProfileData {
  const tasks = allTasks.filter((t) =>
    isRecordLinkedToMachine(machine, t.machineId, t.mainContent)
  );
  const completedTasks = tasks.filter((t) => t.status === 'Hoàn thành').length;
  const averageProgress =
    tasks.length > 0
      ? Math.round(
          tasks.reduce((sum, t) => sum + clampProgress(t.progress), 0) /
            tasks.length
        )
      : 0;

  const materials = allMaterials.filter((m) =>
    isRecordLinkedToMachine(machine, m.machineId, m.projectName)
  );
  const materialToOrder = materials.filter((m) => m.status === 'Cần đặt').length;
  const materialOrdered = materials.filter((m) => m.status === 'Đã đặt').length;
  const materialInStock = materials.filter(
    (m) => m.status === 'Đã về kho'
  ).length;

  const incidents = allIncidents.filter((inc) =>
    isRecordLinkedToMachine(machine, inc.machineId, inc.machineName)
  );
  const resolvedIncidents = incidents.filter(
    (inc) => inc.status === 'Đã khắc phục'
  ).length;
  const openIncidents = incidents.length - resolvedIncidents;

  return {
    machine,
    tasks,
    averageProgress,
    completedTasks,
    materials,
    materialToOrder,
    materialOrdered,
    materialInStock,
    incidents,
    openIncidents,
    resolvedIncidents,
  };
}

export function buildMachinesCsv(
  machines: MachineProject[],
  tasks: WorkTask[],
  materials: MaterialItem[],
  incidents: IncidentEntry[]
): string {
  const headers = [
    'STT',
    'Mã máy',
    'Tên máy / Dự án',
    'Ngày bắt đầu',
    'Trạng thái chung',
    'Tiến độ TB (%)',
    'Số đầu việc',
    'Số vật tư BOM',
    'Số sự cố',
    'Mô tả tổng quan',
  ];

  const rows = machines.map((machine, idx) => {
    const profile = computeMachineProfile(machine, tasks, materials, incidents);
    return [
      idx + 1,
      machine.code,
      machine.name,
      formatDateVi(machine.startDate),
      machine.status,
      `${profile.averageProgress}%`,
      profile.tasks.length,
      profile.materials.length,
      profile.incidents.length,
      machine.description,
    ];
  });

  const lines = [headers, ...rows].map((row) =>
    row.map(escapeCsvCell).join(',')
  );
  return `\uFEFF${lines.join('\r\n')}`;
}
