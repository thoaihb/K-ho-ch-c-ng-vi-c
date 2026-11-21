import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { MACHINE_STATUSES, MachineProject, MachineStatus } from '../types/workplan';
import { generateNextMachineCode } from '../utils/machines';
import { getTodayIsoDate } from '../utils/workplan';

export interface QuickAddMachineInput {
  code: string;
  name: string;
  description: string;
  startDate: string;
  status: MachineStatus;
}

interface MachineSelectWithQuickAddProps {
  id: string;
  label: string;
  required?: boolean;
  machines: MachineProject[];
  selectedMachineId: string;
  legacyFallbackName?: string;
  error?: string;
  onChange: (selection: { machineId: string; machineName: string }) => void;
  onQuickCreateMachine: (data: QuickAddMachineInput) => MachineProject;
}

export function MachineSelectWithQuickAdd({
  id,
  label,
  required = true,
  machines,
  selectedMachineId,
  legacyFallbackName = '',
  error,
  onChange,
  onQuickCreateMachine,
}: MachineSelectWithQuickAddProps) {
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newStatus, setNewStatus] = useState<MachineStatus>('Đang triển khai');
  const [quickError, setQuickError] = useState('');

  const hasMatchingMachine = Boolean(
    selectedMachineId && machines.some((m) => m.id === selectedMachineId)
  );
  const showLegacyOption =
    !hasMatchingMachine && legacyFallbackName.trim().length > 0;
  const selectValue = hasMatchingMachine
    ? selectedMachineId
    : showLegacyOption
    ? `__legacy__:${legacyFallbackName}`
    : '';

  const handleOpenQuickAdd = () => {
    setNewCode(generateNextMachineCode(machines));
    setNewName('');
    setNewStatus('Đang triển khai');
    setQuickError('');
    setIsQuickAdding(true);
  };

  const handleConfirmQuickAdd = () => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      setQuickError('Vui lòng nhập tên máy / dự án.');
      return;
    }
    const existing = machines.find(
      (m) => m.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (existing) {
      onChange({ machineId: existing.id, machineName: existing.name });
      setIsQuickAdding(false);
      return;
    }

    const created = onQuickCreateMachine({
      code: newCode.trim().toUpperCase() || generateNextMachineCode(machines),
      name: trimmedName,
      description: '',
      startDate: getTodayIsoDate(),
      status: newStatus,
    });
    onChange({ machineId: created.id, machineName: created.name });
    setIsQuickAdding(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <label htmlFor={id} className="block text-xs font-semibold text-slate-700">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
        {!isQuickAdding && (
          <button
            type="button"
            onClick={handleOpenQuickAdd}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:text-blue-800 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Thêm nhanh máy mới</span>
          </button>
        )}
      </div>

      <select
        id={id}
        value={selectValue}
        onChange={(e) => {
          const val = e.target.value;
          if (!val) {
            onChange({ machineId: '', machineName: '' });
            return;
          }
          if (val.startsWith('__legacy__:')) {
            onChange({ machineId: '', machineName: val.slice(11) });
            return;
          }
          const found = machines.find((m) => m.id === val);
          if (found) {
            onChange({ machineId: found.id, machineName: found.name });
          }
        }}
        className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
      >
        <option value="">-- Chọn máy / dự án từ danh mục --</option>
        {showLegacyOption && (
          <option value={`__legacy__:${legacyFallbackName}`}>
            {legacyFallbackName} (Chưa gán mã danh mục)
          </option>
        )}
        {machines.map((m) => (
          <option key={m.id} value={m.id}>
            {m.code} — {m.name}
          </option>
        ))}
      </select>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {isQuickAdding && (
        <div className="mt-2.5 p-3.5 bg-slate-50 border border-blue-200 rounded-lg space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-800">
              Thêm nhanh vào Danh mục Máy / Dự án
            </span>
            <button
              type="button"
              onClick={() => setIsQuickAdding(false)}
              aria-label="Đóng thêm nhanh máy"
              className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <input
              type="text"
              aria-label="Mã máy mới"
              placeholder="Mã máy (VD: EOL-02)"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              className="h-9 px-2.5 text-xs font-mono uppercase bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
            <input
              type="text"
              aria-label="Tên máy / dự án mới"
              placeholder="Tên máy / cụm máy..."
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setQuickError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleConfirmQuickAdd();
                }
              }}
              className="sm:col-span-2 h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
            <select
              aria-label="Trạng thái máy mới"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as MachineStatus)}
              className="h-9 px-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            >
              {MACHINE_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {quickError && <p className="text-xs text-red-600">{quickError}</p>}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsQuickAdding(false)}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-100 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirmQuickAdd}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#2563EB] rounded-md hover:bg-blue-700 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Lưu & chọn máy</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
