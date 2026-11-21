import { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { AttachmentPreviewModal } from './components/AttachmentPreviewModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { DriveView } from './components/DriveView';
import { FilterToolbar } from './components/FilterToolbar';
import { Header } from './components/Header';
import { IncidentFormModal } from './components/IncidentFormModal';
import { IncidentsView } from './components/IncidentsView';
import { MachineDetailModal } from './components/MachineDetailModal';
import { MachineFormModal } from './components/MachineFormModal';
import { QuickAddMachineInput } from './components/MachineSelectWithQuickAdd';
import { MachinesView } from './components/MachinesView';
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
  clearAccessToken,
  googleSignIn,
  initAuth,
  logout,
} from './services/googleAuth';
import {
  AppSection,
  AttachmentItem,
  DriveAuthProps,
  IncidentEntry,
  IncidentStatus,
  MachineProject,
  MachineStatus,
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
  MACHINES_STORAGE_KEY,
  createMachineId,
  loadMachinesFromStorage,
} from './utils/machines';
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
  machineId: 'all',
  search: '',
};

export default function App() {
  const [activeSection, setActiveSection] = useState<AppSection>('machines');
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
  const [machines, setMachines] = useState<MachineProject[]>(() =>
    loadMachinesFromStorage(
      window.localStorage,
      loadTasksFromStorage(window.localStorage)
    )
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

  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<MachineProject | null>(
    null
  );
  const [detailMachineId, setDetailMachineId] = useState<string | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<WorkTask | null>(null);
  const [taskDefaultMachineId, setTaskDefaultMachineId] = useState<
    string | undefined
  >(undefined);

  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(
    null
  );
  const [materialDefaultMachineId, setMaterialDefaultMachineId] = useState<
    string | undefined
  >(undefined);

  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<IncidentEntry | null>(
    null
  );
  const [incidentDefaultMachineId, setIncidentDefaultMachineId] = useState<
    string | undefined
  >(undefined);

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState<WorkTask | null>(null);
  const [previewAttachment, setPreviewAttachment] =
    useState<AttachmentItem | null>(null);

  const [driveUser, setDriveUser] = useState<User | null>(null);
  const [driveAccessToken, setDriveAccessToken] = useState<string | null>(null);
  const [isDriveSigningIn, setIsDriveSigningIn] = useState(false);
  const [driveAuthError, setDriveAuthError] = useState<string | null>(null);
  const [driveUploadTrigger, setDriveUploadTrigger] = useState(0);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setDriveUser(user);
        setDriveAccessToken(token);
        setDriveAuthError(null);
      },
      (user) => {
        setDriveUser(user);
        setDriveAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const res = saveToStorage(window.localStorage, TASKS_STORAGE_KEY, tasks);
    setStorageError(res.ok ? null : (res.error ?? null));
  }, [tasks]);

  useEffect(() => {
    const res = saveToStorage(
      window.localStorage,
      MACHINES_STORAGE_KEY,
      machines
    );
    if (!res.ok) {
      setStorageError(res.error ?? null);
    }
  }, [machines]);

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
    () => filterTasks(tasks, filter, members, machines),
    [tasks, filter, members, machines]
  );

  const stats = useMemo(() => computeSummaryStats(tasks), [tasks]);

  const detailMachine = useMemo(
    () =>
      detailMachineId
        ? machines.find((m) => m.id === detailMachineId) ?? null
        : null,
    [detailMachineId, machines]
  );

  const handleQuickCreateMachine = (
    data: QuickAddMachineInput
  ): MachineProject => {
    const created: MachineProject = {
      ...data,
      id: createMachineId(),
      updatedAt: getTodayIsoDate(),
    };
    setMachines((prev) => [created, ...prev]);
    return created;
  };

  const handleSaveMachine = (
    data: Omit<MachineProject, 'id' | 'updatedAt'>,
    existingId?: string
  ) => {
    const today = getTodayIsoDate();
    if (existingId) {
      const previous = machines.find((m) => m.id === existingId);
      setMachines((prev) =>
        prev.map((m) =>
          m.id === existingId ? { ...data, id: existingId, updatedAt: today } : m
        )
      );
      if (previous && previous.name !== data.name) {
        setTasks((prev) =>
          prev.map((t) =>
            t.machineId === existingId || t.mainContent === previous.name
              ? { ...t, machineId: existingId, mainContent: data.name }
              : t
          )
        );
        setMaterials((prev) =>
          prev.map((mat) =>
            mat.machineId === existingId || mat.projectName === previous.name
              ? { ...mat, machineId: existingId, projectName: data.name }
              : mat
          )
        );
        setIncidents((prev) =>
          prev.map((inc) =>
            inc.machineId === existingId || inc.machineName === previous.name
              ? { ...inc, machineId: existingId, machineName: data.name }
              : inc
          )
        );
      }
    } else {
      const created: MachineProject = {
        ...data,
        id: createMachineId(),
        updatedAt: today,
      };
      setMachines((prev) => [created, ...prev]);
    }
    setIsMachineModalOpen(false);
    setEditingMachine(null);
  };

  const handleMachineStatusChange = (id: string, status: MachineStatus) => {
    const today = getTodayIsoDate();
    setMachines((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status, updatedAt: today } : m))
    );
  };

  const handleDeleteMachine = (id: string) => {
    setMachines((prev) => prev.filter((m) => m.id !== id));
    if (detailMachineId === id) {
      setDetailMachineId(null);
    }
    if (filter.machineId === id) {
      setFilter((prev) => ({ ...prev, machineId: 'all' }));
    }
  };

  const handleOpenAddModal = (defaultMachine?: MachineProject) => {
    setEditingTask(null);
    setTaskDefaultMachineId(defaultMachine?.id);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditModal = (task: WorkTask) => {
    setEditingTask(task);
    setTaskDefaultMachineId(undefined);
    setIsTaskModalOpen(true);
  };

  const handleDriveSignIn = async () => {
    setIsDriveSigningIn(true);
    setDriveAuthError(null);
    try {
      const { user, accessToken } = await googleSignIn();
      setDriveUser(user);
      setDriveAccessToken(accessToken);
    } catch (err) {
      setDriveAuthError(
        err instanceof Error
          ? err.message
          : 'Đăng nhập Google thất bại. Vui lòng thử lại.'
      );
    } finally {
      setIsDriveSigningIn(false);
    }
  };

  const handleDriveSignOut = async () => {
    await logout();
    setDriveUser(null);
    setDriveAccessToken(null);
    setDriveAuthError(null);
  };

  const handleDriveTokenExpired = () => {
    clearAccessToken();
    setDriveAccessToken(null);
  };

  const driveAuth: DriveAuthProps = {
    userEmail: driveUser?.email ?? null,
    accessToken: driveAccessToken,
    isSigningIn: isDriveSigningIn,
    onSignIn: handleDriveSignIn,
    onTokenExpired: handleDriveTokenExpired,
  };

  const handleQuickAdd = () => {
    if (activeSection === 'machines') {
      setEditingMachine(null);
      setIsMachineModalOpen(true);
    } else if (activeSection === 'workplan') {
      handleOpenAddModal();
    } else if (activeSection === 'materials') {
      setEditingMaterial(null);
      setMaterialDefaultMachineId(undefined);
      setIsMaterialModalOpen(true);
    } else if (activeSection === 'incidents') {
      setEditingIncident(null);
      setIncidentDefaultMachineId(undefined);
      setIsIncidentModalOpen(true);
    } else if (activeSection === 'overtime') {
      const input = document.getElementById('ot-content');
      input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input?.focus();
    } else if (activeSection === 'drive') {
      if (driveAccessToken) {
        setDriveUploadTrigger((prev) => prev + 1);
      } else {
        void handleDriveSignIn();
      }
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
    setTaskDefaultMachineId(undefined);
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
    setMaterialDefaultMachineId(undefined);
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
    setIncidentDefaultMachineId(undefined);
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
    if (payload.machines) {
      setMachines(payload.machines);
    }
    if (payload.materials) {
      setMaterials(payload.materials);
    }
    if (payload.incidents) {
      setIncidents(payload.incidents);
    }
    setDetailMachineId(null);
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
          isDriveConnected={Boolean(driveAccessToken)}
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

          {activeSection === 'machines' && (
            <MachinesView
              machines={machines}
              tasks={tasks}
              materials={materials}
              incidents={incidents}
              onOpenAddModal={() => {
                setEditingMachine(null);
                setIsMachineModalOpen(true);
              }}
              onEditMachine={(machine) => {
                setEditingMachine(machine);
                setIsMachineModalOpen(true);
              }}
              onStatusChange={handleMachineStatusChange}
              onDeleteMachine={handleDeleteMachine}
              onOpenMachineDetail={(machine) => setDetailMachineId(machine.id)}
            />
          )}

          {activeSection === 'workplan' && (
            <>
              <SummaryStrip stats={stats} />

              <FilterToolbar
                filter={filter}
                members={members}
                machines={machines}
                totalCount={tasks.length}
                filteredCount={filteredTasks.length}
                onChangeFilter={setFilter}
                onResetFilter={handleResetFilter}
              />

              <WorkplanTable
                tasks={filteredTasks}
                totalTaskCount={tasks.length}
                members={members}
                machines={machines}
                onStatusChange={handleInlineStatusChange}
                onProgressChange={handleInlineProgressChange}
                onEditTask={handleOpenEditModal}
                onDeleteTask={setDeletingTask}
                onPreviewAttachment={setPreviewAttachment}
                onOpenMachineDetail={(machine) => setDetailMachineId(machine.id)}
                onOpenAddModal={() => handleOpenAddModal()}
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
              machines={machines}
              onOpenAddModal={() => {
                setEditingMaterial(null);
                setMaterialDefaultMachineId(undefined);
                setIsMaterialModalOpen(true);
              }}
              onEditItem={(item) => {
                setEditingMaterial(item);
                setMaterialDefaultMachineId(undefined);
                setIsMaterialModalOpen(true);
              }}
              onStatusChange={handleMaterialStatusChange}
              onDeleteItem={handleDeleteMaterial}
              onOpenMachineDetail={(machine) => setDetailMachineId(machine.id)}
            />
          )}

          {activeSection === 'incidents' && (
            <IncidentsView
              entries={incidents}
              members={members}
              machines={machines}
              onOpenAddModal={() => {
                setEditingIncident(null);
                setIncidentDefaultMachineId(undefined);
                setIsIncidentModalOpen(true);
              }}
              onEditEntry={(entry) => {
                setEditingIncident(entry);
                setIncidentDefaultMachineId(undefined);
                setIsIncidentModalOpen(true);
              }}
              onStatusChange={handleIncidentStatusChange}
              onDeleteEntry={handleDeleteIncident}
              onPreviewAttachment={setPreviewAttachment}
              onOpenMachineDetail={(machine) => setDetailMachineId(machine.id)}
            />
          )}

          {activeSection === 'drive' && (
            <DriveView
              user={driveUser}
              accessToken={driveAccessToken}
              isSigningIn={isDriveSigningIn}
              authError={driveAuthError}
              onSignIn={handleDriveSignIn}
              onSignOut={handleDriveSignOut}
              onTokenExpired={handleDriveTokenExpired}
              tasks={tasks}
              members={members}
              machines={machines}
              overtimeEntries={overtimeEntries}
              materials={materials}
              incidents={incidents}
              onRestoreBackup={handleRestoreBackup}
              openUploadTrigger={driveUploadTrigger}
            />
          )}

          {activeSection === 'summary' && (
            <SummaryExportView
              tasks={tasks}
              members={members}
              machines={machines}
              overtimeEntries={overtimeEntries}
              materials={materials}
              incidents={incidents}
              driveAuth={driveAuth}
              onOpenDriveTab={() => setActiveSection('drive')}
              onRestoreBackup={handleRestoreBackup}
            />
          )}
        </main>
      </div>

      <MachineDetailModal
        machine={detailMachine}
        tasks={tasks}
        materials={materials}
        incidents={incidents}
        members={members}
        onClose={() => setDetailMachineId(null)}
        onEditMachine={(machine) => {
          setEditingMachine(machine);
          setIsMachineModalOpen(true);
        }}
        onQuickAddTask={(machine) => handleOpenAddModal(machine)}
        onQuickAddMaterial={(machine) => {
          setEditingMaterial(null);
          setMaterialDefaultMachineId(machine.id);
          setIsMaterialModalOpen(true);
        }}
        onQuickAddIncident={(machine) => {
          setEditingIncident(null);
          setIncidentDefaultMachineId(machine.id);
          setIsIncidentModalOpen(true);
        }}
        onPreviewAttachment={setPreviewAttachment}
      />

      <MachineFormModal
        isOpen={isMachineModalOpen}
        editingMachine={editingMachine}
        existingMachines={machines}
        onClose={() => {
          setIsMachineModalOpen(false);
          setEditingMachine(null);
        }}
        onSave={handleSaveMachine}
      />

      <TaskFormModal
        isOpen={isTaskModalOpen}
        editingTask={editingTask}
        defaultMachineId={taskDefaultMachineId}
        members={members}
        machines={machines}
        driveAuth={driveAuth}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
          setTaskDefaultMachineId(undefined);
        }}
        onQuickCreateMachine={handleQuickCreateMachine}
        onSave={handleSaveTask}
      />

      <MaterialFormModal
        isOpen={isMaterialModalOpen}
        editingItem={editingMaterial}
        defaultMachineId={materialDefaultMachineId}
        machines={machines}
        onClose={() => {
          setIsMaterialModalOpen(false);
          setEditingMaterial(null);
          setMaterialDefaultMachineId(undefined);
        }}
        onQuickCreateMachine={handleQuickCreateMachine}
        onSave={handleSaveMaterial}
      />

      <IncidentFormModal
        isOpen={isIncidentModalOpen}
        editingEntry={editingIncident}
        defaultMachineId={incidentDefaultMachineId}
        members={members}
        machines={machines}
        driveAuth={driveAuth}
        onClose={() => {
          setIsIncidentModalOpen(false);
          setEditingIncident(null);
          setIncidentDefaultMachineId(undefined);
        }}
        onQuickCreateMachine={handleQuickCreateMachine}
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
