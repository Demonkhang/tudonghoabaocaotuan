import React, { useState, useEffect } from 'react';
import { KanbanTaskItem } from './KanbanPlannerModal';
import { Eye, Edit3, Paperclip, Download, X, Check, FileCheck, Clock, Tag, PlayCircle, BarChart2, FileText, Upload, Loader2 } from 'lucide-react';

interface TaskDetailModalProps {
  isOpen: boolean;
  mode: 'view' | 'edit';
  task: KanbanTaskItem | null;
  onClose: () => void;
  onSave?: (updatedTask: KanbanTaskItem) => void;
}

export function TaskDetailModal({ isOpen, mode, task, onClose, onSave }: TaskDetailModalProps) {
  const [formData, setFormData] = useState<KanbanTaskItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setFormData({ ...task });
    }
  }, [task]);

  if (!isOpen || !formData) return null;

  const isCompleted = formData.tien_do === 'Hoàn thành' || mode === 'view';

  const handleInputChange = (field: keyof KanbanTaskItem, value: any) => {
    setFormData(prev => (prev ? { ...prev, [field]: value } : null));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const data = new FormData();
      data.append('file', file);

      const res = await fetch('/api/upload-evidence', {
        method: 'POST',
        body: data
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Lỗi khi tải file');
      }

      setFormData(prev =>
        prev
          ? {
              ...prev,
              file_minh_chung: resData.file.url,
              file_original_name: resData.file.originalName
            }
          : null
      );
    } catch (err: any) {
      setUploadError(err.message || 'Không thể tải file lên');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setFormData(prev => (prev ? { ...prev, file_minh_chung: '', file_original_name: '' } : null));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSave && formData) {
      onSave(formData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[260] p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full text-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              isCompleted 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
            }`}>
              {mode === 'view' ? <Eye className="w-6 h-6" /> : <Edit3 className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-wide">
                {mode === 'view' ? 'CHI TIẾT NHIỆM VỤ HOÀN THÀNH' : 'CHỈNH SỬA CHI TIẾT NHIỆM VỤ'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {mode === 'view' ? 'Xem lại kết quả thực hiện và file minh chứng' : 'Cập nhật nội dung, tiến độ và thông tin liên quan'}
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
        {mode === 'view' ? (
          /* READ-ONLY VIEW MODE FOR COMPLETED TASKS */
          <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar text-xs">
            {/* Status & Tag Row */}
            <div className="flex items-center justify-between gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4" />
                Đã hoàn thành
              </span>

              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                {formData.nhom || 'Thường xuyên'}
              </span>
            </div>

            {/* Nội dung nhiệm vụ */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Nội dung nhiệm vụ / công tác được giao:
              </span>
              <p className="text-sm font-semibold text-white leading-relaxed">{formData.noi_dung}</p>
            </div>

            {/* Thông tin 2 cột */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 font-bold block mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  Thời gian hoàn thành:
                </span>
                <p className="text-slate-200 font-medium">{formData.thoi_gian || 'Trong tuần'}</p>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 font-bold block mb-1 flex items-center gap-1">
                  <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
                  Triển khai thực hiện:
                </span>
                <p className="text-slate-200 font-medium">{formData.trien_khai || 'Đã hoàn thành theo kế hoạch'}</p>
              </div>
            </div>

            {/* Sản phẩm / Kết quả đạt được */}
            {formData.san_pham && (
              <div className="bg-emerald-950/30 p-4 rounded-xl border border-emerald-900/60 space-y-1">
                <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Sản phẩm / Kết quả đạt được:
                </span>
                <p className="text-xs text-emerald-100 font-medium leading-relaxed">{formData.san_pham}</p>
              </div>
            )}

            {/* File minh chứng (nếu có) */}
            {formData.file_minh_chung ? (
              <div className="bg-blue-950/40 p-4 rounded-xl border border-blue-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-300 shrink-0">
                    <Paperclip className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] text-blue-300 font-bold block">File minh chứng hoàn thành:</span>
                    <p className="text-xs font-extrabold text-white truncate">
                      {formData.file_original_name || 'File_Minh_Chung.pdf'}
                    </p>
                  </div>
                </div>

                <a
                  href={formData.file_minh_chung}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={formData.file_original_name || 'minh_chung.pdf'}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải File Minh Chứng</span>
                </a>
              </div>
            ) : (
              <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 text-slate-500 text-center italic">
                Chưa đính kèm tệp tin minh chứng
              </div>
            )}

            {/* FOOTER CLOSE BUTTON */}
            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        ) : (
          /* FORM EDIT MODE FOR EDITING TASKS */
          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar text-xs">
            {/* Nội dung */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                1. Nội dung nhiệm vụ / công tác được giao (*):
              </label>
              <textarea
                rows={3}
                value={formData.noi_dung}
                onChange={e => handleInputChange('noi_dung', e.target.value)}
                required
                className="w-full p-3 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 leading-relaxed font-sans"
              />
            </div>

            {/* Nhóm & Tiến độ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nhóm công tác:</label>
                <select
                  value={formData.nhom || 'Thường xuyên'}
                  onChange={e => handleInputChange('nhom', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Thường xuyên">Nhiệm vụ Thường xuyên</option>
                  <option value="Đột xuất">Nhiệm vụ Đột xuất</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Tiến độ thực hiện:</label>
                <select
                  value={formData.tien_do || 'Đang thực hiện'}
                  onChange={e => handleInputChange('tien_do', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Đang thực hiện">Đang thực hiện</option>
                  <option value="Hoàn thành">Hoàn thành</option>
                  <option value="Chưa thực hiện">Chưa thực hiện</option>
                  <option value="Hoàn thành trễ">Hoàn thành trễ</option>
                  <option value="Hủy / Kết thúc">Hủy / Kết thúc</option>
                </select>
              </div>
            </div>

            {/* Thời gian & Triển khai */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Thời gian hoàn thành:</label>
                <input
                  type="text"
                  value={formData.thoi_gian || ''}
                  onChange={e => handleInputChange('thoi_gian', e.target.value)}
                  placeholder="Trong tuần / 15/10/2026..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Triển khai thực hiện:</label>
                <input
                  type="text"
                  value={formData.trien_khai || ''}
                  onChange={e => handleInputChange('trien_khai', e.target.value)}
                  placeholder="Chi tiết công việc triển khai..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Sản phẩm / Kết quả */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Sản phẩm / Kết quả đạt được:</label>
              <textarea
                rows={2}
                value={formData.san_pham || ''}
                onChange={e => handleInputChange('san_pham', e.target.value)}
                placeholder="Ghi chú văn bản/kết quả..."
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-sans"
              />
            </div>

            {/* File Minh chứng Upload trong Modal Edit */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-indigo-400" />
                File Minh Chứng Đính Kèm:
              </label>

              {formData.file_minh_chung ? (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {formData.file_original_name || 'File_Minh_Chung.pdf'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1 text-slate-400 hover:text-rose-400 rounded cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="border border-dashed border-slate-700 hover:border-blue-500 bg-slate-950/60 p-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip,.rar"
                  />
                  {isUploading ? (
                    <span className="text-xs text-blue-400 flex items-center gap-1.5 font-semibold">
                      <Loader2 className="w-4 h-4 animate-spin" /> Đang tải file...
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-blue-400" /> Tải lên File Minh Chứng mới
                    </span>
                  )}
                </label>
              )}
              {uploadError && <p className="text-[11px] text-rose-400">{uploadError}</p>}
            </div>

            {/* FOOTER ACTIONS */}
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
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4 text-blue-200" />
                <span>Lưu Thay Đổi</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
