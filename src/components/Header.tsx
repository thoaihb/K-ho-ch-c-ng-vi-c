import { Menu, Plus, Users } from 'lucide-react';
import { AppSection } from '../types/workplan';

interface HeaderProps {
  activeSection: AppSection;
  memberCount: number;
  isDriveConnected: boolean;
  onOpenMobileMenu: () => void;
  onOpenTeamModal: () => void;
  onQuickAdd: () => void;
}

const SECTION_TITLES: Record<AppSection, string> = {
  machines: 'Danh mục Máy / Dự án',
  workplan: 'Kế hoạch công việc',
  overtime: 'Báo giờ tăng ca',
  materials: 'Vật tư & Linh kiện',
  incidents: 'Nhật ký sự cố & Xử lý',
  drive: 'Google Drive',
  summary: 'Tổng hợp & Xuất dữ liệu',
};

export function Header({
  activeSection,
  memberCount,
  isDriveConnected,
  onOpenMobileMenu,
  onOpenTeamModal,
  onQuickAdd,
}: HeaderProps) {
  const showQuickAdd =
    activeSection !== 'summary' &&
    (activeSection !== 'drive' || isDriveConnected);

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
          <button
            type="button"
            onClick={onOpenTeamModal}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Users className="w-4 h-4 text-slate-500" aria-hidden="true" />
            <span className="hidden sm:inline">Thành viên nhóm</span>
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
