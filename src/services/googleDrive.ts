export const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder';
export const APP_DRIVE_FOLDER_NAME = 'TỰ ĐỘNG HOÁ - Dữ liệu nhóm';

export interface DriveOwner {
  displayName?: string;
  emailAddress?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
  parents?: string[];
  owners?: DriveOwner[];
}

export type DriveFilterMode = 'all' | 'folders' | 'backups' | 'docs';

export class DriveApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'DriveApiError';
    this.status = status;
  }
}

async function handleDriveResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Lỗi Google Drive (${res.status})`;
    try {
      const errBody = (await res.json()) as {
        error?: { message?: string };
      };
      if (errBody?.error?.message) {
        detail = errBody.error.message;
      }
    } catch {
      // Ignore JSON parse errors on error responses
    }
    throw new DriveApiError(detail, res.status);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function buildDriveListQuery(options: {
  folderId?: string;
  search?: string;
  filterMode?: DriveFilterMode;
}): string {
  const clauses: string[] = ['trashed = false'];
  const trimmedSearch = options.search?.trim() ?? '';

  if (options.folderId && !trimmedSearch) {
    clauses.push(`'${escapeDriveQueryValue(options.folderId)}' in parents`);
  } else if (options.folderId && options.folderId !== 'root') {
    clauses.push(`'${escapeDriveQueryValue(options.folderId)}' in parents`);
  }

  if (trimmedSearch) {
    clauses.push(`name contains '${escapeDriveQueryValue(trimmedSearch)}'`);
  }

  if (options.filterMode === 'folders') {
    clauses.push(`mimeType = '${DRIVE_FOLDER_MIME}'`);
  } else if (options.filterMode === 'backups') {
    clauses.push(
      "(mimeType = 'application/json' or name contains '.json')"
    );
  } else if (options.filterMode === 'docs') {
    clauses.push(`mimeType != '${DRIVE_FOLDER_MIME}'`);
  }

  return clauses.join(' and ');
}

export async function listDriveFiles(
  accessToken: string,
  options: {
    folderId?: string;
    search?: string;
    filterMode?: DriveFilterMode;
    pageSize?: number;
  } = {}
): Promise<DriveFile[]> {
  const params = new URLSearchParams({
    q: buildDriveListQuery(options),
    orderBy: 'folder,modifiedTime desc',
    pageSize: String(options.pageSize ?? 50),
    fields:
      'files(id,name,mimeType,size,modifiedTime,webViewLink,iconLink,parents,owners(displayName,emailAddress))',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const data = await handleDriveResponse<{ files?: DriveFile[] }>(res);
  return data.files ?? [];
}

export async function findDriveFolderByName(
  accessToken: string,
  folderName: string,
  parentId: string = 'root'
): Promise<DriveFile | null> {
  const q = [
    'trashed = false',
    `mimeType = '${DRIVE_FOLDER_MIME}'`,
    `name = '${escapeDriveQueryValue(folderName)}'`,
    `'${escapeDriveQueryValue(parentId)}' in parents`,
  ].join(' and ');

  const params = new URLSearchParams({
    q,
    pageSize: '1',
    fields: 'files(id,name,mimeType,modifiedTime,webViewLink,parents)',
  });

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const data = await handleDriveResponse<{ files?: DriveFile[] }>(res);
  return data.files?.[0] ?? null;
}

export async function createDriveFolder(
  accessToken: string,
  name: string,
  parentId?: string
): Promise<DriveFile> {
  const metadata: Record<string, unknown> = {
    name: name.trim(),
    mimeType: DRIVE_FOLDER_MIME,
  };
  if (parentId && parentId !== 'root') {
    metadata.parents = [parentId];
  }

  const params = new URLSearchParams({
    fields: 'id,name,mimeType,modifiedTime,webViewLink,parents',
  });

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    }
  );
  return handleDriveResponse<DriveFile>(res);
}

export async function findOrCreateAppDriveFolder(
  accessToken: string
): Promise<DriveFile> {
  const existing = await findDriveFolderByName(
    accessToken,
    APP_DRIVE_FOLDER_NAME,
    'root'
  );
  if (existing) return existing;
  return createDriveFolder(accessToken, APP_DRIVE_FOLDER_NAME);
}

export async function findFileInFolderByName(
  accessToken: string,
  fileName: string,
  folderId: string
): Promise<DriveFile | null> {
  const q = [
    'trashed = false',
    `name = '${escapeDriveQueryValue(fileName)}'`,
    `'${escapeDriveQueryValue(folderId)}' in parents`,
  ].join(' and ');

  const params = new URLSearchParams({
    q,
    pageSize: '1',
    fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink,parents)',
  });

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const data = await handleDriveResponse<{ files?: DriveFile[] }>(res);
  return data.files?.[0] ?? null;
}

export async function uploadFileToDrive(
  accessToken: string,
  options: {
    fileName: string;
    mimeType: string;
    content: Blob | string;
    parentId?: string;
  }
): Promise<DriveFile> {
  const metadata: Record<string, unknown> = {
    name: options.fileName,
    mimeType: options.mimeType,
  };
  if (options.parentId && options.parentId !== 'root') {
    metadata.parents = [options.parentId];
  }

  const contentBlob =
    typeof options.content === 'string'
      ? new Blob([options.content], { type: options.mimeType })
      : options.content;

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', contentBlob);

  const params = new URLSearchParams({
    uploadType: 'multipart',
    fields:
      'id,name,mimeType,size,modifiedTime,webViewLink,iconLink,parents',
  });

  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files?${params.toString()}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    }
  );
  return handleDriveResponse<DriveFile>(res);
}

export async function updateDriveFileContent(
  accessToken: string,
  fileId: string,
  options: {
    fileName?: string;
    mimeType: string;
    content: Blob | string;
  }
): Promise<DriveFile> {
  const metadata: Record<string, unknown> = {
    mimeType: options.mimeType,
  };
  if (options.fileName) {
    metadata.name = options.fileName;
  }

  const contentBlob =
    typeof options.content === 'string'
      ? new Blob([options.content], { type: options.mimeType })
      : options.content;

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', contentBlob);

  const params = new URLSearchParams({
    uploadType: 'multipart',
    fields:
      'id,name,mimeType,size,modifiedTime,webViewLink,iconLink,parents',
  });

  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(
      fileId
    )}?${params.toString()}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    }
  );
  return handleDriveResponse<DriveFile>(res);
}

export async function renameDriveFile(
  accessToken: string,
  fileId: string,
  newName: string
): Promise<DriveFile> {
  const params = new URLSearchParams({
    fields: 'id,name,mimeType,size,modifiedTime,webViewLink,parents',
  });
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      fileId
    )}?${params.toString()}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: newName.trim() }),
    }
  );
  return handleDriveResponse<DriveFile>(res);
}

export async function deleteDriveFile(
  accessToken: string,
  fileId: string
): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  await handleDriveResponse<void>(res);
}

export async function downloadDriveFileText(
  accessToken: string,
  fileId: string
): Promise<string> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      fileId
    )}?alt=media`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok) {
    throw new DriveApiError(
      `Không thể tải nội dung tệp (${res.status})`,
      res.status
    );
  }
  return res.text();
}

export async function downloadDriveFileBlob(
  accessToken: string,
  fileId: string
): Promise<Blob> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      fileId
    )}?alt=media`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok) {
    throw new DriveApiError(
      `Không thể tải tệp từ Google Drive (${res.status})`,
      res.status
    );
  }
  return res.blob();
}

export function getDriveMimeLabel(mimeType: string, fileName: string): string {
  if (mimeType === DRIVE_FOLDER_MIME) return 'Thư mục';
  if (mimeType === 'application/vnd.google-apps.document') return 'Google Docs';
  if (mimeType === 'application/vnd.google-apps.spreadsheet')
    return 'Google Sheets';
  if (mimeType === 'application/vnd.google-apps.presentation')
    return 'Google Slides';
  if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf'))
    return 'PDF';
  if (
    mimeType === 'application/json' ||
    fileName.toLowerCase().endsWith('.json')
  )
    return 'Sao lưu JSON';
  if (mimeType.includes('csv') || fileName.toLowerCase().endsWith('.csv'))
    return 'CSV / Excel';
  if (mimeType.startsWith('image/')) return 'Hình ảnh';
  return 'Tệp tin';
}

export function formatDriveFileSize(sizeStr?: string): string {
  if (!sizeStr) return '—';
  const bytes = Number(sizeStr);
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatDriveDateTimeVi(isoStr?: string): string {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
