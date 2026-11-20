import { Plus, Users } from 'lucide-react';
import { MAX_TEAM_MEMBERS } from '../types/workplan';

interface HeaderProps {
  memberCount: number;
  onOpenTeamModal: () => void;
  onOpenAddModal: () => void;
}

export function Header({
  memberCount,
  onOpenTeamModal,
  onOpenAddModal,
}: HeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap">
            Kế hoạch Tự động hóa
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onOpenTeamModal}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Users className="w-4 h-4 text-slate-500" aria-hidden="true" />
            <span>
              Thành viên nhóm{' '}
              <span className="font-mono tabular-nums text-slate-500">
                ({memberCount}/{MAX_TEAM_MEMBERS})
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Thêm hạng mục</span>
          </button>
        </div>
      </div>
    </header>
  );
}
