import { FormEvent, useEffect, useState } from 'react';
import { Check, Circle, X } from 'lucide-react';
import {
  MACHINE_STATUSES,
  MachineProject,
  MachineStatus,
} from '../types/workplan';
import { generateNextMachineCode } from '../utils/machines';
import { getTodayIsoDate } from '../utils/workplan';

interface MachineFormModalProps {
  isOpen: boolean;
  editingMachine: MachineProject | null;
  existingMachines: MachineProject[];
  onClose: () => void;
  onSave: (
    data: Omit<MachineProject, 'id' | 'updatedAt'>,
    existingId?: string
  ) => void;
}

export function MachineFormModal({
  isOpen,
  editingMachine,
  existingMachines,
  onClose,
  onSave,
}: MachineFormModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(getTodayIsoDate());
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<MachineStatus>('Đang triển khai');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    if (editingMachine) {
      setCode(editingMachine.code);
      setName(editingMachine.name);
      setStartDate(editingMachine.startDate);
      setDescription(editingMachine.description);
      setStatus(editingMachine.status);
    } else {
      setCode(generateNextMachineCode(existingMachines));
      setName('');
      setStartDate(getTodayIsoDate());
      setDescription('');
      setStatus('Đang triển khai');
    }
    setErrors({});
  }, [isOpen, editingMachine, existingMachines]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();

    if (!trimmedCode) {
      nextErrors.code = 'Vui lòng nhập mã máy.';
    }
    if (!trimmedName) {
      nextErrors.name = 'Vui lòng nhập tên máy / dự án.';
    } else {
      const duplicate = existingMachines.some(
        (m) =>
          m.id !== editingMachine?.id &&
          m.name.trim().toLowerCase() === trimmedName.toLowerCase()
      );
      if (duplicate) {
        nextErrors.name = 'Tên máy / dự án này đã tồn tại trong danh mục.';
      }
    }
    if (!startDate) {
      nextErrors.startDate = 'Vui lòng chọn ngày bắt đầu.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSave(
      {
        code: trimmedCode,
        name: trimmedName,
        startDate,
        description: description.trim(),
        status,
      },
      editingMachine?.id
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="machine-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <h2
            id="machine-modal-title"
            className="text-base font-bold text-slate-900"
          >
            {editingMachine
              ? 'Chỉnh sửa thông tin Máy / Dự án'
              : 'Thêm Máy / Dự án mới'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng biểu mẫu máy"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="mac-code"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Mã máy / Dự án <span className="text-red-600">*</span>
              </label>
              <input
                id="mac-code"
                type="text"
                placeholder="Ví dụ: SQ2118-EPX"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-10 px-3 text-sm font-mono uppercase bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
              {errors.code && (
                <p className="mt-1 text-xs text-red-600">{errors.code}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="mac-start-date"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Ngày bắt đầu <span className="text-red-600">*</span>
              </label>
              <input
                id="mac-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-10 px-3 text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
              {errors.startDate && (
                <p className="mt-1 text-xs text-red-600">{errors.startDate}</p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="mac-name"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Tên máy / Dự án <span className="text-red-600">*</span>
            </label>
            <input
              id="mac-name"
              type="text"
              placeholder="Ví dụ: Máy tự động SQ2118 - Máy nhỏ keo epoxy"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="mac-desc"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Mô tả tổng quan
            </label>
            <textarea
              id="mac-desc"
              rows={3}
              placeholder="Công suất thiết kế, yêu cầu kỹ thuật chính, khách hàng hoặc dây chuyền lắp đặt..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              Trạng thái chung <span className="text-red-600">*</span>
            </span>
            <div
              role="radiogroup"
              aria-label="Chọn trạng thái máy"
              className="grid grid-cols-2 gap-2"
            >
              {MACHINE_STATUSES.map((opt) => {
                const selected = status === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setStatus(opt)}
                    className={`flex items-center justify-start gap-2 h-10 px-3 text-xs rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                      selected
                        ? opt === 'Đã bàn giao'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                          : opt === 'Chạy thử FAT/SAT'
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-800 font-semibold'
                          : opt === 'Tạm dừng'
                          ? 'bg-amber-50 border-amber-300 text-amber-800 font-semibold'
                          : 'bg-blue-50 border-blue-300 text-blue-800 font-semibold'
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
              {editingMachine ? 'Lưu thay đổi' : 'Lưu máy / dự án'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
