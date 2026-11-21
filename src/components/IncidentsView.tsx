import { useMemo, useState } from 'react';
import {
  Check,
  Circle,
  Paperclip,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  AttachmentItem,
  INCIDENT_STATUSES,
  IncidentEntry,
  IncidentFilter,
  IncidentStatus,
  MachineProject,
  TeamMember,
} from '../types/workplan';
import { findMachineForRecord, normalizeMachineName } from '../utils/machines';
import { computeIncidentStats, filterIncidents } from '../utils/operations';
import { formatDateVi, formatFileSize } from '../utils/workplan';

interface IncidentsViewProps {
  entries: IncidentEntry[];
  members: TeamMember[];
  machines: MachineProject[];
  onOpenAddModal: () => void;
  onEditEntry: (entry: IncidentEntry) => void;
  onStatusChange: (id: string, status: IncidentStatus) => void;
  onDeleteEntry: (id: string) => void;
  onPreviewAttachment: (attachment: AttachmentItem) => void;
  onOpenMachineDetail: (machine: MachineProject) => void;
}

function getIncidentStatusStyle(
  status: IncidentStatus,
  selected: boolean
): string {
  if (!selected) {
    return 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-transparent';
  }
  if (status === 'Đã khắc phục') {
    return 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold';
  }
  if (status === 'Theo dõi thêm') {
    return 'bg-amber-50 text-amber-800 border-amber-200 font-semibold';
  }
  return 'bg-red-50 text-red-800 border-red-200 font-semibold';
}

export function IncidentsView({
  entries,
  members,
  machines,
  onOpenAddModal,
  onEditEntry,
  onStatusChange,
  onDeleteEntry,
  onPreviewAttachment,
  onOpenMachineDetail,
}: IncidentsViewProps) {
  const [filter, setFilter] = useState<IncidentFilter>({
    status: 'all',
    assigneeId: 'all',
    machineId: 'all',
    search: '',
  });
  const [deletingEntry, setDeletingEntry] = useState<IncidentEntry | null>(
    null
  );

  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members]
  );

  const unlinkedMachineNames = useMemo(() => {
    const knownNames = new Set(
      machines.map((m) => normalizeMachineName(m.name))
    );
    const seen = new Set<string>();
    const names: string[] = [];
    for (const entry of entries) {
      const trimmed = entry.machineName.trim();
      if (!trimmed) continue;
      const norm = normalizeMachineName(trimmed);
      if (knownNames.has(norm) || seen.has(norm)) continue;
      seen.add(norm);
      names.push(trimmed);
    }
    return names;
  }, [entries, machines]);

  const stats = useMemo(() => computeIncidentStats(entries), [entries]);
  const filteredEntries = useMemo(
    () => filterIncidents(entries, filter, members, machines),
    [entries, filter, members, machines]
  );

  const hasActiveFilter =
    filter.status !== 'all' ||
    filter.assigneeId !== 'all' ||
    filter.machineId !== 'all' ||
    filter.search.trim().length > 0;

  return (
    <div className="space-y-5">
      {/* Summary Strip */}
      <section
        aria-label="Thống kê sự cố kỹ thuật"
        className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-lg"
      >
        <div className="px-4 py-3.5 border-r border-b lg:border-b-0 border-slate-200">
          <p className="text-xs font-medium text-slate-500">Tổng số sự cố</p>
          <p
            data-testid="incidents-total-count"
            className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900"
          >
            {stats.total}
          </p>
          <p className="mt-1 text-xs text-slate-500">Đã ghi nhận trong nhật ký</p>
        </div>

        <div className="px-4 py-3.5 border-b lg:border-b-0 lg:border-r border-slate-200">
          <p className="text-xs font-medium text-red-700">Đang xử lý</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {stats.inProgress}
          </p>
          <p className="mt-1 text-xs text-slate-500">Cần ưu tiên khắc phục</p>
        </div>

        <div className="px-4 py-3.5 border-r border-slate-200">
          <p className="text-xs font-medium text-amber-700">Theo dõi thêm</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {stats.monitoring}
          </p>
          <p className="mt-1 text-xs text-slate-500">Kiểm tra độ ổn định</p>
        </div>

        <div className="px-4 py-3.5">
          <p className="text-xs font-medium text-emerald-700">Đã khắc phục</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {stats.resolved}
          </p>
          <p className="mt-1 text-xs text-slate-500">Vận hành bình thường</p>
        </div>
      </section>

      {/* Filter Toolbar */}
      <section
        aria-label="Bộ lọc nhật ký sự cố"
        className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
      >
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Lọc theo trạng thái sự cố"
            className="inline-flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg"
          >
            {(['all', ...INCIDENT_STATUSES] as const).map((st) => {
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
              htmlFor="inc-filter-machine"
              className="text-xs font-medium text-slate-600 whitespace-nowrap"
            >
              Máy / Cụm máy:
            </label>
            <select
              id="inc-filter-machine"
              value={filter.machineId}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, machineId: e.target.value }))
              }
              className="h-9 max-w-[230px] px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            >
              <option value="all">Tất cả máy</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} — {m.name}
                </option>
              ))}
              {unlinkedMachineNames.map((name) => (
                <option key={name} value={`name:${name}`}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="inc-filter-assignee"
              className="text-xs font-medium text-slate-600 whitespace-nowrap"
            >
              Người xử lý:
            </label>
            <select
              id="inc-filter-assignee"
              value={filter.assigneeId}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, assigneeId: e.target.value }))
              }
              className="h-9 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            >
              <option value="all">Tất cả thành viên</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
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
              aria-label="Tìm kiếm sự cố, tên máy"
              placeholder="Tìm cụm máy, mô tả lỗi..."
              value={filter.search}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, search: e.target.value }))
              }
              className="w-full h-9 pl-9 pr-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <span className="text-xs font-mono tabular-nums text-slate-500 whitespace-nowrap">
            Hiển thị {filteredEntries.length}/{entries.length}
          </span>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={() =>
                setFilter({
                  status: 'all',
                  assigneeId: 'all',
                  machineId: 'all',
                  search: '',
                })
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
      {filteredEntries.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg px-6 py-14 text-center">
          <h2 className="text-base font-semibold text-slate-900">
            {entries.length > 0
              ? 'Không tìm thấy sự cố phù hợp'
              : 'Chưa có nhật ký sự cố nào'}
          </h2>
          <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">
            {entries.length > 0
              ? 'Thử thay đổi bộ lọc trạng thái, người xử lý hoặc từ khóa.'
              : 'Ghi nhận lỗi phát sinh và phương án khắc phục trong quá trình lắp ráp, chạy thử.'}
          </p>
          <div className="mt-5">
            {entries.length > 0 ? (
              <button
                type="button"
                onClick={() =>
                  setFilter({
                    status: 'all',
                    assigneeId: 'all',
                    machineId: 'all',
                    search: '',
                  })
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
                <span>Ghi nhận sự cố đầu tiên</span>
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
                  <th scope="col" className="py-3 px-2.5 text-center w-11">
                    STT
                  </th>
                  <th scope="col" className="py-3 px-2.5 w-24 whitespace-nowrap">
                    Ngày gặp lỗi
                  </th>
                  <th scope="col" className="py-3 px-2.5 w-28 whitespace-nowrap">
                    Thời gian sửa chữa
                  </th>
                  <th scope="col" className="py-3 px-2.5 min-w-[145px]">
                    Tên máy / Cụm máy
                  </th>
                  <th scope="col" className="py-3 px-2.5 min-w-[175px]">
                    Mô tả lỗi
                  </th>
                  <th scope="col" className="py-3 px-2.5 min-w-[175px]">
                    Cách khắc phục
                  </th>
                  <th scope="col" className="py-3 px-2.5 w-32">
                    Người xử lý
                  </th>
                  <th scope="col" className="py-3 px-2.5 w-36">
                    Trạng thái
                  </th>
                  <th scope="col" className="py-3 px-2.5 w-36">
                    File đính kèm
                  </th>
                  <th scope="col" className="py-3 px-2.5 text-right w-18">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredEntries.map((entry, idx) => {
                  const member = memberMap.get(entry.assigneeId);
                  const linkedMachine = findMachineForRecord(
                    machines,
                    entry.machineId,
                    entry.machineName
                  );
                  const attachments = entry.attachments ?? [];
                  return (
                    <tr
                      key={entry.id}
                      className="align-top hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3.5 px-2.5 text-center font-mono tabular-nums text-xs font-semibold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-2.5 font-mono tabular-nums text-xs text-slate-600 whitespace-nowrap">
                        {formatDateVi(entry.occurredAt)}
                      </td>
                      <td className="py-3.5 px-2.5 font-mono tabular-nums text-xs whitespace-nowrap">
                        {entry.repairTime ? (
                          <span className="text-slate-800 font-medium">
                            {entry.repairTime}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-2.5 font-semibold leading-snug text-[13px]">
                        {linkedMachine ? (
                          <button
                            type="button"
                            onClick={() => onOpenMachineDetail(linkedMachine)}
                            className="text-left text-[#2563EB] hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            {linkedMachine.name}
                          </button>
                        ) : (
                          <span className="text-slate-900">
                            {entry.machineName}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-2.5 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                        {entry.description}
                      </td>
                      <td className="py-3.5 px-2.5 text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                        {entry.resolution || '—'}
                      </td>
                      <td className="py-3.5 px-2.5">
                        {member ? (
                          <div>
                            <div className="text-[13px] font-medium text-slate-900 leading-snug">
                              {member.name}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {member.role}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Chưa phân công
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2.5">
                        <div
                          role="radiogroup"
                          aria-label={`Trạng thái sự cố ${entry.machineName}`}
                          className="flex flex-col gap-1"
                        >
                          {INCIDENT_STATUSES.map((st) => {
                            const selected = entry.status === st;
                            return (
                              <button
                                key={st}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => onStatusChange(entry.id, st)}
                                className={`w-full flex items-center gap-1.5 px-2 py-1 text-[11px] rounded border text-left transition-colors cursor-pointer whitespace-nowrap ${getIncidentStatusStyle(
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
                      <td className="py-3 px-2.5">
                        {attachments.length === 0 ? (
                          <span className="text-xs text-slate-400">
                            Không có
                          </span>
                        ) : (
                          <ul className="space-y-1.5">
                            {attachments.map((att) => (
                              <li key={att.id}>
                                <button
                                  type="button"
                                  onClick={() => onPreviewAttachment(att)}
                                  className="w-full text-left inline-flex items-start gap-1 text-xs text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
                                  title={`${att.name} (${formatFileSize(att.size)})`}
                                >
                                  <Paperclip
                                    className="w-3 h-3 mt-0.5 shrink-0 text-slate-400"
                                    aria-hidden="true"
                                  />
                                  <span className="min-w-0 flex flex-col">
                                    <span className="break-all leading-snug">
                                      {att.name}
                                    </span>
                                    <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                                      {formatFileSize(att.size)}
                                    </span>
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="py-3 px-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-0.5">
                          <button
                            type="button"
                            onClick={() => onEditEntry(entry)}
                            aria-label={`Sửa sự cố "${entry.machineName}"`}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingEntry(entry)}
                            aria-label={`Xóa sự cố "${entry.machineName}"`}
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
            {filteredEntries.map((entry, idx) => {
              const member = memberMap.get(entry.assigneeId);
              const linkedMachine = findMachineForRecord(
                machines,
                entry.machineId,
                entry.machineName
              );
              return (
                <article key={entry.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-slate-500">
                        STT #{idx + 1} · {formatDateVi(entry.occurredAt)}
                      </div>
                      <h3 className="mt-0.5 text-sm font-semibold text-slate-900">
                        {linkedMachine ? (
                          <button
                            type="button"
                            onClick={() => onOpenMachineDetail(linkedMachine)}
                            className="text-left text-[#2563EB] underline"
                          >
                            {linkedMachine.name}
                          </button>
                        ) : (
                          entry.machineName
                        )}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onEditEntry(entry)}
                        aria-label={`Sửa sự cố "${entry.machineName}"`}
                        className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md"
                      >
                        <Pencil className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingEntry(entry)}
                        aria-label={`Xóa sự cố "${entry.machineName}"`}
                        className="p-2 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-md"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    <span className="font-semibold text-slate-800">Lỗi: </span>
                    {entry.description}
                  </p>

                  {entry.resolution && (
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <span className="font-semibold text-slate-700">
                        Khắc phục:{' '}
                      </span>
                      {entry.resolution}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 block">
                        Thời gian sửa chữa
                      </span>
                      <span className="font-mono font-medium text-slate-900">
                        {entry.repairTime || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Người xử lý</span>
                      <span className="font-medium text-slate-900">
                        {member ? member.name : 'Chưa phân công'}
                      </span>
                    </div>
                  </div>

                  {(entry.attachments ?? []).length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500 block">
                        File đính kèm
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {(entry.attachments ?? []).map((att) => (
                          <button
                            key={att.id}
                            type="button"
                            onClick={() => onPreviewAttachment(att)}
                            className="inline-flex items-center gap-1 text-xs text-blue-700 underline cursor-pointer"
                          >
                            <Paperclip className="w-3 h-3" aria-hidden="true" />
                            <span>
                              {att.name} ({formatFileSize(att.size)})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    role="radiogroup"
                    aria-label={`Trạng thái sự cố ${entry.machineName}`}
                    className="flex flex-wrap gap-1.5"
                  >
                    {INCIDENT_STATUSES.map((st) => {
                      const selected = entry.status === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => onStatusChange(entry.id, st)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded border transition-colors ${getIncidentStatusStyle(
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
      {deletingEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inc-delete-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <h2
                id="inc-delete-title"
                className="text-base font-bold text-slate-900"
              >
                Xác nhận xóa nhật ký sự cố
              </h2>
              <button
                type="button"
                onClick={() => setDeletingEntry(null)}
                aria-label="Đóng xác nhận xóa sự cố"
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="p-6 space-y-2">
              <p className="text-sm text-slate-700">
                Bạn có chắc chắn muốn xóa bản ghi sự cố này không?
              </p>
              <p className="text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                {formatDateVi(deletingEntry.occurredAt)} —{' '}
                {deletingEntry.machineName}
              </p>
            </div>
            <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingEntry(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteEntry(deletingEntry.id);
                  setDeletingEntry(null);
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
