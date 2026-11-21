import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DRIVE_FOLDER_MIME,
  DriveApiError,
  buildDriveListQuery,
  escapeDriveQueryValue,
  formatDriveDateTimeVi,
  formatDriveFileSize,
  getDriveMimeLabel,
} from './googleDrive';

test('escapeDriveQueryValue escapes backslashes and single quotes', () => {
  assert.equal(escapeDriveQueryValue("O'Reilly\\CAD"), "O\\'Reilly\\\\CAD");
  assert.equal(escapeDriveQueryValue('SQ2118'), 'SQ2118');
});

test('buildDriveListQuery constructs accurate folder, search, and filter clauses', () => {
  assert.equal(
    buildDriveListQuery({ folderId: 'root', filterMode: 'all' }),
    "trashed = false and 'root' in parents"
  );

  assert.equal(
    buildDriveListQuery({
      folderId: 'folder-123',
      search: "SQ'2118",
      filterMode: 'backups',
    }),
    "trashed = false and 'folder-123' in parents and name contains 'SQ\\'2118' and (mimeType = 'application/json' or name contains '.json')"
  );

  assert.equal(
    buildDriveListQuery({
      folderId: 'root',
      search: 'PLC',
      filterMode: 'folders',
    }),
    `trashed = false and name contains 'PLC' and mimeType = '${DRIVE_FOLDER_MIME}'`
  );

  assert.equal(
    buildDriveListQuery({
      folderId: 'root',
      filterMode: 'docs',
    }),
    `trashed = false and 'root' in parents and mimeType != '${DRIVE_FOLDER_MIME}'`
  );
});

test('getDriveMimeLabel maps Google Workspace and binary MIME types to Vietnamese labels', () => {
  assert.equal(getDriveMimeLabel(DRIVE_FOLDER_MIME, 'Docs'), 'Thư mục');
  assert.equal(
    getDriveMimeLabel('application/vnd.google-apps.document', 'Spec'),
    'Google Docs'
  );
  assert.equal(
    getDriveMimeLabel('application/vnd.google-apps.spreadsheet', 'BOM'),
    'Google Sheets'
  );
  assert.equal(
    getDriveMimeLabel('application/vnd.google-apps.presentation', 'Deck'),
    'Google Slides'
  );
  assert.equal(getDriveMimeLabel('application/pdf', 'draw.pdf'), 'PDF');
  assert.equal(
    getDriveMimeLabel('application/json', 'sao-luu.json'),
    'Sao lưu JSON'
  );
  assert.equal(getDriveMimeLabel('text/csv', 'report.csv'), 'CSV / Excel');
  assert.equal(getDriveMimeLabel('image/png', 'photo.png'), 'Hình ảnh');
  assert.equal(
    getDriveMimeLabel('application/octet-stream', 'firmware.bin'),
    'Tệp tin'
  );
});

test('formatDriveFileSize formats bytes, KB, MB, and invalid values safely', () => {
  assert.equal(formatDriveFileSize(undefined), '—');
  assert.equal(formatDriveFileSize('0'), '—');
  assert.equal(formatDriveFileSize('512'), '512 B');
  assert.equal(formatDriveFileSize('2048'), '2.0 KB');
  assert.equal(formatDriveFileSize(String(2 * 1024 * 1024)), '2.00 MB');
});

test('formatDriveDateTimeVi handles valid and invalid timestamps', () => {
  assert.equal(formatDriveDateTimeVi(undefined), '—');
  assert.equal(formatDriveDateTimeVi('not-a-date'), '—');
  const formatted = formatDriveDateTimeVi('2026-05-15T09:30:00.000Z');
  assert.ok(formatted.includes('2026'));
});

test('DriveApiError retains HTTP status code and message', () => {
  const err = new DriveApiError('Unauthorized', 401);
  assert.equal(err.name, 'DriveApiError');
  assert.equal(err.status, 401);
  assert.equal(err.message, 'Unauthorized');
});
