import React from 'react';
import { BarChart3, User, Sun, Moon, Home, FileText, FileSignature } from 'lucide-react';
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
  onOpenUserProfile?: () => void;
  onOpenSignatureSetup?: () => void;
  activeMainTab?: 'dashboard' | 'editor';
  onSelectMainTab?: (tab: 'dashboard' | 'editor') => void;
}

export const Header: React.FC<HeaderProps> = ({
  metadata,
  recentlyCreatedWeek,
  currentUser,
  onSelectReport,
  onOpenUserProfile,
  onOpenSignatureSetup,
  activeMainTab = 'dashboard',
  onSelectMainTab
}) => {
  const isRecentlyCreated = recentlyCreatedWeek && metadata.tuan === recentlyCreatedWeek;
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <header className="sticky top-0 bg-slate-900/95 dark:bg-slate-950/95 text-white px-3 sm:px-5 py-2 flex items-center justify-between shadow-lg z-[100] border-b border-slate-800/80 backdrop-blur-xl transition-colors duration-300">
      
      {/* Brand & Main Navigation Tabs */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl text-white shadow-md shadow-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xs sm:text-sm font-black tracking-wider uppercase leading-tight text-white drop-shadow-xs">
              HỆ THỐNG TẠO BÁO CÁO TUẦN TỰ ĐỘNG
            </h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-tight">
              Nền tảng quản lý hiệu suất công việc chính phủ
            </p>
          </div>
        </div>

        {/* Navigation Switcher: Trang chủ vs Báo cáo tuần */}
        {onSelectMainTab && (
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 backdrop-blur-md">
            <button
              onClick={() => onSelectMainTab('dashboard')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeMainTab === 'dashboard'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Chuyển sang Trang Chủ (Dashboard Thống kê)"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Trang chủ</span>
            </button>

            <button
              onClick={() => onSelectMainTab('editor')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeMainTab === 'editor'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Chuyển sang Bảng Soạn thảo Báo cáo tuần"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Soạn Báo Cáo</span>
            </button>
          </div>
        )}
      </div>

      {/* Weather & Real-time Clock Widget */}
      <WeatherClockWidget />

      {/* Right Controls: Dark Mode, Notifications & User Badge */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Dark Mode Toggle Button */}
        <button
          onClick={toggleDarkMode}
          className="bg-slate-800/80 hover:bg-slate-700 active:scale-95 transition-all p-2 rounded-xl border border-slate-700/80 text-white shadow-xs flex items-center justify-center cursor-pointer"
          title={isDarkMode ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối'}
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4 text-amber-300" />
          ) : (
            <Moon className="w-4 h-4 text-slate-300" />
          )}
        </button>

        {/* Chữ Ký & PIN 6 Số Button */}
        {onOpenSignatureSetup && (
          <button
            onClick={onOpenSignatureSetup}
            className="bg-amber-950/60 hover:bg-amber-900/80 active:scale-95 transition-all px-2.5 py-1.5 rounded-xl border border-amber-600/50 text-amber-300 shadow-xs flex items-center gap-1.5 cursor-pointer text-xs font-bold"
            title="Cài đặt Chữ ký cá nhân tay (PNG) & Mã PIN 6 số xác thực"
          >
            <FileSignature className="w-4 h-4 text-amber-400" />
            <span className="hidden lg:inline">Chữ Ký & PIN</span>
          </button>
        )}

        {/* Notification Bell */}
        {currentUser && (
          <div className="bg-slate-800/80 hover:bg-slate-700 transition-all rounded-xl p-0.5 border border-slate-700/80 shadow-xs">
            <NotificationBell currentUser={currentUser} onSelectReport={onSelectReport} />
          </div>
        )}

        {/* Current User & Report Status Badge */}
        <div
          onClick={onOpenUserProfile}
          title="Click để xem & cập nhật thông tin cá nhân"
          className={`flex items-center gap-2.5 bg-slate-800/80 hover:bg-slate-700/90 active:scale-98 transition-all px-3 py-1 rounded-xl border border-slate-700/80 shadow-xs ${
            onOpenUserProfile ? 'cursor-pointer hover:border-slate-600' : ''
          }`}
        >
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xs tracking-tight text-slate-200">
                Tuần {metadata.tuan}, {metadata.nam}
              </span>
              {isRecentlyCreated && (
                <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-black uppercase tracking-wider rounded-md">
                  Mới
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 font-semibold truncate max-w-[150px]">
              {currentUser ? currentUser.full_name : (metadata.nguoi_lap || 'Cá nhân')}
            </span>
          </div>

          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-xs shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </header>
  );
};
