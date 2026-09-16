import React, { useState } from 'react';
import { Plus, ListPlus, Layout, Sparkles, X, Check, FileText } from 'lucide-react';
import { KanbanTaskItem, ColumnId } from './KanbanPlannerModal';

interface BulkAddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTasks: (newTasks: KanbanTaskItem[], targetCol: ColumnId) => void;
}

export function BulkAddTaskModal({ isOpen, onClose, onAddTasks }: BulkAddTaskModalProps) {
  const [inputMode, setInputMode] = useState<'text' | 'rows'>('text');
  const [bulkText, setBulkText] = useState('');
  const [rowInputs, setRowInputs] = useState<string[]>(['', '', '']);
  
  const [category, setCategory] = useState<'Thường xuyên' | 'Đột xuất'>('Thường xuyên');
  const [timeframe, setTimeframe] = useState('Trong tuần');
  const [expectedProduct, setExpectedProduct] = useState('Kế hoạch công tác');
  const [targetDestination, setTargetDestination] = useState<ColumnId>('backlog');

  if (!isOpen) return null;

  const handleRowChange = (index: number, value: string) => {
    const updated = [...rowInputs];
    updated[index] = value;
    setRowInputs(updated);
  };

  const handleAddRow = () => {
    setRowInputs([...rowInputs, '']);
  };

  const handleRemoveRow = (index: number) => {
    if (rowInputs.length <= 1) return;
    setRowInputs(rowInputs.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let rawContents: string[] = [];

    if (inputMode === 'text') {
      rawContents = bulkText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    } else {
      rawContents = rowInputs.map(r => r.trim()).filter(r => r.length > 0);
    }

    if (rawContents.length === 0) return;

    const itemsToAdd: KanbanTaskItem[] = rawContents.map((content, idx) => ({
      id: `k_bulk_${Date.now()}_${idx}`,
      noi_dung: content,
      nhom: category,
      thoi_gian: timeframe,
      san_pham_du_kien: expectedProduct,
      source: 'custom_added'
    }));

    onAddTasks(itemsToAdd, targetDestination);
    
    // Reset form
    setBulkText('');
    setRowInputs(['', '', '']);
    onClose();
  };

  // Preview count
  const taskCount =
    inputMode === 'text'
      ? bulkText.split('\n').filter(l => l.trim().length > 0).length
      : rowInputs.filter(r => r.trim().length > 0).length;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full text-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
              <ListPlus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-wide">
                THÊM NHIỆM VỤ HÀNG LOẠT VÀO KANBAN
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Nhập 1 hoặc nhiều nhiệm vụ cùng lúc và chọn Tag gán thẳng vị trí
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* BODY FORM */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {/* Mode Switcher */}
          <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setInputMode('text')}
              className={`flex-1 py-1.5 px-3 rounded-lg font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                inputMode === 'text'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Dán / Nhập nhiều dòng text</span>
            </button>

            <button
              type="button"
              onClick={() => setInputMode('rows')}
              className={`flex-1 py-1.5 px-3 rounded-lg font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                inputMode === 'rows'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListPlus className="w-3.5 h-3.5" />
              <span>Nhập theo từng ô dòng</span>
            </button>
          </div>

          {/* Input Area */}
          {inputMode === 'text' ? (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Nội dung các nhiệm vụ (Mỗi dòng là 1 nhiệm vụ):
              </label>
              <textarea
                rows={5}
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                placeholder="Ví dụ:&#10;Triển khai quy trình số hóa hồ sơ quý IV&#10;Họp giao ban phòng ban tháng 10&#10;Kiểm tra hạ tầng mạng và bảo mật"
                className="w-full p-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 leading-relaxed font-mono"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                Danh sách các dòng nhiệm vụ:
              </label>
              {rowInputs.map((val, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 w-5 text-right">{idx + 1}.</span>
                  <input
                    type="text"
                    value={val}
                    onChange={e => handleRowChange(idx, e.target.value)}
                    placeholder={`Tên nhiệm vụ ${idx + 1}...`}
                    className="flex-1 px-3 py-1.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  {rowInputs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddRow}
                className="mt-1 text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm dòng nhiệm vụ mới</span>
              </button>
            </div>
          )}

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-xs">
            {/* Nhóm công tác */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Nhóm công tác:</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="Thường xuyên">Nhiệm vụ Thường xuyên</option>
                <option value="Đột xuất">Nhiệm vụ Đột xuất</option>
              </select>
            </div>

            {/* Thời gian thực hiện */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Thời gian dự kiến:</label>
              <input
                type="text"
                value={timeframe}
                onChange={e => setTimeframe(e.target.value)}
                placeholder="Trong tuần / 15/10/2026..."
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* GÁN TAG VỊ TRÍ ĐÍCH (Target Tag) */}
          <div className="pt-2 border-t border-slate-800">
            <label className="block text-xs font-bold text-slate-300 mb-2">
              🏷️ Chọn Tag / Vị Trí Gán Nhiệm Vụ Về:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label
                onClick={() => setTargetDestination('backlog')}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  targetDestination === 'backlog'
                    ? 'bg-slate-800 border-indigo-500 ring-1 ring-indigo-500/50 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="targetDestination"
                  checked={targetDestination === 'backlog'}
                  onChange={() => setTargetDestination('backlog')}
                  className="mt-0.5"
                />
                <div>
                  <span className="font-bold text-xs flex items-center gap-1.5 text-indigo-300">
                    📦 Kho Nhiệm Vụ
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Nằm ở danh sách chờ phân loại để kéo thả sau
                  </span>
                </div>
              </label>

              <label
                onClick={() => setTargetDestination('nextWeek')}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  targetDestination === 'nextWeek'
                    ? 'bg-blue-950/60 border-blue-500 ring-1 ring-blue-500/50 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="targetDestination"
                  checked={targetDestination === 'nextWeek'}
                  onChange={() => setTargetDestination('nextWeek')}
                  className="mt-0.5"
                />
                <div>
                  <span className="font-bold text-xs flex items-center gap-1.5 text-blue-300">
                    🚀 Gán ngay vào Kế Hoạch Tuần Tới
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Đưa thẳng vào danh sách Kế hoạch Bảng II tuần sau
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-400">
              Tổng số nhiệm vụ hợp lệ: <strong className="text-blue-400 font-bold">{taskCount}</strong>
            </span>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={taskCount === 0}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer transition-all hover:scale-[1.02] flex items-center gap-2"
              >
                <Check className="w-4 h-4 text-blue-200" />
                <span>Thêm {taskCount > 0 ? `${taskCount} Nhiệm Vụ` : ''} Về Kanban</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
