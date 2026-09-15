import React from 'react';
import { BarChart3, User } from 'lucide-react';
import { ReportMetadata } from '../utils/reportUtils';

interface HeaderProps {
  metadata: ReportMetadata;
  setMetadata: React.Dispatch<React.SetStateAction<ReportMetadata>>;
}

export const Header: React.FC<HeaderProps> = ({ metadata }) => {
  return (
    <header className="sticky top-0 bg-[#005dac] text-white px-6 py-3 flex items-center justify-between shadow-md z-50">
      <div className="flex items-center gap-3">
        <div className="bg-white p-1.5 rounded-lg text-[#005dac] flex items-center justify-center">
          <BarChart3 className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight uppercase">
            HỆ THỐNG TẠO BÁO CÁO TUẦN TỰ ĐỘNG
          </h1>
          <p className="text-xs opacity-85">
            Nền tảng quản lý hiệu suất công việc chính phủ
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white/10 px-4 py-2 rounded-xl border border-white/20 backdrop-blur-sm">
        <div className="flex flex-col items-end">
          <span className="font-semibold text-base">
            Tuần {metadata.tuan}, Năm {metadata.nam}
          </span>
          <span className="text-xs opacity-90">
            Người lập: {metadata.nguoi_lap}
          </span>
        </div>
        <div className="h-9 w-9 rounded-full bg-[#cbe6ff] flex items-center justify-center text-[#005dac] font-bold shadow-sm">
          <User className="w-5 h-5" />
        </div>
      </div>
    </header>
  );
};
