import { FormEvent, useMemo, useState } from 'react';
import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Shield,
  Trash2,
  Unlock,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  MAX_TEAM_MEMBERS,
  ModuleKey,
  PermissionAction,
  TeamMember,
  UserPermissions,
} from '../types/workplan';
import {
  ACTION_NAMES,
  MODULE_KEYS,
  MODULE_NAMES,
  getDefaultAdminPermissions,
  getDefaultMemberPermissions,
  getInitials,
} from '../utils/rbac';
import { addTeamMember } from '../utils/workplan';

interface TeamModalProps {
  isOpen: boolean;
  currentUser?: TeamMember | null;
  members: TeamMember[];
  onClose: () => void;
  onUpdateMembers: (
    nextMembers: TeamMember[],
    logInfo?: { action: 'create' | 'update' | 'delete'; details: string }
  ) => void;
}

type ModalTab = 'accounts' | 'permissions';

export function TeamModal({
  isOpen,
  currentUser,
  members,
  onClose,
  onUpdateMembers,
}: TeamModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('accounts');

  // Add Account form state
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('123');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [error, setError] = useState('');

  // Edit Account state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editUsername, setEditUsername] = useState('');

  // Password visibility map (memberId -> boolean)
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Reset password state
  const [resetPwdMemberId, setResetPwdMemberId] = useState<string | null>(null);
  const [newCustomPwd, setNewCustomPwd] = useState('');

  // Selected member for permissions matrix tab
  const [selectedPermMemberId, setSelectedPermMemberId] = useState<string>(
    members.find((m) => !m.isAdmin)?.id || members[0]?.id || ''
  );

  const selectedPermMember = useMemo(
    () =>
      members.find((m) => m.id === selectedPermMemberId) ||
      members[0] ||
      null,
    [members, selectedPermMemberId]
  );

  if (!isOpen) return null;

  const isAtLimit = members.length >= MAX_TEAM_MEMBERS;
  const isAdmin = currentUser ? currentUser.isAdmin : true;

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setError('Chỉ Quản trị viên (Admin) mới có quyền thêm tài khoản.');
      return;
    }

    const res = addTeamMember(
      members,
      newName,
      newRole,
      undefined,
      {
        username: newUsername.trim(),
        password: newPassword.trim() || '123',
        isAdmin: newIsAdmin,
      }
    );

    if (!res.ok) {
      setError(res.error ?? 'Không thể thêm thành viên.');
      return;
    }

    onUpdateMembers(res.members, {
      action: 'create',
      details: `Thêm tài khoản mới: "${newName.trim()}" (@${newUsername.trim() || 'auto'}) - Vai trò: ${newRole.trim()} (${newIsAdmin ? 'Admin' : 'Thành viên'})`,
    });

    setNewName('');
    setNewRole('');
    setNewUsername('');
    setNewPassword('123');
    setNewIsAdmin(false);
    setError('');
  };

  const handleStartEdit = (member: TeamMember) => {
    setEditingId(member.id);
    setEditName(member.name);
    setEditRole(member.role);
    setEditUsername(member.username);
    setError('');
  };

  const handleSaveEdit = (id: string) => {
    const trimmedName = editName.trim();
    const trimmedUsername = editUsername.trim().toLowerCase();
    if (!trimmedName) {
      setError('Tên thành viên không được để trống.');
      return;
    }
    if (!trimmedUsername) {
      setError('Tên đăng nhập không được để trống.');
      return;
    }

    const dupName = members.some(
      (m) =>
        m.id !== id && m.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (dupName) {
      setError('Tên thành viên bị trùng với người khác trong nhóm.');
      return;
    }

    const dupUser = members.some(
      (m) =>
        m.id !== id &&
        (m.username || '').trim().toLowerCase() === trimmedUsername
    );
    if (dupUser) {
      setError('Tên đăng nhập bị trùng với tài khoản khác.');
      return;
    }

    const updated = members.map((m) =>
      m.id === id
        ? {
            ...m,
            name: trimmedName,
            role: editRole.trim() || 'Kỹ sư Tự động hóa',
            username: trimmedUsername,
          }
        : m
    );

    onUpdateMembers(updated, {
      action: 'update',
      details: `Chỉnh sửa thông tin tài khoản "${trimmedName}" (@${trimmedUsername}) - Vai trò: ${editRole.trim()}`,
    });

    setEditingId(null);
    setError('');
  };

  const handleToggleLock = (member: TeamMember) => {
    if (!isAdmin) return;
    if (currentUser?.id && member.id === currentUser.id) {
      setError('Bạn không thể tự khóa tài khoản đang đăng nhập của chính mình.');
      return;
    }

    const willLock = !member.isLocked;
    const updated = members.map((m) =>
      m.id === member.id ? { ...m, isLocked: willLock } : m
    );

    onUpdateMembers(updated, {
      action: 'update',
      details: `${willLock ? 'Khóa' : 'Mở khóa'} tài khoản người dùng: "${member.name}" (@${member.username})`,
    });
    setError('');
  };

  const handleSaveResetPassword = (id: string) => {
    if (!newCustomPwd.trim()) {
      setError('Mật khẩu mới không được để trống.');
      return;
    }

    const target = members.find((m) => m.id === id);
    const updated = members.map((m) =>
      m.id === id ? { ...m, password: newCustomPwd.trim() } : m
    );

    onUpdateMembers(updated, {
      action: 'update',
      details: `Đặt lại mật khẩu cho tài khoản "${target?.name}" (@${target?.username})`,
    });

    setResetPwdMemberId(null);
    setNewCustomPwd('');
    setError('');
  };

  const handleDeleteMember = (member: TeamMember) => {
    if (!isAdmin) {
      setError('Chỉ Quản trị viên mới có quyền xóa tài khoản.');
      return;
    }
    if (members.length <= 1) {
      setError('Hệ thống cần có ít nhất 1 tài khoản.');
      return;
    }
    if (currentUser?.id && member.id === currentUser.id) {
      setError('Bạn không thể xóa tài khoản hiện đang đăng nhập.');
      return;
    }
    if (member.isAdmin && members.filter((m) => m.isAdmin).length <= 1) {
      setError('Không thể xóa Quản trị viên (Admin) duy nhất của hệ thống.');
      return;
    }

    onUpdateMembers(
      members.filter((m) => m.id !== member.id),
      {
        action: 'delete',
        details: `Xóa tài khoản thành viên: "${member.name}" (@${member.username})`,
      }
    );
    setError('');
  };

  // Permission Matrix toggles
  const handleTogglePermission = (
    memberId: string,
    module: ModuleKey,
    action: PermissionAction
  ) => {
    if (!isAdmin) return;
    const target = members.find((m) => m.id === memberId);
    if (!target || target.isAdmin) return; // Admin has all permissions automatically

    const currentPerms =
      target.permissions || getDefaultMemberPermissions();
    const currentModulePerm =
      currentPerms[module] || getDefaultMemberPermissions()[module];
    const nextVal = !currentModulePerm[action];

    const nextPerms: Partial<UserPermissions> = {
      ...currentPerms,
      [module]: {
        ...currentModulePerm,
        [action]: nextVal,
      },
    };

    const updated = members.map((m) =>
      m.id === memberId ? { ...m, permissions: nextPerms } : m
    );

    onUpdateMembers(updated, {
      action: 'update',
      details: `Cập nhật quyền của "${target.name}" (@${target.username}): ${MODULE_NAMES[module]} -> ${ACTION_NAMES[action]}: ${nextVal ? 'Cho phép' : 'Chặn'}`,
    });
  };

  const handleApplyPreset = (
    memberId: string,
    preset: 'readonly' | 'standard' | 'lead'
  ) => {
    if (!isAdmin) return;
    const target = members.find((m) => m.id === memberId);
    if (!target || target.isAdmin) return;

    let nextPerms: UserPermissions;
    let presetLabel = '';

    if (preset === 'readonly') {
      presetLabel = 'Chỉ xem (Read-only)';
      nextPerms = {
        machines: { view: true, add: false, edit: false, delete: false },
        workplan: { view: true, add: false, edit: false, delete: false },
        overtime: { view: true, add: false, edit: false, delete: false },
        materials: { view: true, add: false, edit: false, delete: false },
        incidents: { view: true, add: false, edit: false, delete: false },
        audit: { view: true, add: false, edit: false, delete: false },
        drive: { view: true, add: false, edit: false, delete: false },
        summary: { view: true, add: false, edit: false, delete: false },
      };
    } else if (preset === 'lead') {
      presetLabel = 'Trưởng module (Toàn quyền tác nghiệp)';
      nextPerms = {
        machines: { view: true, add: true, edit: true, delete: false },
        workplan: { view: true, add: true, edit: true, delete: true },
        overtime: { view: true, add: true, edit: true, delete: true },
        materials: { view: true, add: true, edit: true, delete: true },
        incidents: { view: true, add: true, edit: true, delete: true },
        audit: { view: true, add: false, edit: false, delete: false },
        drive: { view: true, add: true, edit: true, delete: false },
        summary: { view: true, add: true, edit: true, delete: false },
      };
    } else {
      presetLabel = 'Kỹ sư tiêu chuẩn';
      nextPerms = getDefaultMemberPermissions();
    }

    const updated = members.map((m) =>
      m.id === memberId ? { ...m, permissions: nextPerms } : m
    );

    onUpdateMembers(updated, {
      action: 'update',
      details: `Áp dụng mẫu phân quyền "${presetLabel}" cho "${target.name}" (@${target.username})`,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-[#2563EB]" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="team-modal-title"
                className="text-base font-bold text-slate-900 flex items-center gap-2"
              >
                <span>Quản lý Tài khoản &amp; Phân quyền (RBAC)</span>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <Shield className="w-3 h-3" aria-hidden="true" />
                    Admin
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                    Chế độ xem
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAdmin
                  ? `Quản lý ${members.length}/${MAX_TEAM_MEMBERS} tài khoản, mật khẩu và ma trận phân quyền chi tiết từng module.`
                  : 'Xem danh sách thành viên nhóm và phân công chuyên môn.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng quản lý nhóm"
            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 bg-slate-50/50 flex gap-4 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'accounts'
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" aria-hidden="true" />
            <span>Tài khoản &amp; Người dùng ({members.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'permissions'
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4" aria-hidden="true" />
            <span>Ma trận Phân quyền (RBAC)</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 text-xs text-red-700 px-3.5 py-2.5 rounded-lg flex items-center justify-between gap-2"
            >
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError('')}
                className="text-red-500 hover:text-red-700 cursor-pointer font-bold"
              >
                ×
              </button>
            </div>
          )}

          {/* TAB 1: ACCOUNTS */}
          {activeTab === 'accounts' && (
            <div className="space-y-5">
              {/* Add form (Admin only) */}
              {isAdmin && (
                <form
                  onSubmit={handleAdd}
                  className="bg-slate-50/70 border border-slate-200 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      + Thêm tài khoản mới
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Còn lại: {MAX_TEAM_MEMBERS - members.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <div>
                      <label
                        htmlFor="new-member-name"
                        className="block text-[11px] font-semibold text-slate-700 mb-1"
                      >
                        Họ và tên <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="new-member-name"
                        type="text"
                        placeholder="Ví dụ: Hoàng Tuấn Kiệt"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        disabled={isAtLimit}
                        className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="new-member-role"
                        className="block text-[11px] font-semibold text-slate-700 mb-1"
                      >
                        Vai trò chuyên môn
                      </label>
                      <input
                        id="new-member-role"
                        type="text"
                        placeholder="Ví dụ: Kỹ sư PLC / SCADA"
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        disabled={isAtLimit}
                        className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="new-member-username"
                        className="block text-[11px] font-semibold text-slate-700 mb-1"
                      >
                        Tên đăng nhập (Username)
                      </label>
                      <input
                        id="new-member-username"
                        type="text"
                        placeholder="Ví dụ: kiet.hoang"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        disabled={isAtLimit}
                        className="w-full h-8 px-2.5 text-xs font-mono bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="new-member-pwd"
                        className="block text-[11px] font-semibold text-slate-700 mb-1"
                      >
                        Mật khẩu khởi tạo
                      </label>
                      <input
                        id="new-member-pwd"
                        type="text"
                        placeholder="Mặc định: 123"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={isAtLimit}
                        className="w-full h-8 px-2.5 text-xs font-mono bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newIsAdmin}
                        onChange={(e) => setNewIsAdmin(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-semibold text-slate-800">
                        Cấp quyền Quản trị viên (Admin Toàn quyền)
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={isAtLimit}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#2563EB] rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Tạo tài khoản</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Members List */}
              <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                <div className="bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-600 grid grid-cols-12 gap-2 items-center">
                  <span className="col-span-4 sm:col-span-3">Thành viên &amp; Vai trò</span>
                  <span className="col-span-3 sm:col-span-2">Tên đăng nhập</span>
                  <span className="col-span-3 sm:col-span-3">Mật khẩu</span>
                  <span className="col-span-2 sm:col-span-2 text-center">Trạng thái</span>
                  <span className="hidden sm:block sm:col-span-2 text-right">Thao tác</span>
                </div>

                {members.map((member) => {
                  const isEditing = editingId === member.id;
                  const isResettingPwd = resetPwdMemberId === member.id;
                  const showPwd = visiblePasswords[member.id];
                  const initials = getInitials(member.name);
                  const isCurrent = currentUser?.id === member.id;

                  return (
                    <div
                      key={member.id}
                      className={`px-4 py-3 grid grid-cols-12 gap-2 items-center hover:bg-slate-50/60 transition-colors ${
                        member.isLocked ? 'bg-red-50/20' : ''
                      }`}
                    >
                      {/* Name & Role */}
                      <div className="col-span-4 sm:col-span-3 flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-[11px] shrink-0"
                          style={{
                            backgroundColor: member.avatarColor || '#2563EB',
                          }}
                        >
                          {initials}
                        </div>
                        {isEditing ? (
                          <div className="min-w-0 space-y-1">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-7 px-2 text-xs border border-slate-300 rounded w-full"
                            />
                            <input
                              type="text"
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value)}
                              className="h-7 px-2 text-xs border border-slate-300 rounded w-full"
                            />
                          </div>
                        ) : (
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-slate-900 truncate flex items-center gap-1.5">
                              <span>{member.name}</span>
                              {isCurrent && (
                                <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 rounded">
                                  Tôi
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {member.role}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Username */}
                      <div className="col-span-3 sm:col-span-2 font-mono text-xs text-slate-700 min-w-0">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editUsername}
                            onChange={(e) => setEditUsername(e.target.value)}
                            className="h-7 px-2 text-xs border border-slate-300 rounded w-full"
                          />
                        ) : (
                          <span className="truncate block">@{member.username}</span>
                        )}
                      </div>

                      {/* Password (Visible to Admin as requested) */}
                      <div className="col-span-3 sm:col-span-3">
                        {isResettingPwd ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              placeholder="Mật khẩu mới"
                              value={newCustomPwd}
                              onChange={(e) => setNewCustomPwd(e.target.value)}
                              className="h-7 px-2 text-xs border border-slate-300 rounded w-24 sm:w-28 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveResetPassword(member.id)}
                              className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer"
                              title="Lưu mật khẩu mới"
                            >
                              <Check className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setResetPwdMemberId(null)}
                              className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 font-mono text-xs text-slate-700">
                            {isAdmin ? (
                              <>
                                <span className="font-semibold select-all">
                                  {showPwd ? member.password || '123' : '••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility(member.id)}
                                  className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                                  title={showPwd ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                                >
                                  {showPwd ? (
                                    <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                                  ) : (
                                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setResetPwdMemberId(member.id);
                                    setNewCustomPwd('');
                                  }}
                                  className="text-[10px] text-blue-600 hover:text-blue-800 underline cursor-pointer whitespace-nowrap ml-1"
                                >
                                  Đổi MK
                                </button>
                              </>
                            ) : (
                              <span className="text-slate-400">••••••</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Role & Locked Status */}
                      <div className="col-span-2 sm:col-span-2 flex flex-col items-center gap-1">
                        {member.isAdmin ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-50 text-amber-800 border border-amber-200">
                            <Shield className="w-3 h-3" aria-hidden="true" />
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-700 border border-slate-200">
                            Thành viên
                          </span>
                        )}

                        {member.isLocked ? (
                          <span className="text-[10px] text-red-700 font-semibold flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" aria-hidden="true" />
                            Đã khóa
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-700 flex items-center gap-0.5">
                            <UserCheck className="w-2.5 h-2.5" aria-hidden="true" />
                            Hoạt động
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="col-span-12 sm:col-span-2 flex items-center justify-end gap-1">
                        {isAdmin ? (
                          <>
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(member.id)}
                                  className="p-1 text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer"
                                  title="Lưu thay đổi"
                                >
                                  <Check className="w-4 h-4" aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="p-1 text-slate-400 hover:bg-slate-100 rounded cursor-pointer"
                                  title="Hủy sửa"
                                >
                                  <X className="w-4 h-4" aria-hidden="true" />
                                </button>
                              </>
                            ) : (
                              <>
                                {/* Lock/Unlock button */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleLock(member)}
                                  disabled={Boolean(currentUser?.id && member.id === currentUser.id)}
                                  className={`p-1.5 rounded cursor-pointer disabled:opacity-40 ${
                                    member.isLocked
                                      ? 'text-red-700 hover:bg-red-50'
                                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                                  }`}
                                  title={
                                    member.isLocked
                                      ? 'Mở khóa tài khoản'
                                      : 'Khóa tài khoản'
                                  }
                                >
                                  {member.isLocked ? (
                                    <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                                  ) : (
                                    <Unlock className="w-3.5 h-3.5" aria-hidden="true" />
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(member)}
                                  className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                                  title="Sửa thông tin"
                                >
                                  <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteMember(member)}
                                  disabled={
                                    Boolean(currentUser?.id && member.id === currentUser.id) ||
                                    (member.isAdmin &&
                                      members.filter((m) => m.isAdmin).length <= 1)
                                  }
                                  className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer disabled:opacity-30"
                                  title="Xóa tài khoản"
                                >
                                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                              </>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Chỉ xem
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: RBAC PERMISSION MATRIX */}
          {activeTab === 'permissions' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="perm-member-select"
                    className="text-xs font-semibold text-slate-700 whitespace-nowrap"
                  >
                    Cấu hình quyền cho thành viên:
                  </label>
                  <select
                    id="perm-member-select"
                    value={selectedPermMemberId}
                    onChange={(e) => setSelectedPermMemberId(e.target.value)}
                    className="h-8 px-2.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (@{m.username}) {m.isAdmin ? '— [Admin Toàn quyền]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {isAdmin && selectedPermMember && !selectedPermMember.isAdmin && (
                  <div className="flex items-center gap-1.5 text-xs shrink-0">
                    <span className="text-slate-500 text-[11px] font-medium">Mẫu nhanh:</span>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(selectedPermMember.id, 'readonly')}
                      className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
                    >
                      Chỉ xem
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(selectedPermMember.id, 'standard')}
                      className="px-2 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 cursor-pointer"
                    >
                      Kỹ sư chuẩn
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(selectedPermMember.id, 'lead')}
                      className="px-2 py-1 text-[11px] font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100 cursor-pointer"
                    >
                      Trưởng module
                    </button>
                  </div>
                )}
              </div>

              {selectedPermMember?.isAdmin ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-800 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-sm">
                    <Shield className="w-4 h-4 text-amber-700" aria-hidden="true" />
                    Tài khoản Quản trị viên cấp cao (Admin)
                  </p>
                  <p>
                    Tài khoản này có <strong>Toàn quyền (Full Access)</strong>: Xem, Thêm, Sửa, Xóa trên tất cả các Module và phê duyệt phân công công việc. Không bị giới hạn quyền.
                  </p>
                </div>
              ) : selectedPermMember?.isLocked ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-xs text-red-800 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-sm">
                    <Lock className="w-4 h-4 text-red-700" aria-hidden="true" />
                    Tài khoản đã bị khóa
                  </p>
                  <p>
                    Tài khoản này đang bị vô hiệu hóa mọi quyền truy cập và không thể đăng nhập cho đến khi Quản trị viên mở khóa.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                        <th scope="col" className="py-2.5 px-3 min-w-[200px]">
                          Phân hệ Module
                        </th>
                        <th scope="col" className="py-2.5 px-3 text-center w-20">
                          Xem (View)
                        </th>
                        <th scope="col" className="py-2.5 px-3 text-center w-20">
                          Thêm (Add)
                        </th>
                        <th scope="col" className="py-2.5 px-3 text-center w-20">
                          Sửa (Edit)
                        </th>
                        <th scope="col" className="py-2.5 px-3 text-center w-20">
                          Xóa (Delete)
                        </th>
                        <th scope="col" className="py-2.5 px-3 min-w-[220px]">
                          Quy tắc đặc thù
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {MODULE_KEYS.map((modKey) => {
                        const perms =
                          selectedPermMember?.permissions?.[modKey] ||
                          getDefaultMemberPermissions()[modKey];

                        return (
                          <tr key={modKey} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {MODULE_NAMES[modKey]}
                            </td>

                            {(['view', 'add', 'edit', 'delete'] as const).map((action) => {
                              const checked = Boolean(perms[action]);
                              return (
                                <td key={action} className="py-2.5 px-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={!isAdmin}
                                    onChange={() =>
                                      selectedPermMember &&
                                      handleTogglePermission(
                                        selectedPermMember.id,
                                        modKey,
                                        action
                                      )
                                    }
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                                  />
                                </td>
                              );
                            })}

                            <td className="py-2.5 px-3 text-slate-500 text-[11px] leading-relaxed">
                              {modKey === 'workplan' && (
                                <span className="text-blue-700 font-medium">
                                  Chỉ sửa/tiến độ được các Task được phân công.
                                </span>
                              )}
                              {modKey === 'machines' && (
                                <span>Xem thông số &amp; tiến độ máy.</span>
                              )}
                              {modKey === 'audit' && (
                                <span>Tra cứu lưu vết lịch sử hệ thống.</span>
                              )}
                              {modKey === 'summary' && (
                                <span>Bảng thống kê và xuất báo cáo.</span>
                              )}
                              {modKey === 'drive' && (
                                <span>Lưu trữ file tài liệu Drive.</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-between gap-3 bg-slate-50/50">
          <div className="text-xs text-slate-500">
            {isAdmin ? (
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                Mọi thay đổi phân quyền được cập nhật tức thời vào hệ thống.
              </span>
            ) : (
              <span>Chỉ xem thông tin phân quyền.</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] rounded-lg hover:bg-blue-700 cursor-pointer shadow-xs"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
}
