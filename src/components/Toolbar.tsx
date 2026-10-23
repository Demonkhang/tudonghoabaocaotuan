import React, { useState, useRef, useEffect } from 'react';
import {
  RefreshCw,
  RotateCcw,
  FileText,
  FileSpreadsheet,
  Printer,
  Upload,
  History,
  Sparkles,
  User,
  ShieldCheck,
  Save,
  Layout,
  Share2,
  Users,
  ArrowRight,
  Trash2,
  MessageCircle,
  Calendar,
  ChevronDown,
  Sliders,
  Menu,
  X,
  FileDown,
  Zap,
  Download,
  Settings
} from 'lucide-react';
import { ReportMetadata, toInputDate } from '../utils/reportUtils';
import { UserProfile } from './LoginModal';
import { isUserVanThu } from './StandaloneTaskKanbanModal';

interface ToolbarProps {
  metadata: ReportMetadata;
  setMetadata: React.Dispatch<React.SetStateAction<ReportMetadata>>;
  recentlyCreatedWeek?: number | null;
  onSync: () => void;
  onReset: () => void;
  onRestore: () => void;
  syncedAt: string;
  totalTasks: number;
  onGenerateWord: () => void;
  onOpenPreview: () => void;
  onOpenGuide: () => void;
  isLoading: boolean;
  onImportFile: (file: File) => void;
  onExportExcel: () => void;
  onClearAll?: () => void;
  onOpenSendZalo?: () => void;

  currentUser: UserProfile | null;
  userPermission?: 'OWNER' | 'ADMIN' | 'EDIT' | 'VIEW' | 'NO_ACCESS';
  onOpenLogin: () => void;
  onOpenHistory: () => void;
  onOpenCarryOver: () => void;
  onOpenKanbanPlanner?: () => void;
  onOpenStandaloneTaskKanban?: () => void;
  onOpenAdmin: () => void;
  onOpenShare?: () => void;
  onSave: () => void;
  onSwitchToPersonalReport?: () => void;

  reportType?: 'SINGLE' | 'CONSOLIDATED_OFFICE';
  activeTeamCode?: 'VAN_THU' | 'CDS' | 'OFFICE_MASTER';
  onOpenReportChoice?: () => void;
  onSelectTeamCode?: (teamCode: 'VAN_THU' | 'CDS' | 'OFFICE_MASTER') => void;
  onOpenDocInspectionModal?: () => void;
  onOpenApprovalChain?: () => void;
  onOpenDigitalSignature?: () => void;
  onOpenSignatureSetup?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  metadata,
  setMetadata,
  recentlyCreatedWeek,
  onSync,
  onReset,
  onRestore,
  syncedAt,
  totalTasks,
  onGenerateWord,
  onOpenPreview,
  onOpenGuide,
  isLoading,
  onImportFile,
  onExportExcel,
  onClearAll,
  onOpenSendZalo,
  currentUser,
  userPermission = 'OWNER',
  onOpenLogin,
  onOpenHistory,
  onOpenCarryOver,
  onOpenKanbanPlanner,
  onOpenStandaloneTaskKanban,
  onOpenAdmin,
  onOpenShare,
  onSave,
  onSwitchToPersonalReport,
  reportType = 'SINGLE',
  activeTeamCode = 'OFFICE_MASTER',
  onOpenReportChoice,
  onSelectTeamCode,
  onOpenDocInspectionModal,
  onOpenApprovalChain,
  onOpenDigitalSignature,
  onOpenSignatureSetup
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Dropdown States
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isDataMenuOpen, setIsDataMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileMenuTab, setMobileMenuTab] = useState<'actions' | 'export' | 'settings'>('actions');

  const exportMenuRef = useRef<HTMLDivElement>(null);
  const dataMenuRef = useRef<HTMLDivElement>(null);

  const isReadOnly = userPermission === 'VIEW';
  const canShare = (userPermission === 'OWNER' || userPermission === 'ADMIN') && onOpenShare;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
      if (dataMenuRef.current && !dataMenuRef.current.contains(event.target as Node)) {
        setIsDataMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col w-full sticky top-[49px] z-40 shadow-xl border-b border-slate-800/80 bg-slate-900/95 backdrop-blur-xl text-slate-100 transition-all duration-300">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx,.xls,.csv"
        className="hidden"
      />

      {/* BANNER THÔNG BÁO BÁO CÁO DÙNG CHUNG */}
      {userPermission && userPermission !== 'OWNER' && userPermission !== 'ADMIN' && (
        <div className="bg-indigo-950/80 text-indigo-200 px-4 py-1.5 flex items-center justify-between text-xs font-semibold border-b border-indigo-800/50">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="truncate">
              👥 <strong>Báo cáo Dùng chung</strong> của <strong className="text-white">{metadata.nguoi_lap || 'Tổ trưởng'}</strong> (Quyền: <span className="text-amber-300 font-bold">{userPermission === 'EDIT' ? 'CHỈNH SỬA' : 'XEM'}</span>)
            </span>
          </div>

          {onSwitchToPersonalReport && (
            <button
              onClick={onSwitchToPersonalReport}
              className="px-2.5 py-1 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-all border border-indigo-400/40 flex items-center gap-1 shrink-0"
            >
              <span>Báo cáo Cá nhân</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* ================= DESKTOP & TABLET TWO-TIER NAVBAR (MD & LG SCREENS) ================= */}
      <div className="hidden md:flex flex-col px-3 py-1.5 gap-1.5 border-b border-slate-800/60">
        
        {/* ROW 1: NGỮ CẢNH BÁO CÁO & THỜI GIAN (CONTEXT BAR) */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto py-0.5 scrollbar-none">
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Account & Dept Badge */}
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/90 hover:bg-slate-700/90 text-cyan-300 border border-slate-700/80 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 shadow-xs"
              title="Đổi tài khoản / Xem phòng ban"
            >
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>{currentUser ? currentUser.department_code : 'Đăng nhập'}</span>
            </button>

            {currentUser?.role === 'ADMIN' && (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-1 px-2 py-1 bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-800/80 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0"
                title="Quản trị hệ thống"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Quản trị</span>
              </button>
            )}

            <button
              onClick={onOpenHistory}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/70 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0"
              title="Xem danh sách lịch sử báo cáo tuần"
            >
              <History className="w-3.5 h-3.5 text-blue-400" />
              <span>Lịch sử</span>
            </button>

            <div className="h-4 w-px bg-slate-800 mx-0.5 shrink-0" />

            {/* Tuần / Năm Capsule */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-2.5 py-0.5 rounded-lg text-xs shadow-inner shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Tuần</span>
              <select
                value={metadata.tuan}
                onChange={(e) => setMetadata(prev => ({ ...prev, tuan: Number(e.target.value), tuan_tiep: Number(e.target.value) + 1 }))}
                className={`text-xs px-2 py-0.5 rounded-md font-bold cursor-pointer border outline-none ${
                  metadata.tuan === recentlyCreatedWeek
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                    : 'bg-slate-800 text-slate-100 border-slate-700 hover:border-slate-600'
                }`}
              >
                {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
                  <option
                    key={w}
                    value={w}
                    className={w === recentlyCreatedWeek ? 'font-bold text-emerald-400 bg-slate-900' : 'bg-slate-900 text-slate-100'}
                  >
                    {w === recentlyCreatedWeek ? `✨ Tuần ${w} (Mới)` : `Tuần ${w}`}
                  </option>
                ))}
              </select>

              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight ml-1">Năm</span>
              <select
                value={metadata.nam}
                onChange={(e) => setMetadata(prev => ({ ...prev, nam: Number(e.target.value) }))}
                className="bg-slate-800 border border-slate-700 rounded-md text-xs px-1.5 py-0.5 font-bold text-slate-100 cursor-pointer"
              >
                <option value={2024}>2024</option>
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>

              <div className="h-3 w-px bg-slate-800 mx-0.5" />

              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={toInputDate(metadata.ngay_lap)}
                onChange={(e) => setMetadata(prev => ({ ...prev, ngay_lap: e.target.value }))}
                className="bg-slate-800 border border-slate-700 rounded-md text-xs px-1.5 py-0.5 font-semibold text-slate-100 cursor-pointer"
              />

              <div className="h-3 w-px bg-slate-800 mx-0.5" />

              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Lập bởi:</span>
              <input
                type="text"
                value={metadata.nguoi_lap || ''}
                onChange={(e) => setMetadata(prev => ({ ...prev, nguoi_lap: e.target.value }))}
                className="bg-slate-800 border border-slate-700 rounded-md text-xs px-2 py-0.5 font-semibold text-slate-100 w-28 focus:w-36 transition-all"
                placeholder="Tên người lập..."
              />
            </div>
          </div>

          {/* Form Switcher & Team Switcher */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenReportChoice && (
              <button
                onClick={onOpenReportChoice}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer shadow-xs ${
                  reportType === 'CONSOLIDATED_OFFICE'
                    ? 'bg-emerald-950/90 text-emerald-200 border-emerald-600/80 hover:bg-emerald-900'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
                title="Đổi loại Form Báo cáo (Đơn cá nhân / Tổng hợp NĐ30)"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>{reportType === 'CONSOLIDATED_OFFICE' ? 'Form NĐ30 (Đa Tổ)' : 'Form Đơn Core'}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            )}

            {reportType === 'CONSOLIDATED_OFFICE' && onSelectTeamCode && (
              <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 border border-slate-800 rounded-lg">
                <button
                  onClick={() => onSelectTeamCode('VAN_THU')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    activeTeamCode === 'VAN_THU' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tổ Văn thư
                </button>
                <button
                  onClick={() => onSelectTeamCode('CDS')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    activeTeamCode === 'CDS' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tổ CĐS
                </button>
                <button
                  onClick={() => onSelectTeamCode('OFFICE_MASTER')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    activeTeamCode === 'OFFICE_MASTER' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Master
                </button>
              </div>
            )}

            {reportType === 'CONSOLIDATED_OFFICE' && onOpenDocInspectionModal && (
              <button
                onClick={onOpenDocInspectionModal}
                className="flex items-center gap-1 px-2.5 py-1 bg-amber-950/80 hover:bg-amber-900 border border-amber-700/80 text-amber-200 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0"
                title="Cấu hình Mục III & Chữ ký"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>Mục III &amp; Chữ ký</span>
              </button>
            )}
          </div>
        </div>

        {/* ROW 2: ACTION BUTTONS & UTILITIES (PRIMARY ACTIONS) */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/50">
          
          {/* Left Action Group */}
          <div className="flex items-center gap-2 shrink-0">
            {/* SAVE BUTTON */}
            <button
              onClick={onSave}
              disabled={isLoading || isReadOnly}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-950/60 transition-all cursor-pointer active:scale-95 disabled:opacity-40"
            >
              <Save className="w-3.5 h-3.5 text-emerald-100" />
              <span>Lưu Báo Cáo</span>
            </button>

            {/* KHO PHÂN CẤP */}
            {onOpenStandaloneTaskKanban && (
              <button
                onClick={onOpenStandaloneTaskKanban}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl text-xs font-extrabold shadow-md shadow-purple-950/60 transition-all cursor-pointer active:scale-95"
                title="Kho Nhiệm Vụ Chung & Điều Hành Phân Cấp"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                <span>Kho Nhiệm Vụ Phân Cấp</span>
              </button>
            )}

            {/* KANBAN & KẾ THỪA */}
            {onOpenKanbanPlanner && (
              <button
                onClick={onOpenKanbanPlanner}
                disabled={isReadOnly}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-800 text-purple-200 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-40"
                title="Giao diện Kanban tuần"
              >
                <Layout className="w-3.5 h-3.5 text-purple-300" />
                <span>Kanban Tuần</span>
              </button>
            )}

            <button
              onClick={onOpenCarryOver}
              disabled={isReadOnly}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-800 text-amber-200 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-40"
              title="Kế thừa & Khởi tạo Nhiệm vụ Thường xuyên & Dở dang sang Tuần tiếp theo"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>Kế thừa Tuần mới</span>
            </button>

            {/* TRÌNH DUYỆT BÁO CÁO */}
            {onOpenApprovalChain && (
              <button
                onClick={onOpenApprovalChain}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer active:scale-95"
                title="Trình nộp báo cáo cho Lãnh đạo / Người duyệt"
              >
                <ArrowRight className="w-3.5 h-3.5 text-blue-200" />
                <span>Trình Duyệt</span>
              </button>
            )}

            {/* KÝ SỐ & PHÊ DUYỆT */}
            {onOpenDigitalSignature && (
              <button
                onClick={onOpenDigitalSignature}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-950/50 transition-all cursor-pointer active:scale-95 border border-emerald-400/30"
                title="Ký số xác thực bằng Mã PIN 6 số & đóng dấu điện tử"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
                <span>Ký Số &amp; Phê Duyệt</span>
              </button>
            )}
          </div>

          {/* Right Action Dropdowns */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* ZALO & SHARE */}
            {canShare && (
              <button
                onClick={onOpenShare}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
                title="Chia sẻ báo cáo"
              >
                <Share2 className="w-3.5 h-3.5 text-indigo-200" />
                <span className="hidden xl:inline">Chia sẻ</span>
              </button>
            )}

            {onOpenSendZalo && (
              <button
                onClick={onOpenSendZalo}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0068ff] hover:bg-[#0052cc] text-white rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
                title="Gửi báo cáo qua Zalo"
              >
                <MessageCircle className="w-3.5 h-3.5 text-blue-100" />
                <span className="hidden xl:inline">Zalo</span>
              </button>
            )}

            {/* DROPDOWN TẠO & XUẤT BÁO CÁO */}
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-amber-300 border border-slate-700 rounded-xl text-xs font-extrabold shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Tạo &amp; Xuất Báo Cáo</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 text-slate-200 text-xs animate-in fade-in duration-150">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">
                    Định Dạng Báo Cáo &amp; Xuất File
                  </div>

                  <button
                    onClick={() => { setIsExportMenuOpen(false); onOpenPreview(); }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 font-medium text-slate-100 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>Xem Trước Báo Cáo (NĐ 30)</span>
                  </button>

                  <button
                    onClick={() => { setIsExportMenuOpen(false); onGenerateWord(); }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 font-medium text-blue-300 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                    <span>Tải File Word (.docx)</span>
                  </button>

                  <button
                    onClick={() => { setIsExportMenuOpen(false); onExportExcel(); }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 font-medium text-emerald-300 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Xuất File Excel (.xlsx)</span>
                  </button>

                  <button
                    onClick={() => { setIsExportMenuOpen(false); onOpenPreview(); }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 font-medium text-rose-300 cursor-pointer"
                  >
                    <FileDown className="w-4 h-4 text-rose-400" />
                    <span>Xuất File PDF</span>
                  </button>

                  <button
                    onClick={() => { setIsExportMenuOpen(false); onOpenPreview(); }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 font-medium text-slate-300 cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-slate-400" />
                    <span>In Báo Cáo Trực Tiếp</span>
                  </button>
                </div>
              )}
            </div>

            {/* DROPDOWN TIỆN ÍCH DỮ LIỆU */}
            <div className="relative" ref={dataMenuRef}>
              <button
                onClick={() => setIsDataMenuOpen(!isDataMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
                title="Tiện ích & Quản lý dữ liệu"
              >
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                <span>Tiện Ích ▾</span>
              </button>

              {isDataMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 text-slate-200 text-xs animate-in fade-in duration-150">
                  {isUserVanThu(currentUser) && (
                    <button
                      onClick={() => { setIsDataMenuOpen(false); fileInputRef.current?.click(); }}
                      disabled={isReadOnly}
                      className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 font-medium text-blue-300 disabled:opacity-40 cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-blue-400" />
                      <span>Import Excel (.xlsx)</span>
                    </button>
                  )}

                  <button
                    onClick={() => { setIsDataMenuOpen(false); onSync(); }}
                    disabled={isLoading}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 font-medium text-emerald-300 cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 text-emerald-400 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Đồng Bộ CSDL</span>
                  </button>

                  <button
                    onClick={() => { setIsDataMenuOpen(false); onRestore(); }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 font-medium text-amber-300 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 text-amber-400" />
                    <span>Khôi Phục Ban Đầu</span>
                  </button>

                  {onClearAll && (
                    <button
                      onClick={() => { setIsDataMenuOpen(false); onClearAll(); }}
                      disabled={isReadOnly}
                      className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 font-medium text-rose-400 border-t border-slate-800 mt-1 pt-2 disabled:opacity-40 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                      <span>Xóa Tất Cả Nhiệm Vụ</span>
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* ================= MOBILE RESPONSIVE NAVBAR (SM SCREENS < 768px) ================= */}
      <div className="md:hidden px-3 py-2 flex flex-col gap-2">
        {/* ROW 1 MOBILE: Quick Controls */}
        <div className="flex items-center justify-between gap-2">
          {/* User Badge */}
          <button
            onClick={onOpenLogin}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 text-cyan-300 border border-slate-700 rounded-lg text-xs font-bold truncate max-w-[120px]"
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{currentUser ? currentUser.department_code : 'Tài khoản'}</span>
          </button>

          {/* Quick Select Week */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg text-xs">
            <span className="text-[10px] text-slate-400 font-bold">Tuần</span>
            <select
              value={metadata.tuan}
              onChange={(e) => setMetadata(prev => ({ ...prev, tuan: Number(e.target.value), tuan_tiep: Number(e.target.value) + 1 }))}
              className="bg-slate-800 text-slate-100 font-bold rounded px-1 text-xs border border-slate-700"
            >
              {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>T{w}</option>
              ))}
            </select>
          </div>

          {/* Save Button */}
          <button
            onClick={onSave}
            disabled={isLoading || isReadOnly}
            className="flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-xs active:scale-95 disabled:opacity-40"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Lưu</span>
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* COLLAPSIBLE STREAMLINED MOBILE MENU DRAWER */}
        {isMobileMenuOpen && (
          <div className="bg-slate-950/95 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-2.5 sm:p-3 space-y-2.5 shadow-2xl animate-in slide-in-from-top-2 duration-200">
            {/* 1. Quick Team Switcher (when NĐ30) */}
            {reportType === 'CONSOLIDATED_OFFICE' && onSelectTeamCode && (
              <div className="flex items-center gap-1 bg-slate-900/90 p-1 border border-slate-800 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 px-1.5 uppercase tracking-wider">Tổ:</span>
                <button
                  type="button"
                  onClick={() => onSelectTeamCode('VAN_THU')}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all text-center ${
                    activeTeamCode === 'VAN_THU' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Văn thư
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTeamCode('CDS')}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all text-center ${
                    activeTeamCode === 'CDS' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  CĐS
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTeamCode('OFFICE_MASTER')}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all text-center ${
                    activeTeamCode === 'OFFICE_MASTER' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Master
                </button>
              </div>
            )}

            {/* 2. Sleek Segmented Control Tabs */}
            <div className="grid grid-cols-3 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs gap-1">
              <button
                type="button"
                onClick={() => setMobileMenuTab('actions')}
                className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                  mobileMenuTab === 'actions'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Tác Vụ</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuTab('export')}
                className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                  mobileMenuTab === 'export'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất & Xem</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuTab('settings')}
                className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                  mobileMenuTab === 'settings'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Thiết Lập</span>
              </button>
            </div>

            {/* 3. Tab Contents */}
            {/* TAB 1: TÁC VỤ */}
            {mobileMenuTab === 'actions' && (
              <div className="space-y-2 animate-in fade-in-50 duration-150">
                {onOpenStandaloneTaskKanban && (
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); onOpenStandaloneTaskKanban(); }}
                    className="w-full py-2 px-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-bold text-xs flex items-center justify-between shadow-md active:scale-98 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                      <span>Kho Nhiệm Vụ Phân Cấp</span>
                    </div>
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-medium">Khám phá</span>
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {onOpenApprovalChain && (
                    <button
                      onClick={() => { setIsMobileMenuOpen(false); onOpenApprovalChain(); }}
                      className="py-2.5 px-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-xl font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    >
                      <ArrowRight className="w-4 h-4 text-blue-400" />
                      <span>Trình Duyệt</span>
                    </button>
                  )}

                  {onOpenDigitalSignature && (
                    <button
                      onClick={() => { setIsMobileMenuOpen(false); onOpenDigitalSignature(); }}
                      className="py-2.5 px-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Ký Số & Duyệt</span>
                    </button>
                  )}

                  {onOpenKanbanPlanner && (
                    <button
                      onClick={() => { setIsMobileMenuOpen(false); onOpenKanbanPlanner(); }}
                      className="py-2.5 px-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-xl font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Layout className="w-4 h-4 text-purple-400" />
                      <span>Kanban Tuần</span>
                    </button>
                  )}

                  <button
                    onClick={() => { setIsMobileMenuOpen(false); onOpenCarryOver(); }}
                    className="py-2.5 px-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-xl font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <RotateCcw className="w-4 h-4 text-amber-400" />
                    <span>Kế Thừa Tuần</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: XUẤT & XEM */}
            {mobileMenuTab === 'export' && (
              <div className="space-y-2 animate-in fade-in-50 duration-150">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); onOpenPreview(); }}
                    className="py-2.5 px-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>Xem Báo Cáo</span>
                  </button>

                  <button
                    onClick={() => { setIsMobileMenuOpen(false); onGenerateWord(); }}
                    className="py-2.5 px-2 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 rounded-xl font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                    <span>Xuất Word (.docx)</span>
                  </button>

                  <button
                    onClick={() => { setIsMobileMenuOpen(false); onExportExcel(); }}
                    className="py-2.5 px-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-xl font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Xuất Excel (.xlsx)</span>
                  </button>

                  <button
                    onClick={() => { setIsMobileMenuOpen(false); onSync(); }}
                    className="py-2.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <RefreshCw className="w-4 h-4 text-cyan-400" />
                    <span>Đồng Bộ CSDL</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); onOpenHistory(); }}
                    className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    <History className="w-3.5 h-3.5 text-blue-400" />
                    <span>Lịch sử phiên bản</span>
                  </button>

                  {canShare && (
                    <button
                      onClick={() => { setIsMobileMenuOpen(false); onOpenShare(); }}
                      className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Chia sẻ liên kết</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: THIẾT LẬP */}
            {mobileMenuTab === 'settings' && (
              <div className="space-y-2.5 text-xs animate-in fade-in-50 duration-150">
                {/* Form Switcher */}
                {onOpenReportChoice && (
                  <div className="flex items-center justify-between bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-[11px] font-medium text-slate-300 block">Biểu mẫu báo cáo</span>
                      <span className="text-[10px] text-slate-500">
                        {reportType === 'CONSOLIDATED_OFFICE' ? 'Báo cáo hợp nhất NĐ30' : 'Báo cáo đơn vị/cá nhân'}
                      </span>
                    </div>
                    <button
                      onClick={() => { setIsMobileMenuOpen(false); onOpenReportChoice(); }}
                      className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1 active:scale-95"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span>Đổi mẫu</span>
                    </button>
                  </div>
                )}

                {/* Mục III Thể thức & Chữ ký */}
                {reportType === 'CONSOLIDATED_OFFICE' && onOpenDocInspectionModal && (
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); onOpenDocInspectionModal(); }}
                    className="w-full py-2 px-2.5 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-700/60 text-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    <span>Mục III Thể Thức & Chữ Ký NĐ30</span>
                  </button>
                )}

                {/* Ngày lập & Người lập */}
                <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">Ngày lập</label>
                    <input
                      type="date"
                      value={toInputDate(metadata.ngay_lap)}
                      onChange={(e) => setMetadata(prev => ({ ...prev, ngay_lap: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-100 text-xs focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">Người lập</label>
                    <input
                      type="text"
                      value={metadata.nguoi_lap || ''}
                      onChange={(e) => setMetadata(prev => ({ ...prev, nguoi_lap: e.target.value }))}
                      placeholder="Nhập họ tên..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-100 text-xs focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                {/* Xóa tất cả */}
                {onClearAll && (
                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => { setIsMobileMenuOpen(false); onClearAll(); }}
                      className="flex items-center gap-1 px-2.5 py-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-rose-900/50 rounded-lg text-[11px] font-medium transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Xóa trắng dữ liệu tuần</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
