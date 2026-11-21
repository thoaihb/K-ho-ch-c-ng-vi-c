import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  ChevronRight,
  Cloud,
  FileText,
  Folder,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import { AttachmentItem } from '../types/workplan';
import {
  DRIVE_FOLDER_MIME,
  DriveApiError,
  DriveFile,
  formatDriveDateTimeVi,
  formatDriveFileSize,
  getDriveMimeLabel,
  listDriveFiles,
} from '../services/googleDrive';
import { getTodayIsoDate } from '../utils/workplan';
import { GoogleSignInButton } from './GoogleSignInButton';

interface DrivePickerModalProps {
  isOpen: boolean;
  accessToken: string | null;
  isSigningIn: boolean;
  onSignIn: () => Promise<void>;
  onTokenExpired: () => void;
  onClose: () => void;
  onSelectFiles: (attachments: AttachmentItem[]) => void;
}

export function DrivePickerModal({
  isOpen,
  accessToken,
  isSigningIn,
  onSignIn,
  onTokenExpired,
  onClose,
  onSelectFiles,
}: DrivePickerModalProps) {
  const [breadcrumbs, setBreadcrumbs] = useState<
    Array<{ id: string; name: string }>
  >([{ id: 'root', name: 'Drive của tôi' }]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const currentFolder = breadcrumbs[breadcrumbs.length - 1];

  const loadFiles = useCallback(async () => {
    if (!accessToken || !isOpen) return;
    setIsLoading(true);
    setError('');
    try {
      const list = await listDriveFiles(accessToken, {
        folderId: currentFolder.id,
        search,
        pageSize: 40,
      });
      setFiles(list);
    } catch (err) {
      if (err instanceof DriveApiError && err.status === 401) {
        onTokenExpired();
        setError('Phiên Google Drive đã hết hạn. Vui lòng đăng nhập lại.');
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải danh sách tệp từ Google Drive.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, isOpen, currentFolder.id, search, onTokenExpired]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedIds(new Set());
    setError('');
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && accessToken) {
      void loadFiles();
    }
  }, [isOpen, accessToken, loadFiles]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleSelection = (fileId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const handleConfirmSelection = () => {
    const today = getTodayIsoDate();
    const chosen = files
      .filter((f) => selectedIds.has(f.id) && f.mimeType !== DRIVE_FOLDER_MIME)
      .map(
        (f): AttachmentItem => ({
          id: `drv-${f.id}-${Date.now().toString(36)}`,
          name: f.name,
          size: Number(f.size) || 0,
          mimeType: f.mimeType,
          externalUrl:
            f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
          addedAt: today,
        })
      );
    onSelectFiles(chosen);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drive-picker-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Cloud className="w-5 h-5 text-[#2563EB] shrink-0" aria-hidden="true" />
            <h2
              id="drive-picker-title"
              className="text-base font-bold text-slate-900 truncate"
            >
              Chọn file đính kèm từ Google Drive
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chọn file Drive"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {!accessToken ? (
          <div className="p-8 text-center space-y-4">
            <p className="text-sm text-slate-600">
              Đăng nhập bằng Google để duyệt và đính kèm tài liệu trực tiếp từ
              Google Drive của bạn.
            </p>
            {error && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <div className="flex justify-center">
              <GoogleSignInButton
                onClick={() => void onSignIn()}
                isLoading={isSigningIn}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 space-y-2.5">
              <div className="flex items-center flex-wrap gap-1 text-xs">
                {breadcrumbs.map((crumb, idx) => {
                  const isLast = idx === breadcrumbs.length - 1;
                  return (
                    <div key={crumb.id} className="flex items-center gap-1">
                      {idx > 0 && (
                        <ChevronRight
                          className="w-3.5 h-3.5 text-slate-400"
                          aria-hidden="true"
                        />
                      )}
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() =>
                          setBreadcrumbs((prev) => prev.slice(0, idx + 1))
                        }
                        className={`px-2 py-0.5 rounded font-semibold ${
                          isLast
                            ? 'bg-blue-100 text-[#2563EB]'
                            : 'text-slate-600 hover:bg-slate-200 cursor-pointer'
                        }`}
                      >
                        {crumb.name}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="relative">
                <Search
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  aria-label="Tìm tệp trên Google Drive"
                  placeholder="Tìm kiếm tài liệu, bản vẽ, hình ảnh..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
              {error && (
                <div className="p-4 text-xs text-red-700 bg-red-50">{error}</div>
              )}

              {isLoading ? (
                <div className="py-12 text-center">
                  <Loader2
                    className="w-5 h-5 animate-spin text-[#2563EB] mx-auto"
                    aria-hidden="true"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Đang tải tệp từ Google Drive...
                  </p>
                </div>
              ) : files.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  Không tìm thấy tệp phù hợp.
                </div>
              ) : (
                files.map((file) => {
                  const isFolder = file.mimeType === DRIVE_FOLDER_MIME;
                  const checked = selectedIds.has(file.id);
                  return (
                    <div
                      key={file.id}
                      className={`px-6 py-2.5 flex items-center justify-between gap-3 text-sm ${
                        checked ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      {isFolder ? (
                        <button
                          type="button"
                          onClick={() => {
                            setBreadcrumbs((prev) => [
                              ...prev,
                              { id: file.id, name: file.name },
                            ]);
                            setSearch('');
                          }}
                          className="flex-1 flex items-center gap-2.5 text-left min-w-0 cursor-pointer"
                        >
                          <Folder
                            className="w-4 h-4 text-amber-500 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="font-semibold text-[#2563EB] hover:underline truncate">
                            {file.name}
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleSelection(file.id)}
                          className="flex-1 flex items-center gap-3 text-left min-w-0 cursor-pointer"
                        >
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              checked
                                ? 'bg-[#2563EB] border-[#2563EB] text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {checked && (
                              <Check className="w-3 h-3" aria-hidden="true" />
                            )}
                          </span>
                          <FileText
                            className="w-4 h-4 text-slate-500 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium text-slate-900 truncate">
                              {file.name}
                            </span>
                            <span className="block text-[11px] font-mono text-slate-500">
                              {getDriveMimeLabel(file.mimeType, file.name)} ·{' '}
                              {formatDriveFileSize(file.size)} ·{' '}
                              {formatDriveDateTimeVi(file.modifiedTime)}
                            </span>
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-between gap-3">
              <span className="text-xs font-mono text-slate-500">
                Đã chọn {selectedIds.size} tệp
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={selectedIds.size === 0}
                  onClick={handleConfirmSelection}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#2563EB] rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-50"
                >
                  Đính kèm ({selectedIds.size})
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
