import {
  AttachmentItem,
  INCIDENT_STATUSES,
  IncidentEntry,
  IncidentFilter,
  IncidentStatus,
  IncidentSummaryStats,
  MATERIAL_STATUSES,
  MachineProject,
  MaterialFilter,
  MaterialItem,
  MaterialStatus,
  MaterialSummaryStats,
  TeamMember,
} from '../types/workplan';
import { matchesMachineFilter } from './machines';
import { escapeCsvCell } from './overtime';
import { StorageLike, formatDateVi } from './workplan';

export const MATERIALS_STORAGE_KEY = 'automation_team_materials_v1';
export const INCIDENTS_STORAGE_KEY = 'automation_team_incidents_v1';

export const DEFAULT_MATERIAL_ITEMS: MaterialItem[] = [
  {
    id: 'mat-1',
    name: 'Module truyền thông Profinet ET200SP IM155-6PN',
    specCode: '6ES7155-6AU01-0BN0',
    quantity: 2,
    unit: 'Bộ',
    projectName: 'Tủ điện phân phối MCC',
    status: 'Đã đặt',
    notes: 'Nhà cung cấp hẹn giao vào thứ Ba tuần tới.',
    updatedAt: '2026-11-16',
  },
  {
    id: 'mat-2',
    name: 'Cảm biến tiệm cận cảm ứng từ M12 NPN NO',
    specCode: 'Omron E2E-X3D1-N 24VDC',
    quantity: 12,
    unit: 'Cái',
    projectName: 'Trạm cấp phôi tự động S7-1500',
    status: 'Đã về kho',
    notes: 'Đã kiểm tra đủ số lượng, bàn giao cho anh Tuấn.',
    updatedAt: '2026-11-12',
  },
  {
    id: 'mat-3',
    name: 'Cáp Encoder chống nhiễu 4 cặp xoắn bọc giáp',
    specCode: 'LAPP Unitronic LiYCY 4x2x0.25',
    quantity: 50,
    unit: 'Mét',
    projectName: 'Line kiểm tra lỗi nhãn Camera',
    status: 'Cần đặt',
    notes: 'Ưu tiên đặt gấp để chống nhiễu xung encoder tốc độ cao.',
    updatedAt: '2026-11-19',
  },
  {
    id: 'mat-4',
    name: 'Xi-lanh khí nén dẫn hướng compact',
    specCode: 'SMC MGPM25-50Z',
    quantity: 4,
    unit: 'Cái',
    projectName: 'Cụm đóng gói cuối line',
    status: 'Cần đặt',
    notes: 'Kèm 8 đầu nối nhanh ren PT 1/8 phi 6.',
    updatedAt: '2026-11-18',
  },
  {
    id: 'mat-5',
    name: 'Công tắc dừng khẩn cấp E-Stop phi 22',
    specCode: 'Schneider XB4BS8445 (1NO+1NC)',
    quantity: 6,
    unit: 'Bộ',
    projectName: 'Cụm đóng gói cuối line',
    status: 'Đã về kho',
    notes: 'Chuẩn bị cho bài test an toàn FAT.',
    updatedAt: '2026-11-14',
  },
];

export const DEFAULT_INCIDENT_ENTRIES: IncidentEntry[] = [
  {
    id: 'inc-1',
    occurredAt: '2026-11-19',
    repairTime: '08:30 - 10:15',
    machineName: 'Trạm cấp phôi tự động S7-1500',
    description:
      'Tín hiệu cảm biến hành trình xi-lanh đẩy bị chập chờn khi van điện từ đóng ngắt liên tục.',
    resolution:
      'Đấu bổ sung diode dập xung 1N4007 song song cuộn coil van 24VDC và tách riêng máng dây tín hiệu.',
    assigneeId: 'mem-1',
    status: 'Đã khắc phục',
    attachments: [
      {
        id: 'inc-att-1',
        name: 'Anh_HienTruong_Diode_Van24V.png',
        size: 124800,
        mimeType: 'image/png',
        addedAt: '2026-11-19',
      },
    ],
  },
  {
    id: 'inc-2',
    occurredAt: '2026-11-18',
    repairTime: '1.5 giờ',
    machineName: 'Line kiểm tra lỗi nhãn Camera',
    description:
      'Mất xung trigger ở tốc độ băng tải 60 sản phẩm/phút khiến camera chụp trễ 1 khung hình.',
    resolution:
      'Chuyển đầu vào encoder sang ngõ HSC tốc độ cao trên PLC và tăng tần số lấy mẫu lên 100kHz.',
    assigneeId: 'mem-3',
    status: 'Theo dõi thêm',
    attachments: [
      {
        id: 'inc-att-2',
        name: 'CauHinh_HSC_Encoder_100kHz.pdf',
        size: 215040,
        mimeType: 'application/pdf',
        addedAt: '2026-11-18',
      },
    ],
  },
  {
    id: 'inc-3',
    occurredAt: '2026-11-20',
    repairTime: '',
    machineName: 'Tủ điện phân phối MCC — Biến tần G120C',
    description:
      'Báo lỗi F07801 (Motor overcurrent) khi khởi động tải băng tải nặng sau khi dừng khẩn cấp.',
    resolution:
      'Đang kiểm tra kẹt cơ khí trục truyền động và điều chỉnh lại thời gian tăng tốc P1120 từ 2s lên 4.5s.',
    assigneeId: 'mem-4',
    status: 'Đang xử lý',
    attachments: [],
  },
  {
    id: 'inc-4',
    occurredAt: '2026-11-15',
    repairTime: '14:00 - 16:30',
    machineName: 'Gateway OPC UA dây chuyền đóng gói',
    description:
      'Gián đoạn đồng bộ dữ liệu OEE lên máy chủ nhà máy khi switch tầng xưởng khởi động lại.',
    resolution:
      'Kích hoạt bộ đệm Store-and-Forward 24h và cấu hình tự động kết nối lại sau 5 giây.',
    assigneeId: 'mem-6',
    status: 'Đã khắc phục',
    attachments: [],
  },
];

export function createMaterialId(): string {
  return `mat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createIncidentId(): string {
  return `inc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function filterMaterials(
  items: MaterialItem[],
  filter: MaterialFilter,
  machines: MachineProject[] = []
): MaterialItem[] {
  const query = filter.search.trim().toLowerCase();
  return items.filter((item) => {
    if (filter.status !== 'all' && item.status !== filter.status) {
      return false;
    }
    if (
      filter.machineId &&
      filter.machineId !== 'all' &&
      !matchesMachineFilter(
        filter.machineId,
        machines,
        item.machineId,
        item.projectName
      )
    ) {
      return false;
    }
    if (query) {
      const haystack = [
        item.name,
        item.specCode,
        item.projectName,
        item.notes,
        item.status,
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

export function computeMaterialStats(
  items: MaterialItem[]
): MaterialSummaryStats {
  let toOrder = 0;
  let ordered = 0;
  let inStock = 0;
  let totalQuantity = 0;

  for (const item of items) {
    if (item.status === 'Cần đặt') toOrder += 1;
    else if (item.status === 'Đã đặt') ordered += 1;
    else if (item.status === 'Đã về kho') inStock += 1;
    totalQuantity += Number.isFinite(item.quantity) ? item.quantity : 0;
  }

  return {
    total: items.length,
    toOrder,
    ordered,
    inStock,
    totalQuantity,
  };
}

export function filterIncidents(
  entries: IncidentEntry[],
  filter: IncidentFilter,
  members: TeamMember[] = [],
  machines: MachineProject[] = []
): IncidentEntry[] {
  const query = filter.search.trim().toLowerCase();
  const memberMap = new Map(members.map((m) => [m.id, m.name.toLowerCase()]));

  return entries.filter((entry) => {
    if (filter.status !== 'all' && entry.status !== filter.status) {
      return false;
    }
    if (filter.assigneeId !== 'all' && entry.assigneeId !== filter.assigneeId) {
      return false;
    }
    if (
      filter.machineId &&
      filter.machineId !== 'all' &&
      !matchesMachineFilter(
        filter.machineId,
        machines,
        entry.machineId,
        entry.machineName
      )
    ) {
      return false;
    }
    if (query) {
      const assigneeName = memberMap.get(entry.assigneeId) ?? '';
      const haystack = [
        entry.machineName,
        entry.repairTime,
        entry.description,
        entry.resolution,
        assigneeName,
        entry.status,
        ...entry.attachments.map((att) => att.name),
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

export function computeIncidentStats(
  entries: IncidentEntry[]
): IncidentSummaryStats {
  let inProgress = 0;
  let monitoring = 0;
  let resolved = 0;

  for (const entry of entries) {
    if (entry.status === 'Đang xử lý') inProgress += 1;
    else if (entry.status === 'Theo dõi thêm') monitoring += 1;
    else if (entry.status === 'Đã khắc phục') resolved += 1;
  }

  return {
    total: entries.length,
    inProgress,
    monitoring,
    resolved,
  };
}

export function normalizeStoredMaterial(item: unknown): MaterialItem | null {
  if (!item || typeof item !== 'object') return null;
  const c = item as Record<string, unknown>;
  if (
    typeof c.id !== 'string' ||
    typeof c.name !== 'string' ||
    !c.name.trim() ||
    typeof c.specCode !== 'string' ||
    typeof c.quantity !== 'number' ||
    !Number.isFinite(c.quantity) ||
    c.quantity <= 0 ||
    typeof c.projectName !== 'string' ||
    !MATERIAL_STATUSES.includes(c.status as MaterialStatus)
  ) {
    return null;
  }

  return {
    id: c.id,
    name: c.name,
    specCode: c.specCode,
    quantity: Math.max(1, Math.round(c.quantity * 100) / 100),
    unit: typeof c.unit === 'string' && c.unit.trim() ? c.unit : 'Cái',
    ...(typeof c.machineId === 'string' && c.machineId
      ? { machineId: c.machineId }
      : {}),
    projectName: c.projectName,
    status: c.status as MaterialStatus,
    notes: typeof c.notes === 'string' ? c.notes : '',
    updatedAt: typeof c.updatedAt === 'string' ? c.updatedAt : '',
  };
}

export function normalizeStoredAttachments(raw: unknown): AttachmentItem[] {
  if (!Array.isArray(raw)) return [];
  const valid: AttachmentItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const c = item as Record<string, unknown>;
    if (typeof c.id !== 'string' || typeof c.name !== 'string' || !c.name.trim()) {
      continue;
    }
    valid.push({
      id: c.id,
      name: c.name,
      size: typeof c.size === 'number' && Number.isFinite(c.size) ? Math.max(0, c.size) : 0,
      mimeType: typeof c.mimeType === 'string' && c.mimeType ? c.mimeType : 'application/octet-stream',
      ...(typeof c.dataUrl === 'string' ? { dataUrl: c.dataUrl } : {}),
      ...(typeof c.externalUrl === 'string' ? { externalUrl: c.externalUrl } : {}),
      addedAt: typeof c.addedAt === 'string' ? c.addedAt : '',
    });
  }
  return valid;
}

export function normalizeStoredIncident(item: unknown): IncidentEntry | null {
  if (!item || typeof item !== 'object') return null;
  const c = item as Record<string, unknown>;
  if (
    typeof c.id !== 'string' ||
    typeof c.occurredAt !== 'string' ||
    typeof c.machineName !== 'string' ||
    !c.machineName.trim() ||
    typeof c.description !== 'string' ||
    typeof c.assigneeId !== 'string' ||
    !INCIDENT_STATUSES.includes(c.status as IncidentStatus)
  ) {
    return null;
  }

  return {
    id: c.id,
    occurredAt: c.occurredAt,
    repairTime: typeof c.repairTime === 'string' ? c.repairTime : '',
    ...(typeof c.machineId === 'string' && c.machineId
      ? { machineId: c.machineId }
      : {}),
    machineName: c.machineName,
    description: c.description,
    resolution: typeof c.resolution === 'string' ? c.resolution : '',
    assigneeId: c.assigneeId,
    status: c.status as IncidentStatus,
    attachments: normalizeStoredAttachments(c.attachments),
  };
}

export function loadMaterialsFromStorage(storage: StorageLike): MaterialItem[] {
  try {
    const raw = storage.getItem(MATERIALS_STORAGE_KEY);
    if (!raw) return DEFAULT_MATERIAL_ITEMS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_MATERIAL_ITEMS;
    return parsed
      .map(normalizeStoredMaterial)
      .filter((item): item is MaterialItem => item !== null);
  } catch {
    return DEFAULT_MATERIAL_ITEMS;
  }
}

export function loadIncidentsFromStorage(
  storage: StorageLike
): IncidentEntry[] {
  try {
    const raw = storage.getItem(INCIDENTS_STORAGE_KEY);
    if (!raw) return DEFAULT_INCIDENT_ENTRIES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_INCIDENT_ENTRIES;
    return parsed
      .map(normalizeStoredIncident)
      .filter((item): item is IncidentEntry => item !== null);
  } catch {
    return DEFAULT_INCIDENT_ENTRIES;
  }
}

export function buildMaterialsCsv(items: MaterialItem[]): string {
  const headers = [
    'STT',
    'Tên vật tư',
    'Mã hiệu / Thông số',
    'Số lượng',
    'Đơn vị',
    'Dự án / Máy áp dụng',
    'Trạng thái',
    'Ghi chú',
    'Ngày cập nhật',
  ];

  const rows = items.map((item, idx) => [
    idx + 1,
    item.name,
    item.specCode,
    item.quantity,
    item.unit,
    item.projectName,
    item.status,
    item.notes,
    formatDateVi(item.updatedAt),
  ]);

  const lines = [headers, ...rows].map((row) =>
    row.map(escapeCsvCell).join(',')
  );
  return `\uFEFF${lines.join('\r\n')}`;
}

export function buildIncidentsCsv(
  entries: IncidentEntry[],
  members: TeamMember[]
): string {
  const memberMap = new Map(members.map((m) => [m.id, m.name]));
  const headers = [
    'STT',
    'Ngày gặp lỗi',
    'Thời gian sửa chữa',
    'Tên máy / Cụm máy',
    'Mô tả lỗi',
    'Cách khắc phục',
    'Người xử lý',
    'Trạng thái',
    'File đính kèm',
  ];

  const rows = entries.map((entry, idx) => [
    idx + 1,
    formatDateVi(entry.occurredAt),
    entry.repairTime || '',
    entry.machineName,
    entry.description,
    entry.resolution,
    memberMap.get(entry.assigneeId) ?? 'Chưa phân công',
    entry.status,
    entry.attachments.map((a) => a.name).join('; '),
  ]);

  const lines = [headers, ...rows].map((row) =>
    row.map(escapeCsvCell).join(',')
  );
  return `\uFEFF${lines.join('\r\n')}`;
}
