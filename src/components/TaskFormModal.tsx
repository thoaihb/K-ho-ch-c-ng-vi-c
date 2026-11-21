import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { Check, Circle, Cloud, Paperclip, Plus, Trash2, Upload, X } from 'lucide-react';
import {
  AttachmentItem,
  DriveAuthProps,
  MachineProject,
  TASK_STATUSES,
  TaskStatus,
  TeamMember,
  WorkTask,
} from '../types/workplan';
import { findMachineForRecord } from '../utils/machines';
import {
  clampProgress,
  formatFileSize,
  getTodayIsoDate,
  resolveProgressForStatus,
} from '../utils/workplan';
import { DrivePickerModal } from './DrivePickerModal';
import {
  MachineSelectWithQuickAdd,
  QuickAddMachineInput,
} from './MachineSelectWithQuickAdd';

interface TaskFormModalProps {
  isOpen: boolean;
  editingTask: WorkTask | null;
  defaultMachineId?: string;
  members: TeamMember[];
  machines: MachineProject[];
  driveAuth?: DriveAuthProps;
  onClose: () => void;
  onQuickCreateMachine: (data: QuickAddMachineInput) => MachineProject;
  onSave: (taskData: Omit<WorkTask, 'id'>, existingId?: string) => void;
}

const MAX_INLINE_FILE_BYTES = 512 * 1024; // 512 KB per file for safe localStorage persistence

export function TaskFormModal({
  isOpen,
  editingTask,
  defaultMachineId,
  members,
  machines,
  driveAuth,
  onClose,
  onQuickCreateMachine,
  onSave,
}: TaskFormModalProps) {
  const [createdAt, setCreatedAt] = useState(getTodayIsoDate());
  const [machineId, setMachineId] = useState('');
  const [mainContent, setMainContent] = useState('');
  const [detailContent, setDetailContent] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [status, setStatus] = useState<TaskStatus>('Đang thực hiện');
  const [progress, setProgress] = useState<number>(0);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [notes, setNotes] = useState('');
  const [customFileName, setCustomFileName] = useState('');
  const [fileNotice, setFileNotice] = useState('');
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const machinesRef = useRef(machines);
  machinesRef.current = machines;
  const membersRef = useRef(members);
  membersRef.current = members;

  useEffect(() => {
    if (!isOpen) return;
    const currentMachines = machinesRef.current;
    const currentMembers = membersRef.current;
    if (editingTask) {
      const matched = findMachineForRecord(
        currentMachines,
        editingTask.machineId,
        editingTask.mainContent
      );
      setCreatedAt(editingTask.createdAt);
      setMachineId(matched?.id ?? editingTask.machineId ?? '');
      setMainContent(matched?.name ?? editingTask.mainContent);
      setDetailContent(editingTask.detailContent);
      setTargetDate(editingTask.targetDate);
      setAssigneeId(editingTask.assigneeId);
      setStatus(editingTask.status);
      setProgress(clampProgress(editingTask.progress));
      setAttachments(editingTask.attachments);
      setNotes(editingTask.notes);
    } else {
      const preselected = defaultMachineId
        ? currentMachines.find((m) => m.id === defaultMachineId)
        : undefined;
      setCreatedAt(getTodayIsoDate());
      setMachineId(preselected?.id ?? '');
      setMainContent(preselected?.name ?? '');
      setDetailContent('');
      setTargetDate('');
      setAssigneeId(currentMembers[0]?.id ?? '');
      setStatus('Đang thực hiện');
      setProgress(0);
      setAttachments([]);
      setNotes('');
    }
    setCustomFileName('');
    setFileNotice('');
    setIsDrivePickerOpen(false);
    setErrors({});
  }, [isOpen, editingTask, defaultMachineId]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setFileNotice('');
    const added: AttachmentItem[] = [];
    let largeFileCount = 0;

    for (const file of files) {
      if (file.size <= MAX_INLINE_FILE_BYTES) {
        const dataUrl = await new Promise<string | undefined>((resolve) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve(typeof reader.result === 'string' ? reader.result : undefined);
          reader.onerror = () => resolve(undefined);
          reader.readAsDataURL(file);
        });
        added.push({
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          dataUrl,
          addedAt: getTodayIsoDate(),
        });
      } else {
        largeFileCount += 1;
        added.push({
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          addedAt: getTodayIsoDate(),
        });
      }
    }

    setAttachments((prev) => [...prev, ...added]);
    if (largeFileCount > 0) {
      setFileNotice(
        'File lớn hơn 512 KB chỉ lưu thông tin tên file để tránh vượt giới hạn bộ nhớ trình duyệt.'
      );
    }
    e.target.value = '';
  };

  const handleAddCustomAttachment = () => {
    const trimmed = customFileName.trim();
    if (!trimmed) return;
    const isUrl = /^https?:\/\//i.test(trimmed);
    const displayName = isUrl
      ? trimmed.split('/').filter(Boolean).pop() || trimmed
      : trimmed;

    setAttachments((prev) => [
      ...prev,
      {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: displayName,
        size: 0,
        mimeType: isUrl ? 'text/uri-list' : 'application/octet-stream',
        externalUrl: isUrl ? trimmed : undefined,
        addedAt: getTodayIsoDate(),
      },
    ]);
    setCustomFileName('');
  };

  const handleRemoveAttachment = (attId: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== attId));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (!createdAt) {
      nextErrors.createdAt = 'Vui lòng chọn ngày tạo.';
    }
    if (!mainContent.trim()) {
      nextErrors.mainContent = 'Vui lòng chọn máy / dự án từ danh mục.';
    }
    if (!targetDate) {
      nextErrors.targetDate = 'Vui lòng chọn ngày kế hoạch hoàn thành.';
    }
    if (!assigneeId) {
      nextErrors.assigneeId = 'Vui lòng chọn người đảm nhận.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSave(
      {
        createdAt,
        ...(machineId ? { machineId } : {}),
        mainContent: mainContent.trim(),
        detailContent: detailContent.trim(),
        targetDate,
        assigneeId,
        status,
        progress: clampProgress(progress),
        attachments,
        notes: notes.trim(),
      },
      editingTask?.id
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <h2
            id="task-modal-title"
            className="text-base font-bold text-slate-900"
          >
            {editingTask ? 'Chỉnh sửa hạng mục công việc' : 'Thêm hạng mục mới'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng biểu mẫu"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="task-created-at"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Ngày tạo <span className="text-red-600">*</span>
              </label>
              <input
                id="task-created-at"
                type="date"
                value={createdAt}
                onChange={(e) => setCreatedAt(e.target.value)}
                className="w-full h-10 px-3 text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
              />
              {errors.createdAt && (
                <p className="mt-1 text-xs text-red-600">{errors.createdAt}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="task-target-date"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Kế hoạch hoàn thành <span className="text-red-600">*</span>
              </label>
              <input
                id="task-target-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full h-10 px-3 text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
              />
              {errors.targetDate && (
                <p className="mt-1 text-xs text-red-600">{errors.targetDate}</p>
              )}
            </div>
          </div>

          <MachineSelectWithQuickAdd
            id="task-main-content"
            label="Nội dung chính (Máy / Dự án)"
            machines={machines}
            selectedMachineId={machineId}
            legacyFallbackName={mainContent}
            error={errors.mainContent}
            onChange={(sel) => {
              setMachineId(sel.machineId);
              setMainContent(sel.machineName);
            }}
            onQuickCreateMachine={onQuickCreateMachine}
          />

          <div>
            <label
              htmlFor="task-detail-content"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Nội dung chi tiết
            </label>
            <textarea
              id="task-detail-content"
              rows={3}
              placeholder="Mô tả thông số kỹ thuật, phạm vi công việc hoặc tiêu chuẩn nghiệm thu..."
              value={detailContent}
              onChange={(e) => setDetailContent(e.target.value)}
              className="w-full p-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-5">
              <label
                htmlFor="task-assignee"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Người đảm nhận <span className="text-red-600">*</span>
              </label>
              <select
                id="task-assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
              >
                <option value="">-- Chọn thành viên nhóm --</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
              {errors.assigneeId && (
                <p className="mt-1 text-xs text-red-600">{errors.assigneeId}</p>
              )}
            </div>

            <div className="sm:col-span-7">
              <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                Trạng thái <span className="text-red-600">*</span>
              </span>
              <div
                role="radiogroup"
                aria-label="Chọn trạng thái công việc"
                className="grid grid-cols-3 gap-1.5"
              >
                {TASK_STATUSES.map((option) => {
                  const selected = status === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        setStatus(option);
                        setProgress((prev) =>
                          resolveProgressForStatus(prev, option)
                        );
                      }}
                      className={`h-10 px-2 flex items-center justify-center gap-1 text-xs rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                        selected
                          ? 'bg-blue-50 border-blue-600 text-blue-800 font-semibold'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {selected ? (
                        <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 shrink-0 text-slate-300" aria-hidden="true" />
                      )}
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="task-progress-range"
                className="text-xs font-semibold text-slate-700"
              >
                Tiến độ hoàn thành (%)
              </label>
              <span className="text-xs font-mono tabular-nums font-semibold text-blue-700">
                {progress}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="task-progress-range"
                type="range"
                min={0}
                max={100}
                step={1}
                value={progress}
                onChange={(e) => setProgress(clampProgress(Number(e.target.value)))}
                className="flex-1 h-2 accent-blue-700 cursor-pointer"
              />
              <div className="flex items-center gap-1 shrink-0">
                <input
                  id="task-progress-number"
                  type="number"
                  aria-label="Nhập phần trăm tiến độ"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setProgress(0);
                      return;
                    }
                    setProgress(clampProgress(Number(raw)));
                  }}
                  className="w-16 h-9 px-2 text-sm font-mono tabular-nums text-right bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                />
                <span className="text-xs font-mono text-slate-500">%</span>
              </div>
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              File đính kèm
            </span>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
              <label className="inline-flex items-center justify-center gap-2 px-3.5 h-10 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer shrink-0">
                <Upload className="w-4 h-4 text-slate-500" aria-hidden="true" />
                <span>Tải file lên</span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </label>

              {driveAuth && (
                <button
                  type="button"
                  onClick={() => setIsDrivePickerOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-3.5 h-10 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 cursor-pointer shrink-0"
                >
                  <Cloud className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                  <span>Chọn từ Drive</span>
                </button>
              )}

              <div className="flex-1 min-w-[220px] flex gap-2">
                <input
                  type="text"
                  aria-label="Hoặc nhập tên tài liệu / đường dẫn"
                  placeholder="Hoặc nhập tên tài liệu / link URL..."
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomAttachment();
                    }
                  }}
                  className="flex-1 h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                />
                <button
                  type="button"
                  onClick={handleAddCustomAttachment}
                  className="inline-flex items-center gap-1 px-3 h-10 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Gắn link</span>
                </button>
              </div>
            </div>

            {fileNotice && (
              <p className="mt-1.5 text-xs text-amber-700">{fileNotice}</p>
            )}

            {attachments.length > 0 && (
              <ul className="mt-2.5 divide-y divide-slate-200 border border-slate-200 rounded-lg">
                {attachments.map((att) => (
                  <li
                    key={att.id}
                    className="px-3 py-2 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip
                        className="w-3.5 h-3.5 text-slate-400 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="font-medium text-slate-800 truncate">
                        {att.name}
                      </span>
                      <span className="font-mono text-slate-400 shrink-0">
                        ({formatFileSize(att.size)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(att.id)}
                      aria-label={`Gỡ file ${att.name}`}
                      className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label
              htmlFor="task-notes"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Ghi chú
            </label>
            <textarea
              id="task-notes"
              rows={2}
              placeholder="Lưu ý phối hợp, phụ thuộc thiết bị hoặc phản hồi kiểm thử..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer"
            >
              {editingTask ? 'Lưu thay đổi' : 'Lưu hạng mục'}
            </button>
          </div>
        </form>
      </div>

      {driveAuth && (
        <DrivePickerModal
          isOpen={isDrivePickerOpen}
          accessToken={driveAuth.accessToken}
          isSigningIn={driveAuth.isSigningIn}
          onSignIn={driveAuth.onSignIn}
          onTokenExpired={driveAuth.onTokenExpired}
          onClose={() => setIsDrivePickerOpen(false)}
          onSelectFiles={(chosen) =>
            setAttachments((prev) => [...prev, ...chosen])
          }
        />
      )}
    </div>
  );
}
