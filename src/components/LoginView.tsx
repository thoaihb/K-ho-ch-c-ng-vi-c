import { FormEvent, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Cpu,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Shield,
  ShieldAlert,
  User,
  UserCheck,
} from 'lucide-react';
import { TeamMember } from '../types/workplan';
import { getInitials } from '../utils/rbac';

interface LoginViewProps {
  members: TeamMember[];
  onLogin: (user: TeamMember, rememberMe: boolean) => void;
}

export function LoginView({ members, onLogin }: LoginViewProps) {
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLockedNotice(null);

    const cleanUser = usernameInput.trim().toLowerCase();
    const cleanPwd = passwordInput.trim();

    if (!cleanUser) {
      setError('Vui lòng nhập Tên đăng nhập hoặc Email.');
      return;
    }
    if (!cleanPwd) {
      setError('Vui lòng nhập Mật khẩu.');
      return;
    }

    // Lookup member by username, email, or exact id
    const found = members.find(
      (m) =>
        m.username.toLowerCase() === cleanUser ||
        (m.email && m.email.toLowerCase() === cleanUser) ||
        m.id.toLowerCase() === cleanUser ||
        m.name.toLowerCase() === cleanUser
    );

    if (!found) {
      setError(
        'Tài khoản không tồn tại trong hệ thống. Vui lòng kiểm tra lại tên đăng nhập hoặc liên hệ Quản trị viên.'
      );
      return;
    }

    // Check if account is locked by Admin
    if (found.isLocked) {
      setLockedNotice(
        `Tài khoản "${found.name}" (@${found.username}) đã bị Quản trị viên (Admin) khóa truy cập. Vui lòng liên hệ Admin để mở khóa.`
      );
      return;
    }

    // Check password (default 123 if not set)
    const expectedPassword = found.password || '123';
    if (cleanPwd !== expectedPassword) {
      setError(
        'Mật khẩu không chính xác. Mật khẩu mặc định hệ thống cấp ban đầu là 123 (nếu chưa được đổi).'
      );
      return;
    }

    // Success
    onLogin(found, rememberMe);
  };

  const handleQuickFill = (member: TeamMember) => {
    setUsernameInput(member.username);
    setPasswordInput(member.password || '123');
    setError(null);
    setLockedNotice(null);
  };

  // Find demo admin and first members for quick demo pill buttons
  const adminMember = members.find((m) => m.isAdmin) || members[0];
  const regularMembers = members.filter((m) => !m.isAdmin).slice(0, 3);

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background radial ambient lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="relative z-10 text-center mb-8 space-y-3">
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-lg">
          <span className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-cyan-400 shadow-inner">
            <Cpu className="w-5 h-5 text-cyan-400" aria-hidden="true" />
          </span>
          <span className="text-xl sm:text-2xl font-extrabold tracking-wider text-white uppercase">
            TỰ ĐỘNG HOÁ
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          Hệ thống Quản lý Thiết bị, Kế hoạch & Kỹ thuật Tự Động Hóa
        </p>
      </div>

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-md bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden">
        {/* Card Header */}
        <div className="px-6 sm:px-8 pt-7 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            <Lock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Xác thực danh tính</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Đăng nhập hệ thống</h2>
          <p className="text-xs text-slate-500 mt-1">
            Vui lòng nhập tài khoản để truy cập không gian làm việc
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="leading-relaxed font-medium">{error}</div>
            </div>
          )}

          {/* Locked Account Notice */}
          {lockedNotice && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5 animate-in fade-in">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="leading-relaxed font-medium">{lockedNotice}</div>
            </div>
          )}

          {/* Username / Email Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="login-username"
              className="block text-xs font-semibold text-slate-700"
            >
              Tên đăng nhập hoặc Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" aria-hidden="true" />
              </div>
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                autoFocus
                value={usernameInput}
                onChange={(e) => {
                  setUsernameInput(e.target.value);
                  setError(null);
                  setLockedNotice(null);
                }}
                placeholder="Ví dụ: admin, ha.tran, nam.le..."
                className="w-full h-11 pl-10 pr-3 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white font-medium transition-all"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-700"
              >
                Mật khẩu <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400 font-normal">
                (Mặc định: 123)
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" aria-hidden="true" />
              </div>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setError(null);
                }}
                placeholder="Nhập mật khẩu..."
                className="w-full h-11 pl-10 pr-10 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white font-medium transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center justify-between pt-0.5">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-600 font-medium select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>Ghi nhớ đăng nhập trên trình duyệt này</span>
            </label>
          </div>

          {/* Login Submit Button */}
          <button
            type="submit"
            className="w-full h-11 px-4 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 shadow-md transition-all cursor-pointer"
          >
            <span>Đăng nhập hệ thống</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </form>

        {/* Quick Demo Accounts Helper Box */}
        <div className="px-6 sm:px-8 py-5 bg-slate-50/90 border-t border-slate-100 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
            <span className="flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
              Chọn nhanh tài khoản có sẵn để test:
            </span>
            <span className="text-[10px] text-slate-400 font-mono">MK: 123</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {adminMember && (
              <button
                type="button"
                onClick={() => handleQuickFill(adminMember)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title={`Admin: ${adminMember.name} (@${adminMember.username})`}
              >
                <Shield className="w-3 h-3 text-purple-600" aria-hidden="true" />
                <span>Admin ({adminMember.username})</span>
              </button>
            )}

            {regularMembers.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleQuickFill(m)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title={`${m.name} (@${m.username}) - ${m.role}`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: m.avatarColor || '#2563EB' }}
                />
                <span>{m.name.split(' ').pop()} (@{m.username})</span>
              </button>
            ))}
          </div>

          <p className="text-[10px] text-slate-500 pt-1 leading-normal">
            * Tài khoản <strong>Admin</strong> có toàn quyền tạo mới, cấp/đổi mật khẩu và phân quyền chi tiết cho tất cả thành viên trong mục <em>Thành viên nhóm</em>.
          </p>
        </div>
      </div>

      {/* Footer copyright / info */}
      <div className="relative z-10 mt-6 text-center text-xs text-slate-500">
        Phòng Kỹ thuật Tự Động Hoá • LAN Server: 192.168.1.224
      </div>
    </div>
  );
}
