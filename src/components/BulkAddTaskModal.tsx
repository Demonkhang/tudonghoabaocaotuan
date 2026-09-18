import React, { useState } from 'react';
import { Plus, ListPlus, Layout, Sparkles, X, Check, FileText, Clock, PlayCircle, BarChart2 } from 'lucide-react';
import { KanbanTaskItem, ColumnId } from './KanbanPlannerModal';

interface BulkAddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTasks: (newTasks: KanbanTaskItem[], targetCol: ColumnId) => void;
}

interface StructuredRowItem {
  noi_dung: string;
  thoi_gian: string;
  trien_khai: string;
  tien_do: string;
}

export function BulkAddTaskModal({ isOpen, onClose, onAddTasks }: BulkAddTaskModalProps) {
  const [inputMode, setInputMode] = useState<'text' | 'rows'>('text');
  
  // Mode 1: Text bulk paste
  const [bulkText, setBulkText] = useState('');
  
  // Mode 2: Detailed row-by-row inputs
  const [structuredRows, setStructuredRows] = useState<StructuredRowItem[]>([
    { noi_dung: '', thoi_gian: '', trien_khai: '', tien_do: 'Đang thực hiện' }
  ]);

  // Global default values
  const [category, setCategory] = useState<'Thường xuyên' | 'Đột xuất'>('Thường xuyên');
  const [timeframe, setTimeframe] = useState('Trong tuần');
  const [trienKhai, setTrienKhai] = useState('Đang triển khai theo kế hoạch');
  const [tienDo, setTienDo] = useState('Đang thực hiện');
  const [targetDestination, setTargetDestination] = useState<ColumnId>('backlog');

  if (!isOpen) return null;

  const handleRowChange = (index: number, field: keyof StructuredRowItem, value: string) => {
    const updated = [...structuredRows];
    updated[index] = { ...updated[index], [field]: value };
    setStructuredRows(updated);
  };

  const handleAddRow = () => {
    setStructuredRows([
      ...structuredRows,
      { noi_dung: '', thoi_gian: timeframe, trien_khai: trienKhai, tien_do: tienDo }
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (structuredRows.length <= 1) return;
    setStructuredRows(structuredRows.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let itemsToAdd: KanbanTaskItem[] = [];

    if (inputMode === 'text') {
      const rawLines = bulkText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (rawLines.length === 0) return;

      itemsToAdd = rawLines.map((lineContent, idx) => ({
        id: `k_bulk_${Date.now()}_${idx}`,
        noi_dung: lineContent,
        nhom: category,
        thoi_gian: timeframe || 'Trong tuần',
        trien_khai: trienKhai || 'Đang triển khai theo kế hoạch',
        tien_do: tienDo || 'Đang thực hiện',
        san_pham_du_kien: 'Kế hoạch công tác',
        source: 'custom_added'
      }));
    } else {
      const validRows = structuredRows.filter(r => r.noi_dung.trim().length > 0);
      if (validRows.length === 0) return;

      itemsToAdd = validRows.map((r, idx) => ({
        id: `k_bulk_${Date.now()}_${idx}`,
        noi_dung: r.noi_dung.trim(),
        nhom: category,
        thoi_gian: r.thoi_gian.trim() || timeframe || 'Trong tuần',
        trien_khai: r.trien_khai.trim() || trienKhai || 'Đang triển khai theo kế hoạch',
        tien_do: r.tien_do || tienDo || 'Đang thực hiện',
        san_pham_du_kien: 'Kế hoạch công tác',
        source: 'custom_added'
      }));
    }

    onAddTasks(itemsToAdd, targetDestination);
    
    // Reset form
    setBulkText('');
    setStructuredRows([{ noi_dung: '', thoi_gian: '', trien_khai: '', tien_do: 'Đang thực hiện' }]);
    onClose();
  };

  // Task count preview
  const taskCount =
    inputMode === 'text'
      ? bulkText.split('\n').filter(l => l.trim().length > 0).length
      : structuredRows.filter(r => r.noi_dung.trim().length > 0).length;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[220] p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-3xl w-full text-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
              <ListPlus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-wide">
                THÊM NHIỆM VỤ MỚI VÀO KANBAN
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Nhập đầy đủ thông tin 4 trường chuẩn Bảng I và chọn Tag gán vị trí
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer text-lg font-bold transition-all"
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
              className={`flex-1 py-2 px-3 rounded-lg font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                inputMode === 'text'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Dán / Nhập nhanh nhiều dòng text</span>
            </button>

            <button
              type="button"
              onClick={() => setInputMode('rows')}
              className={`flex-1 py-2 px-3 rounded-lg font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                inputMode === 'rows'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListPlus className="w-4 h-4" />
              <span>Nhập đầy đủ từng nhiệm vụ</span>
            </button>
          </div>

          {/* MODE 1: BULK TEXT PASTE */}
          {inputMode === 'text' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  1. Nội dung nhiệm vụ / công tác được giao (Mỗi dòng là 1 nhiệm vụ):
                </label>
                <textarea
                  rows={4}
                  value={bulkText}
                  onChange={e => setBulkText(e.target.value)}
                  placeholder="Ví dụ:&#10;Triển khai quy trình số hóa hồ sơ quý IV&#10;Họp giao ban phòng ban tháng 10&#10;Kiểm tra hạ tầng mạng và bảo mật"
                  className="w-full p-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 leading-relaxed font-mono"
                />
              </div>

              {/* Shared Default Fields for Bulk Mode */}
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    2. Thời gian được giao hoàn thiện:
                  </label>
                  <input
                    type="text"
                    value={timeframe}
                    onChange={e => setTimeframe(e.target.value)}
                    placeholder="Trong tuần / 25/10/2026..."
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                    <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
                    3. Triển khai thực hiện:
                  </label>
                  <input
                    type="text"
                    value={trienKhai}
                    onChange={e => setTrienKhai(e.target.value)}
                    placeholder="Đang thực hiện theo kế hoạch..."
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                    <BarChart2 className="w-3.5 h-3.5 text-purple-400" />
                    4. Tiến độ thực hiện:
                  </label>
                  <select
                    value={tienDo}
                    onChange={e => setTienDo(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Đang thực hiện">Đang thực hiện</option>
                    <option value="Hoàn thành">Hoàn thành</option>
                    <option value="Chưa thực hiện">Chưa thực hiện</option>
                    <option value="Hoàn thành trễ">Hoàn thành trễ</option>
                    <option value="Hủy / Kết thúc">Hủy / Kết thúc</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            /* MODE 2: STRUCTURED ROW-BY-ROW DETAILED INPUT */
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-300">
                Danh sách nhiệm vụ với đầy đủ 4 trường thông tin Bảng I:
              </label>

              {structuredRows.map((row, idx) => (
                <div key={idx} className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-3 relative group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      Nhiệm vụ #{idx + 1}
                    </span>

                    {structuredRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg cursor-pointer transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* 1. Nội dung */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      1. Nội dung nhiệm vụ / công tác được giao (*):
                    </label>
                    <input
                      type="text"
                      value={row.noi_dung}
                      onChange={e => handleRowChange(idx, 'noi_dung', e.target.value)}
                      placeholder="Ví dụ: Nâng cấp Phần mềm Quản lý Kế hoạch..."
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* 2, 3, 4 Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        2. Thời gian hoàn thiện:
                      </label>
                      <input
                        type="text"
                        value={row.thoi_gian}
                        onChange={e => handleRowChange(idx, 'thoi_gian', e.target.value)}
                        placeholder={timeframe || 'Trong tuần'}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        3. Triển khai thực hiện:
                      </label>
                      <input
                        type="text"
                        value={row.trien_khai}
                        onChange={e => handleRowChange(idx, 'trien_khai', e.target.value)}
                        placeholder={trienKhai || 'Chi tiết triển khai...'}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        4. Tiến độ thực hiện:
                      </label>
                      <select
                        value={row.tien_do}
                        onChange={e => handleRowChange(idx, 'tien_do', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="Đang thực hiện">Đang thực hiện</option>
                        <option value="Hoàn thành">Hoàn thành</option>
                        <option value="Chưa thực hiện">Chưa thực hiện</option>
                        <option value="Hoàn thành trễ">Hoàn thành trễ</option>
                        <option value="Hủy / Kết thúc">Hủy / Kết thúc</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddRow}
                className="mt-2 text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1.5 cursor-pointer bg-blue-500/10 px-3 py-2 rounded-xl border border-blue-500/20 hover:bg-blue-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm dòng nhiệm vụ mới</span>
              </button>
            </div>
          )}

          {/* NHÓM CÔNG TÁC & THÔNG TIN CHUNG */}
          <div className="pt-2 border-t border-slate-800 text-xs">
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Phân loại nhóm công tác:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                onClick={() => setCategory('Thường xuyên')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  category === 'Thường xuyên'
                    ? 'bg-blue-950/60 border-blue-500 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  checked={category === 'Thường xuyên'}
                  onChange={() => setCategory('Thường xuyên')}
                />
                <span className="font-semibold text-xs">Nhiệm vụ Thường xuyên</span>
              </label>

              <label
                onClick={() => setCategory('Đột xuất')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  category === 'Đột xuất'
                    ? 'bg-amber-950/60 border-amber-500 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  checked={category === 'Đột xuất'}
                  onChange={() => setCategory('Đột xuất')}
                />
                <span className="font-semibold text-xs">Nhiệm vụ Đột xuất</span>
              </label>
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
