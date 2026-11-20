import { SummaryStats } from '../types/workplan';

interface SummaryStripProps {
  stats: SummaryStats;
}

export function SummaryStrip({ stats }: SummaryStripProps) {
  return (
    <section
      aria-label="Tổng quan tiến độ"
      className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-lg"
    >
      <div className="px-4 py-3.5 flex items-start justify-between gap-2 border-r border-b lg:border-b-0 border-slate-200">
        <div>
          <p className="text-xs font-medium text-slate-500">Tổng hạng mục</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {stats.total}
          </p>
        </div>
        {stats.overdue > 0 ? (
          <span className="text-xs font-medium text-red-700 font-mono tabular-nums whitespace-nowrap shrink-0">
            {stats.overdue} quá hạn
          </span>
        ) : (
          <span className="text-xs text-slate-500 whitespace-nowrap shrink-0">
            Đúng tiến độ
          </span>
        )}
      </div>

      <div className="px-4 py-3.5 flex items-start justify-between gap-2 border-b lg:border-b-0 lg:border-r border-slate-200">
        <div>
          <p className="text-xs font-medium text-blue-700">Đang thực hiện</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {stats.inProgress}
          </p>
        </div>
        <span className="text-xs font-mono tabular-nums text-slate-500 whitespace-nowrap shrink-0">
          {stats.total > 0
            ? `${Math.round((stats.inProgress / stats.total) * 100)}%`
            : '0%'}
        </span>
      </div>

      <div className="px-4 py-3.5 flex items-start justify-between gap-2 border-r border-slate-200">
        <div>
          <p className="text-xs font-medium text-emerald-700">Hoàn thành</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {stats.completed}
          </p>
        </div>
        <span className="text-xs font-mono tabular-nums text-slate-500 whitespace-nowrap shrink-0">
          {stats.total > 0
            ? `${Math.round((stats.completed / stats.total) * 100)}%`
            : '0%'}
        </span>
      </div>

      <div className="px-4 py-3.5 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-amber-700">Tạm dừng</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {stats.paused}
          </p>
        </div>
        <span className="text-xs font-mono tabular-nums text-slate-500 whitespace-nowrap shrink-0">
          {stats.total > 0
            ? `${Math.round((stats.paused / stats.total) * 100)}%`
            : '0%'}
        </span>
      </div>
    </section>
  );
}
