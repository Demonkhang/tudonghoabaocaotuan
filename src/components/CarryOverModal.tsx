import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { TaskTable1, TaskTable2 } from '../utils/reportUtils';
import { UserProfile } from './LoginModal';

interface CarryOverModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceWeek: number;
  sourceYear: number;
  table1: TaskTable1[];
  table2: TaskTable2[];
  currentUser: UserProfile | null;
  onConfirmCarryOver: () => Promise<void>;
}

export function CarryOverModal({
  isOpen,
  onClose,
  sourceWeek,
  sourceYear,
  table1,
  table2,
  currentUser,
  onConfirmCarryOver
}: CarryOverModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const targetWeek = sourceWeek + 1;
  const targetYear = sourceYear;

  // Nhiệm vụ Bảng I chưa hoàn thành
  const unfinishedT1 = table1.filter(t => t.tien_do !== 'Hoàn thành' && t.noi_dung.trim().length > 0);
  // Nhiệm vụ Kế hoạch Bảng II sẽ đẩy lên Bảng I tuần tới
  const plannedT2 = table2.filter(t => t.noi_dung.trim().length > 0);

  const totalCarried = unfinishedT1.length + plannedT2.length;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirmCarryOver();
      onClose();
    } catch (err) {
      console.error('Lỗi kết chuyển:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[200] p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-amber-100 hover:text-white cursor-pointer font-bold text-lg"
          >
            ✕
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-xl border border-white/20">
              <Sparkles className="w-7 h-7 text-amber-200" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Xác nhận Kết chuyển Báo cáo Tuần</h3>
              <p className="text-xs text-amber-100 mt-0.5">
                Tự động sao chép nhiệm vụ dở dang từ Tuần {sourceWeek} sang Tuần {targetWeek}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Phòng ban:</strong> {currentUser?.department_name || 'Văn phòng'}<br/>
              Hệ thống sẽ lọc ra <strong>{totalCarried} nhiệm vụ</strong> từ báo cáo Tuần {sourceWeek}/{sourceYear} để tự động điền sẵn vào báo cáo khởi tạo cho <strong>Tuần {targetWeek}/{targetYear}</strong>.
            </div>
          </div>

          {/* Danh sách 1: Nhiệm vụ Bảng I chưa hoàn thành */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
              <span>1. Nhiệm vụ Bảng I chưa hoàn thành ({unfinishedT1.length})</span>
              <span className="text-[10px] text-amber-600 bg-amber-100 px-2 py-0.5 rounded font-semibold">
                Chuyển tiếp làm việc
              </span>
            </h4>
            {unfinishedT1.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                Tất cả nhiệm vụ Bảng I của tuần trước đã hoàn thành 100%!
              </p>
            ) : (
              <div className="space-y-1.5">
                {unfinishedT1.map((item, idx) => (
                  <div key={item.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-400 text-[11px]">{idx + 1}.</span>
                      <span className="font-semibold text-slate-800">{item.noi_dung}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold shrink-0">
                      {item.tien_do || 'Đang thực hiện'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Danh sách 2: Kế hoạch Bảng II đôn lên Bảng I */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
              <span>2. Kế hoạch Bảng II đôn lên Bảng I ({plannedT2.length})</span>
              <span className="text-[10px] text-blue-600 bg-blue-100 px-2 py-0.5 rounded font-semibold">
                Triển khai tuần tới
              </span>
            </h4>
            {plannedT2.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                Không có mục kế hoạch nào từ tuần trước.
              </p>
            ) : (
              <div className="space-y-1.5">
                {plannedT2.map((item, idx) => (
                  <div key={item.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-400 text-[11px]">{idx + 1}.</span>
                      <span className="font-semibold text-slate-800">{item.noi_dung}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 italic shrink-0">
                      {item.san_pham_du_kien || 'Kế hoạch'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Đồng ý Khởi tạo Báo cáo Tuần {targetWeek}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
