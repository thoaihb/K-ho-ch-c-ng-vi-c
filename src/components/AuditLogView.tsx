import { useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  Download,
  Filter,
  History,
  RotateCcw,
  Search,
  User,
} from 'lucide-react';
import {
  AuditAction,
  AuditFilter,
  AuditLogEntry,
  AuditTargetType,
  MachineProject,
  TeamMember,
} from '../types/workplan';
import {
  AUDIT_ACTION_LABELS,
  AUDIT_TARGET_LABELS,
  buildAuditCsv,
  filterAuditLogs,
} from '../utils/auditLog';
import { getInitials } from '../utils/rbac';
import { triggerTextDownload } from '../utils/overtime';
import { getTodayIsoDate } from '../utils/workplan';

interface AuditLogViewProps {
  logs: AuditLogEntry[];
  members: TeamMember[];
  machines: MachineProject[];
  currentUser?: TeamMember | null;
}

const INITIAL_AUDIT_FILTER: AuditFilter = {
  userId: 'all',
  targetType: 'all',
  machineId: 'all',
  action: 'all',
  startDate: '',
  endDate: '',
  search: '',
};

function getActionBadgeStyle(action: AuditAction): string {
  switch (action) {
    case 'create':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'status_change':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'progress_change':
      return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    case 'assign':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'update':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'delete':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function getTargetBadgeStyle(targetType: AuditTargetType): string {
  switch (targetType) {
    case 'machine':
      return 'bg-blue-50 text-[#2563EB] border-blue-100';
    case 'task':
      return 'bg-indigo-50 text-indigo-700 border-indigo-100';
    case 'material':
      return 'bg-amber-50 text-amber-700 border-amber-100';
    case 'incident':
      return 'bg-rose-50 text-rose-700 border-rose-100';
    case 'overtime':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    case 'member':
      return 'bg-purple-50 text-purple-700 border-purple-100';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export function AuditLogView({
  logs,
  members,
  machines,
  currentUser,
}: AuditLogViewProps) {
  const [filter, setFilter] = useState<AuditFilter>(INITIAL_AUDIT_FILTER);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filteredLogs = useMemo(
    () => filterAuditLogs(logs, filter),
    [logs, filter]
  );

  const hasActiveFilter =
    filter.userId !== 'all' ||
    filter.targetType !== 'all' ||
    filter.machineId !== 'all' ||
    filter.action !== 'all' ||
    filter.startDate !== '' ||
    filter.endDate !== '' ||
    filter.search.trim().length > 0;

  const handleExportCsv = () => {
    const csv = buildAuditCsv(filteredLogs);
    triggerTextDownload(
      `nhat-ky-lich-su-${getTodayIsoDate()}.csv`,
      csv,
      'text/csv;charset=utf-8;'
    );
    setFeedback(`Đã xuất file CSV lịch sử thay đổi (${filteredLogs.length} bản ghi).`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleResetFilter = () => {
    setFilter(INITIAL_AUDIT_FILTER);
  };

  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members]
  );

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <section
        aria-label="Tiêu đề nhật ký lịch sử thay đổi"
        className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
            <History className="w-5 h-5 text-[#2563EB]" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Nhật ký Lưu vết &amp; Lịch sử thay đổi (Audit Log)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tự động ghi nhận mọi thao tác thêm, sửa, đổi trạng thái, tiến độ và xóa dữ liệu kèm dấu thời gian và người thực hiện.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-mono tabular-nums text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-md">
            Tổng cộng: <strong>{logs.length}</strong> bản ghi
          </span>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
            <span>Xuất CSV Lịch sử</span>
          </button>
        </div>
      </section>

      {feedback && (
        <div
          role="status"
          className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-4 py-2.5 text-xs font-medium"
        >
          {feedback}
        </div>
      )}

      {/* Filter Toolbar */}
      <section
        aria-label="Bộ lọc lịch sử thay đổi"
        className="bg-white border border-slate-200 rounded-lg p-4 space-y-3"
      >
        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700 pb-1 border-b border-slate-100">
          <span className="inline-flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <span>Bộ lọc tra cứu lịch sử</span>
          </span>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleResetFilter}
              className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Member */}
          <div>
            <label
              htmlFor="audit-filter-user"
              className="block text-[11px] font-medium text-slate-500 mb-1"
            >
              Người thực hiện:
            </label>
            <select
              id="audit-filter-user"
              value={filter.userId}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, userId: e.target.value }))
              }
              className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="all">Tất cả thành viên</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} (@{m.username})
                </option>
              ))}
            </select>
          </div>

          {/* Machine */}
          <div>
            <label
              htmlFor="audit-filter-machine"
              className="block text-[11px] font-medium text-slate-500 mb-1"
            >
              Máy / Dự án liên quan:
            </label>
            <select
              id="audit-filter-machine"
              value={filter.machineId}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, machineId: e.target.value }))
              }
              className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="all">Tất cả máy / dự án</option>
              {machines.map((mac) => (
                <option key={mac.id} value={mac.code}>
                  {mac.code} - {mac.name}
                </option>
              ))}
            </select>
          </div>

          {/* Target Type */}
          <div>
            <label
              htmlFor="audit-filter-target"
              className="block text-[11px] font-medium text-slate-500 mb-1"
            >
              Loại đối tượng:
            </label>
            <select
              id="audit-filter-target"
              value={filter.targetType}
              onChange={(e) =>
                setFilter((prev) => ({
                  ...prev,
                  targetType: e.target.value as AuditFilter['targetType'],
                }))
              }
              className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="all">Tất cả đối tượng</option>
              <option value="machine">Máy / Dự án</option>
              <option value="task">Kế hoạch công việc</option>
              <option value="material">Vật tư & Linh kiện</option>
              <option value="incident">Nhật ký sự cố</option>
              <option value="overtime">Báo giờ tăng ca</option>
              <option value="member">Tài khoản & Phân quyền</option>
            </select>
          </div>

          {/* Action */}
          <div>
            <label
              htmlFor="audit-filter-action"
              className="block text-[11px] font-medium text-slate-500 mb-1"
            >
              Hành động:
            </label>
            <select
              id="audit-filter-action"
              value={filter.action}
              onChange={(e) =>
                setFilter((prev) => ({
                  ...prev,
                  action: e.target.value as AuditFilter['action'],
                }))
              }
              className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="all">Tất cả hành động</option>
              <option value="create">Thêm mới</option>
              <option value="status_change">Đổi trạng thái</option>
              <option value="progress_change">Cập nhật tiến độ</option>
              <option value="assign">Phân công</option>
              <option value="update">Chỉnh sửa</option>
              <option value="delete">Xóa</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label
              htmlFor="audit-filter-search"
              className="block text-[11px] font-medium text-slate-500 mb-1"
            >
              Tìm kiếm nội dung:
            </label>
            <div className="relative">
              <Search
                className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                id="audit-filter-search"
                type="search"
                placeholder="Tìm nội dung, tên..."
                value={filter.search}
                onChange={(e) =>
                  setFilter((prev) => ({ ...prev, search: e.target.value }))
                }
                className="w-full h-8 pl-8 pr-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Table */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg px-6 py-14 text-center">
          <History
            className="w-10 h-10 text-slate-300 mx-auto mb-3"
            aria-hidden="true"
          />
          <h3 className="text-base font-semibold text-slate-900">
            {logs.length > 0
              ? 'Không có lịch sử phù hợp với bộ lọc'
              : 'Chưa có bản ghi lịch sử nào'}
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {logs.length > 0
              ? 'Thử thay đổi người thực hiện, đối tượng hoặc từ khóa tìm kiếm.'
              : 'Mọi thao tác thay đổi máy, công việc, trạng thái, tiến độ và phân công sẽ được tự động ghi lại tại đây.'}
          </p>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleResetFilter}
              className="mt-4 px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th scope="col" className="py-3 px-3 text-center w-12">
                    STT
                  </th>
                  <th scope="col" className="py-3 px-3 w-40 whitespace-nowrap">
                    Thời gian thực hiện
                  </th>
                  <th scope="col" className="py-3 px-3 w-48">
                    Người thực hiện
                  </th>
                  <th scope="col" className="py-3 px-3 w-36 whitespace-nowrap">
                    Hành động
                  </th>
                  <th scope="col" className="py-3 px-3 w-48">
                    Đối tượng &amp; Máy
                  </th>
                  <th scope="col" className="py-3 px-3 min-w-[280px]">
                    Nội dung thay đổi chi tiết
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log, idx) => {
                  const member = memberMap.get(log.userId);
                  const color = member?.avatarColor || '#2563EB';
                  const initials = getInitials(log.userName);

                  return (
                    <tr
                      key={log.id}
                      className="align-top hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 px-3 text-center font-mono tabular-nums text-xs text-slate-400">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-mono tabular-nums text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                          <span>{log.formattedTime}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-[10px] shrink-0"
                            style={{ backgroundColor: color }}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-xs text-slate-900 truncate">
                              {log.userName}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              @{log.userUsername}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded border ${getActionBadgeStyle(
                            log.action
                          )}`}
                        >
                          {AUDIT_ACTION_LABELS[log.action] ?? log.action}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded border ${getTargetBadgeStyle(
                              log.targetType
                            )}`}
                          >
                            {AUDIT_TARGET_LABELS[log.targetType] ?? log.targetType}
                          </span>
                          {log.machineCode && (
                            <div className="text-xs font-mono font-semibold text-slate-700">
                              [{log.machineCode}]
                            </div>
                          )}
                          <div className="text-xs text-slate-800 font-medium leading-snug truncate max-w-[200px]">
                            {log.targetName}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <p className="text-xs text-slate-800 leading-relaxed font-mono whitespace-pre-wrap bg-slate-50 border border-slate-200/80 rounded-md p-2">
                          {log.details}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
