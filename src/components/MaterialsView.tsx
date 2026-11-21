import { useMemo, useState } from 'react';
import {
  Check,
  Circle,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  MATERIAL_STATUSES,
  MachineProject,
  MaterialFilter,
  MaterialItem,
  MaterialStatus,
} from '../types/workplan';
import { findMachineForRecord, normalizeMachineName } from '../utils/machines';
import { computeMaterialStats, filterMaterials } from '../utils/operations';
import { formatDateVi } from '../utils/workplan';

interface MaterialsViewProps {
  items: MaterialItem[];
  machines: MachineProject[];
  onOpenAddModal: () => void;
  onEditItem: (item: MaterialItem) => void;
  onStatusChange: (id: string, status: MaterialStatus) => void;
  onDeleteItem: (id: string) => void;
  onOpenMachineDetail: (machine: MachineProject) => void;
}

function getMaterialStatusStyle(
  status: MaterialStatus,
  selected: boolean
): string {
  if (!selected) {
    return 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-transparent';
  }
  if (status === 'Đã về kho') {
    return 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold';
  }
  if (status === 'Đã đặt') {
    return 'bg-blue-50 text-blue-800 border-blue-200 font-semibold';
  }
  return 'bg-amber-50 text-amber-800 border-amber-200 font-semibold';
}

export function MaterialsView({
  items,
  machines,
  onOpenAddModal,
  onEditItem,
  onStatusChange,
  onDeleteItem,
  onOpenMachineDetail,
}: MaterialsViewProps) {
  const [filter, setFilter] = useState<MaterialFilter>({
    status: 'all',
    machineId: 'all',
    search: '',
  });
  const [deletingItem, setDeletingItem] = useState<MaterialItem | null>(null);

  const unlinkedProjectNames = useMemo(() => {
    const machineNames = new Set(
      machines.map((m) => normalizeMachineName(m.name))
    );
    const extra = new Set<string>();
    for (const item of items) {
      if (
        item.projectName.trim() &&
        !item.machineId &&
        !machineNames.has(normalizeMachineName(item.projectName))
      ) {
        extra.add(item.projectName.trim());
      }
    }
    return Array.from(extra).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [items, machines]);

  const stats = useMemo(() => computeMaterialStats(items), [items]);
  const filteredItems = useMemo(
    () => filterMaterials(items, filter, machines),
    [items, filter, machines]
  );

  const hasActiveFilter =
    filter.status !== 'all' ||
    filter.machineId !== 'all' ||
    filter.search.trim().length > 0;

  return (
    <div className="space-y-5">
      {/* Summary Strip */}
      <section
        aria-label="Thống kê vật tư và linh kiện"
        className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-lg"
      >
        <div className="px-4 py-3.5 border-r border-b lg:border-b-0 border-slate-200">
          <p className="text-xs font-medium text-slate-500">Tổng danh mục</p>
          <p
            data-testid="materials-total-count"
            className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900"
          >
            {stats.total}
          </p>
          <p className="mt-1 text-xs font-mono tabular-nums text-slate-500">
            Tổng SL: {stats.totalQuantity}
          </p>
        </div>

        <div className="px-4 py-3.5 border-b lg:border-b-0 lg:border-r border-slate-200">
          <p className="text-xs font-medium text-amber-700">Cần đặt mua</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {stats.toOrder}
          </p>
          <p className="mt-1 text-xs text-slate-500">Chờ xử lý đặt hàng</p>
        </div>

        <div className="px-4 py-3.5 border-r border-slate-200">
          <p className="text-xs font-medium text-blue-700">Đã đặt hàng</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {stats.ordered}
          </p>
          <p className="mt-1 text-xs text-slate-500">Đang chờ giao về kho</p>
        </div>

        <div className="px-4 py-3.5">
          <p className="text-xs font-medium text-emerald-700">Đã về kho</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {stats.inStock}
          </p>
          <p className="mt-1 text-xs text-slate-500">Sẵn sàng lắp ráp</p>
        </div>
      </section>

      {/* Filter Toolbar */}
      <section
        aria-label="Bộ lọc vật tư và linh kiện"
        className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
      >
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Lọc theo trạng thái vật tư"
            className="inline-flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg"
          >
            {(['all', ...MATERIAL_STATUSES] as const).map((st) => {
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

          <div className="flex items-center gap-2">
            <label
              htmlFor="mat-filter-project"
              className="text-xs font-medium text-slate-600 whitespace-nowrap"
            >
              Máy / Dự án:
            </label>
            <select
              id="mat-filter-project"
              value={filter.machineId}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, machineId: e.target.value }))
              }
              className="h-9 max-w-[240px] px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            >
              <option value="all">Tất cả máy / dự án</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} — {m.name}
                </option>
              ))}
              {unlinkedProjectNames.map((proj) => (
                <option key={proj} value={`name:${proj}`}>
                  {proj}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:w-64 sm:flex-initial">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Tìm kiếm vật tư, mã hiệu"
              placeholder="Tìm tên vật tư, mã hiệu..."
              value={filter.search}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, search: e.target.value }))
              }
              className="w-full h-9 pl-9 pr-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <span className="text-xs font-mono tabular-nums text-slate-500 whitespace-nowrap">
            Hiển thị {filteredItems.length}/{items.length}
          </span>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={() =>
                setFilter({ status: 'all', machineId: 'all', search: '' })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>
      </section>

      {/* Table / Empty State */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg px-6 py-14 text-center">
          <h2 className="text-base font-semibold text-slate-900">
            {items.length > 0
              ? 'Không tìm thấy vật tư phù hợp'
              : 'Chưa có vật tư / linh kiện nào'}
          </h2>
          <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">
            {items.length > 0
              ? 'Thử thay đổi trạng thái, dự án áp dụng hoặc từ khóa tìm kiếm.'
              : 'Thêm thiết bị, cảm biến hoặc linh kiện cần đặt mua cho dự án tự động hóa.'}
          </p>
          <div className="mt-5">
            {items.length > 0 ? (
              <button
                type="button"
                onClick={() =>
                  setFilter({ status: 'all', machineId: 'all', search: '' })
                }
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
                <span>Thêm vật tư đầu tiên</span>
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
                  <th scope="col" className="py-3 px-3 min-w-[200px]">
                    Tên vật tư
                  </th>
                  <th scope="col" className="py-3 px-3 min-w-[160px]">
                    Mã hiệu / Thông số
                  </th>
                  <th scope="col" className="py-3 px-3 text-right w-24 whitespace-nowrap">
                    Số lượng
                  </th>
                  <th scope="col" className="py-3 px-3 min-w-[160px]">
                    Dự án / Máy áp dụng
                  </th>
                  <th scope="col" className="py-3 px-3 w-36">
                    Trạng thái
                  </th>
                  <th scope="col" className="py-3 px-3 min-w-[150px]">
                    Ghi chú
                  </th>
                  <th scope="col" className="py-3 px-3 text-right w-20">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredItems.map((item, idx) => {
                  const linkedMachine = findMachineForRecord(
                    machines,
                    item.machineId,
                    item.projectName
                  );
                  return (
                  <tr
                    key={item.id}
                    className="align-top hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3.5 px-3 text-center font-mono tabular-nums text-xs font-semibold text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-slate-900 leading-snug">
                        {item.name}
                      </div>
                      {item.updatedAt && (
                        <div className="mt-0.5 text-[11px] font-mono text-slate-400">
                          Cập nhật: {formatDateVi(item.updatedAt)}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-xs text-slate-700 leading-relaxed">
                      {item.specCode}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono tabular-nums text-xs font-semibold text-slate-900 whitespace-nowrap">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-3.5 px-3 text-xs font-medium leading-snug">
                      {linkedMachine ? (
                        <button
                          type="button"
                          onClick={() => onOpenMachineDetail(linkedMachine)}
                          className="text-left text-[#2563EB] hover:text-blue-800 hover:underline cursor-pointer font-semibold"
                        >
                          {linkedMachine.name}
                        </button>
                      ) : (
                        <span className="text-slate-800">{item.projectName}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div
                        role="radiogroup"
                        aria-label={`Trạng thái của ${item.name}`}
                        className="flex flex-col gap-1"
                      >
                        {MATERIAL_STATUSES.map((st) => {
                          const selected = item.status === st;
                          return (
                            <button
                              key={st}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              onClick={() => onStatusChange(item.id, st)}
                              className={`w-full flex items-center gap-1.5 px-2 py-1 text-[11px] rounded border text-left transition-colors cursor-pointer whitespace-nowrap ${getMaterialStatusStyle(
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
                    <td className="py-3.5 px-3 text-xs text-slate-600 leading-relaxed">
                      {item.notes || '—'}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          onClick={() => onEditItem(item)}
                          aria-label={`Sửa vật tư "${item.name}"`}
                          className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingItem(item)}
                          aria-label={`Xóa vật tư "${item.name}"`}
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
            {filteredItems.map((item, idx) => (
              <article key={item.id} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-mono text-slate-500">
                      STT #{idx + 1} · {item.quantity} {item.unit}
                    </div>
                    <h3 className="mt-0.5 text-sm font-semibold text-slate-900">
                      {item.name}
                    </h3>
                    <p className="text-xs font-mono text-slate-600 mt-0.5">
                      {item.specCode}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditItem(item)}
                      aria-label={`Sửa vật tư "${item.name}"`}
                      className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md"
                    >
                      <Pencil className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingItem(item)}
                      aria-label={`Xóa vật tư "${item.name}"`}
                      className="p-2 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-md"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="text-xs">
                  <span className="text-slate-500">Dự án / Máy: </span>
                  {(() => {
                    const linkedMachine = findMachineForRecord(
                      machines,
                      item.machineId,
                      item.projectName
                    );
                    return linkedMachine ? (
                      <button
                        type="button"
                        onClick={() => onOpenMachineDetail(linkedMachine)}
                        className="font-semibold text-[#2563EB] underline text-left"
                      >
                        {linkedMachine.name}
                      </button>
                    ) : (
                      <span className="font-medium text-slate-900">
                        {item.projectName}
                      </span>
                    );
                  })()}
                </div>

                <div
                  role="radiogroup"
                  aria-label={`Trạng thái của ${item.name}`}
                  className="flex flex-wrap gap-1.5"
                >
                  {MATERIAL_STATUSES.map((st) => {
                    const selected = item.status === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onStatusChange(item.id, st)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded border transition-colors ${getMaterialStatusStyle(
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

                {item.notes && (
                  <p className="text-xs text-slate-600 pt-1.5 border-t border-slate-100">
                    <span className="font-medium text-slate-700">Ghi chú: </span>
                    {item.notes}
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mat-delete-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <h2
                id="mat-delete-title"
                className="text-base font-bold text-slate-900"
              >
                Xác nhận xóa vật tư
              </h2>
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                aria-label="Đóng xác nhận xóa vật tư"
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="p-6 space-y-2">
              <p className="text-sm text-slate-700">
                Bạn có chắc chắn muốn xóa vật tư này khỏi danh sách?
              </p>
              <p className="text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                {deletingItem.name} ({deletingItem.specCode})
              </p>
            </div>
            <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteItem(deletingItem.id);
                  setDeletingItem(null);
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
