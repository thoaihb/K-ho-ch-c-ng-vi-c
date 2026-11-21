import { RotateCcw, Search } from 'lucide-react';
import {
  MachineProject,
  TASK_STATUSES,
  TaskFilter,
  TaskStatus,
  TeamMember,
} from '../types/workplan';

interface FilterToolbarProps {
  filter: TaskFilter;
  members: TeamMember[];
  machines: MachineProject[];
  totalCount: number;
  filteredCount: number;
  onChangeFilter: (next: TaskFilter) => void;
  onResetFilter: () => void;
}

const STATUS_OPTIONS: Array<{ value: 'all' | TaskStatus; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  ...TASK_STATUSES.map((status) => ({ value: status, label: status })),
];

export function FilterToolbar({
  filter,
  members,
  machines,
  totalCount,
  filteredCount,
  onChangeFilter,
  onResetFilter,
}: FilterToolbarProps) {
  const hasActiveFilter =
    filter.status !== 'all' ||
    filter.assigneeId !== 'all' ||
    filter.machineId !== 'all' ||
    filter.search.trim().length > 0;

  return (
    <section
      aria-label="Bộ lọc công việc"
      className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3"
    >
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="group"
          aria-label="Lọc theo trạng thái"
          className="grid grid-cols-2 sm:inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-full sm:w-auto"
        >
          {STATUS_OPTIONS.map((option) => {
            const active = filter.status === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  onChangeFilter({ ...filter, status: option.value })
                }
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer text-center focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-700 ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-machine"
            className="text-xs font-medium text-slate-600 whitespace-nowrap"
          >
            Máy / Dự án:
          </label>
          <select
            id="filter-machine"
            value={filter.machineId}
            onChange={(e) =>
              onChangeFilter({ ...filter, machineId: e.target.value })
            }
            className="h-9 max-w-[240px] px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
          >
            <option value="all">Tất cả máy / dự án</option>
            {machines.map((machine) => (
              <option key={machine.id} value={machine.id}>
                {machine.code} — {machine.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-assignee"
            className="text-xs font-medium text-slate-600 whitespace-nowrap"
          >
            Người đảm nhận:
          </label>
          <select
            id="filter-assignee"
            value={filter.assigneeId}
            onChange={(e) =>
              onChangeFilter({ ...filter, assigneeId: e.target.value })
            }
            className="h-9 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
          >
            <option value="all">Tất cả thành viên</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:w-60 sm:flex-initial">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Tìm kiếm nội dung công việc"
            placeholder="Tìm nội dung, ghi chú, file..."
            value={filter.search}
            onChange={(e) =>
              onChangeFilter({ ...filter, search: e.target.value })
            }
            className="w-full h-9 pl-9 pr-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
          />
        </div>

        <span className="text-xs font-mono tabular-nums text-slate-500 whitespace-nowrap">
          Hiển thị {filteredCount}/{totalCount}
        </span>

        {hasActiveFilter && (
          <button
            type="button"
            onClick={onResetFilter}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Xóa bộ lọc</span>
          </button>
        )}
      </div>
    </section>
  );
}
