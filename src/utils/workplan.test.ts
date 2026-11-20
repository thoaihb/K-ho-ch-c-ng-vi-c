import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_TEAM_MEMBERS,
  DEFAULT_WORK_TASKS,
  MEMBERS_STORAGE_KEY,
  TASKS_STORAGE_KEY,
  addTeamMember,
  computeSummaryStats,
  filterTasks,
  formatDateVi,
  formatFileSize,
  isTaskOverdue,
  loadMembersFromStorage,
  loadTasksFromStorage,
  saveToStorage,
} from './workplan';
import { MAX_TEAM_MEMBERS, TeamMember } from '../types/workplan';

test('formatDateVi formats ISO YYYY-MM-DD to Vietnamese DD/MM/YYYY', () => {
  assert.equal(formatDateVi('2026-11-20'), '20/11/2026');
  assert.equal(formatDateVi('2026-01-05'), '05/01/2026');
  assert.equal(formatDateVi(''), '—');
});

test('isTaskOverdue flags past due tasks unless status is Hoàn thành', () => {
  assert.equal(
    isTaskOverdue({ targetDate: '2026-11-18', status: 'Đang thực hiện' }, '2026-11-20'),
    true
  );
  assert.equal(
    isTaskOverdue({ targetDate: '2026-11-18', status: 'Tạm dừng' }, '2026-11-20'),
    true
  );
  assert.equal(
    isTaskOverdue({ targetDate: '2026-11-18', status: 'Hoàn thành' }, '2026-11-20'),
    false
  );
  assert.equal(
    isTaskOverdue({ targetDate: '2026-11-20', status: 'Đang thực hiện' }, '2026-11-20'),
    false
  );
});

test('filterTasks filters by status, assigneeId, search query, and combinations', () => {
  const byStatus = filterTasks(
    DEFAULT_WORK_TASKS,
    { status: 'Hoàn thành', assigneeId: 'all', search: '' },
    DEFAULT_TEAM_MEMBERS
  );
  assert.equal(byStatus.length, 2);
  assert.ok(byStatus.every((t) => t.status === 'Hoàn thành'));

  const byAssignee = filterTasks(
    DEFAULT_WORK_TASKS,
    { status: 'all', assigneeId: 'mem-1', search: '' },
    DEFAULT_TEAM_MEMBERS
  );
  assert.equal(byAssignee.length, 1);
  assert.equal(byAssignee[0].id, 'task-1');

  const bySearch = filterTasks(
    DEFAULT_WORK_TASKS,
    { status: 'all', assigneeId: 'all', search: 'camera' },
    DEFAULT_TEAM_MEMBERS
  );
  assert.equal(bySearch.length, 1);
  assert.equal(bySearch[0].id, 'task-3');

  const combined = filterTasks(
    DEFAULT_WORK_TASKS,
    { status: 'Đang thực hiện', assigneeId: 'mem-5', search: 'FAT' },
    DEFAULT_TEAM_MEMBERS
  );
  assert.equal(combined.length, 1);
  assert.equal(combined[0].id, 'task-5');
});

test('computeSummaryStats computes accurate totals and overdue count', () => {
  const stats = computeSummaryStats(DEFAULT_WORK_TASKS, '2026-11-20');
  assert.equal(stats.total, 6);
  assert.equal(stats.inProgress, 3);
  assert.equal(stats.completed, 2);
  assert.equal(stats.paused, 1);
  // task-4 targetDate is 2026-11-15 with status Tạm dừng -> overdue
  assert.equal(stats.overdue, 1);
});

test('addTeamMember enforces max 10 members, rejects empty and duplicate names', () => {
  let members: TeamMember[] = Array.from({ length: 9 }, (_, idx) => ({
    id: `m-${idx + 1}`,
    name: `Thành viên ${idx + 1}`,
    role: 'Kỹ sư',
  }));

  const emptyRes = addTeamMember(members, '   ', '');
  assert.equal(emptyRes.ok, false);

  const dupRes = addTeamMember(members, 'thành viên 1', '');
  assert.equal(dupRes.ok, false);

  const tenthRes = addTeamMember(members, 'Thành viên 10', 'Kỹ sư PLC', () => 'm-10');
  assert.equal(tenthRes.ok, true);
  assert.equal(tenthRes.members.length, MAX_TEAM_MEMBERS);

  const eleventhRes = addTeamMember(tenthRes.members, 'Thành viên 11', 'Kỹ sư');
  assert.equal(eleventhRes.ok, false);
  assert.equal(eleventhRes.members.length, MAX_TEAM_MEMBERS);
  assert.match(eleventhRes.error ?? '', /tối đa 10/);
});

test('formatFileSize formats bytes cleanly', () => {
  assert.equal(formatFileSize(0), 'Liên kết');
  assert.equal(formatFileSize(512), '512 B');
  assert.equal(formatFileSize(2048), '2.0 KB');
  assert.equal(formatFileSize(1048576), '1.00 MB');
});

test('storage helpers load defaults on empty/corrupt data and persist round-trips', () => {
  const map = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
  };

  assert.equal(loadTasksFromStorage(mockStorage).length, DEFAULT_WORK_TASKS.length);
  assert.equal(loadMembersFromStorage(mockStorage).length, DEFAULT_TEAM_MEMBERS.length);

  map.set(TASKS_STORAGE_KEY, '{invalid-json');
  map.set(MEMBERS_STORAGE_KEY, 'not-an-array');
  assert.equal(loadTasksFromStorage(mockStorage).length, DEFAULT_WORK_TASKS.length);
  assert.equal(loadMembersFromStorage(mockStorage).length, DEFAULT_TEAM_MEMBERS.length);

  const customTasks = [DEFAULT_WORK_TASKS[0]];
  const saveRes = saveToStorage(mockStorage, TASKS_STORAGE_KEY, customTasks);
  assert.equal(saveRes.ok, true);
  assert.equal(loadTasksFromStorage(mockStorage).length, 1);
});
