import React from 'react';
import { BarChart3, User, Sun, Moon } from 'lucide-react';
import { ReportMetadata } from '../utils/reportUtils';
import { NotificationBell } from './NotificationBell';
import { WeatherClockWidget } from './WeatherClockWidget';
import { useDarkMode } from '../hooks/useDarkMode';

interface HeaderProps {
  metadata: ReportMetadata;
  setMetadata: React.Dispatch<React.SetStateAction<ReportMetadata>>;
  recentlyCreatedWeek?: number | null;
  currentUser?: { id: string; username: string; full_name: string } | null;
  onSelectReport?: (reportId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ metadata, recentlyCreatedWeek, currentUser, onSelectReport }) => {
  const isRecentlyCreated = recentlyCreatedWeek && metadata.tuan === recentlyCreatedWeek;
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <header className="sticky top-0 bg-gradient-to-r from-[#004b8c] via-[#005dac] to-[#006bbd] dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 text-white px-6 py-2.5 flex items-center justify-between shadow-lg z-[100] border-b border-white/10 dark:border-slate-800 transition-colors duration-300">
      {/* Brand & System Title */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-slate-700 p-2 rounded-xl text-[#005dac] dark:text-blue-400 shadow-md border border-white/40 dark:border-slate-600 flex items-center justify-center">
          <BarChart3 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg font-black tracking-tight uppercase leading-tight text-white drop-shadow-xs">
            HỆ THỐNG TẠO BÁO CÁO TUẦN TỰ ĐỘNG
          </h1>
          <p className="text-[11px] text-blue-100/90 dark:text-slate-300 font-medium">
            Nền tảng quản lý hiệu suất công việc chính phủ
          </p>
        </div>
      </div>

      {/* Middle: Weather & Real-time Clock Widget */}
      <WeatherClockWidget />

      {/* Right Controls: Dark Mode Toggle, Notifications & User Profile */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Dark Mode Toggle Button */}
        <button
          onClick={toggleDarkMode}
          className="bg-white/10 hover:bg-white/20 dark:bg-slate-700/50 dark:hover:bg-slate-700 active:scale-95 transition-all p-2 rounded-xl border border-white/20 dark:border-slate-600 backdrop-blur-md text-white shadow-xs flex items-center justify-center group"
          title={isDarkMode ? 'Chuyển sang Giao diện Sáng (Light Mode)' : 'Chuyển sang Giao diện Tối (Dark Mode)'}
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5 text-amber-300 group-hover:rotate-45 transition-transform" />
          ) : (
            <Moon className="w-5 h-5 text-slate-100 group-hover:-rotate-12 transition-transform" />
          )}
        </button>

        {/* Notification Bell */}
        {currentUser && (
          <div className="bg-white/10 hover:bg-white/15 dark:bg-slate-700/50 transition-all rounded-xl p-0.5 border border-white/20 dark:border-slate-600 backdrop-blur-sm shadow-xs">
            <NotificationBell currentUser={currentUser} onSelectReport={onSelectReport} />
          </div>
        )}

        {/* Current User & Report Status Badge */}
        <div className="flex items-center gap-3 bg-white/10 hover:bg-white/15 dark:bg-slate-700/50 transition-all px-3.5 py-1.5 rounded-xl border border-white/20 dark:border-slate-600 backdrop-blur-md shadow-xs">
          <div className="flex flex-col items-end leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-tight text-white">
                Tuần {metadata.tuan}, Năm {metadata.nam}
              </span>
              {isRecentlyCreated && (
                <span className="px-2 py-0.5 bg-amber-400 text-slate-900 text-[9px] font-black uppercase tracking-wider rounded-full shadow-xs animate-pulse">
                  Mới khởi tạo
                </span>
              )}
            </div>
            <span className="text-[11px] text-blue-100 dark:text-slate-300 font-semibold opacity-95 truncate max-w-[180px]">
              {currentUser ? currentUser.full_name : (metadata.nguoi_lap || 'Cá nhân')}
            </span>
          </div>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-white to-[#cbe6ff] dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-[#005dac] dark:text-blue-400 font-bold shadow-sm border border-white/60 dark:border-slate-600 shrink-0">
            <User className="w-4 h-4 text-[#005dac] dark:text-blue-400" />
          </div>
        </div>
      </div>
    </header>
  );
};

