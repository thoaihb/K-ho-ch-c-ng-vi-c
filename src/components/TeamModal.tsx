import { FormEvent, useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { MAX_TEAM_MEMBERS, TeamMember } from '../types/workplan';
import { addTeamMember } from '../utils/workplan';

interface TeamModalProps {
  isOpen: boolean;
  members: TeamMember[];
  onClose: () => void;
  onUpdateMembers: (nextMembers: TeamMember[]) => void;
}

export function TeamModal({
  isOpen,
  members,
  onClose,
  onUpdateMembers,
}: TeamModalProps) {
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');

  if (!isOpen) return null;

  const isAtLimit = members.length >= MAX_TEAM_MEMBERS;

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    const res = addTeamMember(members, newName, newRole);
    if (!res.ok) {
      setError(res.error ?? 'Không thể thêm thành viên.');
      return;
    }
    onUpdateMembers(res.members);
    setNewName('');
    setNewRole('');
    setError('');
  };

  const handleStartEdit = (member: TeamMember) => {
    setEditingId(member.id);
    setEditName(member.name);
    setEditRole(member.role);
    setError('');
  };

  const handleSaveEdit = (id: string) => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setError('Tên thành viên không được để trống.');
      return;
    }
    const duplicate = members.some(
      (m) => m.id !== id && m.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      setError('Tên thành viên bị trùng với người khác trong nhóm.');
      return;
    }
    onUpdateMembers(
      members.map((m) =>
        m.id === id
          ? { ...m, name: trimmedName, role: editRole.trim() || 'Kỹ sư Tự động hóa' }
          : m
      )
    );
    setEditingId(null);
    setError('');
  };

  const handleDeleteMember = (id: string) => {
    if (members.length <= 1) {
      setError('Nhóm cần có ít nhất 1 thành viên.');
      return;
    }
    onUpdateMembers(members.filter((m) => m.id !== id));
    setError('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2
              id="team-modal-title"
              className="text-base font-bold text-slate-900"
            >
              Danh sách nhóm tự động hóa
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
              {members.length}/{MAX_TEAM_MEMBERS} thành viên
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng quản lý nhóm"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label
                  htmlFor="new-member-name"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Họ và tên
                </label>
                <input
                  id="new-member-name"
                  type="text"
                  placeholder="Ví dụ: Bùi Văn Hùng"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={isAtLimit}
                  className="w-full h-9 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                />
              </div>
              <div>
                <label
                  htmlFor="new-member-role"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Vai trò chuyên môn
                </label>
                <input
                  id="new-member-role"
                  type="text"
                  placeholder="Ví dụ: Kỹ sư PLC / HMI"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  disabled={isAtLimit}
                  className="w-full h-9 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              {isAtLimit ? (
                <p className="text-xs font-medium text-amber-700">
                  Đã đạt giới hạn tối đa {MAX_TEAM_MEMBERS} thành viên trong nhóm.
                </p>
              ) : (
                <span className="text-xs text-slate-500">
                  Còn thêm được {MAX_TEAM_MEMBERS - members.length} thành viên.
                </span>
              )}
              <button
                type="submit"
                disabled={isAtLimit}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Thêm thành viên</span>
              </button>
            </div>
          </form>

          {error && (
            <p role="alert" className="text-xs font-medium text-red-600">
              {error}
            </p>
          )}

          <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
            {members.map((member, index) => {
              const isEditing = editingId === member.id;
              return (
                <div
                  key={member.id}
                  className="px-3.5 py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="w-5 text-xs font-mono tabular-nums text-slate-400 shrink-0">
                      {index + 1}.
                    </span>
                    {isEditing ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                        <input
                          type="text"
                          aria-label="Tên thành viên"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 px-2.5 text-sm border border-slate-300 rounded-md"
                        />
                        <input
                          type="text"
                          aria-label="Vai trò thành viên"
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="h-8 px-2.5 text-sm border border-slate-300 rounded-md"
                        />
                      </div>
                    ) : (
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {member.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {member.role}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(member.id)}
                          aria-label={`Lưu thông tin ${member.name}`}
                          className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-md cursor-pointer"
                        >
                          <Check className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          aria-label="Hủy sửa thành viên"
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md cursor-pointer"
                        >
                          <X className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(member)}
                          aria-label={`Sửa ${member.name}`}
                          className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-md cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMember(member.id)}
                          aria-label={`Xóa ${member.name}`}
                          className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
