import { useState } from 'react';
import { Check, KeyRound, Lock, LogOut, Shield, User, X } from 'lucide-react';
import { TeamMember } from '../types/workplan';
import { getInitials } from '../utils/rbac';

interface UserSwitchModalProps {
  isOpen: boolean;
  currentUser?: TeamMember | null;
  members: TeamMember[];
  onClose: () => void;
  onSelectUser: (user: TeamMember) => void;
  onLogout?: () => void;
}

export function UserSwitchModal({
  isOpen,
  currentUser,
  members,
  onClose,
  onSelectUser,
  onLogout,
}: UserSwitchModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>(
    currentUser?.id ?? members[0]?.id ?? ''
  );
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [requirePassword, setRequirePassword] = useState(false);

  if (!isOpen) return null;

  const handleSelect = (member: TeamMember) => {
    if (member.isLocked) {
      setError(`Tài khoản "${member.name}" đã bị Quản trị viên khóa. Không thể đăng nhập.`);
      return;
    }
    setError(null);
    setSelectedUserId(member.id);
  };

  const handleConfirmSwitch = () => {
    const target = members.find((m) => m.id === selectedUserId);
    if (!target) return;

    if (target.isLocked) {
      setError(`Tài khoản "${target.name}" đã bị Quản trị viên khóa.`);
      return;
    }

    if (requirePassword) {
      if (!passwordInput) {
        setError('Vui lòng nhập mật khẩu để xác thực.');
        return;
      }
      if (passwordInput !== (target.password || '123')) {
        setError('Mật khẩu không chính xác. Vui lòng thử lại.');
        return;
      }
    }

    onSelectUser(target);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="switch-user-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-[#2563EB]" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="switch-user-modal-title"
                className="text-base font-bold text-slate-900"
              >
                Chuyển đổi tài khoản làm việc
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Đăng nhập hoặc chọn người dùng để trải nghiệm phân quyền thực tế
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ chuyển tài khoản"
            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 flex items-start gap-2"
            >
              <Lock className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">
              Chọn tài khoản từ danh sách ({members.length} người dùng):
            </label>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto bg-slate-50/50">
              {members.map((member) => {
                const isCurrent = currentUser?.id === member.id;
                const isSelected = selectedUserId === member.id;
                const initials = getInitials(member.name);

                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => handleSelect(member)}
                    className={`w-full text-left p-3 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 border-l-4 border-l-[#2563EB]'
                        : member.isLocked
                        ? 'opacity-60 bg-slate-100 cursor-not-allowed'
                        : 'hover:bg-white bg-white/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs"
                        style={{
                          backgroundColor: member.avatarColor || '#2563EB',
                        }}
                      >
                        {initials}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900 truncate">
                            {member.name}
                          </span>
                          {member.isAdmin && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-200">
                              <Shield className="w-3 h-3" aria-hidden="true" />
                              Admin
                            </span>
                          )}
                          {member.isLocked && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-red-100 text-red-700 border border-red-200">
                              <Lock className="w-3 h-3" aria-hidden="true" />
                              Đã khóa
                            </span>
                          )}
                          {isCurrent && (
                            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                              Đang dùng
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                          <span>@{member.username}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-sans text-slate-600 truncate">
                            {member.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-slate-300" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={requirePassword}
                onChange={(e) => setRequirePassword(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Yêu cầu xác nhận mật khẩu khi đổi tài khoản</span>
            </label>

            {requirePassword && (
              <div>
                <label
                  htmlFor="switch-user-pwd"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Mật khẩu tài khoản (Mặc định: 123)
                </label>
                <div className="relative">
                  <KeyRound
                    className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    id="switch-user-pwd"
                    type="password"
                    placeholder="Nhập mật khẩu..."
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-between gap-3 bg-slate-50/50">
          <div className="text-xs text-slate-500">
            Tài khoản hiện tại:{' '}
            <strong className="text-slate-800">
              {currentUser?.name ?? 'Chưa đăng nhập'}
            </strong>
          </div>
          <div className="flex items-center gap-2.5">
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="px-3 py-2 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                title="Đăng xuất khỏi hệ thống"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Đăng xuất</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirmSwitch}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] rounded-lg hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
            >
              Chuyển sang tài khoản này
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
