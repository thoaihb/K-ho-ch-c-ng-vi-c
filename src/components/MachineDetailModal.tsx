import { useEffect, useMemo } from 'react';
import {
  ClipboardList,
  Package,
  Paperclip,
  Pencil,
  Plus,
  Wrench,
  X,
} from 'lucide-react';
import {
  AttachmentItem,
  IncidentEntry,
  MachineProject,
  MaterialItem,
  TeamMember,
  WorkTask,
} from '../types/workplan';
import { computeMachineProfile } from '../utils/machines';
import { clampProgress, formatDateVi, formatFileSize } from '../utils/workplan';

interface MachineDetailModalProps {
  machine: MachineProject | null;
  tasks: WorkTask[];
  materials: MaterialItem[];
  incidents: IncidentEntry[];
  members: TeamMember[];
  onClose: () => void;
  onEditMachine: (machine: MachineProject) => void;
  onQuickAddTask: (machine: MachineProject) => void;
  onQuickAddMaterial: (machine: MachineProject) => void;
  onQuickAddIncident: (machine: MachineProject) => void;
  onPreviewAttachment: (attachment: AttachmentItem) => void;
}

function getStatusBadgeClass(status: string): string {
  if (
    status === 'Hoàn thành' ||
    status === 'Đã về kho' ||
    status === 'Đã khắc phục' ||
    status === 'Đã bàn giao'
  ) {
    return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  }
  if (
    status === 'Đang thực hiện' ||
    status === 'Đã đặt' ||
    status === 'Đang triển khai'
  ) {
    return 'bg-blue-50 text-blue-800 border-blue-200';
  }
  if (status === 'Chạy thử FAT/SAT') {
    return 'bg-indigo-50 text-indigo-800 border-indigo-200';
  }
  if (status === 'Đang xử lý') {
    return 'bg-red-50 text-red-800 border-red-200';
  }
  return 'bg-amber-50 text-amber-800 border-amber-200';
}

export function MachineDetailModal({
  machine,
  tasks,
  materials,
  incidents,
  members,
  onClose,
  onEditMachine,
  onQuickAddTask,
  onQuickAddMaterial,
  onQuickAddIncident,
  onPreviewAttachment,
}: MachineDetailModalProps) {
  useEffect(() => {
    if (!machine) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [machine, onClose]);

  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members]
  );

  const profile = useMemo(
    () =>
      machine
        ? computeMachineProfile(machine, tasks, materials, incidents)
        : null,
    [machine, tasks, materials, incidents]
  );

  if (!machine || !profile) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="machine-detail-title"
    >
      <div className="bg-slate-50 border border-slate-200 rounded-xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Sticky Top Header */}
        <div className="bg-white px-5 sm:px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-mono font-bold text-slate-800 bg-slate-100 border border-slate-200 rounded">
                {machine.code}
              </span>
              <span
                className={`px-2 py-0.5 text-xs font-semibold border rounded ${getStatusBadgeClass(
                  machine.status
                )}`}
              >
                {machine.status}
              </span>
              <span className="text-xs font-mono text-slate-500">
                Bắt đầu: {formatDateVi(machine.startDate)}
              </span>
            </div>
            <h2
              id="machine-detail-title"
              className="text-lg sm:text-xl font-bold text-slate-900 leading-snug"
            >
              Hồ sơ Máy: {machine.name}
            </h2>
            {machine.description && (
              <p className="text-xs text-slate-600 leading-relaxed">
                {machine.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onEditMachine(machine)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Sửa thông tin</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng hồ sơ máy"
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* KPI Summary Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 bg-white border border-slate-200 rounded-lg divide-y md:divide-y-0 md:divide-x divide-slate-200">
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-blue-700">
                  Tiến độ công việc trung bình
                </span>
                <span
                  data-testid="machine-detail-avg-progress"
                  className="text-xl font-bold font-mono tabular-nums text-slate-900"
                >
                  {profile.averageProgress}%
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2563EB] rounded-full transition-all"
                  style={{ width: `${profile.averageProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 font-mono tabular-nums">
                {profile.tasks.length} đầu việc ({profile.completedTasks} hoàn thành)
              </p>
            </div>

            <div className="p-4 space-y-1.5">
              <p className="text-xs font-medium text-amber-700">
                Danh sách BOM (Vật tư & Linh kiện)
              </p>
              <p className="text-xl font-bold font-mono tabular-nums text-slate-900">
                {profile.materials.length} mục
              </p>
              <p className="text-xs text-slate-500 font-mono tabular-nums">
                Cần đặt: {profile.materialToOrder} · Đã đặt:{' '}
                {profile.materialOrdered} · Kho: {profile.materialInStock}
              </p>
            </div>

            <div className="p-4 space-y-1.5">
              <p className="text-xs font-medium text-red-700">
                Lịch sử sửa chữa & Sự cố
              </p>
              <p className="text-xl font-bold font-mono tabular-nums text-slate-900">
                {profile.incidents.length} sự cố
              </p>
              <p className="text-xs text-slate-500 font-mono tabular-nums">
                Chưa xong: {profile.openIncidents} · Đã khắc phục:{' '}
                {profile.resolvedIncidents}
              </p>
            </div>
          </div>

          {/* Section 1: Tiến độ công việc */}
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ClipboardList
                  className="w-4 h-4 text-[#2563EB]"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-bold text-slate-900">
                  Phần 1 – Tiến độ công việc ({profile.tasks.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onQuickAddTask(machine)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#2563EB] bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Thêm công việc</span>
              </button>
            </div>

            {profile.tasks.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-500">
                Chưa có đầu việc nào gắn cho máy này.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2.5 px-3 w-10 text-center">STT</th>
                      <th className="py-2.5 px-3 min-w-[220px]">
                        Nội dung chi tiết
                      </th>
                      <th className="py-2.5 px-3 w-36">Người đảm nhận</th>
                      <th className="py-2.5 px-3 w-28 whitespace-nowrap">
                        Kế hoạch HT
                      </th>
                      <th className="py-2.5 px-3 w-28">Trạng thái</th>
                      <th className="py-2.5 px-3 w-28">Tiến độ</th>
                      <th className="py-2.5 px-3 min-w-[140px]">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {profile.tasks.map((task, idx) => {
                      const assignee = memberMap.get(task.assigneeId);
                      const pct = clampProgress(task.progress);
                      return (
                        <tr key={task.id} className="align-top">
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 leading-relaxed whitespace-pre-line">
                            {task.detailContent || task.mainContent}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {assignee ? assignee.name : 'Chưa phân công'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                            {formatDateVi(task.targetDate)}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 text-[11px] font-semibold border rounded ${getStatusBadgeClass(
                                task.status
                              )}`}
                            >
                              {task.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="relative h-5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                              <div
                                className={`h-full transition-all ${
                                  pct >= 100
                                    ? 'bg-emerald-600'
                                    : 'bg-[#2563EB]'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                              <span
                                className={`absolute inset-0 flex items-center justify-center text-[11px] font-mono font-bold ${
                                  pct >= 55 ? 'text-white' : 'text-slate-800'
                                }`}
                              >
                                {pct}%
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {task.notes || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Section 2: Danh sách BOM (Vật tư & Linh kiện) */}
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Package
                  className="w-4 h-4 text-amber-600"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-bold text-slate-900">
                  Phần 2 – Danh sách BOM / Vật tư & Linh kiện (
                  {profile.materials.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onQuickAddMaterial(machine)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Thêm nhanh vật tư vào BOM</span>
              </button>
            </div>

            {profile.materials.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-500">
                Chưa có vật tư / linh kiện nào trong BOM của máy này.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2.5 px-3 w-10 text-center">STT</th>
                      <th className="py-2.5 px-3 min-w-[180px]">Tên vật tư</th>
                      <th className="py-2.5 px-3 min-w-[150px]">
                        Mã hiệu / Thông số
                      </th>
                      <th className="py-2.5 px-3 w-24 text-right">Số lượng</th>
                      <th className="py-2.5 px-3 w-28">Trạng thái</th>
                      <th className="py-2.5 px-3 min-w-[150px]">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {profile.materials.map((item, idx) => (
                      <tr key={item.id} className="align-top">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {item.name}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">
                          {item.specCode}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 text-[11px] font-semibold border rounded ${getStatusBadgeClass(
                              item.status
                            )}`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {item.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Section 3: Lịch sử sửa chữa & Sự cố */}
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Wrench
                  className="w-4 h-4 text-red-600"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-bold text-slate-900">
                  Phần 3 – Lịch sử sửa chữa & Sự cố (
                  {profile.incidents.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onQuickAddIncident(machine)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Ghi nhận sự cố</span>
              </button>
            </div>

            {profile.incidents.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-500">
                Chưa có nhật ký sự cố hoặc sửa chữa nào cho máy này.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2.5 px-3 w-24 whitespace-nowrap">
                        Ngày gặp lỗi
                      </th>
                      <th className="py-2.5 px-3 w-28 whitespace-nowrap">
                        Thời gian sửa
                      </th>
                      <th className="py-2.5 px-3 min-w-[170px]">Mô tả lỗi</th>
                      <th className="py-2.5 px-3 min-w-[170px]">
                        Cách khắc phục
                      </th>
                      <th className="py-2.5 px-3 w-32">Người xử lý</th>
                      <th className="py-2.5 px-3 w-28">Trạng thái</th>
                      <th className="py-2.5 px-3 w-36">File đính kèm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {profile.incidents.map((inc) => {
                      const member = memberMap.get(inc.assigneeId);
                      const atts = inc.attachments ?? [];
                      return (
                        <tr key={inc.id} className="align-top">
                          <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                            {formatDateVi(inc.occurredAt)}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-800 whitespace-nowrap">
                            {inc.repairTime || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 leading-relaxed whitespace-pre-line">
                            {inc.description}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 leading-relaxed whitespace-pre-line">
                            {inc.resolution || '—'}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {member ? member.name : 'Chưa phân công'}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 text-[11px] font-semibold border rounded ${getStatusBadgeClass(
                                inc.status
                              )}`}
                            >
                              {inc.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {atts.length === 0 ? (
                              <span className="text-slate-400">Không có</span>
                            ) : (
                              <ul className="space-y-1">
                                {atts.map((att) => (
                                  <li key={att.id}>
                                    <button
                                      type="button"
                                      onClick={() => onPreviewAttachment(att)}
                                      className="text-left inline-flex items-start gap-1 text-blue-700 hover:underline cursor-pointer"
                                    >
                                      <Paperclip
                                        className="w-3 h-3 mt-0.5 shrink-0 text-slate-400"
                                        aria-hidden="true"
                                      />
                                      <span className="break-all">
                                        {att.name} ({formatFileSize(att.size)})
                                      </span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="bg-white px-6 py-3.5 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            Đóng hồ sơ
          </button>
        </div>
      </div>
    </div>
  );
}
