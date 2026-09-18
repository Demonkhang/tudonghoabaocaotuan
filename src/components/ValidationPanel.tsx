import React from 'react';
import { AlertTriangle, ArrowRight, TrendingUp } from 'lucide-react';
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
  const completedCount = table1.filter(t => t.tien_do === 'Hoàn thành').length;
  const totalCount = table1.length;
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <aside className="col-span-12 lg:col-span-3 border-l border-[#c1c6d4] dark:border-slate-800 bg-[#f2f3fc] dark:bg-slate-900 p-4 flex flex-col gap-4 sticky top-[125px] h-[calc(100vh-125px)] overflow-y-auto transition-colors duration-300">
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
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-lg text-xs font-medium text-center">
            ✔ Dữ liệu hoàn toàn hợp lệ! Sẵn sàng tạo báo cáo.
          </div>
        ) : (
          errors.map((err) => (
            <div
              key={err.id}
              className={`p-3.5 rounded-lg border-l-4 shadow-2xs flex flex-col gap-1.5 transition-all bg-white ${
                err.type === 'error' ? 'border-red-600' : 'border-amber-500'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-900">{err.title}</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                  {err.table}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-snug">{err.message}</p>
              
              {err.rowId && (
                <button
                  onClick={() => onScrollToRow(err.rowId!)}
                  className="mt-1 text-[#005dac] font-bold text-xs flex items-center gap-1 hover:underline self-start cursor-pointer"
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
      <div className="mt-auto bg-[#005dac]/10 border border-[#005dac]/20 rounded-xl p-4 shadow-2xs">
        <div className="flex items-center gap-2 mb-3 text-[#005dac]">
          <TrendingUp className="w-5 h-5" />
          <span className="font-semibold text-sm">Tóm tắt tiến độ</span>
        </div>
        <div className="space-y-2">
          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full transition-all duration-500"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs pt-1">
            <span className="text-slate-600 font-medium">Tỷ lệ hoàn thành</span>
            <span className="font-bold text-[#005dac]">{completionPercent}%</span>
          </div>
          <div className="text-[11px] text-slate-500 text-right">
            ({completedCount}/{totalCount} nhiệm vụ)
          </div>
        </div>
      </div>
    </aside>
  );
};
