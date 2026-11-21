import { useMemo, useState } from 'react';
import {
  Check,
  Circle,
  Eye,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  IncidentEntry,
  MACHINE_STATUSES,
  MachineFilter,
  MachineProject,
  MachineStatus,
  MaterialItem,
  WorkTask,
} from '../types/workplan';
import {
  computeMachineProfile,
  computeMachineStats,
  filterMachines,
} from '../utils/machines';
import { formatDateVi } from '../utils/workplan';

interface MachinesViewProps {
  machines: MachineProject[];
  tasks: WorkTask[];
  materials: MaterialItem[];
  incidents: IncidentEntry[];
  onOpenAddModal: () => void;
  onEditMachine: (machine: MachineProject) => void;
  onStatusChange: (id: string, status: MachineStatus) => void;
  onDeleteMachine: (id: string) => void;
  onOpenMachineDetail: (machine: MachineProject) => void;
}

function getMachineStatusStyle(
  status: MachineStatus,
  selected: boolean
): string {
  if (!selected) {
    return 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-transparent';
  }
  if (status === 'Đã bàn giao') {
    return 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold';
  }
  if (status === 'Chạy thử FAT/SAT') {
    return 'bg-indigo-50 text-indigo-800 border-indigo-200 font-semibold';
  }
  if (status === 'Tạm dừng') {
    return 'bg-amber-50 text-amber-800 border-amber-200 font-semibold';
  }
  return 'bg-blue-50 text-blue-800 border-blue-200 font-semibold';
}

export function MachinesView({
  machines,
  tasks,
  materials,
  incidents,
  onOpenAddModal,
  onEditMachine,
  onStatusChange,
  onDeleteMachine,
  onOpenMachineDetail,
}: MachinesViewProps) {
  const [filter, setFilter] = useState<MachineFilter>({
    status: 'all',
    search: '',
  });
  const [deletingMachine, setDeletingMachine] = useState<MachineProject | null>(
    null
  );

  const stats = useMemo(() => computeMachineStats(machines), [machines]);
  const filteredMachines = useMemo(
    () => filterMachines(machines, filter),
    [machines, filter]
  );

  const profileMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeMachineProfile>>();
    for (const machine of machines) {
      map.set(
        machine.id,
        computeMachineProfile(machine, tasks, materials, incidents)
      );
    }
    return map;
  }, [machines, tasks, materials, incidents]);

  const hasActiveFilter =
    filter.status !== 'all' || filter.search.trim().length > 0;

  return (
    <div className="space-y-5">
      {/* Summary Strip */}
      <section
        aria-label="Thống kê danh mục máy và dự án"
        className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-lg"
      >
        <div className="px-4 py-3.5 border-r border-b lg:border-b-0 border-slate-200">
          <p className="text-xs font-medium text-slate-500">Tổng số máy / dự án</p>
          <p
            data-testid="machines-total-count"
            className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900"
          >
            {stats.total}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Tạm dừng: {stats.paused}
          </p>
        </div>

        <div className="px-4 py-3.5 border-b lg:border-b-0 lg:border-r border-slate-200">
          <p className="text-xs font-medium text-blue-700">Đang triển khai</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {stats.inProgress}
          </p>
          <p className="mt-1 text-xs text-slate-500">Thiết kế & lắp ráp</p>
        </div>

        <div className="px-4 py-3.5 border-r border-slate-200">
          <p className="text-xs font-medium text-indigo-700">Chạy thử FAT/SAT</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {stats.testing}
          </p>
          <p className="mt-1 text-xs text-slate-500">Kiểm thử & hiệu chỉnh</p>
        </div>

        <div className="px-4 py-3.5">
          <p className="text-xs font-medium text-emerald-700">Đã bàn giao</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {stats.delivered}
          </p>
          <p className="mt-1 text-xs text-slate-500">Nghiệm thu hoàn chỉnh</p>
        </div>
      </section>

      {/* Filter Toolbar */}
      <section
        aria-label="Bộ lọc danh mục máy"
        className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
      >
        <div
          role="group"
          aria-label="Lọc theo trạng thái máy"
          className="inline-flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg"
        >
          {(['all', ...MACHINE_STATUSES] as const).map((st) => {
            const active = filter.status === st;
            return (
              <button
                key={st}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter((prev) => ({ ...prev, status: st }))}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'all' ? 'Tất cả' : st}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:w-64 sm:flex-initial">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Tìm kiếm mã máy, tên máy"
              placeholder="Tìm mã máy, tên dự án..."
              value={filter.search}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, search: e.target.value }))
              }
              className="w-full h-9 pl-9 pr-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <span className="text-xs font-mono tabular-nums text-slate-500 whitespace-nowrap">
            Hiển thị {filteredMachines.length}/{machines.length}
          </span>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={() => setFilter({ status: 'all', search: '' })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>
      </section>

      {/* Table / Empty State */}
      {filteredMachines.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg px-6 py-14 text-center">
          <h2 className="text-base font-semibold text-slate-900">
            {machines.length > 0
              ? 'Không tìm thấy máy / dự án phù hợp'
              : 'Chưa có máy / dự án nào'}
          </h2>
          <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">
            {machines.length > 0
              ? 'Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.'
              : 'Tạo danh mục máy chuẩn để liên kết xuyên suốt Kế hoạch công việc, BOM vật tư và Nhật ký sự cố.'}
          </p>
          <div className="mt-5">
            {machines.length > 0 ? (
              <button
                type="button"
                onClick={() => setFilter({ status: 'all', search: '' })}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Xóa bộ lọc
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#2563EB] rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Thêm máy / dự án đầu tiên</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th scope="col" className="py-3 px-3 text-center w-12">
                    STT
                  </th>
                  <th scope="col" className="py-3 px-3 w-28 whitespace-nowrap">
                    Mã máy
                  </th>
                  <th scope="col" className="py-3 px-3 min-w-[240px]">
                    Tên máy / Dự án (Nhấn để xem hồ sơ)
                  </th>
                  <th scope="col" className="py-3 px-3 min-w-[200px]">
                    Mô tả tổng quan
                  </th>
                  <th scope="col" className="py-3 px-3 w-28 whitespace-nowrap">
                    Ngày bắt đầu
                  </th>
                  <th scope="col" className="py-3 px-3 w-44">
                    Trạng thái chung
                  </th>
                  <th scope="col" className="py-3 px-3 w-48">
                    Hồ sơ liên kết
                  </th>
                  <th scope="col" className="py-3 px-3 text-right w-24">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredMachines.map((machine, idx) => {
                  const profile = profileMap.get(machine.id);
                  const avgProgress = profile?.averageProgress ?? 0;
                  return (
                    <tr
                      key={machine.id}
                      className="align-top hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3.5 px-3 text-center font-mono tabular-nums text-xs font-semibold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 text-xs font-mono font-semibold text-slate-800 bg-slate-100 border border-slate-200 rounded">
                          {machine.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <button
                          type="button"
                          onClick={() => onOpenMachineDetail(machine)}
                          className="text-left font-semibold text-[#2563EB] hover:text-blue-800 hover:underline leading-snug cursor-pointer"
                        >
                          {machine.name}
                        </button>
                      </td>
                      <td className="py-3.5 px-3 text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                        {machine.description || '—'}
                      </td>
                      <td className="py-3.5 px-3 font-mono tabular-nums text-xs text-slate-600 whitespace-nowrap">
                        {formatDateVi(machine.startDate)}
                      </td>
                      <td className="py-2.5 px-3">
                        <div
                          role="radiogroup"
                          aria-label={`Trạng thái chung của ${machine.name}`}
                          className="grid grid-cols-1 gap-1"
                        >
                          {MACHINE_STATUSES.map((st) => {
                            const selected = machine.status === st;
                            return (
                              <button
                                key={st}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => onStatusChange(machine.id, st)}
                                className={`w-full flex items-center gap-1.5 px-2 py-1 text-[11px] rounded border text-left transition-colors cursor-pointer whitespace-nowrap ${getMachineStatusStyle(
                                  st,
                                  selected
                                )}`}
                              >
                                {selected ? (
                                  <Check className="w-3 h-3 shrink-0" aria-hidden="true" />
                                ) : (
                                  <Circle className="w-3 h-3 shrink-0 text-slate-300" aria-hidden="true" />
                                )}
                                <span>{st}</span>
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <button
                          type="button"
                          onClick={() => onOpenMachineDetail(machine)}
                          className="w-full text-left space-y-1.5 group cursor-pointer"
                        >
                          <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                            <span className="text-slate-600">Tiến độ TB</span>
                            <span className="font-semibold text-slate-900 group-hover:text-[#2563EB]">
                              {avgProgress}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#2563EB] rounded-full transition-all"
                              style={{ width: `${avgProgress}%` }}
                            />
                          </div>
                          <div className="text-[11px] font-mono tabular-nums text-slate-500">
                            {profile?.tasks.length ?? 0} việc ·{' '}
                            {profile?.materials.length ?? 0} BOM ·{' '}
                            {profile?.incidents.length ?? 0} sự cố
                          </div>
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-0.5">
                          <button
                            type="button"
                            onClick={() => onOpenMachineDetail(machine)}
                            aria-label={`Xem hồ sơ máy "${machine.name}"`}
                            title="Xem hồ sơ máy"
                            className="p-1.5 text-slate-600 hover:text-[#2563EB] hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditMachine(machine)}
                            aria-label={`Sửa máy "${machine.name}"`}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingMachine(machine)}
                            aria-label={`Xóa máy "${machine.name}"`}
                            className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden divide-y divide-slate-200">
            {filteredMachines.map((machine, idx) => {
              const profile = profileMap.get(machine.id);
              const avgProgress = profile?.averageProgress ?? 0;
              return (
                <article key={machine.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                        <span>STT #{idx + 1}</span>
                        <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-800 font-semibold">
                          {machine.code}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenMachineDetail(machine)}
                        className="mt-1 text-left text-sm font-semibold text-[#2563EB] underline"
                      >
                        {machine.name}
                      </button>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onEditMachine(machine)}
                        aria-label={`Sửa máy "${machine.name}"`}
                        className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md"
                      >
                        <Pencil className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingMachine(machine)}
                        aria-label={`Xóa máy "${machine.name}"`}
                        className="p-2 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-md"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {machine.description && (
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {machine.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs font-mono text-slate-600">
                    <span>Bắt đầu: {formatDateVi(machine.startDate)}</span>
                    <span>
                      {profile?.tasks.length ?? 0} việc ·{' '}
                      {profile?.materials.length ?? 0} BOM ·{' '}
                      {profile?.incidents.length ?? 0} sự cố ({avgProgress}%)
                    </span>
                  </div>

                  <div
                    role="radiogroup"
                    aria-label={`Trạng thái chung của ${machine.name}`}
                    className="flex flex-wrap gap-1.5"
                  >
                    {MACHINE_STATUSES.map((st) => {
                      const selected = machine.status === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => onStatusChange(machine.id, st)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded border transition-colors ${getMachineStatusStyle(
                            st,
                            selected
                          )}`}
                        >
                          {selected ? (
                            <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 shrink-0 text-slate-300" aria-hidden="true" />
                          )}
                          <span>{st}</span>
                        </button>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingMachine && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mac-delete-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <h2
                id="mac-delete-title"
                className="text-base font-bold text-slate-900"
              >
                Xác nhận xóa Máy / Dự án
              </h2>
              <button
                type="button"
                onClick={() => setDeletingMachine(null)}
                aria-label="Đóng xác nhận xóa máy"
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="p-6 space-y-2">
              <p className="text-sm text-slate-700">
                Bạn có chắc chắn muốn xóa máy này khỏi danh mục chuẩn không? Các
                công việc, vật tư và sự cố đã ghi nhận trước đó vẫn được giữ
                nguyên dữ liệu.
              </p>
              <p className="text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                {deletingMachine.code} — {deletingMachine.name}
              </p>
            </div>
            <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingMachine(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteMachine(deletingMachine.id);
                  setDeletingMachine(null);
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
