import React, { useRef } from 'react';
import { RefreshCw, RotateCcw, FileText, FileSpreadsheet, Printer, CheckCircle2, Code2, Upload, Download, History, Sparkles, User, ShieldCheck, Save, Layout, Share2, Eye, Lock } from 'lucide-react';
import { ReportMetadata } from '../utils/reportUtils';
import { downloadExcelTemplate } from '../utils/excelParser';
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

  currentUser: UserProfile | null;
  userPermission?: 'OWNER' | 'ADMIN' | 'EDIT' | 'VIEW' | 'NO_ACCESS';
  onOpenLogin: () => void;
  onOpenHistory: () => void;
  onOpenCarryOver: () => void;
  onOpenKanbanPlanner?: () => void;
  onOpenAdmin: () => void;
  onOpenShare?: () => void;
  onSave: () => void;
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
  currentUser,
  userPermission = 'OWNER',
  onOpenLogin,
  onOpenHistory,
  onOpenCarryOver,
  onOpenKanbanPlanner,
  onOpenAdmin,
  onOpenShare,
  onSave
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
    <nav className="bg-[#f2f3fc] border-b border-[#c1c6d4] px-6 py-2.5 flex flex-wrap items-center justify-between sticky top-[68px] z-40 gap-3">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx,.xls,.csv"
        className="hidden"
      />

      {/* Cụm Trái: Chọn tuần/năm & Nút Import / Đồng bộ */}
      <div className="flex items-center gap-3">
        {/* Nút Đăng nhập / Tài khoản */}
        <button
          onClick={onOpenLogin}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#005dac] text-[#005dac] rounded-xl hover:bg-blue-50 transition-all text-xs font-bold shadow-2xs cursor-pointer"
          title="Đổi tài khoản / Phân quyền phòng ban"
        >
          <User className="w-4 h-4 text-[#005dac]" />
          <span>{currentUser ? currentUser.department_code : 'Đăng nhập'}</span>
        </button>

        {/* Nút Quản trị Admin */}
        <button
          onClick={onOpenAdmin}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-amber-300 rounded-xl transition-all text-xs font-bold shadow-2xs cursor-pointer"
          title="Trang quản trị tạo tài khoản & phòng ban"
        >
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>Quản trị</span>
        </button>

        {/* Nút Lịch sử Báo cáo Tuần */}
        <button
          onClick={onOpenHistory}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-700 to-[#005dac] text-white rounded-xl hover:opacity-90 transition-all text-xs font-bold shadow-sm cursor-pointer"
          title="Xem danh sách lịch sử báo cáo các tuần trước"
        >
          <History className="w-4 h-4 text-amber-300" />
          Lịch sử Báo cáo
        </button>

        <div className="h-6 w-px bg-[#c1c6d4]" />

        <div className="flex gap-2 items-center">
          {/* Chọn Tuần (Đủ 52 tuần trong năm) */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-600">Tuần:</span>
            <select
              value={metadata.tuan}
              onChange={(e) => setMetadata({ ...metadata, tuan: Number(e.target.value), tuan_tiep: Number(e.target.value) + 1 })}
              className={`text-sm px-2.5 py-1.5 focus:ring-2 focus:ring-[#005dac] rounded-lg transition-all font-medium cursor-pointer ${
                metadata.tuan === recentlyCreatedWeek
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-extrabold border-2 border-emerald-400 shadow-md ring-2 ring-emerald-200'
                  : 'bg-white border border-[#717783] text-slate-900'
              }`}
            >
              {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
                <option
                  key={w}
                  value={w}
                  className={w === recentlyCreatedWeek ? 'font-bold text-emerald-600 bg-emerald-50' : ''}
                >
                  {w === recentlyCreatedWeek ? `✨ Tuần ${w} (Mới khởi tạo)` : `Tuần ${w}`}
                </option>
              ))}
            </select>

            {recentlyCreatedWeek && metadata.tuan === recentlyCreatedWeek && (
              <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-extrabold rounded-full border border-emerald-300 shadow-xs animate-pulse-subtle flex items-center gap-1">
                ✨ Mới tạo
              </span>
            )}
          </div>

          {/* Chọn Năm */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-slate-600">Năm:</span>
            <select
              value={metadata.nam}
              onChange={(e) => setMetadata({ ...metadata, nam: Number(e.target.value) })}
              className="bg-white border border-[#717783] rounded-lg text-sm px-2.5 py-1.5 focus:ring-2 focus:ring-[#005dac] font-medium"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>
        </div>

        <div className="h-6 w-px bg-[#c1c6d4]" />

        <div className="flex items-center gap-2">
          {/* Nút CHIA SẺ BÁO CÁO (Share Button) */}
          {canShare && (
            <button
              onClick={onOpenShare}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl transition-all text-xs font-bold shadow-md cursor-pointer"
              title="Chia sẻ báo cáo tuần này với tài khoản khác"
            >
              <Share2 className="w-4 h-4 text-blue-200" />
              <span>Chia sẻ</span>
            </button>
          )}

          {/* Badge Chỉ xem khi bị khóa quyền */}
          {isReadOnly && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 border border-amber-300 text-amber-800 rounded-xl text-xs font-bold shadow-2xs">
              <Eye className="w-4 h-4 text-amber-600" />
              <span>Chế độ: Chỉ xem</span>
            </div>
          )}

          {/* Nút LƯU BÁO CÁO (Save Button) */}
          <button
            onClick={onSave}
            disabled={isLoading || isReadOnly}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all text-xs font-bold shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title={isReadOnly ? 'Bạn chỉ có quyền xem báo cáo này' : 'Lưu tất cả chỉnh sửa vào CSDL (Ctrl+S)'}
          >
            <Save className="w-4 h-4 text-emerald-200" />
            💾 Lưu Báo Cáo
          </button>

          {/* Nút Core Action: Tạo Báo cáo Tuần Mới & Kế thừa nhiệm vụ */}
          <button
            onClick={onOpenCarryOver}
            disabled={isReadOnly}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl transition-all text-xs font-bold shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed animate-pulse-subtle"
            title="Tạo báo cáo tuần tiếp theo và tự động chuyển các nhiệm vụ chưa làm xong"
          >
            <Sparkles className="w-4 h-4 text-amber-100" />
            ⚡ Kế thừa (N+1)
          </button>

          {onOpenKanbanPlanner && (
            <button
              onClick={onOpenKanbanPlanner}
              disabled={isReadOnly}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl transition-all text-xs font-bold shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Lập kế hoạch tuần tiếp theo bằng giao diện Kanban kéo thả"
            >
              <Layout className="w-4 h-4 text-purple-200" />
              🎯 Kanban Planner
            </button>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isReadOnly}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#005dac] text-white rounded-lg hover:bg-[#004786] transition-all text-xs font-bold shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Tải lên tệp Excel (.xlsx) hoặc CSV"
          >
            <Upload className="w-3.5 h-3.5 text-amber-300" />
            Import File
          </button>

          <button
            onClick={onSync}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#005dac] text-[#005dac] rounded-lg hover:bg-blue-50 transition-all text-xs font-semibold shadow-2xs cursor-pointer disabled:opacity-50"
            title="Đồng bộ lại từ cơ sở dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Đồng bộ CSDL
          </button>

          <button
            onClick={onRestore}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#717783] text-[#414752] bg-white rounded-lg hover:bg-[#e6e8f0] transition-all text-xs font-semibold cursor-pointer"
            title="Khôi phục trạng thái vừa nhập"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Khôi phục
          </button>
        </div>
      </div>

      {/* Cụm Phải: Trạng thái & Nút Xuất file */}
      <div className="flex items-center gap-3">
        <div className="text-xs text-[#414752] bg-white px-3 py-1.5 rounded-full border border-[#c1c6d4] shadow-2xs flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-[#005dac]" />
          <span>
            Đơn vị: <strong className="text-slate-800">{currentUser?.department_code || 'VP'}</strong> | <strong className="text-[#005dac]">{totalTasks}</strong> nhiệm vụ
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenPreview}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#944700] text-white rounded-lg hover:bg-[#733600] transition-all text-xs font-bold shadow-sm cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Tạo báo cáo
          </button>

          <div className="flex rounded-lg overflow-hidden border border-[#c1c6d4] bg-white shadow-2xs">
            <button
              onClick={onGenerateWord}
              className="p-1.5 hover:bg-[#e6e8f0] border-r border-[#c1c6d4] text-blue-600 transition-colors cursor-pointer"
              title="Xuất file Word (.docx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenPreview}
              className="p-1.5 hover:bg-[#e6e8f0] border-r border-[#c1c6d4] text-red-600 transition-colors cursor-pointer"
              title="Xuất PDF"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenPreview}
              className="p-1.5 hover:bg-[#e6e8f0] text-[#414752] transition-colors cursor-pointer"
              title="Xem trước & In"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
