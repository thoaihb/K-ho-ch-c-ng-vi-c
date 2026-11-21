import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_INCIDENT_ENTRIES,
  DEFAULT_MATERIAL_ITEMS,
  INCIDENTS_STORAGE_KEY,
  MATERIALS_STORAGE_KEY,
  buildIncidentsCsv,
  buildMaterialsCsv,
  computeIncidentStats,
  computeMaterialStats,
  filterIncidents,
  filterMaterials,
  loadIncidentsFromStorage,
  loadMaterialsFromStorage,
} from './operations';
import { buildBackupJson, parseAndValidateBackupJson } from './overtime';
import { DEFAULT_TEAM_MEMBERS, DEFAULT_WORK_TASKS, StorageLike } from './workplan';

function createMemoryStorage(initial: Record<string, string> = {}): StorageLike {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
  };
}

test('filterMaterials and computeMaterialStats filter and count statuses accurately', () => {
  const stats = computeMaterialStats(DEFAULT_MATERIAL_ITEMS);
  assert.equal(stats.total, 5);
  assert.equal(stats.toOrder, 2);
  assert.equal(stats.ordered, 1);
  assert.equal(stats.inStock, 2);
  assert.equal(stats.totalQuantity, 74);

  const filtered = filterMaterials(DEFAULT_MATERIAL_ITEMS, {
    status: 'Cần đặt',
    machineId: 'all',
    search: 'encoder',
  });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'mat-3');
});

test('filterIncidents and computeIncidentStats filter and count statuses accurately', () => {
  const stats = computeIncidentStats(DEFAULT_INCIDENT_ENTRIES);
  assert.equal(stats.total, 4);
  assert.equal(stats.inProgress, 1);
  assert.equal(stats.monitoring, 1);
  assert.equal(stats.resolved, 2);

  const filtered = filterIncidents(
    DEFAULT_INCIDENT_ENTRIES,
    {
      status: 'Đang xử lý',
      assigneeId: 'mem-4',
      machineId: 'all',
      search: 'G120C',
    },
    DEFAULT_TEAM_MEMBERS
  );
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'inc-3');
});

test('loadMaterialsFromStorage and loadIncidentsFromStorage use isolated keys and normalize stored records', () => {
  const empty = createMemoryStorage();
  assert.equal(loadMaterialsFromStorage(empty).length, DEFAULT_MATERIAL_ITEMS.length);
  assert.equal(loadIncidentsFromStorage(empty).length, DEFAULT_INCIDENT_ENTRIES.length);

  const customStorage = createMemoryStorage({
    [MATERIALS_STORAGE_KEY]: JSON.stringify([
      {
        id: 'm-99',
        name: 'PLC Siemens S7-1200',
        specCode: '6ES7214-1AG40-0XB0',
        quantity: 1,
        unit: 'Bộ',
        projectName: 'Máy dán nhãn',
        status: 'Đã đặt',
      },
      { invalid: true },
    ]),
    [INCIDENTS_STORAGE_KEY]: JSON.stringify([
      {
        id: 'i-99',
        occurredAt: '2026-11-20',
        machineName: 'Máy dán nhãn',
        description: 'Lỗi cảm biến quang',
        resolution: 'Vệ sinh thấu kính',
        assigneeId: 'mem-1',
        status: 'Đã khắc phục',
      },
      {
        id: 'i-100',
        occurredAt: '2026-11-21',
        repairTime: '09:00 - 11:30',
        machineName: 'Băng tải cấp hộp',
        description: 'Trượt đai truyền động',
        resolution: 'Căng lại dây đai',
        assigneeId: 'mem-2',
        status: 'Đã khắc phục',
        attachments: [
          {
            id: 'att-i100',
            name: 'Anh_Sau_SuaChua.png',
            size: 2048,
            mimeType: 'image/png',
            dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
            addedAt: '2026-11-21',
          },
        ],
      },
    ]),
  });

  const mats = loadMaterialsFromStorage(customStorage);
  assert.equal(mats.length, 1);
  assert.equal(mats[0].name, 'PLC Siemens S7-1200');

  const incs = loadIncidentsFromStorage(customStorage);
  assert.equal(incs.length, 2);
  assert.equal(incs[0].machineName, 'Máy dán nhãn');
  assert.equal(incs[0].repairTime, '');
  assert.deepEqual(incs[0].attachments, []);
  assert.equal(incs[1].repairTime, '09:00 - 11:30');
  assert.equal(incs[1].attachments.length, 1);
  assert.equal(incs[1].attachments[0].name, 'Anh_Sau_SuaChua.png');
  assert.equal(incs[1].attachments[0].dataUrl, 'data:image/png;base64,iVBORw0KGgo=');
});

test('buildMaterialsCsv and buildIncidentsCsv produce UTF-8 BOM CSV output including repairTime and attachments', () => {
  const matCsv = buildMaterialsCsv(DEFAULT_MATERIAL_ITEMS);
  assert.equal(matCsv.startsWith('\uFEFF'), true);
  assert.equal(matCsv.includes('Tên vật tư'), true);
  assert.equal(matCsv.includes('6ES7155-6AU01-0BN0'), true);

  const incCsv = buildIncidentsCsv(DEFAULT_INCIDENT_ENTRIES, DEFAULT_TEAM_MEMBERS);
  assert.equal(incCsv.startsWith('\uFEFF'), true);
  assert.equal(incCsv.includes('Thời gian sửa chữa'), true);
  assert.equal(incCsv.includes('Tên máy / Cụm máy'), true);
  assert.equal(incCsv.includes('File đính kèm'), true);
  assert.equal(incCsv.includes('08:30 - 10:15'), true);
  assert.equal(incCsv.includes('Anh_HienTruong_Diode_Van24V.png'), true);
  assert.equal(incCsv.includes('Nguyễn Minh Tuấn'), true);
});

test('filterIncidents searches repairTime and attachment names', () => {
  const byRepairTime = filterIncidents(
    DEFAULT_INCIDENT_ENTRIES,
    { status: 'all', assigneeId: 'all', machineId: 'all', search: '1.5 giờ' },
    DEFAULT_TEAM_MEMBERS
  );
  assert.equal(byRepairTime.length, 1);
  assert.equal(byRepairTime[0].id, 'inc-2');

  const byAttachment = filterIncidents(
    DEFAULT_INCIDENT_ENTRIES,
    {
      status: 'all',
      assigneeId: 'all',
      machineId: 'all',
      search: 'Diode_Van24V',
    },
    DEFAULT_TEAM_MEMBERS
  );
  assert.equal(byAttachment.length, 1);
  assert.equal(byAttachment[0].id, 'inc-1');
});

test('v3 JSON backup round-trips machines, materials, and incidents cleanly and handles legacy v2 backups', () => {
  const sampleMachines = [
    {
      id: 'mac-1',
      code: 'SQ2118-EPX',
      name: 'Máy tự động SQ2118 - Máy nhỏ keo epoxy',
      description: 'Cụm nhỏ keo tự động',
      startDate: '2026-11-01',
      status: 'Đang triển khai' as const,
      updatedAt: '2026-11-20',
    },
  ];

  const jsonV3 = buildBackupJson(
    DEFAULT_TEAM_MEMBERS,
    DEFAULT_WORK_TASKS,
    [],
    '2026-11-20',
    DEFAULT_MATERIAL_ITEMS,
    DEFAULT_INCIDENT_ENTRIES,
    sampleMachines
  );
  const resV3 = parseAndValidateBackupJson(jsonV3);
  assert.equal(resV3.ok, true);
  assert.equal(resV3.data?.machines?.length, 1);
  assert.equal(resV3.data?.machines?.[0].code, 'SQ2118-EPX');
  assert.equal(resV3.data?.materials?.length, DEFAULT_MATERIAL_ITEMS.length);
  assert.equal(resV3.data?.incidents?.length, DEFAULT_INCIDENT_ENTRIES.length);
  assert.equal(resV3.data?.incidents?.[0].repairTime, '08:30 - 10:15');
  assert.equal(resV3.data?.incidents?.[0].attachments.length, 1);

  const jsonLegacyNoMachines = buildBackupJson(
    DEFAULT_TEAM_MEMBERS,
    DEFAULT_WORK_TASKS,
    [],
    '2026-11-20',
    DEFAULT_MATERIAL_ITEMS,
    DEFAULT_INCIDENT_ENTRIES
  );
  const legacyObj = JSON.parse(jsonLegacyNoMachines) as Record<string, unknown>;
  delete legacyObj.machines;
  const resLegacy = parseAndValidateBackupJson(JSON.stringify(legacyObj));
  assert.equal(resLegacy.ok, true);
  assert.ok((resLegacy.data?.machines?.length ?? 0) >= 1);
});
