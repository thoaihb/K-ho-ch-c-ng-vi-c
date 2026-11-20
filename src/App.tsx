import { useEffect, useMemo, useState } from 'react';
import { AttachmentPreviewModal } from './components/AttachmentPreviewModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { FilterToolbar } from './components/FilterToolbar';
import { Header } from './components/Header';
import { SummaryStrip } from './components/SummaryStrip';
import { TaskFormModal } from './components/TaskFormModal';
import { TeamModal } from './components/TeamModal';
import { WorkplanTable } from './components/WorkplanTable';
import {
  AttachmentItem,
  TaskFilter,
  TaskStatus,
  TeamMember,
  WorkTask,
} from './types/workplan';
import {
  MEMBERS_STORAGE_KEY,
  TASKS_STORAGE_KEY,
  computeSummaryStats,
  createTaskId,
  filterTasks,
  loadMembersFromStorage,
  loadTasksFromStorage,
  saveToStorage,
} from './utils/workplan';

const INITIAL_FILTER: TaskFilter = {
  status: 'all',
  assigneeId: 'all',
  search: '',
};

export default function App() {
  const [tasks, setTasks] = useState<WorkTask[]>(() =>
    loadTasksFromStorage(window.localStorage)
  );
  const [members, setMembers] = useState<TeamMember[]>(() =>
    loadMembersFromStorage(window.localStorage)
  );
  const [filter, setFilter] = useState<TaskFilter>(INITIAL_FILTER);
  const [storageError, setStorageError] = useState<string | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<WorkTask | null>(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState<WorkTask | null>(null);
  const [previewAttachment, setPreviewAttachment] =
    useState<AttachmentItem | null>(null);

  useEffect(() => {
    const res = saveToStorage(window.localStorage, TASKS_STORAGE_KEY, tasks);
    setStorageError(res.ok ? null : (res.error ?? null));
  }, [tasks]);

  useEffect(() => {
    const res = saveToStorage(
      window.localStorage,
      MEMBERS_STORAGE_KEY,
      members
    );
    if (!res.ok) {
      setStorageError(res.error ?? null);
    }
  }, [members]);

  const filteredTasks = useMemo(
    () => filterTasks(tasks, filter, members),
    [tasks, filter, members]
  );

  const stats = useMemo(() => computeSummaryStats(tasks), [tasks]);

  const handleOpenAddModal = () => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditModal = (task: WorkTask) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = (
    taskData: Omit<WorkTask, 'id'>,
    existingId?: string
  ) => {
    if (existingId) {
      setTasks((prev) =>
        prev.map((item) =>
          item.id === existingId ? { ...taskData, id: existingId } : item
        )
      );
    } else {
      const created: WorkTask = {
        ...taskData,
        id: createTaskId(),
      };
      setTasks((prev) => [created, ...prev]);
    }
    setIsTaskModalOpen(false);
    setEditingTask(null);
  };

  const handleInlineStatusChange = (taskId: string, status: TaskStatus) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, status } : task))
    );
  };

  const handleConfirmDelete = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    setDeletingTask(null);
  };

  const handleUpdateMembers = (nextMembers: TeamMember[]) => {
    setMembers(nextMembers);
    const validIds = new Set(nextMembers.map((m) => m.id));
    if (filter.assigneeId !== 'all' && !validIds.has(filter.assigneeId)) {
      setFilter((prev) => ({ ...prev, assigneeId: 'all' }));
    }
  };

  const handleResetFilter = () => {
    setFilter(INITIAL_FILTER);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        memberCount={members.length}
        onOpenTeamModal={() => setIsTeamModalOpen(true)}
        onOpenAddModal={handleOpenAddModal}
      />

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {storageError && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800"
          >
            {storageError}
          </div>
        )}

        <SummaryStrip stats={stats} />

        <FilterToolbar
          filter={filter}
          members={members}
          totalCount={tasks.length}
          filteredCount={filteredTasks.length}
          onChangeFilter={setFilter}
          onResetFilter={handleResetFilter}
        />

        <WorkplanTable
          tasks={filteredTasks}
          totalTaskCount={tasks.length}
          members={members}
          onStatusChange={handleInlineStatusChange}
          onEditTask={handleOpenEditModal}
          onDeleteTask={setDeletingTask}
          onPreviewAttachment={setPreviewAttachment}
          onOpenAddModal={handleOpenAddModal}
          onResetFilter={handleResetFilter}
        />
      </main>

      <TaskFormModal
        isOpen={isTaskModalOpen}
        editingTask={editingTask}
        members={members}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
      />

      <TeamModal
        isOpen={isTeamModalOpen}
        members={members}
        onClose={() => setIsTeamModalOpen(false)}
        onUpdateMembers={handleUpdateMembers}
      />

      <DeleteConfirmModal
        task={deletingTask}
        onCancel={() => setDeletingTask(null)}
        onConfirm={handleConfirmDelete}
      />

      <AttachmentPreviewModal
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
    </div>
  );
}
