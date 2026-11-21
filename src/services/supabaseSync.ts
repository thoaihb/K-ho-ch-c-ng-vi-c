import {
  AttachmentItem,
  INCIDENT_STATUSES,
  IncidentEntry,
  IncidentStatus,
  MACHINE_STATUSES,
  MATERIAL_STATUSES,
  MachineProject,
  MachineStatus,
  MaterialItem,
  MaterialStatus,
  OVERTIME_DAY_TYPES,
  OvertimeDayType,
  OvertimeEntry,
  TASK_STATUSES,
  TaskStatus,
  TeamMember,
  WorkTask,
} from '../types/workplan';
import { clampProgress, getTodayIsoDate } from '../utils/workplan';
import { formatSupabaseError, getSupabaseClient } from './supabaseClient';

export interface WorkspaceSnapshot {
  members: TeamMember[];
  machines: MachineProject[];
  tasks: WorkTask[];
  overtimeEntries: OvertimeEntry[];
  materials: MaterialItem[];
  incidents: IncidentEntry[];
}

export interface SupabaseFetchResult {
  isEmpty: boolean;
  data: WorkspaceSnapshot;
}

export interface TeamMemberRow {
  id: string;
  name: string;
  role: string;
}

export interface MachineRow {
  id: string;
  code: string;
  name: string;
  description: string;
  start_date: string;
  status: string;
  updated_at?: string;
}

export interface WorkTaskRow {
  id: string;
  created_date: string;
  machine_id: string | null;
  main_content: string;
  detail_content: string;
  target_date: string;
  assignee_id: string | null;
  status: string;
  progress: number;
  notes: string;
}

export interface OvertimeRow {
  id: string;
  overtime_date: string;
  member_id: string;
  hours: number | string;
  day_type: string;
  content: string;
  notes: string;
  created_at?: string;
}

export interface MaterialRow {
  id: string;
  name: string;
  spec_code: string;
  quantity: number | string;
  unit: string;
  machine_id: string | null;
  project_name: string;
  status: string;
  notes: string;
  updated_at?: string;
}

export interface IncidentRow {
  id: string;
  occurred_at: string;
  repair_time: string;
  machine_id: string | null;
  machine_name: string;
  description: string;
  resolution: string;
  assignee_id: string | null;
  status: string;
}

export interface AttachmentRow {
  id: string;
  task_id: string | null;
  incident_id: string | null;
  name: string;
  size_bytes: number | string;
  mime_type: string;
  external_url: string | null;
  data_url: string | null;
  added_at: string;
}

function toIsoDateOnly(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  return fallback;
}

export function sanitizeSafeExternalUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return undefined;
}

export function sanitizeSafeDataUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (/^data:[a-z0-9.+-]+\/[a-z0-9.+-]+/i.test(trimmed)) {
    return trimmed;
  }
  return undefined;
}

export function mapMemberFromRow(row: TeamMemberRow): TeamMember {
  return {
    id: row.id,
    name: row.name,
    role: row.role || 'Kỹ sư Tự động hóa',
  };
}

export function mapMemberToRow(member: TeamMember): TeamMemberRow {
  return {
    id: member.id,
    name: member.name.trim(),
    role: member.role.trim() || 'Kỹ sư Tự động hóa',
  };
}

export function mapMachineFromRow(row: MachineRow): MachineProject {
  const today = getTodayIsoDate();
  const status = MACHINE_STATUSES.includes(row.status as MachineStatus)
    ? (row.status as MachineStatus)
    : 'Đang triển khai';
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? '',
    startDate: toIsoDateOnly(row.start_date, today),
    status,
    updatedAt: toIsoDateOnly(row.updated_at, today),
  };
}

export function mapMachineToRow(
  machine: MachineProject
): Omit<MachineRow, 'updated_at'> {
  return {
    id: machine.id,
    code: machine.code.trim(),
    name: machine.name.trim(),
    description: machine.description ?? '',
    start_date: toIsoDateOnly(machine.startDate, getTodayIsoDate()),
    status: machine.status,
  };
}

export function mapAttachmentFromRow(row: AttachmentRow): AttachmentItem {
  const externalUrl = sanitizeSafeExternalUrl(row.external_url);
  const dataUrl = sanitizeSafeDataUrl(row.data_url);
  return {
    id: row.id,
    name: row.name,
    size: Number(row.size_bytes) || 0,
    mimeType: row.mime_type || 'application/octet-stream',
    ...(externalUrl ? { externalUrl } : {}),
    ...(dataUrl ? { dataUrl } : {}),
    addedAt: toIsoDateOnly(row.added_at, getTodayIsoDate()),
  };
}

export function mapAttachmentToRow(
  att: AttachmentItem,
  parent: { taskId?: string; incidentId?: string }
): AttachmentRow {
  const today = getTodayIsoDate();
  return {
    id: att.id,
    task_id: parent.taskId ?? null,
    incident_id: parent.incidentId ?? null,
    name: att.name.trim() || 'file',
    size_bytes: Math.max(0, Math.round(Number(att.size) || 0)),
    mime_type: att.mimeType || 'application/octet-stream',
    external_url: sanitizeSafeExternalUrl(att.externalUrl) ?? null,
    data_url: sanitizeSafeDataUrl(att.dataUrl) ?? null,
    added_at: toIsoDateOnly(att.addedAt, today),
  };
}

export function mapTaskFromRow(
  row: WorkTaskRow,
  attachments: AttachmentItem[]
): WorkTask {
  const today = getTodayIsoDate();
  const status = TASK_STATUSES.includes(row.status as TaskStatus)
    ? (row.status as TaskStatus)
    : 'Đang thực hiện';
  return {
    id: row.id,
    createdAt: toIsoDateOnly(row.created_date, today),
    ...(row.machine_id ? { machineId: row.machine_id } : {}),
    mainContent: row.main_content,
    detailContent: row.detail_content ?? '',
    targetDate: toIsoDateOnly(row.target_date, today),
    assigneeId: row.assignee_id ?? '',
    status,
    progress: clampProgress(Number(row.progress) || 0),
    attachments,
    notes: row.notes ?? '',
  };
}

export function mapTaskToRow(
  task: WorkTask,
  validMachineIds?: Set<string>,
  validMemberIds?: Set<string>
): WorkTaskRow {
  const today = getTodayIsoDate();
  const machineId =
    task.machineId &&
    (!validMachineIds || validMachineIds.has(task.machineId))
      ? task.machineId
      : null;
  const assigneeId =
    task.assigneeId &&
    (!validMemberIds || validMemberIds.has(task.assigneeId))
      ? task.assigneeId
      : null;

  return {
    id: task.id,
    created_date: toIsoDateOnly(task.createdAt, today),
    machine_id: machineId,
    main_content: task.mainContent.trim(),
    detail_content: task.detailContent ?? '',
    target_date: toIsoDateOnly(task.targetDate, today),
    assignee_id: assigneeId,
    status: task.status,
    progress: clampProgress(task.progress),
    notes: task.notes ?? '',
  };
}

export function mapOvertimeFromRow(row: OvertimeRow): OvertimeEntry {
  const today = getTodayIsoDate();
  const dayType = OVERTIME_DAY_TYPES.includes(row.day_type as OvertimeDayType)
    ? (row.day_type as OvertimeDayType)
    : 'Ngày thường';
  return {
    id: row.id,
    date: toIsoDateOnly(row.overtime_date, today),
    memberId: row.member_id,
    hours: Math.max(0.25, Math.round(Number(row.hours) * 100) / 100),
    dayType,
    content: row.content,
    notes: row.notes ?? '',
    createdAt: toIsoDateOnly(row.created_at, today),
  };
}

export function mapOvertimeToRow(entry: OvertimeEntry): Omit<OvertimeRow, 'created_at'> {
  const today = getTodayIsoDate();
  return {
    id: entry.id,
    overtime_date: toIsoDateOnly(entry.date, today),
    member_id: entry.memberId,
    hours: Math.max(0.25, Math.round(Number(entry.hours) * 100) / 100),
    day_type: entry.dayType,
    content: entry.content.trim(),
    notes: entry.notes ?? '',
  };
}

export function mapMaterialFromRow(row: MaterialRow): MaterialItem {
  const today = getTodayIsoDate();
  const status = MATERIAL_STATUSES.includes(row.status as MaterialStatus)
    ? (row.status as MaterialStatus)
    : 'Cần đặt';
  return {
    id: row.id,
    name: row.name,
    specCode: row.spec_code ?? '',
    quantity: Math.max(1, Math.round(Number(row.quantity) * 100) / 100),
    unit: row.unit || 'Cái',
    ...(row.machine_id ? { machineId: row.machine_id } : {}),
    projectName: row.project_name,
    status,
    notes: row.notes ?? '',
    updatedAt: toIsoDateOnly(row.updated_at, today),
  };
}

export function mapMaterialToRow(
  item: MaterialItem,
  validMachineIds?: Set<string>
): Omit<MaterialRow, 'updated_at'> {
  const machineId =
    item.machineId &&
    (!validMachineIds || validMachineIds.has(item.machineId))
      ? item.machineId
      : null;
  return {
    id: item.id,
    name: item.name.trim(),
    spec_code: item.specCode ?? '',
    quantity: Math.max(1, Math.round(Number(item.quantity) * 100) / 100),
    unit: item.unit.trim() || 'Cái',
    machine_id: machineId,
    project_name: item.projectName.trim(),
    status: item.status,
    notes: item.notes ?? '',
  };
}

export function mapIncidentFromRow(
  row: IncidentRow,
  attachments: AttachmentItem[]
): IncidentEntry {
  const today = getTodayIsoDate();
  const status = INCIDENT_STATUSES.includes(row.status as IncidentStatus)
    ? (row.status as IncidentStatus)
    : 'Đang xử lý';
  return {
    id: row.id,
    occurredAt: toIsoDateOnly(row.occurred_at, today),
    repairTime: row.repair_time ?? '',
    ...(row.machine_id ? { machineId: row.machine_id } : {}),
    machineName: row.machine_name,
    description: row.description,
    resolution: row.resolution ?? '',
    assigneeId: row.assignee_id ?? '',
    status,
    attachments,
  };
}

export function mapIncidentToRow(
  entry: IncidentEntry,
  validMachineIds?: Set<string>,
  validMemberIds?: Set<string>
): IncidentRow {
  const today = getTodayIsoDate();
  const machineId =
    entry.machineId &&
    (!validMachineIds || validMachineIds.has(entry.machineId))
      ? entry.machineId
      : null;
  const assigneeId =
    entry.assigneeId &&
    (!validMemberIds || validMemberIds.has(entry.assigneeId))
      ? entry.assigneeId
      : null;

  return {
    id: entry.id,
    occurred_at: toIsoDateOnly(entry.occurredAt, today),
    repair_time: entry.repairTime ?? '',
    machine_id: machineId,
    machine_name: entry.machineName.trim(),
    description: entry.description.trim(),
    resolution: entry.resolution ?? '',
    assignee_id: assigneeId,
    status: entry.status,
  };
}

export function assembleWorkspaceFromRows(rows: {
  members: TeamMemberRow[];
  machines: MachineRow[];
  tasks: WorkTaskRow[];
  overtimeEntries: OvertimeRow[];
  materials: MaterialRow[];
  incidents: IncidentRow[];
  attachments: AttachmentRow[];
}): SupabaseFetchResult {
  const taskAttMap = new Map<string, AttachmentItem[]>();
  const incAttMap = new Map<string, AttachmentItem[]>();

  for (const rawAtt of rows.attachments) {
    const item = mapAttachmentFromRow(rawAtt);
    if (rawAtt.task_id) {
      const list = taskAttMap.get(rawAtt.task_id) ?? [];
      list.push(item);
      taskAttMap.set(rawAtt.task_id, list);
    } else if (rawAtt.incident_id) {
      const list = incAttMap.get(rawAtt.incident_id) ?? [];
      list.push(item);
      incAttMap.set(rawAtt.incident_id, list);
    }
  }

  const members = rows.members.map(mapMemberFromRow);
  const machines = rows.machines.map(mapMachineFromRow);
  const tasks = rows.tasks.map((t) =>
    mapTaskFromRow(t, taskAttMap.get(t.id) ?? [])
  );
  const overtimeEntries = rows.overtimeEntries.map(mapOvertimeFromRow);
  const materials = rows.materials.map(mapMaterialFromRow);
  const incidents = rows.incidents.map((inc) =>
    mapIncidentFromRow(inc, incAttMap.get(inc.id) ?? [])
  );

  const isEmpty =
    members.length === 0 &&
    machines.length === 0 &&
    tasks.length === 0 &&
    overtimeEntries.length === 0 &&
    materials.length === 0 &&
    incidents.length === 0;

  return {
    isEmpty,
    data: {
      members,
      machines,
      tasks,
      overtimeEntries,
      materials,
      incidents,
    },
  };
}

export async function fetchWorkspaceFromSupabase(): Promise<SupabaseFetchResult | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const [
    membersRes,
    machinesRes,
    tasksRes,
    overtimeRes,
    materialsRes,
    incidentsRes,
    attachmentsRes,
  ] = await Promise.all([
    client.from('team_members').select('id, name, role').order('created_at', { ascending: true }),
    client
      .from('machines')
      .select('id, code, name, description, start_date, status, updated_at')
      .order('created_at', { ascending: false }),
    client
      .from('work_tasks')
      .select(
        'id, created_date, machine_id, main_content, detail_content, target_date, assignee_id, status, progress, notes'
      )
      .order('created_at', { ascending: false }),
    client
      .from('overtime_entries')
      .select('id, overtime_date, member_id, hours, day_type, content, notes, created_at')
      .order('overtime_date', { ascending: false }),
    client
      .from('materials')
      .select(
        'id, name, spec_code, quantity, unit, machine_id, project_name, status, notes, updated_at'
      )
      .order('created_at', { ascending: false }),
    client
      .from('incidents')
      .select(
        'id, occurred_at, repair_time, machine_id, machine_name, description, resolution, assignee_id, status'
      )
      .order('occurred_at', { ascending: false }),
    client
      .from('attachments')
      .select(
        'id, task_id, incident_id, name, size_bytes, mime_type, external_url, data_url, added_at'
      ),
  ]);

  const errors = [
    membersRes.error,
    machinesRes.error,
    tasksRes.error,
    overtimeRes.error,
    materialsRes.error,
    incidentsRes.error,
    attachmentsRes.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw new Error(
      formatSupabaseError(errors[0], 'Không thể tải dữ liệu từ Supabase')
    );
  }

  return assembleWorkspaceFromRows({
    members: (membersRes.data ?? []) as TeamMemberRow[],
    machines: (machinesRes.data ?? []) as MachineRow[],
    tasks: (tasksRes.data ?? []) as WorkTaskRow[],
    overtimeEntries: (overtimeRes.data ?? []) as OvertimeRow[],
    materials: (materialsRes.data ?? []) as MaterialRow[],
    incidents: (incidentsRes.data ?? []) as IncidentRow[],
    attachments: (attachmentsRes.data ?? []) as AttachmentRow[],
  });
}

export async function pushWorkspaceToSupabase(
  snapshot: WorkspaceSnapshot
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const validMemberIds = new Set(snapshot.members.map((m) => m.id));
  const validMachineIds = new Set(snapshot.machines.map((m) => m.id));

  if (snapshot.members.length > 0) {
    const { error } = await client
      .from('team_members')
      .upsert(snapshot.members.map(mapMemberToRow), { onConflict: 'id' });
    if (error) {
      throw new Error(formatSupabaseError(error, 'Lỗi đồng bộ thành viên nhóm'));
    }
  }

  if (snapshot.machines.length > 0) {
    const { error } = await client
      .from('machines')
      .upsert(snapshot.machines.map(mapMachineToRow), { onConflict: 'id' });
    if (error) {
      throw new Error(formatSupabaseError(error, 'Lỗi đồng bộ danh mục máy'));
    }
  }

  if (snapshot.tasks.length > 0) {
    const { error } = await client
      .from('work_tasks')
      .upsert(
        snapshot.tasks.map((t) =>
          mapTaskToRow(t, validMachineIds, validMemberIds)
        ),
        { onConflict: 'id' }
      );
    if (error) {
      throw new Error(formatSupabaseError(error, 'Lỗi đồng bộ kế hoạch công việc'));
    }
  }

  const validOvertime = snapshot.overtimeEntries.filter((e) =>
    validMemberIds.has(e.memberId)
  );
  if (validOvertime.length > 0) {
    const { error } = await client
      .from('overtime_entries')
      .upsert(validOvertime.map(mapOvertimeToRow), { onConflict: 'id' });
    if (error) {
      throw new Error(formatSupabaseError(error, 'Lỗi đồng bộ giờ tăng ca'));
    }
  }

  if (snapshot.materials.length > 0) {
    const { error } = await client
      .from('materials')
      .upsert(
        snapshot.materials.map((m) => mapMaterialToRow(m, validMachineIds)),
        { onConflict: 'id' }
      );
    if (error) {
      throw new Error(formatSupabaseError(error, 'Lỗi đồng bộ vật tư linh kiện'));
    }
  }

  if (snapshot.incidents.length > 0) {
    const { error } = await client
      .from('incidents')
      .upsert(
        snapshot.incidents.map((inc) =>
          mapIncidentToRow(inc, validMachineIds, validMemberIds)
        ),
        { onConflict: 'id' }
      );
    if (error) {
      throw new Error(formatSupabaseError(error, 'Lỗi đồng bộ nhật ký sự cố'));
    }
  }

  const attachmentRows: AttachmentRow[] = [
    ...snapshot.tasks.flatMap((t) =>
      t.attachments.map((att) => mapAttachmentToRow(att, { taskId: t.id }))
    ),
    ...snapshot.incidents.flatMap((inc) =>
      inc.attachments.map((att) =>
        mapAttachmentToRow(att, { incidentId: inc.id })
      )
    ),
  ];

  if (attachmentRows.length > 0) {
    const { error } = await client
      .from('attachments')
      .upsert(attachmentRows, { onConflict: 'id' });
    if (error) {
      throw new Error(formatSupabaseError(error, 'Lỗi đồng bộ file đính kèm'));
    }
  }
}

export async function syncSaveAllMembers(
  nextMembers: TeamMember[],
  previousMembers: TeamMember[]
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  if (nextMembers.length > 0) {
    const { error } = await client
      .from('team_members')
      .upsert(nextMembers.map(mapMemberToRow), { onConflict: 'id' });
    if (error) {
      throw new Error(formatSupabaseError(error, 'Lỗi lưu thành viên lên Supabase'));
    }
  }

  const nextIds = new Set(nextMembers.map((m) => m.id));
  const removedIds = previousMembers
    .map((m) => m.id)
    .filter((id) => !nextIds.has(id));

  if (removedIds.length > 0) {
    const { error } = await client
      .from('team_members')
      .delete()
      .in('id', removedIds);
    if (error) {
      throw new Error(formatSupabaseError(error, 'Lỗi xóa thành viên trên Supabase'));
    }
  }
}

export async function syncUpsertMachine(machine: MachineProject): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client
    .from('machines')
    .upsert(mapMachineToRow(machine), { onConflict: 'id' });
  if (error) {
    throw new Error(formatSupabaseError(error, 'Lỗi lưu máy/dự án lên Supabase'));
  }
}

export async function syncDeleteMachine(machineId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('machines').delete().eq('id', machineId);
  if (error) {
    throw new Error(formatSupabaseError(error, 'Lỗi xóa máy/dự án trên Supabase'));
  }
}

export async function syncUpsertTask(task: WorkTask): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  const { error: taskError } = await client
    .from('work_tasks')
    .upsert(mapTaskToRow(task), { onConflict: 'id' });
  if (taskError) {
    throw new Error(formatSupabaseError(taskError, 'Lỗi lưu công việc lên Supabase'));
  }

  const { error: delAttError } = await client
    .from('attachments')
    .delete()
    .eq('task_id', task.id);
  if (delAttError) {
    throw new Error(
      formatSupabaseError(delAttError, 'Lỗi cập nhật file đính kèm trên Supabase')
    );
  }

  if (task.attachments.length > 0) {
    const { error: insAttError } = await client
      .from('attachments')
      .insert(
        task.attachments.map((att) =>
          mapAttachmentToRow(att, { taskId: task.id })
        )
      );
    if (insAttError) {
      throw new Error(
        formatSupabaseError(insAttError, 'Lỗi lưu file đính kèm lên Supabase')
      );
    }
  }
}

export async function syncDeleteTask(taskId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('work_tasks').delete().eq('id', taskId);
  if (error) {
    throw new Error(formatSupabaseError(error, 'Lỗi xóa công việc trên Supabase'));
  }
}

export async function syncUpsertOvertime(entry: OvertimeEntry): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client
    .from('overtime_entries')
    .upsert(mapOvertimeToRow(entry), { onConflict: 'id' });
  if (error) {
    throw new Error(formatSupabaseError(error, 'Lỗi lưu giờ tăng ca lên Supabase'));
  }
}

export async function syncDeleteOvertime(entryId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client
    .from('overtime_entries')
    .delete()
    .eq('id', entryId);
  if (error) {
    throw new Error(formatSupabaseError(error, 'Lỗi xóa giờ tăng ca trên Supabase'));
  }
}

export async function syncUpsertMaterial(item: MaterialItem): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client
    .from('materials')
    .upsert(mapMaterialToRow(item), { onConflict: 'id' });
  if (error) {
    throw new Error(formatSupabaseError(error, 'Lỗi lưu vật tư lên Supabase'));
  }
}

export async function syncDeleteMaterial(itemId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('materials').delete().eq('id', itemId);
  if (error) {
    throw new Error(formatSupabaseError(error, 'Lỗi xóa vật tư trên Supabase'));
  }
}

export async function syncUpsertIncident(entry: IncidentEntry): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  const { error: incError } = await client
    .from('incidents')
    .upsert(mapIncidentToRow(entry), { onConflict: 'id' });
  if (incError) {
    throw new Error(formatSupabaseError(incError, 'Lỗi lưu sự cố lên Supabase'));
  }

  const { error: delAttError } = await client
    .from('attachments')
    .delete()
    .eq('incident_id', entry.id);
  if (delAttError) {
    throw new Error(
      formatSupabaseError(delAttError, 'Lỗi cập nhật file sự cố trên Supabase')
    );
  }

  if (entry.attachments.length > 0) {
    const { error: insAttError } = await client
      .from('attachments')
      .insert(
        entry.attachments.map((att) =>
          mapAttachmentToRow(att, { incidentId: entry.id })
        )
      );
    if (insAttError) {
      throw new Error(
        formatSupabaseError(insAttError, 'Lỗi lưu file sự cố lên Supabase')
      );
    }
  }
}

export async function syncDeleteIncident(entryId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('incidents').delete().eq('id', entryId);
  if (error) {
    throw new Error(formatSupabaseError(error, 'Lỗi xóa sự cố trên Supabase'));
  }
}
