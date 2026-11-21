import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import {
  CheckCircle2,
  ChevronRight,
  Cloud,
  Download,
  ExternalLink,
  FileCode2,
  FileJson,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderPlus,
  Image as ImageIcon,
  Loader2,
  LogOut,
  Pencil,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  IncidentEntry,
  MachineProject,
  MaterialItem,
  OvertimeEntry,
  TeamMember,
  WorkTask,
  WorkspaceBackupPayload,
} from '../types/workplan';
import {
  APP_DRIVE_FOLDER_NAME,
  DRIVE_FOLDER_MIME,
  DriveApiError,
  DriveFile,
  DriveFilterMode,
  createDriveFolder,
  deleteDriveFile,
  downloadDriveFileBlob,
  downloadDriveFileText,
  findFileInFolderByName,
  findOrCreateAppDriveFolder,
  formatDriveDateTimeVi,
  formatDriveFileSize,
  getDriveMimeLabel,
  listDriveFiles,
  renameDriveFile,
  updateDriveFileContent,
  uploadFileToDrive,
} from '../services/googleDrive';
import {
  buildBackupJson,
  buildWorkplanCsv,
  parseAndValidateBackupJson,
} from '../utils/overtime';
import { getTodayIsoDate } from '../utils/workplan';
import { GoogleSignInButton } from './GoogleSignInButton';

interface DriveViewProps {
  user: User | null;
  accessToken: string | null;
  isSigningIn: boolean;
  authError: string | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onTokenExpired: () => void;
  tasks: WorkTask[];
  members: TeamMember[];
  machines: MachineProject[];
  overtimeEntries: OvertimeEntry[];
  materials: MaterialItem[];
  incidents: IncidentEntry[];
  onRestoreBackup: (payload: WorkspaceBackupPayload) => void;
  openUploadTrigger: number;
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

function getFileIcon(mimeType: string, fileName: string) {
  if (mimeType === DRIVE_FOLDER_MIME) {
    return <Folder className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />;
  }
  if (mimeType === 'application/json' || fileName.toLowerCase().endsWith('.json')) {
    return <FileJson className="w-4 h-4 text-indigo-600 shrink-0" aria-hidden="true" />;
  }
  if (
    mimeType === 'application/vnd.google-apps.spreadsheet' ||
    mimeType.includes('csv') ||
    fileName.toLowerCase().endsWith('.csv') ||
    fileName.toLowerCase().endsWith('.xlsx')
  ) {
    return <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />;
  }
  if (mimeType.startsWith('image/')) {
    return <ImageIcon className="w-4 h-4 text-sky-600 shrink-0" aria-hidden="true" />;
  }
  if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
    return <FileCode2 className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />;
  }
  return <FileText className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />;
}

export function DriveView({
  user,
  accessToken,
  isSigningIn,
  authError,
  onSignIn,
  onSignOut,
  onTokenExpired,
  tasks,
  members,
  machines,
  overtimeEntries,
  materials,
  incidents,
  onRestoreBackup,
  openUploadTrigger,
}: DriveViewProps) {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: 'root', name: 'Drive của tôi' },
  ]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [filterMode, setFilterMode] = useState<DriveFilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Modals requiring explicit confirmation for Drive mutations
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFile, setRenamingFile] = useState<DriveFile | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingFile, setDeletingFile] = useState<DriveFile | null>(null);
  const [overwritePrompt, setOverwritePrompt] = useState<{
    existingFile: DriveFile;
    fileName: string;
    mimeType: string;
    content: string;
    parentId: string;
  } | null>(null);
  const [pendingRestore, setPendingRestore] = useState<{
    fileName: string;
    payload: WorkspaceBackupPayload;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const currentFolder = breadcrumbs[breadcrumbs.length - 1];

  const handleApiError = useCallback(
    (err: unknown, fallbackMsg: string) => {
      if (err instanceof DriveApiError && err.status === 401) {
        onTokenExpired();
        setFeedback({
          type: 'error',
          message:
            'Phiên truy cập Google Drive đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.',
        });
        return;
      }
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : fallbackMsg,
      });
    },
    [onTokenExpired]
  );

  const fetchFiles = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const list = await listDriveFiles(accessToken, {
        folderId: currentFolder.id,
        search: searchQuery,
        filterMode,
      });
      setFiles(list);
    } catch (err) {
      handleApiError(err, 'Không thể tải danh sách tệp từ Google Drive.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, currentFolder.id, searchQuery, filterMode, handleApiError]);

  useEffect(() => {
    if (accessToken) {
      void fetchFiles();
    } else {
      setFiles([]);
    }
  }, [accessToken, fetchFiles]);

  useEffect(() => {
    if (openUploadTrigger > 0 && accessToken) {
      fileInputRef.current?.click();
    }
  }, [openUploadTrigger, accessToken]);

  const handleOpenTeamFolder = async () => {
    if (!accessToken) return;
    setBusyAction('team-folder');
    setFeedback(null);
    try {
      const folder = await findOrCreateAppDriveFolder(accessToken);
      setBreadcrumbs([
        { id: 'root', name: 'Drive của tôi' },
        { id: folder.id, name: folder.name },
      ]);
      setSearchQuery('');
      setFilterMode('all');
    } catch (err) {
      handleApiError(err, 'Không thể mở thư mục dữ liệu nhóm trên Google Drive.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleUploadLocalFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (selected.length === 0 || !accessToken) return;

    setBusyAction('upload');
    setFeedback(null);
    try {
      for (const file of selected) {
        await uploadFileToDrive(accessToken, {
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          content: file,
          parentId: currentFolder.id,
        });
      }
      setFeedback({
        type: 'success',
        message: `Đã tải lên ${selected.length} tệp vào "${currentFolder.name}" trên Google Drive.`,
      });
      await fetchFiles();
    } catch (err) {
      handleApiError(err, 'Tải tệp lên Google Drive thất bại.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveBackupToDrive = async () => {
    if (!accessToken) return;
    setBusyAction('backup');
    setFeedback(null);
    try {
      const folder =
        currentFolder.id === 'root'
          ? await findOrCreateAppDriveFolder(accessToken)
          : currentFolder;
      const today = getTodayIsoDate();
      const fileName = `sao-luu-tu-dong-hoa-${today}.json`;
      const jsonContent = buildBackupJson(
        members,
        tasks,
        overtimeEntries,
        today,
        materials,
        incidents,
        machines
      );

      const existing = await findFileInFolderByName(
        accessToken,
        fileName,
        folder.id
      );

      if (existing) {
        setOverwritePrompt({
          existingFile: existing,
          fileName,
          mimeType: 'application/json',
          content: jsonContent,
          parentId: folder.id,
        });
        setBusyAction(null);
        return;
      }

      await uploadFileToDrive(accessToken, {
        fileName,
        mimeType: 'application/json',
        content: jsonContent,
        parentId: folder.id,
      });

      setFeedback({
        type: 'success',
        message: `Đã lưu bản sao lưu "${fileName}" vào thư mục "${folder.name}" trên Google Drive.`,
      });
      if (currentFolder.id === folder.id) {
        await fetchFiles();
      }
    } catch (err) {
      handleApiError(err, 'Không thể lưu bản sao lưu lên Google Drive.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleExportWorkplanCsvToDrive = async () => {
    if (!accessToken) return;
    setBusyAction('export-csv');
    setFeedback(null);
    try {
      const folder =
        currentFolder.id === 'root'
          ? await findOrCreateAppDriveFolder(accessToken)
          : currentFolder;
      const today = getTodayIsoDate();
      const fileName = `ke-hoach-cong-viec-${today}.csv`;
      const csvContent = buildWorkplanCsv(tasks, members);

      await uploadFileToDrive(accessToken, {
        fileName,
        mimeType: 'text/csv',
        content: csvContent,
        parentId: folder.id,
      });

      setFeedback({
        type: 'success',
        message: `Đã xuất báo cáo CSV "${fileName}" lên thư mục "${folder.name}" trên Google Drive.`,
      });
      if (currentFolder.id === folder.id) {
        await fetchFiles();
      }
    } catch (err) {
      handleApiError(err, 'Không thể xuất CSV lên Google Drive.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleConfirmOverwrite = async (mode: 'overwrite' | 'new') => {
    if (!overwritePrompt || !accessToken) return;
    setBusyAction('overwrite');
    try {
      if (mode === 'overwrite') {
        await updateDriveFileContent(
          accessToken,
          overwritePrompt.existingFile.id,
          {
            fileName: overwritePrompt.fileName,
            mimeType: overwritePrompt.mimeType,
            content: overwritePrompt.content,
          }
        );
        setFeedback({
          type: 'success',
          message: `Đã cập nhật (ghi đè) tệp "${overwritePrompt.fileName}" trên Google Drive.`,
        });
      } else {
        const tsName = overwritePrompt.fileName.replace(
          '.json',
          `-${new Date().toTimeString().slice(0, 5).replace(':', '')}.json`
        );
        await uploadFileToDrive(accessToken, {
          fileName: tsName,
          mimeType: overwritePrompt.mimeType,
          content: overwritePrompt.content,
          parentId: overwritePrompt.parentId,
        });
        setFeedback({
          type: 'success',
          message: `Đã lưu bản sao lưu mới "${tsName}" lên Google Drive.`,
        });
      }
      setOverwritePrompt(null);
      await fetchFiles();
    } catch (err) {
      handleApiError(err, 'Không thể cập nhật tệp trên Google Drive.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateFolder = async () => {
    if (!accessToken || !newFolderName.trim()) return;
    setBusyAction('create-folder');
    setFeedback(null);
    try {
      await createDriveFolder(accessToken, newFolderName.trim(), currentFolder.id);
      setFeedback({
        type: 'success',
        message: `Đã tạo thư mục "${newFolderName.trim()}" trên Google Drive.`,
      });
      setIsNewFolderOpen(false);
      setNewFolderName('');
      await fetchFiles();
    } catch (err) {
      handleApiError(err, 'Không thể tạo thư mục trên Google Drive.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleConfirmRename = async () => {
    if (!accessToken || !renamingFile || !renameValue.trim()) return;
    setBusyAction('rename');
    setFeedback(null);
    try {
      const updated = await renameDriveFile(
        accessToken,
        renamingFile.id,
        renameValue.trim()
      );
      setFeedback({
        type: 'success',
        message: `Đã đổi tên tệp thành "${updated.name}" trên Google Drive.`,
      });
      setRenamingFile(null);
      setRenameValue('');
      await fetchFiles();
    } catch (err) {
      handleApiError(err, 'Không thể đổi tên tệp trên Google Drive.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!accessToken || !deletingFile) return;
    setBusyAction('delete');
    setFeedback(null);
    try {
      await deleteDriveFile(accessToken, deletingFile.id);
      setFeedback({
        type: 'success',
        message: `Đã xóa "${deletingFile.name}" khỏi Google Drive.`,
      });
      setDeletingFile(null);
      await fetchFiles();
    } catch (err) {
      handleApiError(err, 'Không thể xóa tệp trên Google Drive.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownloadDriveFile = async (file: DriveFile) => {
    if (!accessToken) return;
    setBusyAction(`download-${file.id}`);
    try {
      const blob = await downloadDriveFileBlob(accessToken, file.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      handleApiError(err, `Không thể tải xuống tệp "${file.name}".`);
    } finally {
      setBusyAction(null);
    }
  };

  const handlePrepareRestoreFromDrive = async (file: DriveFile) => {
    if (!accessToken) return;
    setBusyAction(`restore-${file.id}`);
    setFeedback(null);
    try {
      const text = await downloadDriveFileText(accessToken, file.id);
      const res = parseAndValidateBackupJson(text);
      if (!res.ok || !res.data) {
        setFeedback({
          type: 'error',
          message:
            res.error ??
            `Tệp "${file.name}" không phải bản sao lưu TỰ ĐỘNG HOÁ hợp lệ.`,
        });
        return;
      }
      setPendingRestore({ fileName: file.name, payload: res.data });
    } catch (err) {
      handleApiError(err, `Không thể đọc bản sao lưu "${file.name}" từ Drive.`);
    } finally {
      setBusyAction(null);
    }
  };

  if (!accessToken) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-10 max-w-2xl mx-auto text-center space-y-5">
        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto">
          <Cloud className="w-6 h-6 text-[#2563EB]" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">
            Kết nối Google Drive cho nhóm TỰ ĐỘNG HOÁ
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
            Đăng nhập bằng tài khoản Google của bạn để duyệt tệp dự án, tải lên
            bản vẽ/tài liệu, lưu &amp; khôi phục bản sao lưu JSON toàn bộ dữ liệu
            nhóm, hoặc đính kèm tài liệu Drive vào công việc và sự cố.
          </p>
        </div>

        {authError && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-xs text-red-800 text-left"
          >
            {authError}
          </div>
        )}

        <div className="flex justify-center pt-1">
          <GoogleSignInButton
            onClick={() => void onSignIn()}
            isLoading={isSigningIn}
          />
        </div>

        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left text-xs text-slate-600">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <p className="font-semibold text-slate-900">Sao lưu &amp; Khôi phục</p>
            <p className="mt-1 leading-relaxed">
              Lưu trực tiếp bản sao lưu JSON và báo cáo CSV vào thư mục{' '}
              <span className="font-medium">{APP_DRIVE_FOLDER_NAME}</span>.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <p className="font-semibold text-slate-900">Quản lý tài liệu máy</p>
            <p className="mt-1 leading-relaxed">
              Tạo thư mục, tải lên sơ đồ đấu nối, bản vẽ CAD/PDF và tìm kiếm
              nhanh theo tên tệp.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <p className="font-semibold text-slate-900">Đính kèm vào đầu việc</p>
            <p className="mt-1 leading-relaxed">
              Chọn trực tiếp file từ Google Drive khi thêm mới hoặc sửa công việc
              và nhật ký sự cố.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleUploadLocalFiles}
        className="sr-only"
      />

      {/* Account & Quick Cloud Actions Bar */}
      <section
        aria-label="Tài khoản và thao tác Google Drive"
        className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3 min-w-0">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName ?? 'Google Account'}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-xs font-bold text-[#2563EB] shrink-0">
              {(user?.displayName || user?.email || 'G')[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-900 truncate">
                {user?.displayName || 'Tài khoản Google'}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                Đã kết nối Drive
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busyAction !== null}
            onClick={handleOpenTeamFolder}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Folder className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
            <span>Thư mục nhóm</span>
          </button>

          <button
            type="button"
            disabled={busyAction !== null}
            onClick={() => void handleSaveBackupToDrive()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#2563EB] rounded-lg hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            {busyAction === 'backup' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <FileJson className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>Lưu sao lưu JSON lên Drive</span>
          </button>

          <button
            type="button"
            disabled={busyAction !== null}
            onClick={() => void handleExportWorkplanCsvToDrive()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            {busyAction === 'export-csv' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            )}
            <span>Xuất CSV Công việc lên Drive</span>
          </button>

          <button
            type="button"
            onClick={() => void onSignOut()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </section>

      {feedback && (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`border rounded-lg px-4 py-3 text-sm flex items-center justify-between gap-3 ${
            feedback.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {feedback.type === 'success' && (
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Đóng thông báo"
            className="p-1 opacity-70 hover:opacity-100 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Browser Toolbar: Breadcrumbs, Filters, Search & Upload */}
      <section
        aria-label="Thanh công cụ trình duyệt Google Drive"
        className="bg-white border border-slate-200 rounded-lg p-4 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Đường dẫn thư mục Drive" className="flex items-center flex-wrap gap-1 text-sm">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <div key={crumb.id} className="flex items-center gap-1">
                  {idx > 0 && (
                    <ChevronRight
                      className="w-4 h-4 text-slate-400"
                      aria-hidden="true"
                    />
                  )}
                  <button
                    type="button"
                    disabled={isLast}
                    onClick={() =>
                      setBreadcrumbs((prev) => prev.slice(0, idx + 1))
                    }
                    className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
                      isLast
                        ? 'bg-blue-50 text-[#2563EB] cursor-default'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer'
                    }`}
                  >
                    {crumb.name}
                  </button>
                </div>
              );
            })}
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => {
                setNewFolderName('');
                setIsNewFolderOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            >
              <FolderPlus className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
              <span>Tạo thư mục</span>
            </button>

            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer disabled:opacity-50"
            >
              {busyAction === 'upload' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>Tải tệp lên Drive</span>
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => void fetchFiles()}
              aria-label="Làm mới danh sách Drive"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div
            role="group"
            aria-label="Lọc loại tệp Google Drive"
            className="inline-flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg self-start"
          >
            {(
              [
                { id: 'all', label: 'Tất cả' },
                { id: 'folders', label: 'Thư mục' },
                { id: 'backups', label: 'Bản sao lưu JSON' },
                { id: 'docs', label: 'Tài liệu & Ảnh' },
              ] as const
            ).map((opt) => {
              const active = filterMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilterMode(opt.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64 sm:flex-initial">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Tìm tệp trên Google Drive"
                placeholder="Tìm tên tệp trên Drive..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-500 whitespace-nowrap">
              {files.length} mục
            </span>
          </div>
        </div>
      </section>

      {/* Files Table */}
      {isLoading && files.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg px-6 py-16 text-center">
          <Loader2
            className="w-6 h-6 animate-spin text-[#2563EB] mx-auto"
            aria-hidden="true"
          />
          <p className="mt-2.5 text-sm text-slate-500">
            Đang tải dữ liệu từ Google Drive...
          </p>
        </div>
      ) : files.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg px-6 py-14 text-center">
          <h2 className="text-base font-semibold text-slate-900">
            Không có tệp nào trong mục này
          </h2>
          <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">
            Bạn có thể tải tệp lên từ máy tính, tạo thư mục mới hoặc lưu bản sao
            lưu JSON của nhóm trực tiếp lên Google Drive.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th scope="col" className="py-3 px-4">
                    Tên tệp / Thư mục
                  </th>
                  <th scope="col" className="py-3 px-3 w-36">
                    Loại
                  </th>
                  <th scope="col" className="py-3 px-3 w-28 text-right">
                    Dung lượng
                  </th>
                  <th scope="col" className="py-3 px-3 w-40">
                    Cập nhật lần cuối
                  </th>
                  <th scope="col" className="py-3 px-4 text-right w-56">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {files.map((file) => {
                  const isFolder = file.mimeType === DRIVE_FOLDER_MIME;
                  const isJson =
                    file.mimeType === 'application/json' ||
                    file.name.toLowerCase().endsWith('.json');
                  const isGoogleWorkspaceDoc = file.mimeType.startsWith(
                    'application/vnd.google-apps.'
                  );

                  return (
                    <tr
                      key={file.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {getFileIcon(file.mimeType, file.name)}
                          {isFolder ? (
                            <button
                              type="button"
                              onClick={() => {
                                setBreadcrumbs((prev) => [
                                  ...prev,
                                  { id: file.id, name: file.name },
                                ]);
                                setSearchQuery('');
                              }}
                              className="font-semibold text-[#2563EB] hover:underline text-left truncate cursor-pointer"
                            >
                              {file.name}
                            </button>
                          ) : (
                            <span className="font-medium text-slate-900 truncate">
                              {file.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600 whitespace-nowrap">
                        {getDriveMimeLabel(file.mimeType, file.name)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-xs text-slate-500 whitespace-nowrap">
                        {isFolder ? '—' : formatDriveFileSize(file.size)}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-xs text-slate-500 whitespace-nowrap">
                        {formatDriveDateTimeVi(file.modifiedTime)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          {isJson && (
                            <button
                              type="button"
                              disabled={busyAction !== null}
                              onClick={() =>
                                void handlePrepareRestoreFromDrive(file)
                              }
                              title="Khôi phục dữ liệu từ bản sao lưu này"
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[#2563EB] bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 cursor-pointer disabled:opacity-50"
                            >
                              <RotateCcw className="w-3 h-3" aria-hidden="true" />
                              <span>Khôi phục</span>
                            </button>
                          )}

                          {!isFolder && !isGoogleWorkspaceDoc && (
                            <button
                              type="button"
                              disabled={busyAction !== null}
                              onClick={() => void handleDownloadDriveFile(file)}
                              aria-label={`Tải xuống ${file.name}`}
                              title="Tải xuống máy"
                              className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md cursor-pointer disabled:opacity-50"
                            >
                              <Download className="w-4 h-4" aria-hidden="true" />
                            </button>
                          )}

                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Mở ${file.name} trên Google Drive`}
                              title="Mở trên Google Drive"
                              className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md"
                            >
                              <ExternalLink
                                className="w-4 h-4"
                                aria-hidden="true"
                              />
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setRenamingFile(file);
                              setRenameValue(file.name);
                            }}
                            aria-label={`Đổi tên ${file.name}`}
                            title="Đổi tên"
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" aria-hidden="true" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingFile(file)}
                            aria-label={`Xóa ${file.name}`}
                            title="Xóa khỏi Drive"
                            className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-md cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-slate-200">
            {files.map((file) => {
              const isFolder = file.mimeType === DRIVE_FOLDER_MIME;
              const isJson =
                file.mimeType === 'application/json' ||
                file.name.toLowerCase().endsWith('.json');
              return (
                <article key={file.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="mt-0.5">
                        {getFileIcon(file.mimeType, file.name)}
                      </span>
                      <div className="min-w-0">
                        {isFolder ? (
                          <button
                            type="button"
                            onClick={() => {
                              setBreadcrumbs((prev) => [
                                ...prev,
                                { id: file.id, name: file.name },
                              ]);
                              setSearchQuery('');
                            }}
                            className="text-sm font-semibold text-[#2563EB] underline text-left break-all"
                          >
                            {file.name}
                          </button>
                        ) : (
                          <p className="text-sm font-semibold text-slate-900 break-all">
                            {file.name}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 mt-0.5 font-mono">
                          {getDriveMimeLabel(file.mimeType, file.name)} ·{' '}
                          {isFolder ? 'Thư mục' : formatDriveFileSize(file.size)}{' '}
                          · {formatDriveDateTimeVi(file.modifiedTime)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {isJson && (
                      <button
                        type="button"
                        onClick={() => void handlePrepareRestoreFromDrive(file)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#2563EB] bg-blue-50 border border-blue-200 rounded-md"
                      >
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Khôi phục</span>
                      </button>
                    )}
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md"
                      >
                        <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Mở trên Drive</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingFile(file);
                        setRenameValue(file.name);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md"
                    >
                      <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Đổi tên</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingFile(file)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Xóa</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {isNewFolderOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="drive-new-folder-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2
                id="drive-new-folder-title"
                className="text-base font-bold text-slate-900"
              >
                Tạo thư mục mới trên Google Drive
              </h2>
              <button
                type="button"
                onClick={() => setIsNewFolderOpen(false)}
                aria-label="Đóng hộp thoại tạo thư mục"
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-xs text-slate-500">
                Vị trí tạo: <strong className="text-slate-800">{currentFolder.name}</strong>
              </p>
              <input
                type="text"
                aria-label="Tên thư mục mới"
                placeholder="VD: Hồ sơ máy SQ2118..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleCreateFolder();
                  }
                }}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>
            <div className="px-6 py-3.5 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsNewFolderOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!newFolderName.trim() || busyAction === 'create-folder'}
                onClick={() => void handleCreateFolder()}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#2563EB] rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-50"
              >
                {busyAction === 'create-folder' ? 'Đang tạo...' : 'Tạo thư mục'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename File Confirmation Modal */}
      {renamingFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="drive-rename-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2
                id="drive-rename-title"
                className="text-base font-bold text-slate-900"
              >
                Xác nhận đổi tên trên Google Drive
              </h2>
              <button
                type="button"
                onClick={() => setRenamingFile(null)}
                aria-label="Đóng hộp thoại đổi tên"
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-xs text-slate-600">
                Tên hiện tại:{' '}
                <strong className="text-slate-900 break-all">
                  {renamingFile.name}
                </strong>
              </p>
              <input
                type="text"
                aria-label="Tên mới trên Google Drive"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleConfirmRename();
                  }
                }}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>
            <div className="px-6 py-3.5 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRenamingFile(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={
                  !renameValue.trim() ||
                  renameValue.trim() === renamingFile.name ||
                  busyAction === 'rename'
                }
                onClick={() => void handleConfirmRename()}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#2563EB] rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-50"
              >
                {busyAction === 'rename'
                  ? 'Đang đổi tên...'
                  : 'Xác nhận đổi tên'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Drive File Confirmation Modal */}
      {deletingFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="drive-delete-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2
                id="drive-delete-title"
                className="text-base font-bold text-slate-900"
              >
                Xác nhận xóa tệp trên Google Drive
              </h2>
              <button
                type="button"
                onClick={() => setDeletingFile(null)}
                aria-label="Đóng xác nhận xóa tệp Drive"
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="p-6 space-y-2.5 text-sm text-slate-700">
              <p>
                Bạn có chắc chắn muốn xóa mục sau khỏi Google Drive không? Thao
                tác này sẽ xóa vĩnh viễn tệp trên Drive của bạn.
              </p>
              <p className="font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 break-all">
                {deletingFile.name}
              </p>
            </div>
            <div className="px-6 py-3.5 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingFile(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={busyAction === 'delete'}
                onClick={() => void handleConfirmDelete()}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 cursor-pointer disabled:opacity-50"
              >
                {busyAction === 'delete'
                  ? 'Đang xóa...'
                  : 'Xác nhận xóa trên Drive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overwrite Existing Backup File Confirmation Modal */}
      {overwritePrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="drive-overwrite-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2
                id="drive-overwrite-title"
                className="text-base font-bold text-slate-900"
              >
                Tệp sao lưu đã tồn tại trên Google Drive
              </h2>
            </div>
            <div className="p-6 space-y-2.5 text-sm text-slate-700">
              <p>
                Tệp{' '}
                <strong className="font-mono text-slate-900 break-all">
                  {overwritePrompt.fileName}
                </strong>{' '}
                đã có trên Google Drive. Bạn muốn ghi đè nội dung mới lên tệp
                này hay tạo một tệp sao lưu mới?
              </p>
            </div>
            <div className="px-6 py-3.5 border-t border-slate-200 flex flex-wrap justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setOverwritePrompt(null)}
                className="px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={busyAction === 'overwrite'}
                onClick={() => void handleConfirmOverwrite('new')}
                className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-800 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 cursor-pointer disabled:opacity-50"
              >
                Lưu thành bản mới
              </button>
              <button
                type="button"
                disabled={busyAction === 'overwrite'}
                onClick={() => void handleConfirmOverwrite('overwrite')}
                className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-[#2563EB] rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-50"
              >
                {busyAction === 'overwrite'
                  ? 'Đang cập nhật...'
                  : 'Ghi đè tệp hiện có'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Backup Confirmation Modal */}
      {pendingRestore && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="drive-restore-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2
                id="drive-restore-title"
                className="text-base font-bold text-slate-900"
              >
                Xác nhận khôi phục dữ liệu từ Drive
              </h2>
            </div>
            <div className="p-6 space-y-2.5 text-sm text-slate-700">
              <p>
                Dữ liệu hiện tại trên trình duyệt sẽ được thay thế bằng bản sao
                lưu{' '}
                <strong className="font-mono text-slate-900 break-all">
                  {pendingRestore.fileName}
                </strong>{' '}
                (ngày{' '}
                <strong className="font-mono">
                  {pendingRestore.payload.exportedAt}
                </strong>
                ):
              </p>
              <ul className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 text-xs font-mono tabular-nums text-slate-800">
                <li>• Thành viên nhóm: {pendingRestore.payload.members.length}</li>
                {pendingRestore.payload.machines && (
                  <li>
                    • Danh mục Máy / Dự án:{' '}
                    {pendingRestore.payload.machines.length}
                  </li>
                )}
                <li>• Hạng mục công việc: {pendingRestore.payload.tasks.length}</li>
                <li>
                  • Bản ghi tăng ca:{' '}
                  {pendingRestore.payload.overtimeEntries.length}
                </li>
                {pendingRestore.payload.materials && (
                  <li>
                    • Vật tư &amp; linh kiện:{' '}
                    {pendingRestore.payload.materials.length}
                  </li>
                )}
                {pendingRestore.payload.incidents && (
                  <li>
                    • Nhật ký sự cố: {pendingRestore.payload.incidents.length}
                  </li>
                )}
              </ul>
            </div>
            <div className="px-6 py-3.5 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingRestore(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  onRestoreBackup(pendingRestore.payload);
                  setFeedback({
                    type: 'success',
                    message: `Đã khôi phục dữ liệu từ "${pendingRestore.fileName}" trên Google Drive.`,
                  });
                  setPendingRestore(null);
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#2563EB] rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                Xác nhận khôi phục
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
