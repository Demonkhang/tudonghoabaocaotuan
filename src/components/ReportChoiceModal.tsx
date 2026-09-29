import React from 'react';
import { Users, FileEdit, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';

interface ReportChoiceModalProps {
  isOpen: boolean;
  weekNumber: number;
  year: number;
  sharedOwnerName: string;
  onSelectSharedReport: () => void;
  onSelectPersonalReport: () => void;
  onSelectConsolidatedReport?: (teamCode: 'VAN_THU' | 'CDS' | 'OFFICE_MASTER') => void;
  onClose: () => void;
}

export function ReportChoiceModal({
  isOpen,
  weekNumber,
  year,
  sharedOwnerName,
  onSelectSharedReport,
  onSelectPersonalReport,
  onSelectConsolidatedReport,
  onClose
}: ReportChoiceModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[260] p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full text-slate-100 shadow-2xl overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 p-5 border-b border-indigo-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-wide">
                LỰA CHỌN BIỂU MẪU BÁO CÁO TUẦN {weekNumber}/{year}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Vui lòng chọn loại Form báo cáo và không gian làm việc
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

        {/* BODY CONTENT */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {sharedOwnerName && (
            <div className="bg-indigo-950/40 p-3.5 rounded-xl border border-indigo-800/60 text-xs text-indigo-200 flex items-start gap-2.5">
              <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Tổ trưởng <strong className="text-white font-bold">{sharedOwnerName}</strong> đã chia sẻ quyền làm việc cho bạn trong kỳ báo cáo này.
              </p>
            </div>
          )}

          {/* CHOICE OPTIONS */}
          <div className="space-y-3">
            
            {/* OPTION 1: CONSOLIDATED OFFICE REPORT (NGHỊ ĐỊNH 30) - NEW FEATURE */}
            {onSelectConsolidatedReport && (
              <div className="p-4 rounded-xl border border-emerald-500/60 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 hover:border-emerald-400 transition-all space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-emerald-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    1. Báo cáo Tuần Tổng Hợp Văn Phòng (Nghị định 30)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                    Form Mới
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Tự động gộp dữ liệu từ <strong>Tổ Chuyển đổi số</strong> & <strong>Tổ Văn thư - Lưu trữ</strong>, xuất file chuẩn Nghị định 30/2020/NĐ-CP (có Mục III Kiểm tra thể thức công văn & Ma trận 4 chữ ký).
                </p>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    onClick={() => onSelectConsolidatedReport('VAN_THU')}
                    className="px-3 py-2 bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-600/50 rounded-lg text-emerald-100 font-bold text-xs flex items-center justify-center text-center cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    Tổ Văn thư – Lưu trữ
                  </button>
                  <button
                    onClick={() => onSelectConsolidatedReport('CDS')}
                    className="px-3 py-2 bg-blue-900/60 hover:bg-blue-800 border border-blue-600/50 rounded-lg text-blue-100 font-bold text-xs flex items-center justify-center text-center cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    Tổ Chuyển đổi số
                  </button>
                  <button
                    onClick={() => onSelectConsolidatedReport('OFFICE_MASTER')}
                    className="px-3 py-2 bg-amber-900/60 hover:bg-amber-800 border border-amber-600/50 rounded-lg text-amber-100 font-bold text-xs flex items-center justify-center text-center cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    👑 Master Tổng Hợp NĐ30
                  </button>
                </div>
              </div>
            )}

            {/* OPTION 2: SHARED TEAM REPORT */}
            {sharedOwnerName && (
              <button
                onClick={onSelectSharedReport}
                className="w-full text-left p-4 rounded-xl border border-indigo-500/50 bg-gradient-to-r from-indigo-950/80 to-slate-900 hover:from-indigo-900/90 hover:to-indigo-950 shadow-lg cursor-pointer transition-all hover:scale-[1.01] group space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-indigo-200 flex items-center gap-2 group-hover:text-white">
                    <Users className="w-4 h-4 text-indigo-400" />
                    2. Mở Báo cáo Dùng chung của Tổ trưởng
                  </span>
                </div>
                <p className="text-xs text-slate-400 group-hover:text-slate-300 leading-relaxed">
                  Soạn thảo và phối hợp trực tiếp trên Báo cáo Tuần của Tổ trưởng <strong>{sharedOwnerName}</strong>.
                </p>
              </button>
            )}

            {/* OPTION 3: PERSONAL REPORT (CORE CŨ) */}
            <button
              onClick={onSelectPersonalReport}
              className="w-full text-left p-4 rounded-xl border border-slate-800 bg-slate-950/80 hover:bg-slate-800 hover:border-slate-700 shadow-md cursor-pointer transition-all hover:scale-[1.01] group space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-slate-200 flex items-center gap-2 group-hover:text-white">
                  <FileEdit className="w-4 h-4 text-blue-400" />
                  3. Báo cáo Tuần Đơn Cá nhân / Phòng ban (Form Core Cũ)
                </span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-xs text-slate-400 group-hover:text-slate-300 leading-relaxed">
                Bản Báo cáo Tuần đơn lẻ tiêu chuẩn cho cá nhân/phòng ban độc lập.
              </p>
            </button>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
          >
            Đóng / Chọn sau
          </button>
        </div>
      </div>
    </div>
  );
}
