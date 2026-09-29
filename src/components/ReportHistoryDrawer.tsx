import React, { useEffect, useState } from 'react';
import { History, Calendar, CheckCircle2, Clock, FileText, ArrowRight, Sparkles, PlusCircle, UserCheck, ShieldCheck, AlertCircle } from 'lucide-react';
import { UserProfile } from './LoginModal';
import { fetchPendingReportsApi } from '../services/api';

export interface HistoryReportItem {
  id: string;
  department_id: string;
  account_id: string;
  week_number: number;
  year: number;
  status?: string;
  approval_status?: 'DRAFT' | 'PENDING_APPROVAL' | 'PARTIALLY_SIGNED' | 'APPROVED';
  nguoi_lap?: string;
  author_name?: string;
  don_vi?: string;
  department_name?: string;
  don_vi_code?: string;
  created_at: string;
  updated_at: string;
  total_t1?: number;
  total_t2?: number;
  done_t1?: number;
  percent_done?: string;
}

interface ReportHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onSelectReport: (reportId: string, week: number, year: number) => void;
  onRequestCarryOver: (reportId: string, week: number, year: number) => void;
  onOpenDigitalSignature?: (reportId: string) => void;
  activeReportId?: string;
}

export function ReportHistoryDrawer({
  isOpen,
  onClose,
  currentUser,
  onSelectReport,
  onRequestCarryOver,
  onOpenDigitalSignature,
  activeReportId
}: ReportHistoryDrawerProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'pending'>('history');
  const [reports, setReports] = useState<HistoryReportItem[]>([]);
  const [pendingReports, setPendingReports] = useState<HistoryReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser) {
      loadHistory();
      loadPendingReports();
    }
  }, [isOpen, currentUser]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const deptId = currentUser?.department_id || 'dept_vp';
      const accId = currentUser?.id || '';
      const res = await fetch(`/api/reports/history?department_id=${deptId}&account_id=${accId}`);
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

  const loadPendingReports = async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetchPendingReportsApi(currentUser.id);
      if (res && res.success && res.reports) {
        setPendingReports(res.reports);
      }
    } catch (err) {
      console.error('Lỗi nạp báo cáo chờ duyệt:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs z-[200] flex justify-end animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">
        {/* Drawer Header */}
        <div className="p-4 bg-gradient-to-r from-[#001e30] to-[#003452] text-white flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <History className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="font-bold text-sm">Quản lý Báo cáo Tuần</h3>
                <p className="text-[11px] text-slate-300">
                  {currentUser ? `${currentUser.full_name} (${currentUser.department_name})` : 'Tất cả báo cáo'}
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

          {/* Navigation Tabs inside Drawer */}
          <div className="flex items-center bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Lịch sử Báo cáo</span>
            </button>

            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
                activeTab === 'pending'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>Mục Chờ Duyệt</span>
              {pendingReports.length > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-black rounded-full shadow-xs animate-pulse">
                  {pendingReports.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-950">
          {isLoading ? (
            <div className="text-center py-10 text-xs text-slate-500 dark:text-slate-400">Đang nạp danh sách...</div>
          ) : activeTab === 'history' ? (
            /* TAB 1: LỊCH SỬ BÁO CÁO */
            reports.length === 0 ? (
              <div className="text-center py-12 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Chưa có báo cáo tuần nào</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Báo cáo mới được tạo sẽ tự động lưu lại vào lịch sử đơn vị.</p>
              </div>
            ) : (
              reports.map((item) => {
                const isActive = activeReportId === item.id;
                const isApproved = item.approval_status === 'APPROVED' || item.status === 'APPROVED';
                const isPending = item.approval_status === 'PENDING_APPROVAL' || item.approval_status === 'PARTIALLY_SIGNED';

                return (
                  <div
                    key={item.id}
                    className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 transition-all shadow-2xs hover:shadow-md ${
                      isActive
                        ? 'border-[#005dac] ring-2 ring-blue-100 dark:ring-blue-900/40'
                        : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#005dac] dark:text-blue-400 font-extrabold text-xs flex items-center justify-center border border-blue-100 dark:border-blue-900/50">
                          W{item.week_number}
                        </span>
                        <div>
                          <h4 className="font-bold text-xs text-[#001e30] dark:text-white">
                            Báo cáo Tuần {item.week_number} / {item.year}
                          </h4>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            Người lập: {item.nguoi_lap || item.author_name || 'Cá nhân'}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isApproved
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                            : isPending
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {isApproved ? '✓ Đã Phê Duyệt' : isPending ? '⏳ Đang Trình Duyệt' : 'Bản Nháp'}
                      </span>
                    </div>

                    {/* Thống kê task */}
                    <div className="grid grid-cols-2 gap-2 my-3 text-[11px]">
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Bảng I (Kết quả):</span>
                        <strong className="text-slate-700 dark:text-slate-200">{item.done_t1 || 0}/{item.total_t1 || 0} Hoàn thành</strong>
                        <span className="text-emerald-600 font-bold ml-1">({item.percent_done || '0%'})</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Bảng II (Kế hoạch):</span>
                        <strong className="text-slate-700 dark:text-slate-200">{item.total_t2 || 0} Mục công tác</strong>
                      </div>
                    </div>

                    {/* Thao tác */}
                    <div className="flex items-center justify-between pt-1 gap-2">
                      <button
                        onClick={() => {
                          onSelectReport(item.id, item.week_number, item.year);
                          onClose();
                        }}
                        className="flex-1 py-1.5 px-3 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-[#005dac] dark:text-blue-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer border border-blue-200 dark:border-blue-900/50"
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
            )
          ) : (
            /* TAB 2: MỤC CHỜ DUYỆT */
            pendingReports.length === 0 ? (
              <div className="text-center py-12 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-60" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Không có báo cáo nào chờ bạn duyệt</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Khi nhân viên hoặc cấp dưới gửi trình duyệt báo cáo tuần, thông báo và dữ liệu phê duyệt sẽ xuất hiện tại đây.
                </p>
              </div>
            ) : (
              pendingReports.map((item) => {
                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-900/60 p-4 transition-all shadow-sm hover:shadow-md relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 bg-amber-500 text-white font-black text-[9px] px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
                      Chờ bạn ký số
                    </div>

                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-black text-xs flex items-center justify-center border border-amber-200 dark:border-amber-900 shrink-0">
                        W{item.week_number}
                      </span>
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                          Báo cáo Tuần {item.week_number} / {item.year}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                          Tác giả: <span className="text-slate-900 dark:text-slate-200 font-bold">{item.author_name || item.nguoi_lap}</span> ({item.department_name || item.don_vi})
                        </p>
                      </div>
                    </div>

                    <div className="p-2.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-100 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>Báo cáo này được gửi trình phê duyệt cho bạn. Vui lòng kiểm tra và Ký số xác thực PIN 6 số.</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          onSelectReport(item.id, item.week_number, item.year);
                          onClose();
                        }}
                        className="flex-1 py-1.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Xem nội dung
                      </button>

                      {onOpenDigitalSignature && (
                        <button
                          onClick={() => {
                            onSelectReport(item.id, item.week_number, item.year);
                            onOpenDigitalSignature(item.id);
                            onClose();
                          }}
                          className="flex-1 py-1.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-98 transition-all"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>Ký Số & Phê Duyệt</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      </div>
    </div>
  );
}
