import { useState } from 'react';
import {
  AlertCircle,
  Check,
  Circle,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  AttachmentItem,
  MachineProject,
  TASK_STATUSES,
  TaskStatus,
  TeamMember,
  WorkTask,
} from '../types/workplan';
import { findMachineForRecord } from '../utils/machines';
import { formatDateVi, formatFileSize, isTaskOverdue } from '../utils/workplan';
import { ProgressControl } from './ProgressControl';

interface WorkplanTableProps {
  tasks: WorkTask[];
  totalTaskCount: number;
  members: TeamMember[];
  machines: MachineProject[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onProgressChange: (taskId: string, progress: number) => void;
  onEditTask: (task: WorkTask) => void;
  onDeleteTask: (task: WorkTask) => void;
  onPreviewAttachment: (attachment: AttachmentItem) => void;
  onOpenMachineDetail: (machine: MachineProject) => void;
  onOpenAddModal: () => void;
  onResetFilter: () => void;
}

function getStatusOptionStyle(status: TaskStatus, selected: boolean): string {
  if (!selected) {
    return 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-transparent';
  }
  if (status === 'Đang thực hiện') {
    return 'bg-blue-50 text-blue-800 border-blue-200 font-semibold';
  }
  if (status === 'Hoàn thành') {
    return 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold';
  }
  return 'bg-amber-50 text-amber-800 border-amber-200 font-semibold';
}

export function WorkplanTable({
  tasks,
  totalTaskCount,
  members,
  machines,
  onStatusChange,
  onProgressChange,
  onEditTask,
  onDeleteTask,
  onPreviewAttachment,
  onOpenMachineDetail,
  onOpenAddModal,
  onResetFilter,
}: WorkplanTableProps) {
  const [openProgressTaskId, setOpenProgressTaskId] = useState<string | null>(
    null
  );
  const memberMap = new Map(members.map((m) => [m.id, m]));

  if (tasks.length === 0) {
    const isFilteredEmpty = totalTaskCount > 0;
    return (
      <div className="bg-white border border-slate-200 rounded-lg px-6 py-14 text-center">
        <h2 className="text-base font-semibold text-slate-900">
          {isFilteredEmpty
            ? 'Không tìm thấy hạng mục phù hợp'
            : 'Chưa có hạng mục công việc nào'}
        </h2>
        <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">
          {isFilteredEmpty
            ? 'Thử thay đổi điều kiện lọc theo trạng thái, người đảm nhận hoặc từ khóa tìm kiếm.'
            : 'Bắt đầu thêm kế hoạch công việc đầu tiên cho nhóm tự động hóa để theo dõi tiến độ.'}
        </p>
        <div className="mt-5 flex items-center justify-center gap-3">
          {isFilteredEmpty ? (
            <button
              type="button"
              onClick={onResetFilter}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Thêm hạng mục đầu tiên</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Desktop & Tablet Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
              <th scope="col" className="py-3 px-2 text-center w-10">
                STT
              </th>
              <th scope="col" className="py-3 px-2 w-[86px] whitespace-nowrap">
                Ngày tạo
              </th>
              <th scope="col" className="py-3 px-2 min-w-[130px] w-[14%]">
                Nội dung chính
              </th>
              <th scope="col" className="py-3 px-2 min-w-[145px] w-[17%]">
                Nội dung chi tiết
              </th>
              <th scope="col" className="py-3 px-2 w-[92px]">
                Kế hoạch hoàn thành
              </th>
              <th scope="col" className="py-3 px-2 w-[116px]">
                Người đảm nhận
              </th>
              <th scope="col" className="py-3 px-2 w-[124px]">
                Trạng thái
              </th>
              <th scope="col" className="py-3 px-2 w-[92px] whitespace-nowrap">
                Tiến độ (%)
              </th>
              <th scope="col" className="py-3 px-2 w-[114px]">
                File đính kèm
              </th>
              <th scope="col" className="py-3 px-2 min-w-[110px]">
                Ghi chú
              </th>
              <th scope="col" className="py-3 px-2 text-right w-[68px] whitespace-nowrap">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {tasks.map((task, index) => {
              const assignee = memberMap.get(task.assigneeId);
              const linkedMachine = findMachineForRecord(
                machines,
                task.machineId,
                task.mainContent
              );
              const overdue = isTaskOverdue(task);
              const rowNumber = index + 1;

              return (
                <tr
                  key={task.id}
                  data-testid={`task-row-${task.id}`}
                  className="align-top hover:bg-slate-50/70 transition-colors"
                >
                  <td className="py-3 px-2 text-center font-mono tabular-nums text-xs font-semibold text-slate-500">
                    {rowNumber}
                  </td>

                  <td className="py-3 px-2 font-mono tabular-nums text-xs text-slate-600 whitespace-nowrap">
                    {formatDateVi(task.createdAt)}
                  </td>

                  <td className="py-3 px-2 text-[13px] font-semibold leading-snug">
                    {linkedMachine ? (
                      <button
                        type="button"
                        onClick={() => onOpenMachineDetail(linkedMachine)}
                        className="text-left text-[#2563EB] hover:text-blue-800 hover:underline cursor-pointer"
                        title="Xem hồ sơ tổng hợp của máy"
                      >
                        {linkedMachine.name}
                      </button>
                    ) : (
                      <span className="text-slate-900">{task.mainContent}</span>
                    )}
                  </td>

                  <td className="py-3 px-2 text-slate-600 text-xs leading-relaxed whitespace-pre-line">
                    {task.detailContent || '—'}
                  </td>

                  <td className="py-3 px-2 whitespace-nowrap">
                    <div className="font-mono tabular-nums text-xs text-slate-800">
                      {formatDateVi(task.targetDate)}
                    </div>
                    {overdue && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-red-700">
                        <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span>Quá hạn</span>
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-2">
                    {assignee ? (
                      <div>
                        <div className="text-[13px] font-medium text-slate-900 leading-snug">
                          {assignee.name}
                        </div>
                        <div className="text-[11px] text-slate-500 leading-snug mt-0.5">
                          {assignee.role}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Chưa phân công</span>
                    )}
                  </td>

                  <td className="py-2.5 px-2">
                    <div
                      role="radiogroup"
                      aria-label={`Trạng thái của ${task.mainContent}`}
                      className="flex flex-col gap-1"
                    >
                      {TASK_STATUSES.map((status) => {
                        const selected = task.status === status;
                        return (
                          <button
                            key={status}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => onStatusChange(task.id, status)}
                            className={`w-full flex items-center gap-1 px-1.5 py-1 text-[11px] rounded border text-left transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-700 ${getStatusOptionStyle(
                              status,
                              selected
                            )}`}
                          >
                            {selected ? (
                              <Check className="w-3 h-3 shrink-0" aria-hidden="true" />
                            ) : (
                              <Circle className="w-3 h-3 shrink-0 text-slate-300" aria-hidden="true" />
                            )}
                            <span>{status}</span>
                          </button>
                        );
                      })}
                    </div>
                  </td>

                  <td className="py-3 px-2">
                    <ProgressControl
                      taskId={task.id}
                      taskName={task.mainContent}
                      status={task.status}
                      progress={task.progress}
                      isOpen={openProgressTaskId === `desktop-${task.id}`}
                      onToggleOpen={(id) =>
                        setOpenProgressTaskId(id ? `desktop-${id}` : null)
                      }
                      onChangeProgress={onProgressChange}
                    />
                  </td>

                  <td className="py-3 px-2">
                    {task.attachments.length === 0 ? (
                      <span className="text-xs text-slate-400">Không có</span>
                    ) : (
                      <ul className="space-y-1.5">
                        {task.attachments.map((att) => (
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

                  <td className="py-3 px-2 text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                    {task.notes || '—'}
                  </td>

                  <td className="py-2.5 px-2 text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-0.5">
                      <button
                        type="button"
                        onClick={() => onEditTask(task)}
                        aria-label={`Sửa "${task.mainContent}"`}
                        className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteTask(task)}
                        aria-label={`Xóa "${task.mainContent}"`}
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

      {/* Mobile List View (< 768px) */}
      <div className="md:hidden divide-y divide-slate-200">
        {tasks.map((task, index) => {
          const assignee = memberMap.get(task.assigneeId);
          const linkedMachine = findMachineForRecord(
            machines,
            task.machineId,
            task.mainContent
          );
          const overdue = isTaskOverdue(task);
          const rowNumber = index + 1;

          return (
            <article key={task.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                    <span>STT #{rowNumber}</span>
                    <span aria-hidden="true">·</span>
                    <span>Tạo: {formatDateVi(task.createdAt)}</span>
                  </div>
                  <h3 className="mt-1 text-sm font-semibold text-slate-900">
                    {linkedMachine ? (
                      <button
                        type="button"
                        onClick={() => onOpenMachineDetail(linkedMachine)}
                        className="text-left text-[#2563EB] underline"
                      >
                        {linkedMachine.name}
                      </button>
                    ) : (
                      task.mainContent
                    )}
                  </h3>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onEditTask(task)}
                    aria-label={`Sửa "${task.mainContent}"`}
                    className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md"
                  >
                    <Pencil className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteTask(task)}
                    aria-label={`Xóa "${task.mainContent}"`}
                    className="p-2 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-md"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {task.detailContent && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {task.detailContent}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block">Kế hoạch hoàn thành</span>
                  <span className="font-mono tabular-nums font-medium text-slate-900">
                    {formatDateVi(task.targetDate)}
                  </span>
                  {overdue && (
                    <span className="ml-1.5 text-red-700 font-medium">
                      (Quá hạn)
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 block">Người đảm nhận</span>
                  <span className="font-medium text-slate-900">
                    {assignee ? assignee.name : 'Chưa phân công'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-500 block mb-1.5">
                  Trạng thái
                </span>
                <div
                  role="radiogroup"
                  aria-label={`Trạng thái của ${task.mainContent}`}
                  className="flex flex-wrap gap-1.5"
                >
                  {TASK_STATUSES.map((status) => {
                    const selected = task.status === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onStatusChange(task.id, status)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-2 text-xs rounded border transition-colors whitespace-nowrap ${getStatusOptionStyle(
                          status,
                          selected
                        )}`}
                      >
                        {selected ? (
                          <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 shrink-0 text-slate-300" aria-hidden="true" />
                        )}
                        <span>{status}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-500 block mb-1.5">
                  Tiến độ (%)
                </span>
                <ProgressControl
                  taskId={task.id}
                  taskName={task.mainContent}
                  status={task.status}
                  progress={task.progress}
                  isOpen={openProgressTaskId === `mobile-${task.id}`}
                  onToggleOpen={(id) =>
                    setOpenProgressTaskId(id ? `mobile-${id}` : null)
                  }
                  onChangeProgress={onProgressChange}
                />
              </div>

              {task.attachments.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 block">File đính kèm</span>
                  <div className="flex flex-wrap gap-2">
                    {task.attachments.map((att) => (
                      <button
                        key={att.id}
                        type="button"
                        onClick={() => onPreviewAttachment(att)}
                        className="inline-flex items-center gap-1 text-xs text-blue-700 underline"
                      >
                        <Paperclip className="w-3 h-3" aria-hidden="true" />
                        <span>{att.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {task.notes && (
                <div className="text-xs text-slate-600 pt-1 border-t border-slate-100">
                  <span className="font-medium text-slate-700">Ghi chú: </span>
                  {task.notes}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
