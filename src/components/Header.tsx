import React from 'react';
import { BarChart3, User } from 'lucide-react';
import { ReportMetadata } from '../utils/reportUtils';
import { NotificationBell } from './NotificationBell';

interface HeaderProps {
  metadata: ReportMetadata;
  setMetadata: React.Dispatch<React.SetStateAction<ReportMetadata>>;
  recentlyCreatedWeek?: number | null;
  currentUser?: { id: string; username: string; full_name: string } | null;
  onSelectReport?: (reportId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ metadata, recentlyCreatedWeek, currentUser, onSelectReport }) => {
  const isRecentlyCreated = recentlyCreatedWeek && metadata.tuan === recentlyCreatedWeek;

  return (
    <header className="sticky top-0 bg-[#005dac] text-white px-6 py-3 flex items-center justify-between shadow-md z-40">
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

      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        {currentUser && (
          <div className="bg-white/10 rounded-xl p-0.5 border border-white/20">
            <NotificationBell currentUser={currentUser} onSelectReport={onSelectReport} />
          </div>
        )}

        <div className="flex items-center gap-4 bg-white/10 px-4 py-2 rounded-xl border border-white/20 backdrop-blur-sm">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-base">
                Tuần {metadata.tuan}, Năm {metadata.nam}
              </span>
              {isRecentlyCreated && (
                <span className="px-2 py-0.5 bg-amber-400 text-slate-900 text-[10px] font-extrabold rounded-full shadow-sm animate-pulse-subtle">
                  ✨ Mới khởi tạo
                </span>
              )}
            </div>
            <span className="text-xs opacity-90">
              Người lập: {metadata.nguoi_lap}
            </span>
          </div>
          <div className="h-9 w-9 rounded-full bg-[#cbe6ff] flex items-center justify-center text-[#005dac] font-bold shadow-sm">
            <User className="w-5 h-5" />
          </div>
        </div>
      </div>
    </header>
  );
};
