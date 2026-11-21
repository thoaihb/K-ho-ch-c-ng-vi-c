import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MACHINES_STORAGE_KEY,
  buildMachinesCsv,
  computeMachineProfile,
  computeMachineStats,
  extractMachinesFromTasks,
  filterMachines,
  generateNextMachineCode,
  isRecordLinkedToMachine,
  loadMachinesFromStorage,
  matchesMachineFilter,
} from './machines';
import { MachineProject, MaterialItem, IncidentEntry, WorkTask } from '../types/workplan';
import { DEFAULT_WORK_TASKS, StorageLike } from './workplan';

function createMemoryStorage(initial: Record<string, string> = {}): StorageLike {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
  };
}

test('extractMachinesFromTasks auto-extracts unique machines from existing workplan tasks', () => {
  const tasks: WorkTask[] = [
    {
      ...DEFAULT_WORK_TASKS[0],
      id: 't1',
      createdAt: '2026-11-05',
      mainContent: 'Máy kiểm tra EOL',
      detailContent: 'Kiểm tra cảm biến đầu ra',
      status: 'Đang thực hiện',
      progress: 60,
    },
    {
      ...DEFAULT_WORK_TASKS[1],
      id: 't2',
      createdAt: '2026-11-02',
      mainContent: '  máy   kiểm tra EOL ',
      detailContent: 'Lắp tủ điện',
      status: 'Hoàn thành',
      progress: 100,
    },
    {
      ...DEFAULT_WORK_TASKS[2],
      id: 't3',
      createdAt: '2026-11-08',
      mainContent: 'Máy tự động SQ2118 - Máy nhỏ keo epoxy',
      detailContent: 'Hiệu chỉnh van nhỏ keo',
      status: 'Hoàn thành',
      progress: 100,
    },
  ];

  const extracted = extractMachinesFromTasks(tasks, '2026-11-20');
  assert.equal(extracted.length, 2);
  assert.equal(extracted[0].code, 'MAY-01');
  assert.equal(extracted[0].name, 'Máy kiểm tra EOL');
  assert.equal(extracted[0].startDate, '2026-11-02');
  assert.equal(extracted[0].status, 'Đang triển khai');

  assert.equal(extracted[1].code, 'MAY-02');
  assert.equal(extracted[1].name, 'Máy tự động SQ2118 - Máy nhỏ keo epoxy');
  assert.equal(extracted[1].status, 'Đã bàn giao');
});

test('loadMachinesFromStorage initializes from tasks when missing and preserves stored catalog when present', () => {
  const emptyStorage = createMemoryStorage();
  const autoLoaded = loadMachinesFromStorage(emptyStorage, DEFAULT_WORK_TASKS);
  assert.equal(autoLoaded.length, DEFAULT_WORK_TASKS.length);

  const customMachine: MachineProject = {
    id: 'mac-custom-1',
    code: 'SQ2118-WLD',
    name: 'Máy tự động SQ2118 - Máy hàn tự động',
    description: 'Cụm hàn tự động 4 trục',
    startDate: '2026-11-10',
    status: 'Chạy thử FAT/SAT',
    updatedAt: '2026-11-20',
  };

  const populatedStorage = createMemoryStorage({
    [MACHINES_STORAGE_KEY]: JSON.stringify([customMachine, { bad: true }]),
  });
  const loaded = loadMachinesFromStorage(populatedStorage, DEFAULT_WORK_TASKS);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].id, 'mac-custom-1');
  assert.equal(loaded[0].code, 'SQ2118-WLD');
  assert.equal(loaded[0].status, 'Chạy thử FAT/SAT');
});

test('computeMachineProfile aggregates linked tasks, average progress, BOM materials, and incidents', () => {
  const machine: MachineProject = {
    id: 'mac-eol',
    code: 'EOL-01',
    name: 'Máy kiểm tra EOL',
    description: 'Trạm kiểm tra cuối chuyền',
    startDate: '2026-11-01',
    status: 'Đang triển khai',
    updatedAt: '2026-11-20',
  };

  const tasks: WorkTask[] = [
    {
      ...DEFAULT_WORK_TASKS[0],
      id: 't1',
      machineId: 'mac-eol',
      mainContent: 'Máy kiểm tra EOL',
      status: 'Hoàn thành',
      progress: 100,
    },
    {
      ...DEFAULT_WORK_TASKS[1],
      id: 't2',
      // legacy link by normalized name without machineId
      mainContent: '  máy kiểm tra EOL ',
      status: 'Đang thực hiện',
      progress: 40,
    },
    {
      ...DEFAULT_WORK_TASKS[2],
      id: 't3',
      machineId: 'other-mac',
      mainContent: 'Máy khác',
      status: 'Đang thực hiện',
      progress: 10,
    },
  ];

  const materials: MaterialItem[] = [
    {
      id: 'mat-a',
      name: 'Cảm biến quang',
      specCode: 'E3Z-T61',
      quantity: 4,
      unit: 'Cái',
      machineId: 'mac-eol',
      projectName: 'Máy kiểm tra EOL',
      status: 'Cần đặt',
      notes: '',
      updatedAt: '2026-11-20',
    },
    {
      id: 'mat-b',
      name: 'Van điện từ',
      specCode: 'SY5120',
      quantity: 2,
      unit: 'Cái',
      projectName: 'Máy kiểm tra EOL',
      status: 'Đã về kho',
      notes: '',
      updatedAt: '2026-11-20',
    },
  ];

  const incidents: IncidentEntry[] = [
    {
      id: 'inc-a',
      occurredAt: '2026-11-18',
      repairTime: '08:00 - 09:30',
      machineId: 'mac-eol',
      machineName: 'Máy kiểm tra EOL',
      description: 'Mất tín hiệu trigger',
      resolution: 'Thay dây sensor',
      assigneeId: 'mem-1',
      status: 'Đã khắc phục',
      attachments: [],
    },
    {
      id: 'inc-b',
      occurredAt: '2026-11-19',
      repairTime: '1.5 giờ',
      machineName: 'Máy kiểm tra EOL',
      description: 'Sai số đo dòng',
      resolution: '',
      assigneeId: 'mem-2',
      status: 'Đang xử lý',
      attachments: [],
    },
  ];

  const profile = computeMachineProfile(machine, tasks, materials, incidents);
  assert.equal(profile.tasks.length, 2);
  assert.equal(profile.completedTasks, 1);
  assert.equal(profile.averageProgress, 70);
  assert.equal(profile.materials.length, 2);
  assert.equal(profile.materialToOrder, 1);
  assert.equal(profile.materialInStock, 1);
  assert.equal(profile.incidents.length, 2);
  assert.equal(profile.openIncidents, 1);
  assert.equal(profile.resolvedIncidents, 1);

  assert.equal(isRecordLinkedToMachine(machine, 'mac-eol', 'Anything'), true);
  assert.equal(isRecordLinkedToMachine(machine, 'mac-other', 'Máy kiểm tra EOL'), false);
  assert.equal(
    matchesMachineFilter('mac-eol', [machine], undefined, 'Máy kiểm tra EOL'),
    true
  );
});

test('filterMachines, computeMachineStats, generateNextMachineCode, and buildMachinesCsv work accurately', () => {
  const machines: MachineProject[] = [
    {
      id: 'm1',
      code: 'MAY-01',
      name: 'Máy nhỏ keo epoxy',
      description: 'SQ2118',
      startDate: '2026-11-01',
      status: 'Đang triển khai',
      updatedAt: '2026-11-20',
    },
    {
      id: 'm2',
      code: 'MAY-02',
      name: 'Máy hàn tự động',
      description: 'SQ2118',
      startDate: '2026-11-05',
      status: 'Chạy thử FAT/SAT',
      updatedAt: '2026-11-20',
    },
    {
      id: 'm3',
      code: 'MAY-04',
      name: 'Máy kiểm tra EOL',
      description: 'Cuối chuyền',
      startDate: '2026-10-15',
      status: 'Đã bàn giao',
      updatedAt: '2026-11-20',
    },
  ];

  assert.equal(generateNextMachineCode(machines), 'MAY-05');

  const stats = computeMachineStats(machines);
  assert.equal(stats.total, 3);
  assert.equal(stats.inProgress, 1);
  assert.equal(stats.testing, 1);
  assert.equal(stats.delivered, 1);
  assert.equal(stats.paused, 0);

  const filtered = filterMachines(machines, {
    status: 'Chạy thử FAT/SAT',
    search: 'hàn',
  });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'm2');

  const csv = buildMachinesCsv(machines, DEFAULT_WORK_TASKS, [], []);
  assert.equal(csv.startsWith('\uFEFF'), true);
  assert.equal(csv.includes('Mã máy'), true);
  assert.equal(csv.includes('Máy nhỏ keo epoxy'), true);
});
