import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import {
  Check,
  Circle,
  Cloud,
  Paperclip,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  AttachmentItem,
  DriveAuthProps,
  INCIDENT_STATUSES,
  IncidentEntry,
  IncidentStatus,
  MachineProject,
  TeamMember,
} from '../types/workplan';
import { findMachineForRecord } from '../utils/machines';
import { formatFileSize, getTodayIsoDate } from '../utils/workplan';
import { DrivePickerModal } from './DrivePickerModal';
import {
  MachineSelectWithQuickAdd,
  QuickAddMachineInput,
} from './MachineSelectWithQuickAdd';

interface IncidentFormModalProps {
  isOpen: boolean;
  editingEntry: IncidentEntry | null;
  defaultMachineId?: string;
  members: TeamMember[];
  machines: MachineProject[];
  driveAuth?: DriveAuthProps;
  onClose: () => void;
  onQuickCreateMachine: (data: QuickAddMachineInput) => MachineProject;
  onSave: (data: Omit<IncidentEntry, 'id'>, existingId?: string) => void;
}

const MAX_INLINE_FILE_BYTES = 512 * 1024;

export function IncidentFormModal({
  isOpen,
  editingEntry,
  defaultMachineId,
  members,
  machines,
  driveAuth,
  onClose,
  onQuickCreateMachine,
  onSave,
}: IncidentFormModalProps) {
  const [occurredAt, setOccurredAt] = useState(getTodayIsoDate());
  const [repairTime, setRepairTime] = useState('');
  const [machineId, setMachineId] = useState('');
  const [machineName, setMachineName] = useState('');
  const [description, setDescription] = useState('');
  const [resolution, setResolution] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [status, setStatus] = useState<IncidentStatus>('Đang xử lý');
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
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
    if (editingEntry) {
      const matched = findMachineForRecord(
        currentMachines,
        editingEntry.machineId,
        editingEntry.machineName
      );
      setOccurredAt(editingEntry.occurredAt);
      setRepairTime(editingEntry.repairTime ?? '');
      setMachineId(matched?.id ?? editingEntry.machineId ?? '');
      setMachineName(matched?.name ?? editingEntry.machineName);
      setDescription(editingEntry.description);
      setResolution(editingEntry.resolution);
      setAssigneeId(editingEntry.assigneeId);
      setStatus(editingEntry.status);
      setAttachments(editingEntry.attachments ?? []);
    } else {
      const preselected = defaultMachineId
        ? currentMachines.find((m) => m.id === defaultMachineId)
        : undefined;
      setOccurredAt(getTodayIsoDate());
      setRepairTime('');
      setMachineId(preselected?.id ?? '');
      setMachineName(preselected?.name ?? '');
      setDescription('');
      setResolution('');
      setAssigneeId(currentMembers[0]?.id ?? '');
      setStatus('Đang xử lý');
      setAttachments([]);
    }
    setCustomFileName('');
    setFileNotice('');
    setIsDrivePickerOpen(false);
    setErrors({});
  }, [isOpen, editingEntry, defaultMachineId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
            resolve(
              typeof reader.result === 'string' ? reader.result : undefined
            );
          reader.onerror = () => resolve(undefined);
          reader.readAsDataURL(file);
        });
        added.push({
          id: `inc-att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          dataUrl,
          addedAt: getTodayIsoDate(),
        });
      } else {
        largeFileCount += 1;
        added.push({
          id: `inc-att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
        id: `inc-att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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

    if (!occurredAt) {
      nextErrors.occurredAt = 'Vui lòng chọn ngày gặp lỗi.';
    }
    if (!machineName.trim()) {
      nextErrors.machineName = 'Vui lòng chọn máy hoặc cụm máy từ danh mục.';
    }
    if (!description.trim()) {
      nextErrors.description = 'Vui lòng mô tả chi tiết lỗi phát sinh.';
    }
    if (!assigneeId) {
      nextErrors.assigneeId = 'Vui lòng chọn người xử lý.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSave(
      {
        occurredAt,
        repairTime: repairTime.trim(),
        ...(machineId ? { machineId } : {}),
        machineName: machineName.trim(),
        description: description.trim(),
        resolution: resolution.trim(),
        assigneeId,
        status,
        attachments,
      },
      editingEntry?.id
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="incident-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <h2
            id="incident-modal-title"
            className="text-base font-bold text-slate-900"
          >
            {editingEntry
              ? 'Chỉnh sửa nhật ký sự cố'
              : 'Ghi nhận sự cố & xử lý mới'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng biểu mẫu sự cố"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="inc-date"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Ngày gặp lỗi <span className="text-red-600">*</span>
              </label>
              <input
                id="inc-date"
                type="date"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className="w-full h-10 px-3 text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
              {errors.occurredAt && (
                <p className="mt-1 text-xs text-red-600">{errors.occurredAt}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="inc-repair-time"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Thời gian sửa chữa
              </label>
              <input
                id="inc-repair-time"
                type="text"
                placeholder="08:30 - 11:00 hoặc 2.5 giờ"
                value={repairTime}
                onChange={(e) => setRepairTime(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label
                htmlFor="inc-assignee"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Người xử lý <span className="text-red-600">*</span>
              </label>
              <select
                id="inc-assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                <option value="">-- Chọn thành viên --</option>
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
          </div>

          <MachineSelectWithQuickAdd
            id="inc-machine"
            label="Tên máy / Cụm máy"
            machines={machines}
            selectedMachineId={machineId}
            legacyFallbackName={machineName}
            error={errors.machineName}
            onChange={(sel) => {
              setMachineId(sel.machineId);
              setMachineName(sel.machineName);
            }}
            onQuickCreateMachine={onQuickCreateMachine}
          />

          <div>
            <label
              htmlFor="inc-desc"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Mô tả lỗi phát sinh <span className="text-red-600">*</span>
            </label>
            <textarea
              id="inc-desc"
              rows={3}
              placeholder="Hiện tượng lỗi, mã cảnh báo trên PLC/HMI hoặc điều kiện xảy ra..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-600">{errors.description}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="inc-resolution"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Cách khắc phục / Phương án xử lý
            </label>
            <textarea
              id="inc-resolution"
              rows={3}
              placeholder="Biện pháp đã thực hiện hoặc hướng kiểm tra tiếp theo..."
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              className="w-full p-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              File đính kèm (Ảnh hiện trường, ảnh sau khắc phục, tài liệu PDF...)
            </span>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
              <label className="inline-flex items-center justify-center gap-2 px-3.5 h-10 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer shrink-0">
                <Upload className="w-4 h-4 text-slate-500" aria-hidden="true" />
                <span>Tải file lên</span>
                <input
                  id="inc-file-upload"
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
                  className="flex-1 h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
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
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              Trạng thái xử lý <span className="text-red-600">*</span>
            </span>
            <div
              role="radiogroup"
              aria-label="Chọn trạng thái sự cố"
              className="grid grid-cols-3 gap-2"
            >
              {INCIDENT_STATUSES.map((opt) => {
                const selected = status === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setStatus(opt)}
                    className={`flex items-center justify-center gap-1.5 h-10 px-2.5 text-xs rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                      selected
                        ? opt === 'Đã khắc phục'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                          : opt === 'Theo dõi thêm'
                          ? 'bg-amber-50 border-amber-300 text-amber-800 font-semibold'
                          : 'bg-red-50 border-red-300 text-red-800 font-semibold'
                        : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {selected ? (
                      <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 shrink-0 text-slate-300" aria-hidden="true" />
                    )}
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-[#2563EB] rounded-lg hover:bg-blue-700 cursor-pointer"
            >
              {editingEntry ? 'Lưu thay đổi' : 'Lưu sự cố'}
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
