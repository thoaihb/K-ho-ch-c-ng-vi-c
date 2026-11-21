import { ChangeEvent, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  Download,
  FileJson,
  FileSpreadsheet,
  Loader2,
  Upload,
} from 'lucide-react';
import {
  DriveAuthProps,
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
  DriveApiError,
  DriveFile,
  findFileInFolderByName,
  findOrCreateAppDriveFolder,
  updateDriveFileContent,
  uploadFileToDrive,
} from '../services/googleDrive';
import { GoogleSignInButton } from './GoogleSignInButton';
import { buildMachinesCsv, computeMachineStats } from '../utils/machines';
import {
  buildIncidentsCsv,
  buildMaterialsCsv,
  computeIncidentStats,
  computeMaterialStats,
} from '../utils/operations';
import {
  buildBackupJson,
  buildOvertimeCsv,
  buildWorkplanCsv,
  computeMemberOvertimeBreakdown,
  computeOvertimeStats,
  formatHours,
  formatMonthVi,
  getMonthKey,
  parseAndValidateBackupJson,
  triggerTextDownload,
} from '../utils/overtime';
import { computeSummaryStats, getTodayIsoDate } from '../utils/workplan';

interface SummaryExportViewProps {
  tasks: WorkTask[];
  members: TeamMember[];
  machines: MachineProject[];
  overtimeEntries: OvertimeEntry[];
  materials: MaterialItem[];
  incidents: IncidentEntry[];
  driveAuth?: DriveAuthProps;
  onOpenDriveTab?: () => void;
  onRestoreBackup: (payload: WorkspaceBackupPayload) => void;
}

export function SummaryExportView({
  tasks,
  members,
  machines,
  overtimeEntries,
  materials,
  incidents,
  driveAuth,
  onOpenDriveTab,
  onRestoreBackup,
}: SummaryExportViewProps) {
  const defaultMonth = getMonthKey(getTodayIsoDate());
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [pendingRestore, setPendingRestore] =
    useState<WorkspaceBackupPayload | null>(null);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [driveOverwritePrompt, setDriveOverwritePrompt] = useState<{
    existingFile: DriveFile;
    fileName: string;
    content: string;
    parentId: string;
    folderName: string;
  } | null>(null);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    if (defaultMonth) set.add(defaultMonth);
    for (const entry of overtimeEntries) {
      const m = getMonthKey(entry.date);
      if (m) set.add(m);
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [overtimeEntries, defaultMonth]);

  const workStats = useMemo(() => computeSummaryStats(tasks), [tasks]);
  const machineStats = useMemo(() => computeMachineStats(machines), [machines]);
  const materialStats = useMemo(
    () => computeMaterialStats(materials),
    [materials]
  );
  const incidentStats = useMemo(
    () => computeIncidentStats(incidents),
    [incidents]
  );

  const monthlyOvertimeEntries = useMemo(() => {
    if (!selectedMonth) return overtimeEntries;
    return overtimeEntries.filter(
      (entry) => getMonthKey(entry.date) === selectedMonth
    );
  }, [overtimeEntries, selectedMonth]);

  const overtimeStats = useMemo(
    () => computeOvertimeStats(monthlyOvertimeEntries),
    [monthlyOvertimeEntries]
  );

  const memberRows = useMemo(
    () =>
      computeMemberOvertimeBreakdown(
        members,
        tasks,
        overtimeEntries,
        selectedMonth
      ),
    [members, tasks, overtimeEntries, selectedMonth]
  );

  const handleExportWorkplanCsv = () => {
    const csv = buildWorkplanCsv(tasks, members);
    triggerTextDownload(
      `ke-hoach-cong-viec-${getTodayIsoDate()}.csv`,
      csv,
      'text/csv;charset=utf-8;'
    );
    setFeedback({
      type: 'success',
      message: `Đã xuất file CSV Kế hoạch công việc (${tasks.length} hạng mục).`,
    });
  };

  const handleExportOvertimeCsv = (scope: 'month' | 'all') => {
    const targetEntries =
      scope === 'month' ? monthlyOvertimeEntries : overtimeEntries;
    const csv = buildOvertimeCsv(targetEntries, members);
    const suffix =
      scope === 'month' && selectedMonth ? selectedMonth : 'toan-bo';
    triggerTextDownload(
      `bao-gio-tang-ca-${suffix}.csv`,
      csv,
      'text/csv;charset=utf-8;'
    );
    setFeedback({
      type: 'success',
      message: `Đã xuất file CSV Báo giờ tăng ca (${targetEntries.length} bản ghi).`,
    });
  };

  const handleExportMaterialsCsv = () => {
    const csv = buildMaterialsCsv(materials);
    triggerTextDownload(
      `vat-tu-linh-kien-${getTodayIsoDate()}.csv`,
      csv,
      'text/csv;charset=utf-8;'
    );
    setFeedback({
      type: 'success',
      message: `Đã xuất file CSV Vật tư & Linh kiện (${materials.length} mục).`,
    });
  };

  const handleExportIncidentsCsv = () => {
    const csv = buildIncidentsCsv(incidents, members);
    triggerTextDownload(
      `nhat-ky-su-co-${getTodayIsoDate()}.csv`,
      csv,
      'text/csv;charset=utf-8;'
    );
    setFeedback({
      type: 'success',
      message: `Đã xuất file CSV Nhật ký sự cố (${incidents.length} bản ghi).`,
    });
  };

  const handleExportMachinesCsv = () => {
    const csv = buildMachinesCsv(machines, tasks, materials, incidents);
    triggerTextDownload(
      `danh-muc-may-du-an-${getTodayIsoDate()}.csv`,
      csv,
      'text/csv;charset=utf-8;'
    );
    setFeedback({
      type: 'success',
      message: `Đã xuất file CSV Danh mục Máy / Dự án (${machines.length} máy).`,
    });
  };

  const handleDownloadBackupJson = () => {
    const json = buildBackupJson(
      members,
      tasks,
      overtimeEntries,
      getTodayIsoDate(),
      materials,
      incidents,
      machines
    );
    triggerTextDownload(
      `sao-luu-tu-dong-hoa-${getTodayIsoDate()}.json`,
      json,
      'application/json;charset=utf-8;'
    );
    setFeedback({
      type: 'success',
      message: 'Đã tải xuống tệp sao lưu JSON toàn bộ dữ liệu.',
    });
  };

  const handleSelectRestoreFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const text = await file.text();
    const res = parseAndValidateBackupJson(text);
    if (!res.ok || !res.data) {
      setFeedback({
        type: 'error',
        message: res.error ?? 'Tệp sao lưu JSON không hợp lệ.',
      });
      return;
    }
    setFeedback(null);
    setPendingRestore(res.data);
  };

  const handleConfirmRestore = () => {
    if (!pendingRestore) return;
    onRestoreBackup(pendingRestore);
    const macCount = pendingRestore.machines?.length ?? 0;
    const matCount = pendingRestore.materials?.length ?? 0;
    const incCount = pendingRestore.incidents?.length ?? 0;
    setFeedback({
      type: 'success',
      message: `Đã khôi phục ${macCount} máy/dự án, ${pendingRestore.tasks.length} công việc, ${pendingRestore.overtimeEntries.length} bản ghi tăng ca, ${matCount} vật tư, ${incCount} sự cố và ${pendingRestore.members.length} thành viên.`,
    });
    setPendingRestore(null);
  };

  const handleQuickBackupToDrive = async () => {
    if (!driveAuth?.accessToken) return;
    setIsSyncingDrive(true);
    setFeedback(null);
    try {
      const folder = await findOrCreateAppDriveFolder(driveAuth.accessToken);
      const today = getTodayIsoDate();
      const fileName = `sao-luu-tu-dong-hoa-${today}.json`;
      const content = buildBackupJson(
        members,
        tasks,
        overtimeEntries,
        today,
        materials,
        incidents,
        machines
      );

      const existing = await findFileInFolderByName(
        driveAuth.accessToken,
        fileName,
        folder.id
      );

      if (existing) {
        setDriveOverwritePrompt({
          existingFile: existing,
          fileName,
          content,
          parentId: folder.id,
          folderName: folder.name,
        });
        setIsSyncingDrive(false);
        return;
      }

      await uploadFileToDrive(driveAuth.accessToken, {
        fileName,
        mimeType: 'application/json',
        content,
        parentId: folder.id,
      });
      setFeedback({
        type: 'success',
        message: `Đã lưu bản sao lưu "${fileName}" lên Google Drive (thư mục "${folder.name}").`,
      });
    } catch (err) {
      if (err instanceof DriveApiError && err.status === 401) {
        driveAuth.onTokenExpired();
        setFeedback({
          type: 'error',
          message:
            'Phiên Google Drive đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.',
        });
      } else {
        setFeedback({
          type: 'error',
          message:
            err instanceof Error
              ? err.message
              : 'Không thể lưu bản sao lưu lên Google Drive.',
        });
      }
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const handleConfirmDriveOverwrite = async (mode: 'overwrite' | 'new') => {
    if (!driveOverwritePrompt || !driveAuth?.accessToken) return;
    setIsSyncingDrive(true);
    try {
      if (mode === 'overwrite') {
        await updateDriveFileContent(
          driveAuth.accessToken,
          driveOverwritePrompt.existingFile.id,
          {
            fileName: driveOverwritePrompt.fileName,
            mimeType: 'application/json',
            content: driveOverwritePrompt.content,
          }
        );
        setFeedback({
          type: 'success',
          message: `Đã cập nhật (ghi đè) tệp "${driveOverwritePrompt.fileName}" trong "${driveOverwritePrompt.folderName}" trên Google Drive.`,
        });
      } else {
        const tsName = driveOverwritePrompt.fileName.replace(
          '.json',
          `-${new Date().toTimeString().slice(0, 5).replace(':', '')}.json`
        );
        await uploadFileToDrive(driveAuth.accessToken, {
          fileName: tsName,
          mimeType: 'application/json',
          content: driveOverwritePrompt.content,
          parentId: driveOverwritePrompt.parentId,
        });
        setFeedback({
          type: 'success',
          message: `Đã lưu bản sao lưu mới "${tsName}" vào "${driveOverwritePrompt.folderName}" trên Google Drive.`,
        });
      }
      setDriveOverwritePrompt(null);
    } catch (err) {
      if (err instanceof DriveApiError && err.status === 401) {
        driveAuth.onTokenExpired();
        setFeedback({
          type: 'error',
          message:
            'Phiên Google Drive đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.',
        });
      } else {
        setFeedback({
          type: 'error',
          message:
            err instanceof Error
              ? err.message
              : 'Không thể cập nhật tệp trên Google Drive.',
        });
      }
    } finally {
      setIsSyncingDrive(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Month Selection Bar */}
      <section
        aria-label="Kỳ thống kê báo cáo"
        className="bg-white border border-slate-200 rounded-lg px-4 py-3.5 flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Bảng điều khiển tổng quan hoạt động nhóm
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi tiến độ dự án, giờ tăng ca theo tháng, tình trạng vật tư
            và nhật ký sự cố kỹ thuật
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="summary-month-select"
            className="text-xs font-medium text-slate-600 whitespace-nowrap"
          >
            Tháng thống kê:
          </label>
          <select
            id="summary-month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-9 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          >
            <option value="">Tất cả các tháng</option>
            {availableMonths.map((monthKey) => (
              <option key={monthKey} value={monthKey}>
                {formatMonthVi(monthKey)}
              </option>
            ))}
          </select>
        </div>
      </section>

      {feedback && (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`border rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${
            feedback.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {feedback.type === 'success' && (
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Overview Stat Grid */}
      <section
        aria-label="Thẻ thống kê nhanh"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 bg-white border border-slate-200 rounded-lg divide-y md:divide-y-0 md:divide-x divide-slate-200"
      >
        <div className="p-4 space-y-1.5">
          <p className="text-xs font-medium text-indigo-700">
            Danh mục Máy / Dự án
          </p>
          <p
            data-testid="summary-machines-total"
            className="text-2xl font-bold font-mono tabular-nums text-slate-900"
          >
            {machineStats.total}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 font-mono tabular-nums">
            <span>Triển khai: {machineStats.inProgress}</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-700">Giao: {machineStats.delivered}</span>
          </div>
        </div>

        <div className="p-4 space-y-1.5">
          <p className="text-xs font-medium text-slate-500">
            Tổng hạng mục công việc
          </p>
          <p
            data-testid="summary-total-tasks"
            className="text-2xl font-bold font-mono tabular-nums text-slate-900"
          >
            {workStats.total}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 font-mono tabular-nums">
            <span>Đang làm: {workStats.inProgress}</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-700">Xong: {workStats.completed}</span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-700">Dừng: {workStats.paused}</span>
          </div>
        </div>

        <div className="p-4 space-y-2">
          <p className="text-xs font-medium text-blue-700">
            Tiến độ trung bình
          </p>
          <p
            data-testid="summary-avg-progress"
            className="text-2xl font-bold font-mono tabular-nums text-slate-900"
          >
            {workStats.averageProgress}%
          </p>
          <div
            className="h-2 w-full bg-slate-100 rounded-full overflow-hidden"
            aria-hidden="true"
          >
            <div
              className="h-full bg-[#2563EB] rounded-full transition-all duration-200"
              style={{ width: `${workStats.averageProgress}%` }}
            />
          </div>
        </div>

        <div className="p-4 space-y-1.5">
          <p className="text-xs font-medium text-emerald-700">
            Tăng ca {selectedMonth ? formatMonthVi(selectedMonth) : 'toàn bộ'}
          </p>
          <div className="flex items-baseline gap-2">
            <span
              data-testid="summary-overtime-hours"
              className="text-2xl font-bold font-mono tabular-nums text-slate-900"
            >
              {formatHours(overtimeStats.totalHours)}
            </span>
            <span className="text-xs font-mono tabular-nums font-semibold text-blue-700">
              ({formatHours(overtimeStats.totalWeightedHours)} quy đổi)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono tabular-nums">
            {overtimeStats.count} lượt ghi nhận
          </p>
        </div>

        <div className="p-4 space-y-1.5">
          <p className="text-xs font-medium text-amber-700">
            Vật tư & Linh kiện
          </p>
          <p
            data-testid="summary-materials-total"
            className="text-2xl font-bold font-mono tabular-nums text-slate-900"
          >
            {materialStats.total}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono tabular-nums text-slate-600">
            <span className="text-amber-700">
              Cần đặt: {materialStats.toOrder}
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-blue-700">Đặt: {materialStats.ordered}</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-700">
              Kho: {materialStats.inStock}
            </span>
          </div>
        </div>

        <div className="p-4 space-y-1.5">
          <p className="text-xs font-medium text-red-700">Nhật ký sự cố</p>
          <p
            data-testid="summary-incidents-total"
            className="text-2xl font-bold font-mono tabular-nums text-slate-900"
          >
            {incidentStats.total}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono tabular-nums text-slate-600">
            <span className="text-red-700">
              Xử lý: {incidentStats.inProgress}
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-700">
              Xong: {incidentStats.resolved}
            </span>
          </div>
        </div>
      </section>

      {/* Export & Backup Actions */}
      <section
        aria-label="Xuất báo cáo và sao lưu dữ liệu"
        className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
      >
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Xuất báo cáo & Sao lưu dữ liệu
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Tệp CSV sử dụng chuẩn UTF-8 BOM mở trực tiếp trên Excel; tệp JSON
            sao lưu toàn bộ công việc, tăng ca, vật tư, sự cố và thành viên.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={handleExportMachinesCsv}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Xuất CSV Danh mục Máy</span>
          </button>

          <button
            type="button"
            onClick={handleExportWorkplanCsv}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
            <span>Xuất CSV Công việc</span>
          </button>

          <button
            type="button"
            onClick={() => handleExportOvertimeCsv('month')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download
              className="w-4 h-4 text-slate-600 shrink-0"
              aria-hidden="true"
            />
            <span>
              Xuất CSV Tăng ca ({selectedMonth ? 'tháng' : 'tất cả'})
            </span>
          </button>

          <button
            type="button"
            onClick={handleExportMaterialsCsv}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download
              className="w-4 h-4 text-slate-600 shrink-0"
              aria-hidden="true"
            />
            <span>Xuất CSV Vật tư & Linh kiện</span>
          </button>

          <button
            type="button"
            onClick={handleExportIncidentsCsv}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download
              className="w-4 h-4 text-slate-600 shrink-0"
              aria-hidden="true"
            />
            <span>Xuất CSV Nhật ký sự cố</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadBackupJson}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <FileJson
              className="w-4 h-4 text-slate-600 shrink-0"
              aria-hidden="true"
            />
            <span>Sao lưu toàn bộ (JSON)</span>
          </button>

          <label className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap">
            <Upload
              className="w-4 h-4 text-slate-600 shrink-0"
              aria-hidden="true"
            />
            <span>Khôi phục từ JSON</span>
            <input
              type="file"
              accept="application/json,.json"
              onChange={handleSelectRestoreFile}
              className="sr-only"
            />
          </label>
        </div>

        {driveAuth && (
          <div className="pt-4 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0 mt-0.5">
                <Cloud className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Đồng bộ &amp; Sao lưu Google Drive
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {driveAuth.accessToken
                    ? `Đang kết nối${
                        driveAuth.userEmail ? ` (${driveAuth.userEmail})` : ''
                      }. Lưu trực tiếp bản sao lưu JSON vào thư mục "${APP_DRIVE_FOLDER_NAME}".`
                    : `Kết nối Google Drive để lưu bản sao lưu JSON và báo cáo trực tiếp vào thư mục "${APP_DRIVE_FOLDER_NAME}".`}
                </p>
              </div>
            </div>

            {!driveAuth.accessToken ? (
              <div className="shrink-0">
                <GoogleSignInButton
                  onClick={() => void driveAuth.onSignIn()}
                  isLoading={driveAuth.isSigningIn}
                />
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  disabled={isSyncingDrive}
                  onClick={() => void handleQuickBackupToDrive()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  {isSyncingDrive ? (
                    <Loader2
                      className="w-3.5 h-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <FileJson className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>Lưu sao lưu JSON lên Drive</span>
                </button>
                {onOpenDriveTab && (
                  <button
                    type="button"
                    onClick={onOpenDriveTab}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Cloud className="w-3.5 h-3.5 text-[#2563EB]" aria-hidden="true" />
                    <span>Mở Google Drive</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Member Breakdown Table */}
      <section
        aria-label="Tổng hợp theo thành viên"
        className="bg-white border border-slate-200 rounded-lg overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900">
            Phân bổ công việc & giờ tăng ca theo thành viên
          </h3>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            {members.length} thành viên
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th scope="col" className="py-3 px-4 text-center w-12">
                  STT
                </th>
                <th scope="col" className="py-3 px-4">
                  Thành viên
                </th>
                <th scope="col" className="py-3 px-4">
                  Vai trò
                </th>
                <th
                  scope="col"
                  className="py-3 px-4 text-right whitespace-nowrap"
                >
                  Số công việc
                </th>
                <th
                  scope="col"
                  className="py-3 px-4 text-right whitespace-nowrap"
                >
                  Tiến độ TB
                </th>
                <th
                  scope="col"
                  className="py-3 px-4 text-right whitespace-nowrap"
                >
                  Tăng ca thực tế
                </th>
                <th
                  scope="col"
                  className="py-3 px-4 text-right whitespace-nowrap"
                >
                  Tăng ca quy đổi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {memberRows.map((row, idx) => (
                <tr key={row.member.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 text-center font-mono tabular-nums text-xs text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                    {row.member.name}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                    {row.member.role}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-800">
                    {row.taskCount}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-800">
                    {row.averageTaskProgress}%
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs font-semibold text-slate-900">
                    {formatHours(row.overtimeHours)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs font-semibold text-blue-700">
                    {formatHours(row.weightedOvertimeHours)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Restore JSON Confirmation Modal */}
      {pendingRestore && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="restore-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2
                id="restore-modal-title"
                className="text-base font-bold text-slate-900"
              >
                Xác nhận khôi phục dữ liệu
              </h2>
            </div>

            <div className="p-6 space-y-2 text-sm text-slate-700">
              <p>
                Dữ liệu hiện tại trên trình duyệt sẽ được thay thế bằng bản sao
                lưu từ ngày{' '}
                <strong className="font-mono">
                  {pendingRestore.exportedAt}
                </strong>
                :
              </p>
              <ul className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 text-xs font-mono tabular-nums text-slate-800">
                <li>• Thành viên nhóm: {pendingRestore.members.length}</li>
                {pendingRestore.machines && (
                  <li>
                    • Danh mục Máy / Dự án: {pendingRestore.machines.length}
                  </li>
                )}
                <li>• Hạng mục công việc: {pendingRestore.tasks.length}</li>
                <li>
                  • Bản ghi tăng ca: {pendingRestore.overtimeEntries.length}
                </li>
                {pendingRestore.materials && (
                  <li>
                    • Vật tư & linh kiện: {pendingRestore.materials.length}
                  </li>
                )}
                {pendingRestore.incidents && (
                  <li>• Nhật ký sự cố: {pendingRestore.incidents.length}</li>
                )}
              </ul>
            </div>

            <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingRestore(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#2563EB] rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                Xác nhận khôi phục
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drive Overwrite Confirmation Modal */}
      {driveOverwritePrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="summary-drive-overwrite-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2
                id="summary-drive-overwrite-title"
                className="text-base font-bold text-slate-900"
              >
                Bản sao lưu hôm nay đã tồn tại trên Drive
              </h2>
            </div>
            <div className="p-6 text-sm text-slate-700 space-y-2">
              <p>
                Thư mục{' '}
                <strong className="text-slate-900">
                  {driveOverwritePrompt.folderName}
                </strong>{' '}
                đã có tệp{' '}
                <strong className="font-mono text-slate-900">
                  {driveOverwritePrompt.fileName}
                </strong>
                . Bạn muốn ghi đè bản cũ hay lưu thành tệp mới kèm giờ?
              </p>
            </div>
            <div className="px-6 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDriveOverwritePrompt(null)}
                className="px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isSyncingDrive}
                onClick={() => void handleConfirmDriveOverwrite('new')}
                className="px-3.5 py-2 text-sm font-semibold text-slate-800 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                Lưu thành tệp mới
              </button>
              <button
                type="button"
                disabled={isSyncingDrive}
                onClick={() => void handleConfirmDriveOverwrite('overwrite')}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#2563EB] rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                Ghi đè bản hiện có
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
