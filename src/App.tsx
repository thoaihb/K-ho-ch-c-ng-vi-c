import { useEffect, useMemo, useRef, useState } from 'react';
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
  formatSupabaseError,
  isSupabaseConfigured,
} from './services/supabaseClient';
import {
  fetchWorkspaceFromSupabase,
  pushWorkspaceToSupabase,
  syncDeleteIncident,
  syncDeleteMachine,
  syncDeleteMaterial,
  syncDeleteOvertime,
  syncDeleteTask,
  syncSaveAllMembers,
  syncUpsertIncident,
  syncUpsertMachine,
  syncUpsertMaterial,
  syncUpsertOvertime,
  syncUpsertTask,
} from './services/supabaseSync';
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
  const [supabaseError, setSupabaseError] = useState<string | null>(null);

  const syncQueueRef = useRef<Promise<void>>(Promise.resolve());
  const initialSnapshotRef = useRef({
    members,
    machines,
    tasks,
    overtimeEntries,
    materials,
    incidents,
  });

  const enqueueSupabaseSync = (action: () => Promise<void>) => {
    if (!isSupabaseConfigured()) return;
    syncQueueRef.current = syncQueueRef.current
      .then(async () => {
        await action();
        setSupabaseError(null);
      })
      .catch((err) => {
        setSupabaseError(
          err instanceof Error ? err.message : 'Đồng bộ Supabase thất bại.'
        );
      });
  };

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;

    const loadInitialFromSupabase = async () => {
      try {
        const res = await fetchWorkspaceFromSupabase();
        if (cancelled || !res) return;
        if (res.isEmpty) {
          await pushWorkspaceToSupabase(initialSnapshotRef.current);
        } else {
          if (res.data.members.length > 0) {
            setMembers(res.data.members);
          }
          setMachines(res.data.machines);
          setTasks(res.data.tasks);
          setOvertimeEntries(res.data.overtimeEntries);
          setMaterials(res.data.materials);
          setIncidents(res.data.incidents);
        }
        setSupabaseError(null);
      } catch (err) {
        if (!cancelled) {
          setSupabaseError(
            formatSupabaseError(err, 'Không thể đồng bộ dữ liệu với Supabase')
          );
        }
      }
    };

    void loadInitialFromSupabase();
    return () => {
      cancelled = true;
    };
  }, []);

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
    enqueueSupabaseSync(() => syncUpsertMachine(created));
    return created;
  };

  const handleSaveMachine = (
    data: Omit<MachineProject, 'id' | 'updatedAt'>,
    existingId?: string
  ) => {
    const today = getTodayIsoDate();
    if (existingId) {
      const previous = machines.find((m) => m.id === existingId);
      const updatedMachine: MachineProject = {
        ...data,
        id: existingId,
        updatedAt: today,
      };
      setMachines((prev) =>
        prev.map((m) => (m.id === existingId ? updatedMachine : m))
      );

      let renamedTasks: WorkTask[] = [];
      let renamedMaterials: MaterialItem[] = [];
      let renamedIncidents: IncidentEntry[] = [];

      if (previous && previous.name !== data.name) {
        renamedTasks = tasks
          .filter(
            (t) => t.machineId === existingId || t.mainContent === previous.name
          )
          .map((t) => ({ ...t, machineId: existingId, mainContent: data.name }));
        renamedMaterials = materials
          .filter(
            (mat) =>
              mat.machineId === existingId || mat.projectName === previous.name
          )
          .map((mat) => ({
            ...mat,
            machineId: existingId,
            projectName: data.name,
          }));
        renamedIncidents = incidents
          .filter(
            (inc) =>
              inc.machineId === existingId || inc.machineName === previous.name
          )
          .map((inc) => ({
            ...inc,
            machineId: existingId,
            machineName: data.name,
          }));

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

      enqueueSupabaseSync(async () => {
        await syncUpsertMachine(updatedMachine);
        for (const t of renamedTasks) await syncUpsertTask(t);
        for (const m of renamedMaterials) await syncUpsertMaterial(m);
        for (const inc of renamedIncidents) await syncUpsertIncident(inc);
      });
    } else {
      const created: MachineProject = {
        ...data,
        id: createMachineId(),
        updatedAt: today,
      };
      setMachines((prev) => [created, ...prev]);
      enqueueSupabaseSync(() => syncUpsertMachine(created));
    }
    setIsMachineModalOpen(false);
    setEditingMachine(null);
  };

  const handleMachineStatusChange = (id: string, status: MachineStatus) => {
    const today = getTodayIsoDate();
    const target = machines.find((m) => m.id === id);
    setMachines((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status, updatedAt: today } : m))
    );
    if (target) {
      enqueueSupabaseSync(() =>
        syncUpsertMachine({ ...target, status, updatedAt: today })
      );
    }
  };

  const handleDeleteMachine = (id: string) => {
    setMachines((prev) => prev.filter((m) => m.id !== id));
    if (detailMachineId === id) {
      setDetailMachineId(null);
    }
    if (filter.machineId === id) {
      setFilter((prev) => ({ ...prev, machineId: 'all' }));
    }
    enqueueSupabaseSync(() => syncDeleteMachine(id));
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
      const updated: WorkTask = { ...taskData, id: existingId };
      setTasks((prev) =>
        prev.map((item) => (item.id === existingId ? updated : item))
      );
      enqueueSupabaseSync(() => syncUpsertTask(updated));
    } else {
      const created: WorkTask = {
        ...taskData,
        id: createTaskId(),
      };
      setTasks((prev) => [created, ...prev]);
      enqueueSupabaseSync(() => syncUpsertTask(created));
    }
    setIsTaskModalOpen(false);
    setEditingTask(null);
    setTaskDefaultMachineId(undefined);
  };

  const handleInlineStatusChange = (taskId: string, status: TaskStatus) => {
    const target = tasks.find((t) => t.id === taskId);
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
    if (target) {
      enqueueSupabaseSync(() =>
        syncUpsertTask({
          ...target,
          status,
          progress: resolveProgressForStatus(target.progress, status),
        })
      );
    }
  };

  const handleInlineProgressChange = (taskId: string, progress: number) => {
    const clamped = clampProgress(progress);
    const target = tasks.find((t) => t.id === taskId);
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, progress: clamped } : task
      )
    );
    if (target) {
      enqueueSupabaseSync(() =>
        syncUpsertTask({ ...target, progress: clamped })
      );
    }
  };

  const handleConfirmDelete = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    setDeletingTask(null);
    enqueueSupabaseSync(() => syncDeleteTask(taskId));
  };

  const handleUpdateMembers = (nextMembers: TeamMember[]) => {
    const previousMembers = members;
    setMembers(nextMembers);
    const validIds = new Set(nextMembers.map((m) => m.id));
    if (filter.assigneeId !== 'all' && !validIds.has(filter.assigneeId)) {
      setFilter((prev) => ({ ...prev, assigneeId: 'all' }));
    }
    enqueueSupabaseSync(() =>
      syncSaveAllMembers(nextMembers, previousMembers)
    );
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
    enqueueSupabaseSync(() => syncUpsertOvertime(created));
  };

  const handleUpdateOvertime = (
    id: string,
    data: Omit<OvertimeEntry, 'id' | 'createdAt'>
  ) => {
    const existing = overtimeEntries.find((e) => e.id === id);
    setOvertimeEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...data } : entry))
    );
    if (existing) {
      enqueueSupabaseSync(() => syncUpsertOvertime({ ...existing, ...data }));
    }
  };

  const handleDeleteOvertime = (id: string) => {
    setOvertimeEntries((prev) => prev.filter((entry) => entry.id !== id));
    enqueueSupabaseSync(() => syncDeleteOvertime(id));
  };

  const handleSaveMaterial = (
    data: Omit<MaterialItem, 'id' | 'updatedAt'>,
    existingId?: string
  ) => {
    const today = getTodayIsoDate();
    if (existingId) {
      const updated: MaterialItem = { ...data, id: existingId, updatedAt: today };
      setMaterials((prev) =>
        prev.map((item) => (item.id === existingId ? updated : item))
      );
      enqueueSupabaseSync(() => syncUpsertMaterial(updated));
    } else {
      const created: MaterialItem = {
        ...data,
        id: createMaterialId(),
        updatedAt: today,
      };
      setMaterials((prev) => [created, ...prev]);
      enqueueSupabaseSync(() => syncUpsertMaterial(created));
    }
    setIsMaterialModalOpen(false);
    setEditingMaterial(null);
    setMaterialDefaultMachineId(undefined);
  };

  const handleMaterialStatusChange = (id: string, status: MaterialStatus) => {
    const today = getTodayIsoDate();
    const target = materials.find((item) => item.id === id);
    setMaterials((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status, updatedAt: today } : item
      )
    );
    if (target) {
      enqueueSupabaseSync(() =>
        syncUpsertMaterial({ ...target, status, updatedAt: today })
      );
    }
  };

  const handleDeleteMaterial = (id: string) => {
    setMaterials((prev) => prev.filter((item) => item.id !== id));
    enqueueSupabaseSync(() => syncDeleteMaterial(id));
  };

  const handleSaveIncident = (
    data: Omit<IncidentEntry, 'id'>,
    existingId?: string
  ) => {
    if (existingId) {
      const updated: IncidentEntry = { ...data, id: existingId };
      setIncidents((prev) =>
        prev.map((entry) => (entry.id === existingId ? updated : entry))
      );
      enqueueSupabaseSync(() => syncUpsertIncident(updated));
    } else {
      const created: IncidentEntry = {
        ...data,
        id: createIncidentId(),
      };
      setIncidents((prev) => [created, ...prev]);
      enqueueSupabaseSync(() => syncUpsertIncident(created));
    }
    setIsIncidentModalOpen(false);
    setEditingIncident(null);
    setIncidentDefaultMachineId(undefined);
  };

  const handleIncidentStatusChange = (id: string, status: IncidentStatus) => {
    const target = incidents.find((entry) => entry.id === id);
    setIncidents((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, status } : entry))
    );
    if (target) {
      enqueueSupabaseSync(() => syncUpsertIncident({ ...target, status }));
    }
  };

  const handleDeleteIncident = (id: string) => {
    setIncidents((prev) => prev.filter((entry) => entry.id !== id));
    enqueueSupabaseSync(() => syncDeleteIncident(id));
  };

  const handleRestoreBackup = (payload: WorkspaceBackupPayload) => {
    const nextMachines = payload.machines ?? machines;
    const nextMaterials = payload.materials ?? materials;
    const nextIncidents = payload.incidents ?? incidents;

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

    enqueueSupabaseSync(() =>
      pushWorkspaceToSupabase({
        members: payload.members,
        machines: nextMachines,
        tasks: payload.tasks,
        overtimeEntries: payload.overtimeEntries,
        materials: nextMaterials,
        incidents: nextIncidents,
      })
    );
  };

  const handlePullSupabase = async (): Promise<string> => {
    const res = await fetchWorkspaceFromSupabase();
    if (!res || res.isEmpty) {
      return 'Cơ sở dữ liệu Supabase hiện đang trống. Hãy bấm "Đẩy dữ liệu lên Supabase" để đồng bộ dự án hiện tại.';
    }
    if (res.data.members.length > 0) {
      setMembers(res.data.members);
    }
    setMachines(res.data.machines);
    setTasks(res.data.tasks);
    setOvertimeEntries(res.data.overtimeEntries);
    setMaterials(res.data.materials);
    setIncidents(res.data.incidents);
    setSupabaseError(null);
    return `Đã tải từ Supabase: ${res.data.machines.length} máy, ${res.data.tasks.length} công việc, ${res.data.overtimeEntries.length} tăng ca, ${res.data.materials.length} vật tư, ${res.data.incidents.length} sự cố.`;
  };

  const handlePushSupabase = async (): Promise<string> => {
    await pushWorkspaceToSupabase({
      members,
      machines,
      tasks,
      overtimeEntries,
      materials,
      incidents,
    });
    setSupabaseError(null);
    return `Đã đồng bộ toàn bộ lên Supabase (${machines.length} máy, ${tasks.length} công việc, ${overtimeEntries.length} tăng ca, ${materials.length} vật tư, ${incidents.length} sự cố, ${members.length} thành viên).`;
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

          {supabaseError && (
            <div
              role="alert"
              className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-900"
            >
              {supabaseError}
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
              onPullSupabase={handlePullSupabase}
              onPushSupabase={handlePushSupabase}
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
