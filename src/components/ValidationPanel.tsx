import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, TrendingUp, ChevronDown, CheckCircle2 } from 'lucide-react';
import { ValidationError, TaskTable1 } from '../utils/reportUtils';

interface ValidationPanelProps {
  errors: ValidationError[];
  onScrollToRow: (rowId: string) => void;
  table1: TaskTable1[];
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({
  errors,
  onScrollToRow,
  table1
}) => {
  const [isMobileExpanded, setIsMobileExpanded] = useState<boolean>(false);
  const completedCount = table1.filter(t => t.tien_do === 'Hoàn thành').length;
  const totalCount = table1.length;
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <>
      {/* ================= DESKTOP SIDEBAR (>= lg screens) ================= */}
      <aside className="hidden lg:flex col-span-3 border-l border-[#c1c6d4] dark:border-slate-800 bg-[#f2f3fc] dark:bg-slate-900 p-4 flex-col gap-4 h-full min-h-0 overflow-y-auto transition-colors duration-300">
        {/* Header Panel */}
        <div className="flex items-center justify-between pb-2 border-b border-[#c1c6d4] dark:border-slate-800">
          <h3 className="font-semibold text-base flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span>Kiểm tra dữ liệu</span>
          </h3>
          <span className="bg-red-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">
            {errors.length} lỗi
          </span>
        </div>

        {/* Danh sách thẻ lỗi */}
        <div className="space-y-3 overflow-y-auto flex-1 pr-1">
          {errors.length === 0 ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 p-3.5 rounded-lg text-xs font-medium text-center">
              ✔ Dữ liệu hoàn toàn hợp lệ! Sẵn sàng tạo báo cáo.
            </div>
          ) : (
            errors.map((err) => (
              <div
                key={err.id}
                className={`p-3.5 rounded-lg border-l-4 shadow-2xs flex flex-col gap-1.5 transition-all bg-white dark:bg-slate-800 ${
                  err.type === 'error' ? 'border-red-600' : 'border-amber-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{err.title}</span>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-medium">
                    {err.table}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">{err.message}</p>
                
                {err.rowId && (
                  <button
                    onClick={() => onScrollToRow(err.rowId!)}
                    className="mt-1 text-[#005dac] dark:text-blue-400 font-bold text-xs flex items-center gap-1 hover:underline self-start cursor-pointer"
                  >
                    {err.table === 'Hệ thống' ? 'Kiểm tra ngay' : 'Đi đến dòng'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Tóm tắt tiến độ Widget */}
        <div className="mt-auto bg-[#005dac]/10 dark:bg-blue-950/40 border border-[#005dac]/20 dark:border-blue-800/40 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center gap-2 mb-3 text-[#005dac] dark:text-blue-400">
            <TrendingUp className="w-5 h-5" />
            <span className="font-semibold text-sm">Tóm tắt tiến độ</span>
          </div>
          <div className="space-y-2">
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs pt-1">
              <span className="text-slate-600 dark:text-slate-300 font-medium">Tỷ lệ hoàn thành</span>
              <span className="font-bold text-[#005dac] dark:text-blue-400">{completionPercent}%</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 text-right">
              ({completedCount}/{totalCount} nhiệm vụ)
            </div>
          </div>
        </div>
      </aside>

      {/* ================= MOBILE COLLAPSIBLE PANEL (< lg screens) ================= */}
      <div className="block lg:hidden col-span-12 p-3 sm:p-4 bg-[#f2f3fc] dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 transition-colors duration-300">
        <div
          onClick={() => setIsMobileExpanded(!isMobileExpanded)}
          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all shadow-xs ${
            errors.length > 0
              ? 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-900/60 text-red-900 dark:text-red-200'
              : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {errors.length > 0 ? (
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            )}
            <div className="leading-tight">
              <h4 className="font-extrabold text-xs">
                {errors.length > 0 ? `Kiểm tra dữ liệu (${errors.length} lỗi)` : 'Dữ liệu hoàn toàn hợp lệ'}
              </h4>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                {errors.length > 0 ? 'Nhấn để xem chi tiết các lỗi cần khắc phục' : 'Báo cáo đã sẵn sàng phê duyệt & xuất Word'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-[#005dac] dark:text-blue-300 text-[10px] font-extrabold">
              {completionPercent}% xong
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMobileExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Collapsible content on mobile */}
        {isMobileExpanded && (
          <div className="mt-3 space-y-3 animate-fadeIn">
            {/* Error Cards */}
            {errors.length === 0 ? (
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-medium text-center">
                🎉 Không phát hiện lỗi định dạng hay thiếu dữ liệu.
              </div>
            ) : (
              errors.map((err) => (
                <div
                  key={err.id}
                  className={`p-3 rounded-xl border-l-4 shadow-xs flex flex-col gap-1 bg-white dark:bg-slate-900 ${
                    err.type === 'error' ? 'border-red-600' : 'border-amber-500'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{err.title}</span>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.2 rounded font-medium">
                      {err.table}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">{err.message}</p>
                  {err.rowId && (
                    <button
                      onClick={() => {
                        onScrollToRow(err.rowId!);
                        // On mobile, scroll to mobile card if exists
                        const el = document.getElementById(`mobile_card_${err.rowId}`) || document.getElementById(`row_${err.rowId}`);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }}
                      className="mt-1 text-[#005dac] dark:text-blue-400 font-bold text-xs flex items-center gap-1 hover:underline self-start cursor-pointer"
                    >
                      {err.table === 'Hệ thống' ? 'Kiểm tra ngay' : 'Đi đến dòng'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}

            {/* Progress summary widget on mobile */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold mb-1.5 text-slate-800 dark:text-slate-200">
                <span className="flex items-center gap-1.5 text-[#005dac] dark:text-blue-400">
                  <TrendingUp className="w-4 h-4" />
                  <span>Tiến độ hoàn thành Bảng I</span>
                </span>
                <span className="text-[#005dac] dark:text-blue-400">{completionPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full transition-all duration-500"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 text-right mt-1">
                ({completedCount}/{totalCount} nhiệm vụ hoàn thành)
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
