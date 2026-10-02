import React, { useState, useEffect } from 'react';
import { FileCheck, PenTool, Save, X, Sparkles } from 'lucide-react';

export interface DocInspectionStatItem {
  id?: string;
  department_name: string;
  total_checked: number;
  error_count: number;
  total_pages?: number;
}

export interface ConsolidatedReportMetaItem {
  to_truong_name: string;
  nguoi_lap_name: string;
  pho_chanh_van_phong_name: string;
  chanh_van_phong_name: string;
  ending_note: string;
}

interface DocInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: DocInspectionStatItem[];
  meta: ConsolidatedReportMetaItem;
  onSave: (updatedStats: DocInspectionStatItem[], updatedMeta: ConsolidatedReportMetaItem) => void;
}

export function DocInspectionModal({
  isOpen,
  onClose,
  stats,
  meta,
  onSave
}: DocInspectionModalProps) {
  const [localStats, setLocalStats] = useState<DocInspectionStatItem[]>(() => stats || []);
  const [localMeta, setLocalMeta] = useState<ConsolidatedReportMetaItem>(() => meta || {
    to_truong_name: 'Trần Thuận Hòa',
    nguoi_lap_name: '',
    pho_chanh_van_phong_name: 'Nguyễn Đức Thắng',
    chanh_van_phong_name: 'Hoàng Văn Dương',
    ending_note: 'Trên đây là báo cáo tình hình thực hiện nhiệm vụ Tuần và kế hoạch thực hiện nhiệm vụ trọng tâm công tác Tuần tiếp theo. Kính trình Lãnh đạo phòng xem xét./.'
  });

  useEffect(() => {
    if (isOpen) {
      if (stats) setLocalStats(stats);
      if (meta) setLocalMeta(meta);
    }
  }, [isOpen, meta, stats]);

  if (!isOpen) return null;

  const handleStatChange = (index: number, field: 'total_checked' | 'error_count' | 'total_pages', val: number) => {
    const updated = [...localStats];
    updated[index] = { ...updated[index], [field]: Math.max(0, val) };
    setLocalStats(updated);
  };

  const handleSave = () => {
    onSave(localStats, localMeta);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[280] p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-2xl w-full text-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 p-5 border-b border-emerald-900/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-wide flex items-center gap-2">
                MỤC III & KHỐI CHỮ KÝ (NGHỊ ĐỊNH 30)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cấu hình Thống kê Thể thức Công văn & Thông tin 4 Chữ ký Phê duyệt
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

        {/* BODY */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* MỤC III SECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Mục III: Kết quả kiểm tra thể thức và chính tả công văn phát hành
              </h4>
            </div>

            <div className="bg-slate-950/80 rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900/90 text-slate-400 uppercase font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">STT</th>
                    <th className="py-2.5 px-3">Phòng ban</th>
                    <th className="py-2.5 px-3 text-center w-32">Tổng số VB kiểm tra</th>
                    <th className="py-2.5 px-3 text-center w-24">Số lỗi</th>
                    <th className="py-2.5 px-3 text-center w-28">Tổng số trang</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {localStats.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40">
                      <td className="py-2 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                      <td className="py-2 px-3 font-medium text-slate-200">{item.department_name}</td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          value={item.total_checked}
                          onChange={(e) => handleStatChange(idx, 'total_checked', parseInt(e.target.value, 10) || 0)}
                          className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center font-bold text-emerald-400 focus:border-emerald-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          value={item.error_count}
                          onChange={(e) => handleStatChange(idx, 'error_count', parseInt(e.target.value, 10) || 0)}
                          className={`w-16 bg-slate-900 border rounded px-2 py-1 text-center font-bold focus:outline-none ${item.error_count > 0 ? 'border-rose-500 text-rose-400' : 'border-slate-700 text-slate-300'}`}
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          value={item.total_pages ?? 0}
                          onChange={(e) => handleStatChange(idx, 'total_pages', parseInt(e.target.value, 10) || 0)}
                          className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center font-bold text-sky-400 focus:border-sky-500 focus:outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* LỜI KẾT MỤC IV */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <PenTool className="w-3.5 h-3.5 text-indigo-400" />
              Lời kết văn bản (Cuối Mục IV trình Lãnh đạo xem xét):
            </label>
            <textarea
              rows={2}
              value={localMeta.ending_note}
              onChange={(e) => setLocalMeta({ ...localMeta, ending_note: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
              placeholder="Ghi lời kết văn bản báo cáo..."
            />
          </div>

          {/* KHỐI CHỮ KÝ 4 VỊ TRÍ */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2 border-b border-slate-800 pb-2">
              <PenTool className="w-4 h-4 text-amber-400" />
              Khối Chữ Ký Phê Duyệt 4 Vị Trí (Theo Nghị định 30)
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-bold">1. Ý kiến của Tổ trưởng (Tên):</label>
                <input
                  type="text"
                  value={localMeta.to_truong_name}
                  onChange={(e) => setLocalMeta({ ...localMeta, to_truong_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-bold">2. Người lập báo cáo (Tên):</label>
                <input
                  type="text"
                  value={localMeta.nguoi_lap_name}
                  onChange={(e) => setLocalMeta({ ...localMeta, nguoi_lap_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-bold">3. Ý kiến của Phó Chánh Văn phòng (Tên):</label>
                <input
                  type="text"
                  value={localMeta.pho_chanh_van_phong_name}
                  onChange={(e) => setLocalMeta({ ...localMeta, pho_chanh_van_phong_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-bold">4. Ý kiến của Chánh Văn phòng (Tên):</label>
                <input
                  type="text"
                  value={localMeta.chanh_van_phong_name}
                  onChange={(e) => setLocalMeta({ ...localMeta, chanh_van_phong_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-950"
          >
            <Save className="w-4 h-4" />
            Cập nhật Báo cáo
          </button>
        </div>
      </div>
    </div>
  );
}
