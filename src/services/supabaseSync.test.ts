import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assembleWorkspaceFromRows,
  mapAttachmentFromRow,
  mapAttachmentToRow,
  mapIncidentToRow,
  mapMachineFromRow,
  mapMachineToRow,
  mapMaterialToRow,
  mapMemberFromRow,
  mapOvertimeFromRow,
  mapOvertimeToRow,
  mapTaskToRow,
  sanitizeSafeDataUrl,
  sanitizeSafeExternalUrl,
} from './supabaseSync';

test('URL sanitizers accept safe http/https/data URLs and reject javascript schemes', () => {
  assert.equal(
    sanitizeSafeExternalUrl('https://drive.google.com/file/d/123/view'),
    'https://drive.google.com/file/d/123/view'
  );
  assert.equal(sanitizeSafeExternalUrl('javascript:alert(1)'), undefined);
  assert.equal(
    sanitizeSafeDataUrl('data:image/png;base64,AAAA'),
    'data:image/png;base64,AAAA'
  );
  assert.equal(sanitizeSafeDataUrl('javascript:void(0)'), undefined);
});

test('row mappers convert foreign keys and clamp numeric fields cleanly', () => {
  const validMachines = new Set(['mac-1']);
  const validMembers = new Set(['mem-1']);

  const taskRow = mapTaskToRow(
    {
      id: 'task-1',
      createdAt: '2026-11-20',
      machineId: 'missing-machine',
      mainContent: 'Trạm cấp phôi',
      detailContent: 'Chi tiết',
      targetDate: '2026-11-30',
      assigneeId: '',
      status: 'Đang thực hiện',
      progress: 145,
      attachments: [],
      notes: '',
    },
    validMachines,
    validMembers
  );

  assert.equal(taskRow.machine_id, null);
  assert.equal(taskRow.assignee_id, null);
  assert.equal(taskRow.progress, 100);

  const validTaskRow = mapTaskToRow(
    {
      id: 'task-2',
      createdAt: '2026-11-20',
      machineId: 'mac-1',
      mainContent: 'Trạm cấp phôi',
      detailContent: '',
      targetDate: '2026-11-30',
      assigneeId: 'mem-1',
      status: 'Hoàn thành',
      progress: 100,
      attachments: [],
      notes: '',
    },
    validMachines,
    validMembers
  );
  assert.equal(validTaskRow.machine_id, 'mac-1');
  assert.equal(validTaskRow.assignee_id, 'mem-1');
});

test('overtime, machine, material, incident, and attachment mappers round-trip accurately', () => {
  const member = mapMemberFromRow({
    id: 'mem-1',
    name: 'Nguyễn Minh Tuấn',
    role: 'Trưởng nhóm PLC',
  });
  assert.equal(member.name, 'Nguyễn Minh Tuấn');

  const machineRow = mapMachineToRow({
    id: 'mac-1',
    code: 'MAY-01',
    name: 'Máy hàn tự động',
    description: 'Mô tả',
    startDate: '2026-11-01',
    status: 'Đang triển khai',
    updatedAt: '2026-11-20',
  });
  const machine = mapMachineFromRow({
    ...machineRow,
    updated_at: '2026-11-20T09:00:00Z',
  });
  assert.equal(machine.updatedAt, '2026-11-20');

  const otRow = mapOvertimeToRow({
    id: 'ot-1',
    date: '2026-11-18',
    memberId: 'mem-1',
    hours: 2.5,
    dayType: 'Cuối tuần',
    content: 'Test FAT',
    notes: '',
    createdAt: '2026-11-18',
  });
  const ot = mapOvertimeFromRow({
    ...otRow,
    created_at: '2026-11-18T10:00:00Z',
  });
  assert.equal(ot.hours, 2.5);
  assert.equal(ot.dayType, 'Cuối tuần');

  const matRow = mapMaterialToRow(
    {
      id: 'mat-1',
      name: 'Cảm biến M12',
      specCode: 'E2E',
      quantity: 4,
      unit: 'Cái',
      machineId: 'mac-1',
      projectName: 'Máy hàn tự động',
      status: 'Cần đặt',
      notes: '',
      updatedAt: '2026-11-20',
    },
    new Set(['mac-1'])
  );
  assert.equal(matRow.machine_id, 'mac-1');

  const incRow = mapIncidentToRow(
    {
      id: 'inc-1',
      occurredAt: '2026-11-20',
      repairTime: '1 giờ',
      machineId: 'mac-1',
      machineName: 'Máy hàn tự động',
      description: 'Lỗi cảm biến',
      resolution: 'Thay mới',
      assigneeId: 'mem-1',
      status: 'Đã khắc phục',
      attachments: [],
    },
    new Set(['mac-1']),
    new Set(['mem-1'])
  );
  assert.equal(incRow.repair_time, '1 giờ');

  const attRow = mapAttachmentToRow(
    {
      id: 'att-1',
      name: 'SoDo.pdf',
      size: 2048,
      mimeType: 'application/pdf',
      externalUrl: 'https://drive.google.com/file/d/abc/view',
      addedAt: '2026-11-20',
    },
    { taskId: 'task-1' }
  );
  const att = mapAttachmentFromRow(attRow);
  assert.equal(att.externalUrl, 'https://drive.google.com/file/d/abc/view');
  assert.equal(att.size, 2048);
});

test('assembleWorkspaceFromRows groups attachments into tasks and incidents and detects empty state', () => {
  const empty = assembleWorkspaceFromRows({
    members: [],
    machines: [],
    tasks: [],
    overtimeEntries: [],
    materials: [],
    incidents: [],
    attachments: [],
  });
  assert.equal(empty.isEmpty, true);

  const populated = assembleWorkspaceFromRows({
    members: [{ id: 'mem-1', name: 'Tuấn', role: 'PLC' }],
    machines: [
      {
        id: 'mac-1',
        code: 'MAY-01',
        name: 'Máy 01',
        description: '',
        start_date: '2026-11-01',
        status: 'Đang triển khai',
      },
    ],
    tasks: [
      {
        id: 'task-1',
        created_date: '2026-11-01',
        machine_id: 'mac-1',
        main_content: 'Máy 01',
        detail_content: 'Chi tiết',
        target_date: '2026-11-25',
        assignee_id: 'mem-1',
        status: 'Đang thực hiện',
        progress: 50,
        notes: '',
      },
    ],
    overtimeEntries: [],
    materials: [],
    incidents: [
      {
        id: 'inc-1',
        occurred_at: '2026-11-10',
        repair_time: '09:00 - 10:00',
        machine_id: 'mac-1',
        machine_name: 'Máy 01',
        description: 'Lỗi PLC',
        resolution: 'Reset',
        assignee_id: 'mem-1',
        status: 'Đã khắc phục',
      },
    ],
    attachments: [
      {
        id: 'att-t1',
        task_id: 'task-1',
        incident_id: null,
        name: 'task.pdf',
        size_bytes: 100,
        mime_type: 'application/pdf',
        external_url: null,
        data_url: null,
        added_at: '2026-11-01',
      },
      {
        id: 'att-i1',
        task_id: null,
        incident_id: 'inc-1',
        name: 'inc.png',
        size_bytes: 200,
        mime_type: 'image/png',
        external_url: 'https://drive.google.com/file/d/xyz/view',
        data_url: null,
        added_at: '2026-11-10',
      },
    ],
  });

  assert.equal(populated.isEmpty, false);
  assert.equal(populated.data.tasks[0].attachments.length, 1);
  assert.equal(populated.data.tasks[0].attachments[0].name, 'task.pdf');
  assert.equal(populated.data.incidents[0].attachments.length, 1);
  assert.equal(
    populated.data.incidents[0].attachments[0].externalUrl,
    'https://drive.google.com/file/d/xyz/view'
  );
});
