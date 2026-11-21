import { FormEvent, useMemo, useState } from 'react';
import { Pencil, Plus, RotateCcw, Search, Trash2, X } from 'lucide-react';
import {
  OVERTIME_DAY_TYPES,
  OVERTIME_MULTIPLIERS,
  OvertimeDayType,
  OvertimeEntry,
  OvertimeFilter,
  TeamMember,
} from '../types/workplan';
import {
  calculateWeightedHours,
  computeOvertimeStats,
  filterOvertimeEntries,
  formatHours,
  formatMonthVi,
  getMonthKey,
  getOvertimeMultiplier,
  roundHours,
} from '../utils/overtime';
import { formatDateVi, getTodayIsoDate } from '../utils/workplan';

interface OvertimeViewProps {
  entries: OvertimeEntry[];
  members: TeamMember[];
  onAddEntry: (data: Omit<OvertimeEntry, 'id' | 'createdAt'>) => void;
  onUpdateEntry: (
    id: string,
    data: Omit<OvertimeEntry, 'id' | 'createdAt'>
  ) => void;
  onDeleteEntry: (id: string) => void;
}

export function OvertimeView({
  entries,
  members,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
}: OvertimeViewProps) {
  const [date, setDate] = useState(getTodayIsoDate());
  const [memberId, setMemberId] = useState(members[0]?.id ?? '');
  const [hoursInput, setHoursInput] = useState('2');
  const [dayType, setDayType] = useState<OvertimeDayType>('Ngày thường');
  const [content, setContent] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<OvertimeEntry | null>(
    null
  );

  const [filter, setFilter] = useState<OvertimeFilter>({
    memberId: 'all',
    month: '',
    search: '',
  });

  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members]
  );

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const entry of entries) {
      const m = getMonthKey(entry.date);
      if (m) set.add(m);
    }
    const currentMonth = getMonthKey(getTodayIsoDate());
    if (currentMonth) set.add(currentMonth);
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [entries]);

  const filteredEntries = useMemo(
    () => filterOvertimeEntries(entries, filter, members),
    [entries, filter, members]
  );

  const stats = useMemo(
    () => computeOvertimeStats(filteredEntries),
    [filteredEntries]
  );

  const parsedHours = Number(hoursInput);
  const previewWeightedHours =
    Number.isFinite(parsedHours) && parsedHours > 0
      ? calculateWeightedHours(parsedHours, dayType)
      : 0;

  const resetForm = () => {
    setDate(getTodayIsoDate());
    setMemberId(members[0]?.id ?? '');
    setHoursInput('2');
    setDayType('Ngày thường');
    setContent('');
    setNotes('');
    setErrors({});
    setEditingEntryId(null);
  };

  const handleStartEdit = (entry: OvertimeEntry) => {
    setEditingEntryId(entry.id);
    setDate(entry.date);
    setMemberId(entry.memberId);
    setHoursInput(String(entry.hours));
    setDayType(entry.dayType);
    setContent(entry.content);
    setNotes(entry.notes);
    setErrors({});
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    const h = Number(hoursInput);

    if (!date) {
      nextErrors.date = 'Vui lòng chọn ngày tăng ca.';
    }
    if (!memberId) {
      nextErrors.memberId = 'Vui lòng chọn người thực hiện.';
    }
    if (!Number.isFinite(h) || h <= 0 || h > 24) {
      nextErrors.hours = 'Số giờ hợp lệ phải từ 0.5 đến 24 giờ.';
    }
    if (!content.trim()) {
      nextErrors.content = 'Vui lòng nhập nội dung công việc tăng ca.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload = {
      date,
      memberId,
      hours: roundHours(h),
      dayType,
      content: content.trim(),
      notes: notes.trim(),
    };

    if (editingEntryId) {
      onUpdateEntry(editingEntryId, payload);
    } else {
      onAddEntry(payload);
    }
    resetForm();
  };

  const hasActiveFilter =
    filter.memberId !== 'all' ||
    filter.month !== '' ||
    filter.search.trim().length > 0;

  return (
    <div className="space-y-5">
      {/* Overtime Summary Strip */}
      <section
        aria-label="Thống kê giờ tăng ca"
        className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-lg"
      >
        <div className="px-4 py-3.5 border-r border-b lg:border-b-0 border-slate-200">
          <p className="text-xs font-medium text-slate-500">Tổng số lượt</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {stats.count}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {hasActiveFilter ? 'Theo bộ lọc hiện tại' : 'Toàn bộ bản ghi'}
          </p>
        </div>

        <div className="px-4 py-3.5 border-b lg:border-b-0 lg:border-r border-slate-200">
          <p className="text-xs font-medium text-blue-700">Tổng giờ thực tế</p>
          <p
            data-testid="overtime-total-hours"
            className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900"
          >
            {formatHours(stats.totalHours)}
          </p>
          <p className="mt-1 text-xs font-mono tabular-nums text-slate-500">
            Thường: {formatHours(stats.regularHours)}
          </p>
        </div>

        <div className="px-4 py-3.5 border-r border-slate-200">
          <p className="text-xs font-medium text-emerald-700">
            Tổng giờ quy đổi
          </p>
          <p
            data-testid="overtime-weighted-hours"
            className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900"
          >
            {formatHours(stats.totalWeightedHours)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Tính theo 1.5x / 2.0x / 3.0x
          </p>
        </div>

        <div className="px-4 py-3.5">
          <p className="text-xs font-medium text-amber-700">
            Cuối tuần & Ngày lễ
          </p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {formatHours(stats.weekendHours + stats.holidayHours)}
          </p>
          <p className="mt-1 text-xs font-mono tabular-nums text-slate-500">
            CT: {formatHours(stats.weekendHours)} · Lễ:{' '}
            {formatHours(stats.holidayHours)}
          </p>
        </div>
      </section>

      {/* Inline Add / Edit Overtime Form */}
      <section
        aria-label={
          editingEntryId
            ? 'Chỉnh sửa bản ghi tăng ca'
            : 'Ghi nhận giờ tăng ca mới'
        }
        className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-900">
            {editingEntryId
              ? 'Chỉnh sửa bản ghi tăng ca'
              : 'Ghi nhận giờ tăng ca mới'}
          </h2>
          <span className="text-xs font-mono tabular-nums text-slate-600">
            Quy đổi dự kiến:{' '}
            <strong className="text-blue-700">
              {formatHours(previewWeightedHours)}
            </strong>{' '}
            ({getOvertimeMultiplier(dayType)}x)
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div>
              <label
                htmlFor="ot-date"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Ngày tăng ca <span className="text-red-600">*</span>
              </label>
              <input
                id="ot-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-9 px-3 text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
              />
              {errors.date && (
                <p className="mt-1 text-xs text-red-600">{errors.date}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="ot-member"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Người thực hiện <span className="text-red-600">*</span>
              </label>
              <select
                id="ot-member"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full h-9 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
              >
                <option value="">-- Chọn thành viên --</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              {errors.memberId && (
                <p className="mt-1 text-xs text-red-600">{errors.memberId}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="ot-hours"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Số giờ (giờ) <span className="text-red-600">*</span>
              </label>
              <input
                id="ot-hours"
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                placeholder="1.5"
                value={hoursInput}
                onChange={(e) => setHoursInput(e.target.value)}
                className="w-full h-9 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
              />
              {errors.hours && (
                <p className="mt-1 text-xs text-red-600">{errors.hours}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="ot-day-type"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Loại ngày <span className="text-red-600">*</span>
              </label>
              <select
                id="ot-day-type"
                value={dayType}
                onChange={(e) => setDayType(e.target.value as OvertimeDayType)}
                className="w-full h-9 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
              >
                {OVERTIME_DAY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type} ({OVERTIME_MULTIPLIERS[type]}x)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="ot-content"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Nội dung công việc tăng ca{' '}
                <span className="text-red-600">*</span>
              </label>
              <input
                id="ot-content"
                type="text"
                placeholder="Ví dụ: Chạy thử liên động PLC S7-1500 sau giờ hành chính"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-9 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
              />
              {errors.content && (
                <p className="mt-1 text-xs text-red-600">{errors.content}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="ot-notes"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Ghi chú
              </label>
              <input
                id="ot-notes"
                type="text"
                placeholder="Thông tin ca trực, kết quả nghiệm thu hoặc hỗ trợ..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-9 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-1">
            {editingEntryId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Hủy sửa
              </button>
            )}
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>{editingEntryId ? 'Cập nhật tăng ca' : 'Lưu tăng ca'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* Filter Toolbar */}
      <section
        aria-label="Bộ lọc báo giờ tăng ca"
        className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label
              htmlFor="ot-filter-member"
              className="text-xs font-medium text-slate-600 whitespace-nowrap"
            >
              Người thực hiện:
            </label>
            <select
              id="ot-filter-member"
              value={filter.memberId}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, memberId: e.target.value }))
              }
              className="h-9 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
            >
              <option value="all">Tất cả thành viên</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="ot-filter-month"
              className="text-xs font-medium text-slate-600 whitespace-nowrap"
            >
              Tháng:
            </label>
            <select
              id="ot-filter-month"
              value={filter.month}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, month: e.target.value }))
              }
              className="h-9 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
            >
              <option value="">Tất cả các tháng</option>
              {availableMonths.map((monthKey) => (
                <option key={monthKey} value={monthKey}>
                  {formatMonthVi(monthKey)}
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
              aria-label="Tìm kiếm nội dung tăng ca"
              placeholder="Tìm nội dung, ghi chú..."
              value={filter.search}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, search: e.target.value }))
              }
              className="w-full h-9 pl-9 pr-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
            />
          </div>

          <span className="text-xs font-mono tabular-nums text-slate-500 whitespace-nowrap">
            Hiển thị {filteredEntries.length}/{entries.length}
          </span>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={() =>
                setFilter({ memberId: 'all', month: '', search: '' })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>
      </section>

      {/* Overtime List / Table */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg px-6 py-12 text-center">
          <h3 className="text-base font-semibold text-slate-900">
            {entries.length > 0
              ? 'Không có bản ghi tăng ca phù hợp'
              : 'Chưa có dữ liệu báo giờ tăng ca'}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {entries.length > 0
              ? 'Thử thay đổi bộ lọc thành viên, tháng hoặc từ khóa tìm kiếm.'
              : 'Sử dụng biểu mẫu phía trên để ghi nhận lượt tăng ca đầu tiên của nhóm.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th scope="col" className="py-3 px-3 text-center w-12">
                    STT
                  </th>
                  <th scope="col" className="py-3 px-3 w-28 whitespace-nowrap">
                    Ngày tăng ca
                  </th>
                  <th scope="col" className="py-3 px-3 w-44">
                    Người thực hiện
                  </th>
                  <th scope="col" className="py-3 px-3 w-36 whitespace-nowrap">
                    Loại ngày
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-3 text-right w-24 whitespace-nowrap"
                  >
                    Số giờ
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-3 text-right w-28 whitespace-nowrap"
                  >
                    Giờ quy đổi
                  </th>
                  <th scope="col" className="py-3 px-3 min-w-[200px]">
                    Nội dung công việc tăng ca
                  </th>
                  <th scope="col" className="py-3 px-3 min-w-[160px]">
                    Ghi chú
                  </th>
                  <th scope="col" className="py-3 px-3 text-right w-20">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredEntries.map((entry, idx) => {
                  const member = memberMap.get(entry.memberId);
                  const multiplier = getOvertimeMultiplier(entry.dayType);
                  const weighted = calculateWeightedHours(
                    entry.hours,
                    entry.dayType
                  );

                  return (
                    <tr
                      key={entry.id}
                      className="align-top hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3.5 px-3 text-center font-mono tabular-nums text-xs font-semibold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-3 font-mono tabular-nums text-xs text-slate-700 whitespace-nowrap">
                        {formatDateVi(entry.date)}
                      </td>
                      <td className="py-3.5 px-3">
                        {member ? (
                          <div>
                            <div className="font-medium text-slate-900">
                              {member.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {member.role}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Không xác định
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap text-xs">
                        <span
                          className={`font-medium ${
                            entry.dayType === 'Ngày lễ'
                              ? 'text-red-700'
                              : entry.dayType === 'Cuối tuần'
                              ? 'text-amber-700'
                              : 'text-slate-700'
                          }`}
                        >
                          {entry.dayType}
                        </span>
                        <span className="ml-1.5 font-mono text-slate-400">
                          · {multiplier}x
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-xs font-semibold text-slate-900 whitespace-nowrap">
                        {formatHours(entry.hours)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-xs font-semibold text-blue-700 whitespace-nowrap">
                        {formatHours(weighted)}
                      </td>
                      <td className="py-3.5 px-3 text-slate-800 text-xs leading-relaxed">
                        {entry.content}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 text-xs leading-relaxed">
                        {entry.notes || '—'}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(entry)}
                            aria-label={`Sửa tăng ca "${entry.content}"`}
                            className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingEntry(entry)}
                            aria-label={`Xóa tăng ca "${entry.content}"`}
                            className="p-2 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
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
              const member = memberMap.get(entry.memberId);
              const multiplier = getOvertimeMultiplier(entry.dayType);
              const weighted = calculateWeightedHours(
                entry.hours,
                entry.dayType
              );

              return (
                <article key={entry.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                        <span>STT #{idx + 1}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatDateVi(entry.date)}</span>
                      </div>
                      <h3 className="mt-1 text-sm font-semibold text-slate-900">
                        {entry.content}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(entry)}
                        aria-label={`Sửa tăng ca "${entry.content}"`}
                        className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md"
                      >
                        <Pencil className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingEntry(entry)}
                        aria-label={`Xóa tăng ca "${entry.content}"`}
                        className="p-2 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-md"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 block">
                        Người thực hiện
                      </span>
                      <span className="font-medium text-slate-900">
                        {member ? member.name : 'Không xác định'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Loại ngày</span>
                      <span className="font-medium text-slate-900">
                        {entry.dayType} ({multiplier}x)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Số giờ</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-900">
                        {formatHours(entry.hours)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Giờ quy đổi</span>
                      <span className="font-mono tabular-nums font-semibold text-blue-700">
                        {formatHours(weighted)}
                      </span>
                    </div>
                  </div>

                  {entry.notes && (
                    <p className="text-xs text-slate-600 pt-1.5 border-t border-slate-100">
                      <span className="font-medium text-slate-700">
                        Ghi chú:{' '}
                      </span>
                      {entry.notes}
                    </p>
                  )}
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
          aria-labelledby="ot-delete-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <h2
                id="ot-delete-title"
                className="text-base font-bold text-slate-900"
              >
                Xác nhận xóa bản ghi tăng ca
              </h2>
              <button
                type="button"
                onClick={() => setDeletingEntry(null)}
                aria-label="Đóng xác nhận xóa tăng ca"
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 space-y-2">
              <p className="text-sm text-slate-700">
                Bạn có chắc chắn muốn xóa bản ghi giờ tăng ca này không?
              </p>
              <p className="text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                {formatDateVi(deletingEntry.date)} —{' '}
                {formatHours(deletingEntry.hours)} ({deletingEntry.content})
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
                  if (editingEntryId === deletingEntry.id) {
                    resetForm();
                  }
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
