import React, { useEffect, useState } from 'react';
import { History, Calendar, CheckCircle2, Clock, FileText, ArrowRight, Sparkles, PlusCircle } from 'lucide-react';
import { UserProfile } from './LoginModal';

export interface HistoryReportItem {
  id: string;
  department_id: string;
  account_id: string;
  week_number: number;
  year: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED';
  nguoi_lap: string;
  don_vi: string;
  don_vi_code: string;
  created_at: string;
  updated_at: string;
  total_t1: number;
  total_t2: number;
  done_t1: number;
  percent_done: string;
}

interface ReportHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onSelectReport: (reportId: string, week: number, year: number) => void;
  onRequestCarryOver: (reportId: string, week: number, year: number) => void;
  activeReportId?: string;
}

export function ReportHistoryDrawer({
  isOpen,
  onClose,
  currentUser,
  onSelectReport,
  onRequestCarryOver,
  activeReportId
}: ReportHistoryDrawerProps) {
  const [reports, setReports] = useState<HistoryReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser) {
      loadHistory();
    }
  }, [isOpen, currentUser]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const deptId = currentUser?.department_id || 'dept_vp';
      const res = await fetch(`/api/reports/history?department_id=${deptId}`);
      const data = await res.json();
      if (data.success && data.reports) {
        setReports(data.reports);
      }
    } catch (err) {
      console.error('Lỗi nạp lịch sử:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs z-[200] flex justify-end animate-fadeIn">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Drawer Header */}
        <div className="p-5 bg-gradient-to-r from-[#001e30] to-[#003452] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-sm">Lịch sử Báo cáo Tuần</h3>
              <p className="text-[11px] text-slate-300">
                {currentUser ? `${currentUser.department_name} (${currentUser.department_code})` : 'Tất cả các tuần'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white text-lg font-bold cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          {isLoading ? (
            <div className="text-center py-10 text-xs text-slate-500">Đang nạp danh sách lịch sử...</div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white rounded-2xl border border-dashed border-slate-300">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">Chưa có báo cáo tuần nào</p>
              <p className="text-[11px] text-slate-400 mt-1">Báo cáo mới được tạo sẽ tự động lưu lại vào lịch sử đơn vị.</p>
            </div>
          ) : (
            reports.map((item) => {
              const isActive = activeReportId === item.id;
              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl border p-4 transition-all shadow-2xs hover:shadow-md ${
                    isActive ? 'border-[#005dac] ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-blue-50 text-[#005dac] font-extrabold text-xs flex items-center justify-center border border-blue-100">
                        W{item.week_number}
                      </span>
                      <div>
                        <h4 className="font-bold text-xs text-[#001e30]">
                          Báo cáo Tuần {item.week_number} / {item.year}
                        </h4>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          Người lập: {item.nguoi_lap}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : item.status === 'SUBMITTED'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {item.status === 'APPROVED' ? 'Đã duyệt' : item.status === 'SUBMITTED' ? 'Đã gửi' : 'Bản nháp'}
                    </span>
                  </div>

                  {/* Thống kê task */}
                  <div className="grid grid-cols-2 gap-2 my-3 text-[11px]">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Bảng I (Kết quả):</span>
                      <strong className="text-slate-700">{item.done_t1}/{item.total_t1} Hoàn thành</strong>
                      <span className="text-emerald-600 font-bold ml-1">({item.percent_done})</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Bảng II (Kế hoạch):</span>
                      <strong className="text-slate-700">{item.total_t2} Mục công tác</strong>
                    </div>
                  </div>

                  {/* Thao tác */}
                  <div className="flex items-center justify-between pt-1 gap-2">
                    <button
                      onClick={() => {
                        onSelectReport(item.id, item.week_number, item.year);
                        onClose();
                      }}
                      className="flex-1 py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-[#005dac] rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Xem / Chỉnh sửa
                    </button>

                    <button
                      onClick={() => {
                        onRequestCarryOver(item.id, item.week_number, item.year);
                      }}
                      className="py-1.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer shrink-0"
                      title="Tạo Báo cáo tuần tiếp theo & Tự động kết chuyển công việc chưa hoàn thành"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Tạo Tuần {item.week_number + 1}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
