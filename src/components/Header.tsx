import { CloudUpload, LogOut, Menu, Plus, Users } from 'lucide-react';
import { AppSection, TeamMember } from '../types/workplan';
import { getInitials, hasPermission } from '../utils/rbac';

interface HeaderProps {
  activeSection: AppSection;
  memberCount: number;
  isDriveConnected: boolean;
  currentUser?: TeamMember | null;
  isPushingSupabase?: boolean;
  onOpenMobileMenu: () => void;
  onOpenTeamModal: () => void;
  onOpenUserSwitchModal?: () => void;
  onManualPushSupabase?: () => void;
  onQuickAdd: () => void;
  onLogout?: () => void;
}

const SECTION_TITLES: Record<AppSection, string> = {
  machines: 'Danh mục Máy / Dự án',
  workplan: 'Kế hoạch công việc',
  overtime: 'Báo giờ tăng ca',
  materials: 'Vật tư & Linh kiện',
  incidents: 'Nhật ký sự cố & Xử lý',
  audit: 'Lịch sử thay đổi (Audit Log)',
  drive: 'Google Drive',
  summary: 'Tổng hợp & Xuất dữ liệu',
};

export function Header({
  activeSection,
  memberCount,
  isDriveConnected,
  currentUser,
  isPushingSupabase,
  onOpenMobileMenu,
  onOpenTeamModal,
  onOpenUserSwitchModal,
  onManualPushSupabase,
  onQuickAdd,
  onLogout,
}: HeaderProps) {
  const canAddCurrentModule = currentUser
    ? hasPermission(currentUser, activeSection, 'add')
    : true;

  const showQuickAdd =
    activeSection !== 'summary' &&
    activeSection !== 'audit' &&
    (activeSection !== 'drive' || isDriveConnected) &&
    canAddCurrentModule;

  return (
    <header className="bg-white border-b border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)] shrink-0 sticky top-0 z-30">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Mở menu điều hướng"
            className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer shrink-0"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 truncate">
            {SECTION_TITLES[activeSection]}
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {onManualPushSupabase && (
            <button
              type="button"
              onClick={onManualPushSupabase}
              disabled={isPushingSupabase}
              title="Đẩy toàn bộ dữ liệu thực tế đang lưu trong Preview lên 7 bảng Supabase"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              <CloudUpload
                className={`w-4 h-4 text-emerald-600 shrink-0 ${
                  isPushingSupabase ? 'animate-bounce' : ''
                }`}
                aria-hidden="true"
              />
              <span className="hidden md:inline">
                {isPushingSupabase ? 'Đang đẩy...' : 'Đẩy lên Supabase'}
              </span>
              <span className="md:hidden">
                {isPushingSupabase ? 'Đang đẩy' : 'Supabase'}
              </span>
            </button>
          )}

          {currentUser && onOpenUserSwitchModal && (
            <button
              type="button"
              onClick={onOpenUserSwitchModal}
              title={`Đang đăng nhập: ${currentUser.name} (${
                currentUser.isAdmin ? 'Quản trị viên' : 'Thành viên'
              }) - Bấm để chuyển tài khoản`}
              className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-xs"
                style={{ backgroundColor: currentUser.avatarColor || '#2563EB' }}
              >
                {getInitials(currentUser.name)}
              </span>
              <span className="hidden sm:inline font-semibold text-slate-800 max-w-[120px] truncate">
                {currentUser.name}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                  currentUser.isAdmin
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {currentUser.isAdmin ? 'Admin' : 'Kỹ sư'}
              </span>
            </button>
          )}

          {currentUser && onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title="Đăng xuất khỏi hệ thống"
              aria-label="Đăng xuất khỏi hệ thống"
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </button>
          )}

          <button
            type="button"
            onClick={onOpenTeamModal}
            className="hidden sm:inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Users className="w-4 h-4 text-slate-500" aria-hidden="true" />
            <span>Thành viên</span>
            <span className="font-mono tabular-nums text-slate-500">
              ({memberCount})
            </span>
          </button>

          {showQuickAdd && (
            <button
              type="button"
              onClick={onQuickAdd}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#2563EB] rounded-lg hover:bg-blue-700 shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Thêm mới</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
