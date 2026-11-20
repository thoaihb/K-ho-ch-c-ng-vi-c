import { X } from 'lucide-react';
import { WorkTask } from '../types/workplan';

interface DeleteConfirmModalProps {
  task: WorkTask | null;
  onCancel: () => void;
  onConfirm: (taskId: string) => void;
}

export function DeleteConfirmModal({
  task,
  onCancel,
  onConfirm,
}: DeleteConfirmModalProps) {
  if (!task) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <h2
            id="delete-modal-title"
            className="text-base font-bold text-slate-900"
          >
            Xác nhận xóa hạng mục
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Đóng xác nhận xóa"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-2">
          <p className="text-sm text-slate-700">
            Bạn có chắc chắn muốn xóa hạng mục công việc này không? Hành động này
            không thể hoàn tác.
          </p>
          <p className="text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            {task.mainContent}
          </p>
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => onConfirm(task.id)}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 cursor-pointer"
          >
            Xác nhận xóa
          </button>
        </div>
      </div>
    </div>
  );
}
