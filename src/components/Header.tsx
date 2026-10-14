import React, { useState, useRef, useEffect } from 'react';
import { BarChart3, User, Sun, Moon, Home, FileText, FileSignature, GitFork, LogOut, UserCheck, RefreshCw, ChevronDown, KeyRound, ShieldCheck } from 'lucide-react';
import { ReportMetadata } from '../utils/reportUtils';
import { NotificationBell } from './NotificationBell';
import { WeatherClockWidget } from './WeatherClockWidget';
import { useDarkMode } from '../hooks/useDarkMode';

interface HeaderProps {
  metadata: ReportMetadata;
  setMetadata: React.Dispatch<React.SetStateAction<ReportMetadata>>;
  recentlyCreatedWeek?: number | null;
  currentUser?: { id: string; username: string; full_name: string; role?: string; department_name?: string } | null;
  onSelectReport?: (reportId: string) => void;
  onOpenUserProfile?: () => void;
  onOpenSignatureSetup?: () => void;
  onOpenTaskTree?: () => void;
  activeMainTab?: 'dashboard' | 'editor';
  onSelectMainTab?: (tab: 'dashboard' | 'editor') => void;
  onOpenLogin?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  metadata,
  recentlyCreatedWeek,
  currentUser,
  onSelectReport,
  onOpenUserProfile,
  onOpenSignatureSetup,
  onOpenTaskTree,
  activeMainTab = 'dashboard',
  onSelectMainTab,
  onOpenLogin,
  onLogout
}) => {
  const isRecentlyCreated = recentlyCreatedWeek && metadata.tuan === recentlyCreatedWeek;
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

        {/* Navigation Switcher: Trang chủ vs Soạn báo cáo vs Cây Nhiệm Vụ */}
        {onSelectMainTab && (
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 backdrop-blur-md gap-1">
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

            {onOpenTaskTree && (
              <button
                onClick={onOpenTaskTree}
                className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white shadow-md border border-cyan-400/40 cursor-pointer active:scale-95"
                title="Mở Sơ Đồ Cây Nhiệm Vụ Phân Cấp"
              >
                <GitFork className="w-3.5 h-3.5 text-cyan-200" />
                <span>🌳 Cây Nhiệm Vụ</span>
              </button>
            )}
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

        {/* Current User & Login/Account Switcher Dropdown */}
        <div className="relative" ref={userMenuRef}>
          {currentUser ? (
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(prev => !prev)}
              className="flex items-center gap-2 bg-gradient-to-r from-slate-800/90 to-slate-900/90 hover:from-slate-800 hover:to-slate-800 active:scale-98 transition-all px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-md cursor-pointer group"
              title="Click để mở menu quản lý tài khoản & đăng xuất"
            >
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs tracking-tight text-slate-100 group-hover:text-purple-300 transition-colors">
                    {currentUser.full_name}
                  </span>
                  {isRecentlyCreated && (
                    <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-black uppercase tracking-wider rounded-md">
                      Mới
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[140px]">
                  {currentUser.department_name || metadata.don_vi || 'Cán bộ'}
                </span>
              </div>

              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-xs shrink-0 group-hover:ring-2 group-hover:ring-purple-400/50 transition-all">
                <User className="w-4 h-4 text-white" />
              </div>

              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180 text-purple-400' : ''}`} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenLogin}
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black px-3.5 py-1.5 rounded-xl border border-blue-400/40 shadow-lg shadow-blue-900/40 text-xs flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
              title="Click để Đăng Nhập / Chọn Tài Khoản"
            >
              <UserCheck className="w-4 h-4 text-cyan-200" />
              <span>🔑 Đăng Nhập / Chọn Tài Khoản</span>
            </button>
          )}

          {/* USER ACCOUNT PROFILE DROPDOWN MENU */}
          {isUserMenuOpen && currentUser && (
            <div className="absolute right-0 mt-2 w-72 bg-slate-900/95 border border-purple-500/40 rounded-2xl shadow-2xl backdrop-blur-xl p-2.5 text-slate-100 z-[120] animate-fadeIn flex flex-col gap-1">
              {/* User Header Info Card */}
              <div className="p-3 bg-gradient-to-br from-slate-950 to-slate-900 rounded-xl border border-slate-800 flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 border border-purple-400/50 flex items-center justify-center text-white font-bold shrink-0 shadow-md">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="overflow-hidden">
                  <h4 className="font-extrabold text-sm text-white truncate">
                    {currentUser.full_name}
                  </h4>
                  <p className="text-[11px] text-purple-300 font-semibold truncate">
                    {currentUser.department_name || 'VĂN PHÒNG BAN QUẢN LÝ'}
                  </p>
                  <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700/80 inline-block mt-0.5">
                    Mã: {currentUser.username}
                  </span>
                </div>
              </div>

              {/* Action 1: Hồ sơ cá nhân */}
              {onOpenUserProfile && (
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenUserProfile();
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition-all text-left cursor-pointer group"
                >
                  <div className="w-6 h-6 rounded-lg bg-blue-950/80 border border-blue-800 text-blue-300 flex items-center justify-center shrink-0 group-hover:bg-blue-900">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <span>👤 Thông Tin Cá Nhân</span>
                </button>
              )}

              {/* Action 2: Chữ Ký & PIN */}
              {onOpenSignatureSetup && (
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenSignatureSetup();
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition-all text-left cursor-pointer group"
                >
                  <div className="w-6 h-6 rounded-lg bg-amber-950/80 border border-amber-800 text-amber-300 flex items-center justify-center shrink-0 group-hover:bg-amber-900">
                    <FileSignature className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <span>✍️ Cài Đặt Chữ Ký Tay & PIN</span>
                </button>
              )}

              {/* Action 3: Đổi Tài Khoản */}
              {onOpenLogin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenLogin();
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold text-purple-200 hover:bg-purple-950/60 hover:text-purple-100 flex items-center gap-2.5 transition-all text-left cursor-pointer group"
                >
                  <div className="w-6 h-6 rounded-lg bg-purple-950/80 border border-purple-800 text-purple-300 flex items-center justify-center shrink-0 group-hover:bg-purple-900">
                    <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <span>🔄 Đổi Tài Khoản / Chọn Cấp Bậc</span>
                </button>
              )}

              <div className="h-px bg-slate-800 my-1" />

              {/* Action 4: Đăng xuất */}
              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold text-rose-300 hover:bg-rose-950/60 hover:text-rose-100 flex items-center gap-2.5 transition-all text-left cursor-pointer group"
                >
                  <div className="w-6 h-6 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 flex items-center justify-center shrink-0 group-hover:bg-rose-900">
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  </div>
                  <span>🚪 Đăng Xuất Khỏi Hệ Thống</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
