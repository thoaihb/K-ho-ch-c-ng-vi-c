import { FormEvent, useEffect, useState } from 'react';
import { Check, Circle, X } from 'lucide-react';
import {
  MATERIAL_STATUSES,
  MaterialItem,
  MaterialStatus,
} from '../types/workplan';
import { getTodayIsoDate } from '../utils/workplan';

interface MaterialFormModalProps {
  isOpen: boolean;
  editingItem: MaterialItem | null;
  onClose: () => void;
  onSave: (
    data: Omit<MaterialItem, 'id' | 'updatedAt'>,
    existingId?: string
  ) => void;
}

export function MaterialFormModal({
  isOpen,
  editingItem,
  onClose,
  onSave,
}: MaterialFormModalProps) {
  const [name, setName] = useState('');
  const [specCode, setSpecCode] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('Cái');
  const [projectName, setProjectName] = useState('');
  const [status, setStatus] = useState<MaterialStatus>('Cần đặt');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    if (editingItem) {
      setName(editingItem.name);
      setSpecCode(editingItem.specCode);
      setQuantity(String(editingItem.quantity));
      setUnit(editingItem.unit);
      setProjectName(editingItem.projectName);
      setStatus(editingItem.status);
      setNotes(editingItem.notes);
    } else {
      setName('');
      setSpecCode('');
      setQuantity('1');
      setUnit('Cái');
      setProjectName('');
      setStatus('Cần đặt');
      setNotes('');
    }
    setErrors({});
  }, [isOpen, editingItem]);

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
    const parsedQty = Number(quantity);

    if (!name.trim()) {
      nextErrors.name = 'Vui lòng nhập tên vật tư / linh kiện.';
    }
    if (!specCode.trim()) {
      nextErrors.specCode = 'Vui lòng nhập mã hiệu hoặc thông số kỹ thuật.';
    }
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      nextErrors.quantity = 'Số lượng phải lớn hơn 0.';
    }
    if (!projectName.trim()) {
      nextErrors.projectName = 'Vui lòng nhập tên dự án hoặc cụm máy áp dụng.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSave(
      {
        name: name.trim(),
        specCode: specCode.trim(),
        quantity: Math.round(parsedQty * 100) / 100,
        unit: unit.trim() || 'Cái',
        projectName: projectName.trim(),
        status,
        notes: notes.trim(),
      },
      editingItem?.id
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="material-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <h2
            id="material-modal-title"
            className="text-base font-bold text-slate-900"
          >
            {editingItem
              ? 'Chỉnh sửa vật tư & linh kiện'
              : 'Thêm vật tư & linh kiện mới'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng biểu mẫu vật tư"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div>
            <label
              htmlFor="mat-name"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Tên vật tư / Linh kiện <span className="text-red-600">*</span>
            </label>
            <input
              id="mat-name"
              type="text"
              placeholder="Ví dụ: Cảm biến tiệm cận M12 NPN NO"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="mat-spec"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Mã hiệu / Thông số <span className="text-red-600">*</span>
              </label>
              <input
                id="mat-spec"
                type="text"
                placeholder="Ví dụ: Omron E2E-X3D1-N"
                value={specCode}
                onChange={(e) => setSpecCode(e.target.value)}
                className="w-full h-10 px-3 text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
              {errors.specCode && (
                <p className="mt-1 text-xs text-red-600">{errors.specCode}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="mat-project"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Dự án / Máy áp dụng <span className="text-red-600">*</span>
              </label>
              <input
                id="mat-project"
                type="text"
                placeholder="Ví dụ: Trạm cấp phôi tự động"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
              {errors.projectName && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.projectName}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="mat-qty"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Số lượng <span className="text-red-600">*</span>
              </label>
              <input
                id="mat-qty"
                type="number"
                min="0.1"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full h-10 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
              {errors.quantity && (
                <p className="mt-1 text-xs text-red-600">{errors.quantity}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="mat-unit"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Đơn vị tính
              </label>
              <input
                id="mat-unit"
                type="text"
                placeholder="Cái, Bộ, Mét..."
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              Trạng thái vật tư <span className="text-red-600">*</span>
            </span>
            <div
              role="radiogroup"
              aria-label="Chọn trạng thái vật tư"
              className="grid grid-cols-3 gap-2"
            >
              {MATERIAL_STATUSES.map((opt) => {
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
                        ? opt === 'Đã về kho'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                          : opt === 'Đã đặt'
                          ? 'bg-blue-50 border-blue-300 text-blue-800 font-semibold'
                          : 'bg-amber-50 border-amber-300 text-amber-800 font-semibold'
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

          <div>
            <label
              htmlFor="mat-notes"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Ghi chú
            </label>
            <textarea
              id="mat-notes"
              rows={2}
              placeholder="Nhà cung cấp, thời gian giao dự kiến hoặc lưu ý kỹ thuật..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            <span className="text-xs font-mono text-slate-400">
              Cập nhật: {getTodayIsoDate()}
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
                type="submit"
                className="px-4 py-2 text-sm font-semibold text-white bg-[#2563EB] rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                {editingItem ? 'Lưu thay đổi' : 'Lưu vật tư'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
