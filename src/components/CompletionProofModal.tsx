import React, { useState } from 'react';
import { CheckCircle2, Upload, FileText, AlertCircle, X, Check, Loader2, Paperclip, FileCheck } from 'lucide-react';

interface CompletionProofModalProps {
  isOpen: boolean;
  taskTitle: string;
  onClose: () => void;
  onConfirm: (proofData: { san_pham: string; file_minh_chung: string; file_original_name: string }) => void;
}

export function CompletionProofModal({ isOpen, taskTitle, onClose, onConfirm }: CompletionProofModalProps) {
  const [sanPham, setSanPham] = useState('');
  const [file, setFile] = useState<{ url: string; filename: string; originalName: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/upload-evidence', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lỗi khi tải file lên máy chủ');
      }

      setFile({
        url: data.file.url,
        filename: data.file.filename,
        originalName: data.file.originalName
      });
    } catch (err: any) {
      setUploadError(err.message || 'Không thể tải file lên');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
  };

  // Rule: Must have EITHER an uploaded file OR non-empty product text
  const isValid = file !== null || sanPham.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    onConfirm({
      san_pham: sanPham.trim(),
      file_minh_chung: file ? file.url : '',
      file_original_name: file ? file.originalName : ''
    });

    // Reset & close
    setSanPham('');
    setFile(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[260] p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full text-slate-100 shadow-2xl overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 p-4 border-b border-emerald-900/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-wide">
                XÁC NHẬN MINH CHỨNG HOÀN THÀNH
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cung cấp file minh chứng hoặc ghi nhận sản phẩm kết quả
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

        {/* BODY */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* TASK TITLE BOX */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 font-bold block mb-1">Nhiệm vụ hoàn thành:</span>
            <p className="text-slate-100 font-semibold leading-relaxed">{taskTitle}</p>
          </div>

          {/* SECTION 1: UPLOAD FILE MINH CHỨNG */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Paperclip className="w-4 h-4 text-emerald-400" />
              1. Đính kèm File Minh Chứng (Lưu vào Docker /uploads):
            </label>

            {file ? (
              <div className="bg-emerald-950/40 border border-emerald-800/80 p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-emerald-200 truncate">{file.originalName}</p>
                    <span className="text-[10px] text-emerald-400/80">Đã lưu trữ thành công trên server</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg cursor-pointer transition-all shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-slate-700 hover:border-emerald-500 bg-slate-950/50 hover:bg-slate-950 p-4 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group">
                <input
                  type="file"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip,.rar"
                />
                {isUploading ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Đang tải file lên server...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-7 h-7 text-slate-400 group-hover:text-emerald-400 mb-1 transition-colors" />
                    <span className="text-xs font-bold text-slate-300 group-hover:text-white">
                      Bấm để chọn file hoặc kéo thả tệp tin vào đây
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      Hỗ trợ PDF, DOCX, XLSX, Ảnh, ZIP (Tối đa 50MB)
                    </span>
                  </>
                )}
              </label>
            )}

            {uploadError && (
              <p className="text-xs text-rose-400 font-semibold">{uploadError}</p>
            )}
          </div>

          {/* SECTION 2: MÔ TẢ SẢN PHẨM / KẾT QUẢ */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-400" />
              2. Mô tả Sản phẩm / Kết quả đạt được:
              {!file && <span className="text-amber-400 font-bold text-[11px]">(Bắt buộc nếu không có file)</span>}
            </label>
            <textarea
              rows={3}
              value={sanPham}
              onChange={e => setSanPham(e.target.value)}
              placeholder="Ví dụ: Báo cáo số 125/BC-VP ngày 15/10/2026, Phiếu trình 45/PTr-VP..."
              className="w-full p-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-sans"
            />
          </div>

          {/* VALIDATION WARNING BANNER */}
          {!isValid && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p>
                <strong>Quy định hoàn thành:</strong> Bạn phải đính kèm <strong>File minh chứng</strong> HOẶC nhập thông tin <strong>Sản phẩm / Kết quả đạt được</strong> thì mới có thể bấm nút "Xác nhận Hoàn thành".
              </p>
            </div>
          )}

          {/* FOOTER */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={!isValid || isUploading}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer transition-all hover:scale-[1.02] flex items-center gap-2"
            >
              <Check className="w-4 h-4 text-emerald-200" />
              <span>Xác nhận Hoàn thành</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
