import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { TaskStatus } from '../types/workplan';
import { clampProgress } from '../utils/workplan';

interface ProgressControlProps {
  taskId: string;
  taskName: string;
  status: TaskStatus;
  progress: number;
  isOpen: boolean;
  disabled?: boolean;
  onToggleOpen: (taskId: string | null) => void;
  onChangeProgress: (taskId: string, progress: number) => void;
}

function getProgressFillClass(status: TaskStatus): string {
  if (status === 'Hoàn thành') return 'bg-emerald-600';
  if (status === 'Tạm dừng') return 'bg-amber-500';
  return 'bg-blue-600';
}

export function ProgressControl({
  taskId,
  taskName,
  status,
  progress,
  isOpen,
  disabled,
  onToggleOpen,
  onChangeProgress,
}: ProgressControlProps) {
  const safeProgress = clampProgress(progress);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const popoverWidth = 256;
      const estimatedHeight = 156;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward =
        spaceBelow < estimatedHeight + 16 && rect.top > estimatedHeight + 16;

      const top = openUpward
        ? Math.max(12, rect.top - estimatedHeight - 8)
        : Math.min(window.innerHeight - estimatedHeight - 12, rect.bottom + 8);

      const left = Math.max(
        12,
        Math.min(rect.left, window.innerWidth - popoverWidth - 12)
      );

      setCoords({ top, left });
    };

    updatePosition();

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      onToggleOpen(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onToggleOpen(null);
        triggerRef.current?.focus();
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, onToggleOpen]);

  const fillClass = getProgressFillClass(status);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-expanded={isOpen}
        aria-label={`Tiến độ "${taskName}": ${safeProgress}%. Bấm để điều chỉnh`}
        title={
          disabled
            ? 'Chỉ thành viên được phân công hoặc Quản trị viên mới được điều chỉnh tiến độ'
            : `Tiến độ: ${safeProgress}%. Bấm để điều chỉnh`
        }
        onClick={() => {
          if (disabled) return;
          onToggleOpen(isOpen ? null : taskId);
        }}
        className={`relative w-full h-7 rounded-md bg-slate-100 border border-slate-200 overflow-hidden block transition-colors ${
          disabled
            ? 'opacity-70 cursor-not-allowed'
            : 'hover:border-slate-300 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-700 cursor-pointer'
        }`}
      >
        <div
          className={`h-full transition-all duration-150 ${fillClass}`}
          style={{ width: `${safeProgress}%` }}
        />
        <span
          aria-hidden="true"
          className={`absolute inset-0 flex items-center font-mono tabular-nums text-xs font-semibold pointer-events-none px-2 ${
            safeProgress === 100
              ? 'justify-center text-white'
              : safeProgress >= 42
              ? 'justify-start text-white'
              : 'justify-end text-slate-800'
          }`}
        >
          {safeProgress}%
        </span>
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={`Điều chỉnh tiến độ "${taskName}"`}
          style={{ top: coords.top, left: coords.left }}
          className="fixed z-50 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-3.5 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-800">
              Cập nhật tiến độ
            </span>
            <button
              type="button"
              onClick={() => onToggleOpen(null)}
              aria-label="Đóng thanh trượt tiến độ"
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <input
              type="range"
              aria-label={`Thanh trượt tiến độ "${taskName}"`}
              min={0}
              max={100}
              step={1}
              value={safeProgress}
              onChange={(e) =>
                onChangeProgress(taskId, clampProgress(Number(e.target.value)))
              }
              className="flex-1 h-2 accent-blue-700 cursor-pointer"
            />
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="number"
                aria-label={`Nhập phần trăm tiến độ "${taskName}"`}
                min={0}
                max={100}
                value={safeProgress}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    onChangeProgress(taskId, 0);
                    return;
                  }
                  onChangeProgress(taskId, clampProgress(Number(raw)));
                }}
                className="w-14 h-8 px-1.5 text-xs font-mono tabular-nums text-right bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
              />
              <span className="text-xs font-mono text-slate-500">%</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100">
            {[0, 25, 50, 75, 100].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onChangeProgress(taskId, preset)}
                className={`px-1.5 py-1 text-[11px] font-mono tabular-nums rounded border transition-colors cursor-pointer ${
                  safeProgress === preset
                    ? 'bg-blue-50 border-blue-200 text-blue-800 font-semibold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {preset}%
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
