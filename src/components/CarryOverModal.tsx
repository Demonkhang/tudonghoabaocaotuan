import React, { useState, useEffect } from 'react';
import { Sparkles, AlertCircle, RefreshCw, Repeat, Clock, Calendar, CheckSquare, Square, Layers, Folder, ShieldCheck } from 'lucide-react';
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
  reportType?: 'SINGLE' | 'CONSOLIDATED_OFFICE';
  activeTeamCode?: 'VAN_THU' | 'CDS' | 'OFFICE_MASTER';
  onConfirmCarryOver: (selectedTaskIds?: string[]) => Promise<void>;
}

export function CarryOverModal({
  isOpen,
  onClose,
  sourceWeek,
  sourceYear,
  table1,
  table2,
  currentUser,
  reportType = 'SINGLE',
  activeTeamCode = 'OFFICE_MASTER',
  onConfirmCarryOver
}: CarryOverModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Lọc dữ liệu theo Form & Vị trí làm việc hiện tại
  const filteredTable1 = (table1 || []).filter(t => {
    if (reportType === 'CONSOLIDATED_OFFICE' && (activeTeamCode === 'VAN_THU' || activeTeamCode === 'CDS')) {
      return !t.team_code || t.team_code === activeTeamCode;
    }
    return true;
  });

  const filteredTable2 = (table2 || []).filter(t => {
    if (reportType === 'CONSOLIDATED_OFFICE' && (activeTeamCode === 'VAN_THU' || activeTeamCode === 'CDS')) {
      return !t.team_code || t.team_code === activeTeamCode;
    }
    return true;
  });

  // 1. Phân loại Bảng I - Nhiệm vụ Thường xuyên
  const t1_tx = filteredTable1.filter(
    t => (t.nhom === 'Thường xuyên' || t.is_recurring) && t.noi_dung && t.noi_dung.trim().length > 0
  );
  const t1_tx_ids = new Set(t1_tx.map(t => t.id));

  // 2. Phân loại Bảng I - Nhiệm vụ Đột xuất (Chưa hoàn thành / Dở dang)
  const t1_dx = filteredTable1.filter(
    t => t.tien_do !== 'Hoàn thành' && !t1_tx_ids.has(t.id) && t.noi_dung && t.noi_dung.trim().length > 0
  );

  // 3. Phân loại Bảng II - Kế hoạch đôn lên Bảng I
  const t2_planned = filteredTable2.filter(
    t => t.noi_dung && t.noi_dung.trim().length > 0
  );

  const allEligibleTasks = [...t1_tx, ...t1_dx, ...t2_planned];
  const totalEligible = allEligibleTasks.length;

  // Helper nhóm nhiệm vụ theo Bộ phận (Văn thư / CĐS / Khác)
  const groupTasksByDepartment = <T extends TaskTable1 | TaskTable2>(tasks: T[]) => {
    const vanThu = tasks.filter(t => t.team_code === 'VAN_THU');
    const cds = tasks.filter(t => t.team_code === 'CDS');
    const other = tasks.filter(t => t.team_code !== 'VAN_THU' && t.team_code !== 'CDS');
    return { vanThu, cds, other };
  };

  const t1_tx_dept = groupTasksByDepartment(t1_tx);
  const t1_dx_dept = groupTasksByDepartment(t1_dx);
  const t2_planned_dept = groupTasksByDepartment(t2_planned);

  // Khởi tạo trạng thái chọn tất cả mặc định khi mở modal
  useEffect(() => {
    if (isOpen) {
      const initialIds = new Set<string>(allEligibleTasks.map(t => t.id));
      setSelectedIds(initialIds);
    }
  }, [isOpen, table1, table2, reportType, activeTeamCode]);

  if (!isOpen) return null;

  const targetWeek = sourceWeek + 1;
  const targetYear = sourceYear;

  const getFormLabel = () => {
    if (reportType === 'CONSOLIDATED_OFFICE') {
      if (activeTeamCode === 'VAN_THU') return 'Báo cáo Tổng hợp NĐ30 (Tổ Văn thư – Lưu trữ)';
      if (activeTeamCode === 'CDS') return 'Báo cáo Tổng hợp NĐ30 (Tổ Chuyển đổi số)';
      return 'Báo cáo Tuần Tổng Hợp NĐ30 (Master Văn phòng)';
    }
    return currentUser?.department_name || 'Báo cáo Tuần Đơn cá nhân / phòng ban';
  };

  const toggleTask = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === totalEligible) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allEligibleTasks.map(t => t.id)));
    }
  };

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirmCarryOver(Array.from(selectedIds));
      onClose();
    } catch (err) {
      console.error('Lỗi kết chuyển:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Render một dòng nhiệm vụ trong danh sách
  const renderTaskRow = (item: TaskTable1 | TaskTable2, idx: number, themeColor: 'amber' | 'orange' | 'blue') => {
    const isChecked = selectedIds.has(item.id);
    const badgeText = ('tien_do' in item) ? (item.tien_do || 'Đang thực hiện') : ('san_pham_du_kien' in item ? (item.san_pham_du_kien || 'Kế hoạch') : 'Kế hoạch');

    const themeStyles = {
      amber: isChecked ? 'bg-amber-50/70 border-amber-300 text-slate-900 shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-500 opacity-70 hover:opacity-100',
      orange: isChecked ? 'bg-orange-50/70 border-orange-300 text-slate-900 shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-500 opacity-70 hover:opacity-100',
      blue: isChecked ? 'bg-blue-50/70 border-blue-300 text-slate-900 shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-500 opacity-70 hover:opacity-100'
    };

    const checkboxColors = {
      amber: 'text-amber-600 accent-amber-600',
      orange: 'text-orange-600 accent-orange-600',
      blue: 'text-blue-600 accent-blue-600'
    };

    const isStarred = item.is_starred || item.nhom === 'Thường xuyên' || item.is_recurring;

    return (
      <div
        key={item.id}
        onClick={() => toggleTask(item.id)}
        className={`p-2.5 rounded-xl text-xs flex items-center justify-between border transition-all cursor-pointer ${themeStyles[themeColor]}`}
      >
        <div className="flex items-center gap-2 flex-1 pr-2">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => {}}
            className={`w-3.5 h-3.5 rounded cursor-pointer ${checkboxColors[themeColor]}`}
          />
          <span className="font-bold text-slate-400 text-[11px]">{idx + 1}.</span>
          {isStarred && (
            <span className="text-amber-500 font-bold text-xs shrink-0" title="Nhiệm vụ mẫu / Thường xuyên">
              ★
            </span>
          )}
          <span className="font-medium text-slate-800 leading-snug">{item.noi_dung}</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 bg-slate-200/80 text-slate-700 rounded font-semibold shrink-0">
          {badgeText}
        </span>
      </div>
    );
  };

  // Render một nhóm Bộ phận chuyên môn (Văn thư / CĐS / Khác)
  const renderDepartmentBlock = <T extends TaskTable1 | TaskTable2>(
    deptTitle: string,
    deptTasks: T[],
    themeColor: 'amber' | 'orange' | 'blue'
  ) => {
    if (!deptTasks || deptTasks.length === 0) return null;

    return (
      <div className="ml-3 mt-1.5 space-y-1">
        <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 pt-1">
          <Folder className="w-3.5 h-3.5 text-slate-500" />
          <span>{deptTitle} ({deptTasks.length})</span>
        </div>
        <div className="space-y-1 pl-2">
          {deptTasks.map((t, idx) => renderTaskRow(t, idx, themeColor))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[200] p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 p-5 text-white relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-amber-100 hover:text-white cursor-pointer font-bold text-lg transition-all"
          >
            ✕
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-xl border border-white/20 shadow-inner">
              <Sparkles className="w-7 h-7 text-amber-200" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Xác nhận Kết chuyển & Kế thừa Tuần mới</h3>
              <p className="text-xs text-amber-100 mt-0.5">
                Kế thừa nhiệm vụ theo đúng cấu trúc Form từ Tuần {sourceWeek} sang Tuần {targetWeek}
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Active Form Position Info Alert */}
          <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 space-y-1.5 text-xs text-amber-900 shadow-xs">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <Layers className="w-4.5 h-4.5 text-amber-600 shrink-0" />
              <span>{getFormLabel()}</span>
            </div>
            <p className="text-[11px] text-amber-900 leading-relaxed">
              Hệ thống lọc ra <strong className="text-amber-950">{totalEligible} nhiệm vụ</strong> xếp đúng khuôn Bảng & Bộ phận để điền sẵn cho <strong className="text-amber-950">Tuần {targetWeek}/{targetYear}</strong>.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-100/70 p-1.5 rounded-lg border border-emerald-200 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Kết quả & sản phẩm hoàn thành cũ sẽ được <strong>làm sạch tự động</strong> cho Tuần {targetWeek} (không copy văn bản/số liệu cũ).</span>
            </div>
          </div>

          {/* Quick Filter Bar & Select All */}
          <div className="flex items-center justify-between py-1 border-b border-slate-100 text-xs shrink-0">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 font-bold text-slate-700 hover:text-amber-600 cursor-pointer transition-colors"
            >
              {selectedIds.size === totalEligible && totalEligible > 0 ? (
                <CheckSquare className="w-4 h-4 text-amber-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>Chọn tất cả ({selectedIds.size}/{totalEligible})</span>
            </button>

            <span className="text-[11px] text-slate-500 italic">
              Đánh dấu các nhiệm vụ bạn muốn kế thừa sang Tuần {targetWeek}
            </span>
          </div>

          {/* BLOCK 1: BẢNG I - NHIỆM VỤ THƯỜNG XUYÊN */}
          <div className="space-y-2 border border-slate-200/80 rounded-xl p-3 bg-slate-50/50">
            <h4 className="text-xs font-extrabold text-slate-800 flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="flex items-center gap-1.5 text-amber-900">
                <Repeat className="w-4 h-4 text-amber-600" />
                BẢNG I — I. Nhiệm vụ Thường xuyên ({t1_tx.length})
              </span>
              <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-bold">
                Tự động lặp lại
              </span>
            </h4>

            {t1_tx.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-2">Không có nhiệm vụ Thường xuyên.</p>
            ) : (
              <div>
                {renderDepartmentBlock('1. Bộ phận Văn thư – Lưu trữ', t1_tx_dept.vanThu, 'amber')}
                {renderDepartmentBlock('2. Bộ phận Chuyển đổi số', t1_tx_dept.cds, 'amber')}
                {renderDepartmentBlock('3. Nhiệm vụ Phòng ban chung', t1_tx_dept.other, 'amber')}
              </div>
            )}
          </div>

          {/* BLOCK 2: BẢNG I - NHIỆM VỤ ĐỘT XUẤT CHƯA HOÀN THÀNH */}
          <div className="space-y-2 border border-slate-200/80 rounded-xl p-3 bg-slate-50/50">
            <h4 className="text-xs font-extrabold text-slate-800 flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="flex items-center gap-1.5 text-orange-900">
                <Clock className="w-4 h-4 text-orange-600" />
                BẢNG I — II. Nhiệm vụ Đột xuất chưa hoàn thành ({t1_dx.length})
              </span>
              <span className="text-[10px] text-orange-800 bg-orange-100 px-2 py-0.5 rounded font-bold">
                Chuyển tiếp làm việc
              </span>
            </h4>

            {t1_dx.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-2">Tất cả nhiệm vụ đột xuất tuần trước đã hoàn thành 100%!</p>
            ) : (
              <div>
                {renderDepartmentBlock('1. Bộ phận Văn thư – Lưu trữ', t1_dx_dept.vanThu, 'orange')}
                {renderDepartmentBlock('2. Bộ phận Chuyển đổi số', t1_dx_dept.cds, 'orange')}
                {renderDepartmentBlock('3. Nhiệm vụ Phòng ban chung', t1_dx_dept.other, 'orange')}
              </div>
            )}
          </div>

          {/* BLOCK 3: BẢNG II - KẾ HOẠCH ĐÔN LÊN BẢNG I */}
          <div className="space-y-2 border border-slate-200/80 rounded-xl p-3 bg-slate-50/50">
            <h4 className="text-xs font-extrabold text-slate-800 flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="flex items-center gap-1.5 text-blue-900">
                <Calendar className="w-4 h-4 text-blue-600" />
                BẢNG II — Kế hoạch tuần trước đôn lên Bảng I ({t2_planned.length})
              </span>
              <span className="text-[10px] text-blue-800 bg-blue-100 px-2 py-0.5 rounded font-bold">
                Triển khai tuần tới
              </span>
            </h4>

            {t2_planned.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-2">Không có mục kế hoạch nào từ Bảng II tuần trước.</p>
            ) : (
              <div>
                {renderDepartmentBlock('1. Bộ phận Văn thư – Lưu trữ', t2_planned_dept.vanThu, 'blue')}
                {renderDepartmentBlock('2. Bộ phận Chuyển đổi số', t2_planned_dept.cds, 'blue')}
                {renderDepartmentBlock('3. Kế hoạch Phòng ban chung', t2_planned_dept.other, 'blue')}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-600 font-semibold">
            Đã chọn: <span className="text-amber-700 font-bold">{selectedIds.size}</span> / {totalEligible} nhiệm vụ
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-all"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing || selectedIds.size === 0}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Đang khởi tạo...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Đồng ý Khởi tạo Báo cáo Tuần {targetWeek} ({selectedIds.size})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
