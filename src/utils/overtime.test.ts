import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_OVERTIME_ENTRIES,
  OVERTIME_STORAGE_KEY,
  buildBackupJson,
  buildOvertimeCsv,
  buildWorkplanCsv,
  calculateWeightedHours,
  computeMemberOvertimeBreakdown,
  computeOvertimeStats,
  filterOvertimeEntries,
  formatMonthVi,
  getOvertimeMultiplier,
  loadOvertimeFromStorage,
  parseAndValidateBackupJson,
} from './overtime';
import { DEFAULT_TEAM_MEMBERS, DEFAULT_WORK_TASKS } from './workplan';

test('getOvertimeMultiplier and calculateWeightedHours apply 1.5x / 2.0x / 3.0x accurately', () => {
  assert.equal(getOvertimeMultiplier('Ngày thường'), 1.5);
  assert.equal(getOvertimeMultiplier('Cuối tuần'), 2.0);
  assert.equal(getOvertimeMultiplier('Ngày lễ'), 3.0);

  assert.equal(calculateWeightedHours(2, 'Ngày thường'), 3);
  assert.equal(calculateWeightedHours(1.5, 'Ngày thường'), 2.25);
  assert.equal(calculateWeightedHours(4, 'Cuối tuần'), 8);
  assert.equal(calculateWeightedHours(2.5, 'Ngày lễ'), 7.5);
  assert.equal(calculateWeightedHours(0, 'Ngày lễ'), 0);
});

test('filterOvertimeEntries filters by memberId, month, and search query', () => {
  const byMember = filterOvertimeEntries(
    DEFAULT_OVERTIME_ENTRIES,
    { memberId: 'mem-1', month: '', search: '' },
    DEFAULT_TEAM_MEMBERS
  );
  assert.equal(byMember.length, 1);
  assert.equal(byMember[0].id, 'ot-1');

  const byMonthNov = filterOvertimeEntries(
    DEFAULT_OVERTIME_ENTRIES,
    { memberId: 'all', month: '2026-11', search: '' },
    DEFAULT_TEAM_MEMBERS
  );
  assert.equal(byMonthNov.length, 4);

  const bySearch = filterOvertimeEntries(
    DEFAULT_OVERTIME_ENTRIES,
    { memberId: 'all', month: '', search: 'SCADA' },
    DEFAULT_TEAM_MEMBERS
  );
  assert.equal(bySearch.length, 1);
  assert.equal(bySearch[0].id, 'ot-2');
});

test('computeOvertimeStats totals actual and weighted hours correctly', () => {
  const stats = computeOvertimeStats(DEFAULT_OVERTIME_ENTRIES);
  assert.equal(stats.count, 5);
  // 2.5 + 4 + 1.5 + 3 + 2 = 13
  assert.equal(stats.totalHours, 13);
  // 2.5*1.5 (3.75) + 4*2 (8) + 1.5*1.5 (2.25) + 3*2 (6) + 2*3 (6) = 26
  assert.equal(stats.totalWeightedHours, 26);
  assert.equal(stats.regularHours, 4);
  assert.equal(stats.weekendHours, 7);
  assert.equal(stats.holidayHours, 2);
});

test('computeMemberOvertimeBreakdown computes per-member task & monthly overtime stats', () => {
  const rows = computeMemberOvertimeBreakdown(
    DEFAULT_TEAM_MEMBERS,
    DEFAULT_WORK_TASKS,
    DEFAULT_OVERTIME_ENTRIES,
    '2026-11'
  );
  assert.equal(rows.length, DEFAULT_TEAM_MEMBERS.length);
  const tuan = rows.find((r) => r.member.id === 'mem-1');
  assert.ok(tuan);
  assert.equal(tuan.taskCount, 1);
  assert.equal(tuan.averageTaskProgress, 65);
  assert.equal(tuan.overtimeHours, 2.5);
  assert.equal(tuan.weightedOvertimeHours, 3.75);

  // mem-6 only has overtime in 2026-10, so 2026-11 should be 0
  const phuoc = rows.find((r) => r.member.id === 'mem-6');
  assert.ok(phuoc);
  assert.equal(phuoc.overtimeHours, 0);
});

test('loadOvertimeFromStorage loads defaults on empty/corrupt and normalizes stored entries', () => {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
  };

  assert.equal(
    loadOvertimeFromStorage(mockStorage).length,
    DEFAULT_OVERTIME_ENTRIES.length
  );

  store.set(OVERTIME_STORAGE_KEY, '{bad-json');
  assert.equal(
    loadOvertimeFromStorage(mockStorage).length,
    DEFAULT_OVERTIME_ENTRIES.length
  );

  store.set(
    OVERTIME_STORAGE_KEY,
    JSON.stringify([DEFAULT_OVERTIME_ENTRIES[0]])
  );
  assert.equal(loadOvertimeFromStorage(mockStorage).length, 1);
});

test('buildWorkplanCsv and buildOvertimeCsv include UTF-8 BOM and escape cells properly', () => {
  const tasksCsv = buildWorkplanCsv(DEFAULT_WORK_TASKS, DEFAULT_TEAM_MEMBERS);
  assert.ok(tasksCsv.startsWith('\uFEFF'));
  assert.ok(tasksCsv.includes('Tiến độ (%)'));
  assert.ok(tasksCsv.includes('Lập trình PLC S7-1500'));

  const otCsv = buildOvertimeCsv(DEFAULT_OVERTIME_ENTRIES, DEFAULT_TEAM_MEMBERS);
  assert.ok(otCsv.startsWith('\uFEFF'));
  assert.ok(otCsv.includes('Giờ quy đổi'));
  assert.ok(otCsv.includes('3.75'));
});

test('buildBackupJson and parseAndValidateBackupJson validate and round-trip workspace data', () => {
  const json = buildBackupJson(
    DEFAULT_TEAM_MEMBERS,
    DEFAULT_WORK_TASKS,
    DEFAULT_OVERTIME_ENTRIES,
    '2026-11-20'
  );
  const parsed = parseAndValidateBackupJson(json);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data?.members.length, DEFAULT_TEAM_MEMBERS.length);
  assert.equal(parsed.data?.tasks.length, DEFAULT_WORK_TASKS.length);
  assert.equal(parsed.data?.overtimeEntries.length, DEFAULT_OVERTIME_ENTRIES.length);

  const invalid = parseAndValidateBackupJson('{"foo": "bar"}');
  assert.equal(invalid.ok, false);

  const corrupt = parseAndValidateBackupJson('{not-json');
  assert.equal(corrupt.ok, false);

  assert.equal(formatMonthVi('2026-11'), 'Tháng 11/2026');
});
