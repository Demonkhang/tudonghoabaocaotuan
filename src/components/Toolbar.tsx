import React, { useRef } from 'react';
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
  Eye,
  Users,
  ArrowRight,
  Trash2,
  MessageCircle,
  Calendar,
  Clock,
  MoreVertical
} from 'lucide-react';
import { ReportMetadata, toInputDate } from '../utils/reportUtils';
import { UserProfile } from './LoginModal';

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
  onOpenAdmin: () => void;
  onOpenShare?: () => void;
  onSave: () => void;
  onSwitchToPersonalReport?: () => void;
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
  onOpenAdmin,
  onOpenShare,
  onSave,
  onSwitchToPersonalReport
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isReadOnly = userPermission === 'VIEW';
  const canShare = (userPermission === 'OWNER' || userPermission === 'ADMIN') && onOpenShare;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col w-full sticky top-[57px] z-40 shadow-xs border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
      {/* BANNER THÔNG BÁO BÁO CÁO DÙNG CHUNG */}
      {userPermission && userPermission !== 'OWNER' && userPermission !== 'ADMIN' && (
        <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 text-indigo-100 px-5 py-2 flex items-center justify-between text-xs font-semibold border-b border-indigo-800/80 shadow-inner">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              👥 Bạn đang làm việc trên <strong>Báo cáo Dùng chung</strong> do <strong className="text-white">{metadata.nguoi_lap || 'Tổ trưởng'}</strong> khởi tạo (Quyền: <span className="text-amber-300 font-bold">{userPermission === 'EDIT' ? 'CHỈNH SỬA' : 'XEM'}</span>)
            </span>
          </div>

          {onSwitchToPersonalReport && (
            <button
              onClick={onSwitchToPersonalReport}
              className="px-3 py-1 bg-indigo-600/70 hover:bg-indigo-600 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-all border border-indigo-400/40 flex items-center gap-1.5 shadow-xs"
            >
              <span>📝 Chuyển sang Báo cáo Cá nhân</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* THANH CÔNG CỤ CHÍNH TINH GỌN (MAIN TOOLBAR BAR) */}
      <nav className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-slate-800 dark:text-slate-200">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xlsx,.xls,.csv"
          className="hidden"
        />

        {/* ================= KHỐI BÊN TRÁI: NGỮ CẢNH BÁO CÁO (REPORT CONTEXT) ================= */}
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          {/* Nút Tài Khoản / Phòng Ban */}
          <button
            onClick={onOpenLogin}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-[#005dac] dark:text-blue-400 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 active:scale-95"
            title="Đổi tài khoản / Xem phòng ban"
          >
            <User className="w-3.5 h-3.5 text-[#005dac] dark:text-blue-400" />
            <span>{currentUser ? currentUser.department_code : 'Đăng nhập'}</span>
          </button>

          {/* Admin Portal (Nếu là Admin) */}
          {currentUser?.role === 'ADMIN' && (
            <button
              onClick={onOpenAdmin}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
              title="Quản trị hệ thống"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Quản trị</span>
            </button>
          )}

          {/* Lịch sử Báo báo */}
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 dark:bg-blue-950/50 hover:bg-blue-600/20 text-[#005dac] dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0"
            title="Xem danh sách lịch sử báo cáo tuần trước"
          >
            <History className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Lịch sử</span>
          </button>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5 shrink-0" />

          {/* CAPSULE CHỌN TUẦN / NĂM / NGÀY / NGƯỜI LẬP TINH GỌN */}
          <div className="flex items-center gap-2 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-xl text-xs shadow-2xs shrink-0">
            {/* Chọn Tuần */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Tuần</span>
              <select
                value={metadata.tuan}
                onChange={(e) => setMetadata(prev => ({ ...prev, tuan: Number(e.target.value), tuan_tiep: Number(e.target.value) + 1 }))}
                className={`text-xs px-2 py-0.5 rounded-lg font-bold cursor-pointer transition-all border outline-hidden ${
                  metadata.tuan === recentlyCreatedWeek
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-2xs'
                    : 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600 hover:border-slate-400'
                }`}
              >
                {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
                  <option
                    key={w}
                    value={w}
                    className={w === recentlyCreatedWeek ? 'font-bold text-emerald-600 bg-emerald-50 dark:bg-slate-800 dark:text-emerald-400' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100'}
                  >
                    {w === recentlyCreatedWeek ? `✨ Tuần ${w} (Mới tạo)` : `Tuần ${w}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Chọn Năm */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Năm</span>
              <select
                value={metadata.nam}
                onChange={(e) => setMetadata(prev => ({ ...prev, nam: Number(e.target.value) }))}
                className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs px-1.5 py-0.5 font-bold text-slate-900 dark:text-slate-100 cursor-pointer"
              >
                <option value={2024}>2024</option>
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>

            <div className="h-3.5 w-px bg-slate-300 dark:bg-slate-700" />

            {/* Ngày Lập */}
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={toInputDate(metadata.ngay_lap)}
                onChange={(e) => setMetadata(prev => ({ ...prev, ngay_lap: e.target.value }))}
                className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs px-1.5 py-0.5 font-semibold text-slate-900 dark:text-slate-100 cursor-pointer"
                title="Chọn ngày lập báo cáo"
              />
            </div>

            <div className="h-3.5 w-px bg-slate-300 dark:bg-slate-700" />

            {/* Người Lập */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Lập bởi:</span>
              <input
                type="text"
                value={metadata.nguoi_lap || ''}
                onChange={(e) => setMetadata(prev => ({ ...prev, nguoi_lap: e.target.value }))}
                className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs px-2 py-0.5 font-semibold text-slate-900 dark:text-slate-100 w-28 focus:w-36 transition-all"
                placeholder="Nhập tên..."
              />
            </div>
          </div>
        </div>

        {/* ================= KHỐI BÊN PHẢI: CÁC NÚT THAO TÁC (ACTIONS & TOOLS) ================= */}
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          {/* LƯU BÁO CÁO (PRIMARY ACTION) */}
          <button
            onClick={onSave}
            disabled={isLoading || isReadOnly}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-40 shrink-0"
            title={isReadOnly ? 'Chỉ có quyền xem' : 'Lưu tất cả thay đổi vào CSDL'}
          >
            <Save className="w-3.5 h-3.5 text-emerald-100" />
            <span>Lưu Báo Cáo</span>
          </button>

          {/* CHIA SẺ BÁO CÁO */}
          {canShare && (
            <button
              onClick={onOpenShare}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer active:scale-95 shrink-0"
              title="Chia sẻ báo cáo với đồng nghiệp"
            >
              <Share2 className="w-3.5 h-3.5 text-indigo-200" />
              <span>Chia sẻ</span>
            </button>
          )}

          {/* GỬI ZALO */}
          {onOpenSendZalo && (
            <button
              onClick={onOpenSendZalo}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0068ff] hover:bg-[#0052cc] text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer active:scale-95 shrink-0"
              title="Gửi Báo Cáo qua Zalo"
            >
              <MessageCircle className="w-3.5 h-3.5 text-blue-100" />
              <span>Gửi Zalo</span>
            </button>
          )}

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5 shrink-0" />

          {/* NHÓM TÍNH NĂNG THÔNG MINH (KẾ THỪA & KANBAN) */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onOpenCarryOver}
              disabled={isReadOnly}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer active:scale-95 disabled:opacity-40"
              title="Kế thừa việc dở dang sang tuần tiếp theo"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-100" />
              <span>Kế thừa</span>
            </button>

            {onOpenKanbanPlanner && (
              <button
                onClick={onOpenKanbanPlanner}
                disabled={isReadOnly}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer active:scale-95 disabled:opacity-40"
                title="Giao diện Kanban kéo thả"
              >
                <Layout className="w-3.5 h-3.5 text-purple-200" />
                <span>Kanban</span>
              </button>
            )}
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5 shrink-0" />

          {/* NHÓM DỮ LIỆU & EXCEL (DATA UTILITIES) */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isReadOnly}
              className="flex items-center gap-1 px-2 py-1 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all text-xs font-semibold cursor-pointer disabled:opacity-40"
              title="Import file Excel (.xlsx)"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Import</span>
            </button>

            <button
              onClick={onExportExcel}
              className="flex items-center gap-1 px-2 py-1 text-emerald-700 dark:text-emerald-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all text-xs font-bold cursor-pointer"
              title="Xuất file Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Xuất Excel</span>
            </button>

            <button
              onClick={onSync}
              disabled={isLoading}
              className="flex items-center gap-1 px-2 py-1 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all text-xs font-semibold cursor-pointer disabled:opacity-50"
              title="Đồng bộ CSDL"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Đồng bộ</span>
            </button>

            <button
              onClick={onRestore}
              className="flex items-center gap-1 px-2 py-1 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all text-xs font-semibold cursor-pointer"
              title="Khôi phục dữ liệu ban đầu"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              <span>Khôi phục</span>
            </button>

            {onClearAll && (
              <button
                onClick={onClearAll}
                disabled={isReadOnly}
                className="flex items-center gap-1 px-2 py-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-all text-xs font-bold cursor-pointer disabled:opacity-40"
                title="Xóa tất cả nhiệm vụ tuần này"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Xóa</span>
              </button>
            )}
          </div>

          {/* NHÓM XUẤT FILE & XEM TRƯỚC (PUBLISH / WORD / PDF / PRINT) */}
          <div className="flex items-center gap-1 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-700 p-1 rounded-xl text-white shadow-xs shrink-0">
            <button
              onClick={onOpenPreview}
              className="flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-xs font-bold cursor-pointer"
              title="Xem trước mẫu Báo cáo NĐ 30/2020/NĐ-CP"
            >
              <FileText className="w-3.5 h-3.5 text-amber-300" />
              <span>Tạo Báo Cáo</span>
            </button>

            <div className="flex items-center border-l border-white/20 pl-1">
              <button
                onClick={onGenerateWord}
                className="p-1 hover:bg-white/20 rounded-lg text-emerald-300 transition-colors cursor-pointer"
                title="Tải file Word (.docx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onOpenPreview}
                className="p-1 hover:bg-white/20 rounded-lg text-rose-300 transition-colors cursor-pointer"
                title="Xuất file PDF"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onOpenPreview}
                className="p-1 hover:bg-white/20 rounded-lg text-amber-200 transition-colors cursor-pointer"
                title="In trực tiếp"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
};
