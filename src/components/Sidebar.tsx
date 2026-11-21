import { useEffect } from 'react';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Cpu,
  Package,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { AppSection } from '../types/workplan';

interface SidebarProps {
  activeSection: AppSection;
  isCollapsed: boolean;
  isMobileOpen: boolean;
  memberCount: number;
  onSelectSection: (section: AppSection) => void;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  onOpenTeamModal: () => void;
}

const NAV_ITEMS: Array<{
  id: AppSection;
  label: string;
  icon: typeof ClipboardList;
}> = [
  { id: 'workplan', label: 'Kế hoạch công việc', icon: ClipboardList },
  { id: 'overtime', label: 'Báo giờ tăng ca', icon: Clock },
  { id: 'materials', label: 'Vật tư & Linh kiện', icon: Package },
  { id: 'incidents', label: 'Nhật ký sự cố & Xử lý', icon: Wrench },
  { id: 'summary', label: 'Tổng hợp & Xuất dữ liệu', icon: BarChart3 },
];

export function Sidebar({
  activeSection,
  isCollapsed,
  isMobileOpen,
  memberCount,
  onSelectSection,
  onToggleCollapse,
  onCloseMobile,
  onOpenTeamModal,
}: SidebarProps) {
  useEffect(() => {
    if (!isMobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onCloseMobile]);

  const handleNavClick = (section: AppSection) => {
    onSelectSection(section);
    onCloseMobile();
  };

  return (
    <>
      {/* Desktop Dark Navy Sidebar */}
      <aside
        aria-label="Thanh điều hướng bên trái"
        className={`hidden lg:flex flex-col shrink-0 bg-[#0F172A] text-slate-300 border-r border-slate-800/90 transition-[width] duration-200 ease-out sticky top-0 h-screen ${
          isCollapsed ? 'w-[72px]' : 'w-[252px]'
        }`}
      >
        <div
          className={`h-16 border-b border-slate-800/80 flex items-center shrink-0 ${
            isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
          }`}
        >
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-lg bg-slate-800/90 border border-slate-700/80 flex items-center justify-center shrink-0">
                <Cpu className="w-4 h-4 text-cyan-400" aria-hidden="true" />
              </span>
              <span className="text-[15px] font-extrabold tracking-wider text-white uppercase whitespace-nowrap truncate">
                TỰ ĐỘNG HOÁ
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={
              isCollapsed
                ? 'Mở rộng thanh điều hướng'
                : 'Thu gọn thanh điều hướng'
            }
            aria-expanded={!isCollapsed}
            title={
              isCollapsed
                ? 'Mở rộng thanh điều hướng'
                : 'Thu gọn thanh điều hướng'
            }
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>

        <nav
          aria-label="Danh mục chức năng"
          className="flex-1 p-3 space-y-1 overflow-y-auto"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                aria-label={isCollapsed ? item.label : undefined}
                title={isCollapsed ? item.label : undefined}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 rounded-lg text-sm cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-400 ${
                  isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
                } ${
                  active
                    ? 'bg-[#2563EB] text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white font-medium'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? 'text-white' : 'text-slate-400'
                  }`}
                  aria-hidden="true"
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800/80 shrink-0">
          <button
            type="button"
            onClick={onOpenTeamModal}
            aria-label={
              isCollapsed ? `Thành viên nhóm (${memberCount})` : undefined
            }
            title={
              isCollapsed ? `Thành viên nhóm (${memberCount})` : undefined
            }
            className={`w-full flex items-center gap-2.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer whitespace-nowrap ${
              isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
            }`}
          >
            <Users
              className="w-4 h-4 text-cyan-400/90 shrink-0"
              aria-hidden="true"
            />
            {!isCollapsed && (
              <span className="flex-1 flex items-center justify-between gap-2 min-w-0">
                <span className="truncate">Thành viên nhóm</span>
                <span className="font-mono tabular-nums text-slate-400 shrink-0">
                  ({memberCount})
                </span>
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Dark Navy Slide-Over Drawer */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Menu điều hướng di động"
        >
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] bg-[#0F172A] text-slate-300 h-full border-r border-slate-800 flex flex-col">
            <div className="h-16 px-4 border-b border-slate-800/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-lg bg-slate-800/90 border border-slate-700/80 flex items-center justify-center shrink-0">
                  <Cpu className="w-4 h-4 text-cyan-400" aria-hidden="true" />
                </span>
                <span className="text-[15px] font-extrabold tracking-wider text-white uppercase whitespace-nowrap">
                  TỰ ĐỘNG HOÁ
                </span>
              </div>
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Đóng menu điều hướng"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <nav
              aria-label="Danh mục chức năng di động"
              className="flex-1 p-3 space-y-1 overflow-y-auto"
            >
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={active ? 'page' : undefined}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-[#2563EB] text-white font-semibold shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white font-medium'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        active ? 'text-white' : 'text-slate-400'
                      }`}
                      aria-hidden="true"
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-3 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  onCloseMobile();
                  onOpenTeamModal();
                }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-slate-200 bg-slate-800/70 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <span className="inline-flex items-center gap-2">
                  <Users
                    className="w-4 h-4 text-cyan-400/90"
                    aria-hidden="true"
                  />
                  <span>Thành viên nhóm</span>
                </span>
                <span className="font-mono tabular-nums text-slate-400">
                  ({memberCount})
                </span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
