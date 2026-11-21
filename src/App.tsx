import { useEffect, useMemo, useState } from 'react';
import { AttachmentPreviewModal } from './components/AttachmentPreviewModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { FilterToolbar } from './components/FilterToolbar';
import { Header } from './components/Header';
import { IncidentFormModal } from './components/IncidentFormModal';
import { IncidentsView } from './components/IncidentsView';
import { MaterialFormModal } from './components/MaterialFormModal';
import { MaterialsView } from './components/MaterialsView';
import { OvertimeView } from './components/OvertimeView';
import { Sidebar } from './components/Sidebar';
import { SummaryExportView } from './components/SummaryExportView';
import { SummaryStrip } from './components/SummaryStrip';
import { TaskFormModal } from './components/TaskFormModal';
import { TeamModal } from './components/TeamModal';
import { WorkplanTable } from './components/WorkplanTable';
import {
  AppSection,
  AttachmentItem,
  IncidentEntry,
  IncidentStatus,
  MaterialItem,
  MaterialStatus,
  OvertimeEntry,
  TaskFilter,
  TaskStatus,
  TeamMember,
  WorkTask,
  WorkspaceBackupPayload,
} from './types/workplan';
import {
  INCIDENTS_STORAGE_KEY,
  MATERIALS_STORAGE_KEY,
  createIncidentId,
  createMaterialId,
  loadIncidentsFromStorage,
  loadMaterialsFromStorage,
} from './utils/operations';
import {
  OVERTIME_STORAGE_KEY,
  SIDEBAR_COLLAPSED_KEY,
  createOvertimeId,
  loadOvertimeFromStorage,
} from './utils/overtime';
import {
  MEMBERS_STORAGE_KEY,
  TASKS_STORAGE_KEY,
  clampProgress,
  computeSummaryStats,
  createTaskId,
  filterTasks,
  getTodayIsoDate,
  loadMembersFromStorage,
  loadTasksFromStorage,
  resolveProgressForStatus,
  saveToStorage,
} from './utils/workplan';

const INITIAL_FILTER: TaskFilter = {
  status: 'all',
  assigneeId: 'all',
  search: '',
};

export default function App() {
  const [activeSection, setActiveSection] = useState<AppSection>('workplan');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [tasks, setTasks] = useState<WorkTask[]>(() =>
    loadTasksFromStorage(window.localStorage)
  );
  const [members, setMembers] = useState<TeamMember[]>(() =>
    loadMembersFromStorage(window.localStorage)
  );
  const [overtimeEntries, setOvertimeEntries] = useState<OvertimeEntry[]>(() =>
    loadOvertimeFromStorage(window.localStorage)
  );
  const [materials, setMaterials] = useState<MaterialItem[]>(() =>
    loadMaterialsFromStorage(window.localStorage)
  );
  const [incidents, setIncidents] = useState<IncidentEntry[]>(() =>
    loadIncidentsFromStorage(window.localStorage)
  );

  const [filter, setFilter] = useState<TaskFilter>(INITIAL_FILTER);
  const [storageError, setStorageError] = useState<string | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<WorkTask | null>(null);

  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(
    null
  );

  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<IncidentEntry | null>(
    null
  );

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

  useEffect(() => {
    const res = saveToStorage(
      window.localStorage,
      OVERTIME_STORAGE_KEY,
      overtimeEntries
    );
    if (!res.ok) {
      setStorageError(res.error ?? null);
    }
  }, [overtimeEntries]);

  useEffect(() => {
    const res = saveToStorage(
      window.localStorage,
      MATERIALS_STORAGE_KEY,
      materials
    );
    if (!res.ok) {
      setStorageError(res.error ?? null);
    }
  }, [materials]);

  useEffect(() => {
    const res = saveToStorage(
      window.localStorage,
      INCIDENTS_STORAGE_KEY,
      incidents
    );
    if (!res.ok) {
      setStorageError(res.error ?? null);
    }
  }, [incidents]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SIDEBAR_COLLAPSED_KEY,
        String(isSidebarCollapsed)
      );
    } catch {
      // Ignore storage error for UI layout preference
    }
  }, [isSidebarCollapsed]);

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

  const handleQuickAdd = () => {
    if (activeSection === 'workplan') {
      handleOpenAddModal();
    } else if (activeSection === 'materials') {
      setEditingMaterial(null);
      setIsMaterialModalOpen(true);
    } else if (activeSection === 'incidents') {
      setEditingIncident(null);
      setIsIncidentModalOpen(true);
    } else if (activeSection === 'overtime') {
      const input = document.getElementById('ot-content');
      input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input?.focus();
    }
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
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status,
              progress: resolveProgressForStatus(task.progress, status),
            }
          : task
      )
    );
  };

  const handleInlineProgressChange = (taskId: string, progress: number) => {
    const clamped = clampProgress(progress);
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, progress: clamped } : task
      )
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

  const handleAddOvertime = (
    data: Omit<OvertimeEntry, 'id' | 'createdAt'>
  ) => {
    const created: OvertimeEntry = {
      ...data,
      id: createOvertimeId(),
      createdAt: getTodayIsoDate(),
    };
    setOvertimeEntries((prev) => [created, ...prev]);
  };

  const handleUpdateOvertime = (
    id: string,
    data: Omit<OvertimeEntry, 'id' | 'createdAt'>
  ) => {
    setOvertimeEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...data } : entry))
    );
  };

  const handleDeleteOvertime = (id: string) => {
    setOvertimeEntries((prev) => prev.filter((entry) => entry.id !== id));
  };

  const handleSaveMaterial = (
    data: Omit<MaterialItem, 'id' | 'updatedAt'>,
    existingId?: string
  ) => {
    const today = getTodayIsoDate();
    if (existingId) {
      setMaterials((prev) =>
        prev.map((item) =>
          item.id === existingId ? { ...data, id: existingId, updatedAt: today } : item
        )
      );
    } else {
      const created: MaterialItem = {
        ...data,
        id: createMaterialId(),
        updatedAt: today,
      };
      setMaterials((prev) => [created, ...prev]);
    }
    setIsMaterialModalOpen(false);
    setEditingMaterial(null);
  };

  const handleMaterialStatusChange = (id: string, status: MaterialStatus) => {
    const today = getTodayIsoDate();
    setMaterials((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status, updatedAt: today } : item
      )
    );
  };

  const handleDeleteMaterial = (id: string) => {
    setMaterials((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveIncident = (
    data: Omit<IncidentEntry, 'id'>,
    existingId?: string
  ) => {
    if (existingId) {
      setIncidents((prev) =>
        prev.map((entry) =>
          entry.id === existingId ? { ...data, id: existingId } : entry
        )
      );
    } else {
      const created: IncidentEntry = {
        ...data,
        id: createIncidentId(),
      };
      setIncidents((prev) => [created, ...prev]);
    }
    setIsIncidentModalOpen(false);
    setEditingIncident(null);
  };

  const handleIncidentStatusChange = (id: string, status: IncidentStatus) => {
    setIncidents((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, status } : entry))
    );
  };

  const handleDeleteIncident = (id: string) => {
    setIncidents((prev) => prev.filter((entry) => entry.id !== id));
  };

  const handleRestoreBackup = (payload: WorkspaceBackupPayload) => {
    setMembers(payload.members);
    setTasks(payload.tasks);
    setOvertimeEntries(payload.overtimeEntries);
    if (payload.materials) {
      setMaterials(payload.materials);
    }
    if (payload.incidents) {
      setIncidents(payload.incidents);
    }
    setFilter(INITIAL_FILTER);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar
        activeSection={activeSection}
        isCollapsed={isSidebarCollapsed}
        isMobileOpen={isMobileMenuOpen}
        memberCount={members.length}
        onSelectSection={setActiveSection}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onOpenTeamModal={() => setIsTeamModalOpen(true)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <Header
          activeSection={activeSection}
          memberCount={members.length}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenTeamModal={() => setIsTeamModalOpen(true)}
          onQuickAdd={handleQuickAdd}
        />

        <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-5">
          {storageError && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800"
            >
              {storageError}
            </div>
          )}

          {activeSection === 'workplan' && (
            <>
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
                onProgressChange={handleInlineProgressChange}
                onEditTask={handleOpenEditModal}
                onDeleteTask={setDeletingTask}
                onPreviewAttachment={setPreviewAttachment}
                onOpenAddModal={handleOpenAddModal}
                onResetFilter={handleResetFilter}
              />
            </>
          )}

          {activeSection === 'overtime' && (
            <OvertimeView
              entries={overtimeEntries}
              members={members}
              onAddEntry={handleAddOvertime}
              onUpdateEntry={handleUpdateOvertime}
              onDeleteEntry={handleDeleteOvertime}
            />
          )}

          {activeSection === 'materials' && (
            <MaterialsView
              items={materials}
              onOpenAddModal={() => {
                setEditingMaterial(null);
                setIsMaterialModalOpen(true);
              }}
              onEditItem={(item) => {
                setEditingMaterial(item);
                setIsMaterialModalOpen(true);
              }}
              onStatusChange={handleMaterialStatusChange}
              onDeleteItem={handleDeleteMaterial}
            />
          )}

          {activeSection === 'incidents' && (
            <IncidentsView
              entries={incidents}
              members={members}
              onOpenAddModal={() => {
                setEditingIncident(null);
                setIsIncidentModalOpen(true);
              }}
              onEditEntry={(entry) => {
                setEditingIncident(entry);
                setIsIncidentModalOpen(true);
              }}
              onStatusChange={handleIncidentStatusChange}
              onDeleteEntry={handleDeleteIncident}
              onPreviewAttachment={setPreviewAttachment}
            />
          )}

          {activeSection === 'summary' && (
            <SummaryExportView
              tasks={tasks}
              members={members}
              overtimeEntries={overtimeEntries}
              materials={materials}
              incidents={incidents}
              onRestoreBackup={handleRestoreBackup}
            />
          )}
        </main>
      </div>

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

      <MaterialFormModal
        isOpen={isMaterialModalOpen}
        editingItem={editingMaterial}
        onClose={() => {
          setIsMaterialModalOpen(false);
          setEditingMaterial(null);
        }}
        onSave={handleSaveMaterial}
      />

      <IncidentFormModal
        isOpen={isIncidentModalOpen}
        editingEntry={editingIncident}
        members={members}
        onClose={() => {
          setIsIncidentModalOpen(false);
          setEditingIncident(null);
        }}
        onSave={handleSaveIncident}
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
