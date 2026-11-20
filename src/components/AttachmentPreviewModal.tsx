import { Download, FileText, X } from 'lucide-react';
import { AttachmentItem } from '../types/workplan';
import { formatDateVi, formatFileSize } from '../utils/workplan';

interface AttachmentPreviewModalProps {
  attachment: AttachmentItem | null;
  onClose: () => void;
}

export function AttachmentPreviewModal({
  attachment,
  onClose,
}: AttachmentPreviewModalProps) {
  if (!attachment) return null;

  const isImage =
    attachment.dataUrl && attachment.mimeType.startsWith('image/');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="attachment-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <h2
            id="attachment-modal-title"
            className="text-base font-bold text-slate-900 truncate"
          >
            Chi tiết file đính kèm
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng xem file"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <FileText
              className="w-8 h-8 text-blue-700 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 break-all">
                {attachment.name}
              </p>
              <p className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                Dung lượng: {formatFileSize(attachment.size)} · Ngày gắn:{' '}
                {formatDateVi(attachment.addedAt)}
              </p>
            </div>
          </div>

          {isImage && (
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
              <img
                src={attachment.dataUrl}
                alt={attachment.name}
                referrerPolicy="no-referrer"
                className="max-h-64 w-full object-contain"
              />
            </div>
          )}

          {!attachment.dataUrl && !attachment.externalUrl && (
            <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
              Tệp này được lưu dưới dạng thông tin tham chiếu (file mẫu mặc định
              hoặc tệp dung lượng lớn hơn 512 KB). Bạn có thể tải lại tệp mới
              vào hạng mục để tải xuống trực tiếp từ trình duyệt.
            </p>
          )}

          {attachment.externalUrl && (
            <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 break-all">
              Đường dẫn tham chiếu:{' '}
              <a
                href={attachment.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 underline"
              >
                {attachment.externalUrl}
              </a>
            </p>
          )}
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-3">
          {attachment.dataUrl && (
            <a
              href={attachment.dataUrl}
              download={attachment.name}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Tải xuống</span>
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
