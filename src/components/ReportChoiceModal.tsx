import React from 'react';
import { Users, FileEdit, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';

interface ReportChoiceModalProps {
  isOpen: boolean;
  weekNumber: number;
  year: number;
  sharedOwnerName: string;
  onSelectSharedReport: () => void;
  onSelectPersonalReport: () => void;
  onClose: () => void;
}

export function ReportChoiceModal({
  isOpen,
  weekNumber,
  year,
  sharedOwnerName,
  onSelectSharedReport,
  onSelectPersonalReport,
  onClose
}: ReportChoiceModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[260] p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full text-slate-100 shadow-2xl overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 p-5 border-b border-indigo-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-wide">
                PHÁT HIỆN BÁO CÁO ĐƯỢC CHIA SẺ
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Báo cáo Tuần {weekNumber}/{year}
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
        <div className="p-6 space-y-5">
          <div className="bg-indigo-950/40 p-3.5 rounded-xl border border-indigo-800/60 text-xs text-indigo-200 flex items-start gap-2.5">
            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Tổ trưởng <strong className="text-white font-bold">{sharedOwnerName || 'Lãnh đạo'}</strong> đã tạo Báo cáo Tuần {weekNumber}/{year} và chia sẻ quyền <strong>CHỈNH SỬA</strong> cho bạn. Bạn vui lòng chọn không gian làm việc bên dưới:
            </p>
          </div>

          {/* CHOICE OPTIONS */}
          <div className="space-y-3">
            
            {/* OPTION 1: SHARED TEAM REPORT */}
            <button
              onClick={onSelectSharedReport}
              className="w-full text-left p-4 rounded-xl border border-indigo-500/50 bg-gradient-to-r from-indigo-950/80 to-slate-900 hover:from-indigo-900/90 hover:to-indigo-950 border-indigo-500/80 shadow-lg cursor-pointer transition-all hover:scale-[1.01] group space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-indigo-200 flex items-center gap-2 group-hover:text-white">
                  <Users className="w-4 h-4 text-indigo-400" />
                  1. Mở Báo cáo Dùng chung của Tổ trưởng
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold">
                  Khuyên dùng
                </span>
              </div>
              <p className="text-xs text-slate-400 group-hover:text-slate-300 leading-relaxed">
                Soạn thảo và phối hợp trực tiếp trên Báo cáo Tuần của Tổ trưởng <strong>{sharedOwnerName}</strong>. Dữ liệu sẽ cập nhật trực tiếp vào báo cáo chung.
              </p>
            </button>

            {/* OPTION 2: PERSONAL REPORT */}
            <button
              onClick={onSelectPersonalReport}
              className="w-full text-left p-4 rounded-xl border border-slate-800 bg-slate-950/80 hover:bg-slate-800 hover:border-slate-700 shadow-md cursor-pointer transition-all hover:scale-[1.01] group space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-slate-200 flex items-center gap-2 group-hover:text-white">
                  <FileEdit className="w-4 h-4 text-blue-400" />
                  2. Tạo Báo cáo Cá nhân độc lập của tôi
                </span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-xs text-slate-400 group-hover:text-slate-300 leading-relaxed">
                Tạo một bản Báo cáo Tuần {weekNumber} cá nhân hoàn toàn riêng biệt. Không ảnh hưởng đến dữ liệu báo cáo dùng chung của Tổ trưởng.
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
