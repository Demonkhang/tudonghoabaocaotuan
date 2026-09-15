import React, { useRef } from 'react';
import { RefreshCw, RotateCcw, FileText, FileSpreadsheet, Printer, CheckCircle2, Code2, Upload, Download } from 'lucide-react';
import { ReportMetadata } from '../utils/reportUtils';
import { downloadExcelTemplate } from '../utils/excelParser';

interface ToolbarProps {
  metadata: ReportMetadata;
  setMetadata: React.Dispatch<React.SetStateAction<ReportMetadata>>;
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
}

export const Toolbar: React.FC<ToolbarProps> = ({
  metadata,
  setMetadata,
  onSync,
  onReset,
  onRestore,
  syncedAt,
  totalTasks,
  onGenerateWord,
  onOpenPreview,
  onOpenGuide,
  isLoading,
  onImportFile
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
        <div className="flex gap-2 items-center">
          {/* Chọn Tuần (Đủ 52 tuần trong năm) */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-slate-600">Tuần:</span>
            <select
              value={metadata.tuan}
              onChange={(e) => setMetadata({ ...metadata, tuan: Number(e.target.value), tuan_tiep: Number(e.target.value) + 1 })}
              className="bg-white border border-[#717783] rounded-lg text-sm px-2.5 py-1.5 focus:ring-2 focus:ring-[#005dac] font-medium"
            >
              {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  Tuần {w}
                </option>
              ))}
            </select>
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

          {/* Nhập Ngày lập báo cáo */}
          <div className="flex items-center gap-1 ml-1">
            <span className="text-xs font-semibold text-slate-600">Ngày lập:</span>
            <input
              type="text"
              value={metadata.ngay_lap || ''}
              onChange={(e) => setMetadata({ ...metadata, ngay_lap: e.target.value })}
              placeholder="dd/mm/yyyy"
              className="bg-white border border-[#717783] rounded-lg text-sm px-2.5 py-1.5 focus:ring-2 focus:ring-[#005dac] w-36"
              title="Nhập ngày lập báo cáo (Ví dụ: 28/07/2026)"
            />
          </div>
        </div>

        <div className="h-6 w-px bg-[#c1c6d4]" />

        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#005dac] text-white rounded-lg hover:bg-[#004786] transition-all text-xs font-bold shadow-sm cursor-pointer"
            title="Tải lên tệp Excel (.xlsx) hoặc CSV để tự động điền vào Form Word"
          >
            <Upload className="w-4 h-4 text-amber-300" />
            Import File Sheet
          </button>

          <button
            onClick={onSync}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#005dac] text-[#005dac] rounded-lg hover:bg-blue-50 transition-all text-xs font-semibold shadow-2xs cursor-pointer disabled:opacity-50"
            title="Đồng bộ trực tiếp từ Google Sheet via Apps Script API"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Đồng bộ Google Sheet
          </button>

          <button
            onClick={downloadExcelTemplate}
            className="flex items-center gap-1 px-2.5 py-1.5 text-slate-700 bg-white hover:bg-slate-100 rounded-lg text-xs font-medium transition-all border border-slate-300"
            title="Tải file Excel mẫu (.xlsx) để xem cấu trúc chuẩn"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            Tải Mẫu Sheet
          </button>

          <button
            onClick={onRestore}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#717783] text-[#414752] bg-white rounded-lg hover:bg-[#e6e8f0] transition-all text-xs font-semibold cursor-pointer"
            title="Khôi phục trạng thái ban đầu trước khi sửa (BR13)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Khôi phục
          </button>

          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[#944700] hover:bg-[#ffdbc7] rounded-lg text-xs font-semibold transition-all border border-[#ba5b00]/30"
            title="Xem mã Google Apps Script"
          >
            <Code2 className="w-3.5 h-3.5" />
            Apps Script
          </button>
        </div>
      </div>

      {/* Cụm Phải: Trạng thái & Nút Tạo báo cáo */}
      <div className="flex items-center gap-3">
        <div className="text-xs text-[#414752] bg-white px-3 py-1.5 rounded-full border border-[#c1c6d4] shadow-2xs flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-[#005dac]" />
          <span>
            Đã đồng bộ lúc <strong className="text-slate-800">{syncedAt}</strong> | <strong className="text-[#005dac]">{totalTasks}</strong> nhiệm vụ được tải
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
