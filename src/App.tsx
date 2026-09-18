import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { TableEditor } from './components/TableEditor';
import { ValidationPanel } from './components/ValidationPanel';
import { Footer } from './components/Footer';
import { PreviewModal } from './components/PreviewModal';
import { ConfigModal } from './components/ConfigModal';
import { LoginModal, UserProfile } from './components/LoginModal';
import { ReportHistoryDrawer } from './components/ReportHistoryDrawer';
import { CarryOverModal } from './components/CarryOverModal';
import { KanbanPlannerModal, KanbanTaskItem } from './components/KanbanPlannerModal';
import { AdminPanelModal, DepartmentItem } from './components/AdminPanelModal';
import { ShareReportModal } from './components/ShareReportModal';
import { CompletionProofModal } from './components/CompletionProofModal';
import { TaskDetailModal } from './components/TaskDetailModal';
import { ReportChoiceModal } from './components/ReportChoiceModal';
import { FileSpreadsheet, Upload, Download, Sparkles, CheckCircle, History, PlusCircle, Layout } from 'lucide-react';
import {
  TaskTable1,
  TaskTable2,
  ReportMetadata,
  validateReport,
  toInputDate
} from './utils/reportUtils';
import { exportWordReport, fetchReportDetail, saveReportData, triggerCarryOver, fetchReportHistory } from './services/api';
import { parseExcelFile, downloadExcelTemplate } from './utils/excelParser';
import { exportReportToExcel } from './utils/excelExporter';

const initialDataSample = {
  metadata: {
    tuan: 42,
    tuan_tiep: 43,
    nam: 2026,
    nguoi_lap: "",
    don_vi: "VĂN PHÒNG BAN QUẢN LÝ",
    co_quan_cap_tren: "BAN QUẢN LÝ CÁC KHU LIÊN HỢP XỬ LÝ CHẤT THẢI THÀNH PHỐ",
    ngay_lap: "20/10/2026"
  },
  table1: [
    {
      id: "t1_1",
      noi_dung: "Rà soát hồ sơ công chức quý IV",
      thoi_gian: "15/10/2026",
      trien_khai: "Đã hoàn thành rà soát 45 bộ hồ sơ",
      tien_do: "Hoàn thành",
      nhom: "Thường xuyên",
      isEdited: false
    },
    {
      id: "t1_2",
      noi_dung: "Báo cáo tổng kết tháng",
      thoi_gian: "Chưa nhập",
      trien_khai: "Đang soạn thảo văn bản trình Lãnh đạo",
      tien_do: "Đang thực hiện",
      nhom: "Thường xuyên",
      isEdited: true
    },
    {
      id: "t1_3",
      noi_dung: "Kiểm tra công tác lưu trữ hồ sơ",
      thoi_gian: "18/10/2026",
      trien_khai: "Đã thực hiện tại 3 đơn vị trực thuộc",
      tien_do: "Hoàn thành",
      nhom: "Thường xuyên",
      isEdited: false
    },
    {
      id: "t1_4",
      noi_dung: "Phối hợp tổ chức Hội nghị Chuyển đổi số",
      thoi_gian: "20/10/2026",
      trien_khai: "Đã gửi giấy mời, chốt danh sách đại biểu",
      tien_do: "Đang thực hiện",
      nhom: "Đột xuất",
      isEdited: false
    }
  ] as TaskTable1[],
  table2: [
    {
      id: "t2_1",
      noi_dung: "Ban hành kế hoạch Rà soát, triển khai các nội dung trọng tâm",
      thoi_gian_du_kien: "23/10/2026",
      san_pham_du_kien: "Dự thảo Kế hoạch trình duyệt",
      nhom: "Thường xuyên",
      isEdited: false
    }
  ] as TaskTable2[]
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('currentUser');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Lỗi khi nạp currentUser từ localStorage:', e);
    }
    return null;
  });

  const [metadata, setMetadata] = useState<ReportMetadata>(() => {
    const savedUser = (() => {
      try {
        const saved = localStorage.getItem('currentUser');
        if (saved) return JSON.parse(saved);
      } catch (e) { }
      return null;
    })();

    return {
      tuan: 42,
      tuan_tiep: 43,
      nam: 2026,
      nguoi_lap: savedUser?.full_name || "Chưa đăng nhập",
      don_vi: savedUser?.department_name || "Chưa chọn phòng ban",
      co_quan_cap_tren: "BAN QUẢN LÝ CÁC KHU LIÊN HỢP XỬ LÝ CHẤT THẢI THÀNH PHỐ",
      ngay_lap: toInputDate()
    };
  });

  const [hasLoadedData, setHasLoadedData] = useState<boolean>(false);
  const [table1, setTable1] = useState<TaskTable1[]>([]);
  const [table2, setTable2] = useState<TaskTable2[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);

  // Snapshot lưu trạng thái ban đầu để Khôi phục (BR13)
  const [initialSnapshot, setInitialSnapshot] = useState<{
    table1: TaskTable1[];
    table2: TaskTable2[];
  }>({
    table1: [],
    table2: []
  });

  const [syncedAt, setSyncedAt] = useState<string>("Chưa đồng bộ");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);
  const [recentlyCreatedWeek, setRecentlyCreatedWeek] = useState<number | null>(null);

  // States for main table proof validation & task detail modals
  const [pendingMainProofTask, setPendingMainProofTask] = useState<TaskTable1 | null>(null);
  const [activeMainDetailTask, setActiveMainDetailTask] = useState<KanbanTaskItem | null>(null);
  const [activeMainDetailMode, setActiveMainDetailMode] = useState<'view' | 'edit'>('view');
  const [isInitialLoadDone, setIsInitialLoadDone] = useState<boolean>(false);

  // Concurrency & Shared Report Choice states
  const [lastSaveUpdatedAt, setLastSaveUpdatedAt] = useState<string | null>(null);
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState<boolean>(false);
  const [sharedChoiceData, setSharedChoiceData] = useState<{ ownerName: string; week: number; year: number; reportId: string } | null>(null);
  const [hasPromptedChoiceSet, setHasPromptedChoiceSet] = useState<Set<string>>(new Set());

  // Modals & User Permissions
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isCarryOverOpen, setIsCarryOverOpen] = useState<boolean>(false);
  const [isKanbanPlannerOpen, setIsKanbanPlannerOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);
  const [userPermission, setUserPermission] = useState<'OWNER' | 'ADMIN' | 'EDIT' | 'VIEW' | 'NO_ACCESS'>('OWNER');

  // Lấy lỗi validation (BR14)
  const validationErrors = validateReport(table1, table2);

  // Load danh sách Phòng ban
  const loadDepartmentsList = async () => {
    try {
      const res = await fetch('/api/departments');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.departments) {
          setDepartments(data.departments);
        }
      }
    } catch (e) {
      console.warn('Không thể tải danh sách phòng ban:', e);
    }
  };

  useEffect(() => {
    loadDepartmentsList();
    if (!currentUser) {
      setIsLoginOpen(true);
    }
  }, []);

  // Tự động tìm báo cáo mới nhất từ CSDL của tài khoản khi ứng dụng khởi động hoặc reload (F5)
  useEffect(() => {
    if (!currentUser) return;

    const autoLoadLatestReportOnStart = async () => {
      setIsLoading(true);
      try {
        const historyRes = await fetchReportHistory(currentUser.department_id, currentUser.id);
        if (historyRes && historyRes.success && Array.isArray(historyRes.reports) && historyRes.reports.length > 0) {
          const latest = historyRes.reports[0];
          const latestWeek = latest.week_number;
          const latestYear = latest.year;

          setMetadata(prev => ({
            ...prev,
            tuan: latestWeek,
            tuan_tiep: latestWeek + 1,
            nam: latestYear
          }));
          setRecentlyCreatedWeek(latestWeek);
          await loadReportFromDB(currentUser.department_id, latestWeek, latestYear, latest.id);
        } else {
          await loadReportFromDB(currentUser.department_id, metadata.tuan, metadata.nam);
        }
      } catch (err) {
        console.warn('Lỗi autoLoadLatestReportOnStart:', err);
        await loadReportFromDB(currentUser.department_id, metadata.tuan, metadata.nam);
      } finally {
        setIsLoading(false);
        setIsInitialLoadDone(true);
      }
    };

    if (currentUser?.full_name) {
      setMetadata(prev => ({
        ...prev,
        nguoi_lap: currentUser.full_name,
        don_vi: currentUser.department_name || prev.don_vi
      }));
    }

    autoLoadLatestReportOnStart();
  }, [currentUser?.id, currentUser?.department_id]);

  // Tải báo cáo khi người dùng chủ động chọn đổi Tuần / Năm trên dropdown sau khi đã khởi động xong
  useEffect(() => {
    if (currentUser && isInitialLoadDone) {
      loadReportFromDB(currentUser.department_id, metadata.tuan, metadata.nam);
    }
  }, [metadata.tuan, metadata.nam]);


  const loadReportFromDB = async (deptId: string, week: number, year: number, reportId?: string) => {
    setIsLoading(true);
    const res = await fetchReportDetail(deptId, week, year, reportId, currentUser?.id);
    setIsLoading(false);

    if (res && res.success && res.data) {
      const fetchedTable1 = res.data.table1 || [];
      const fetchedTable2 = res.data.table2 || [];
      const valid1 = fetchedTable1.filter((t: any) => (t.noi_dung || '').trim().length > 0);
      const valid2 = fetchedTable2.filter((t: any) => (t.noi_dung || '').trim().length > 0);
      const hasAnyTask = valid1.length > 0 || valid2.length > 0;

      const meta = res.data.metadata;
      setUserPermission(meta.user_permission || 'OWNER');
      setLastSaveUpdatedAt(meta.updated_at || null);

      setMetadata(prev => ({
        ...meta,
        don_vi: meta.don_vi || currentUser?.department_name,
        nguoi_lap: meta.nguoi_lap || currentUser?.full_name
      }));
      setTable1(fetchedTable1);
      setTable2(fetchedTable2);
      setInitialSnapshot({
        table1: JSON.parse(JSON.stringify(fetchedTable1)),
        table2: JSON.parse(JSON.stringify(fetchedTable2))
      });
      setHasLoadedData(hasAnyTask);
      setSyncedAt(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));

      // If this report is owned by someone else (e.g. Leader) and user is STAFF with EDIT permissions
      const key = `${week}_${year}_${meta.report_id}`;
      if (
        meta.user_permission === 'EDIT' &&
        meta.account_id !== currentUser?.id &&
        !hasPromptedChoiceSet.has(key)
      ) {
        setSharedChoiceData({
          ownerName: meta.nguoi_lap || 'Tổ trưởng',
          week,
          year,
          reportId: meta.report_id
        });
        setIsChoiceModalOpen(true);
        setHasPromptedChoiceSet(prev => new Set(prev).add(key));
      }
    } else {
      setUserPermission('OWNER');
      setMetadata(prev => ({
        ...prev,
        report_id: `rpt_${currentUser?.id || 'user'}_w${week}_${year}`,
        tuan: week,
        tuan_tiep: week + 1,
        nam: year,
        don_vi: currentUser?.department_name || prev.don_vi,
        nguoi_lap: currentUser?.full_name || prev.nguoi_lap
      }));
      setTable1([]);
      setTable2([]);
      setInitialSnapshot({ table1: [], table2: [] });
      setHasLoadedData(false);
      setSyncedAt("Tuần mới (Chưa lưu)");
    }
  };

  // Tạo báo cáo trắng sạch sẽ từ đầu cho tuần được chọn
  const handleStartBlankReport = () => {
    setRecentlyCreatedWeek(metadata.tuan);
    setTable1([
      {
        id: `t1_init_${Date.now()}`,
        noi_dung: '',
        thoi_gian: 'Trong tuần',
        trien_khai: '',
        tien_do: 'Đang thực hiện',
        nhom: 'Thường xuyên',
        isEdited: true
      }
    ]);
    setTable2([
      {
        id: `t2_init_${Date.now()}`,
        noi_dung: '',
        thoi_gian_du_kien: 'Trong tuần',
        san_pham_du_kien: '',
        nhom: 'Thường xuyên',
        isEdited: true
      }
    ]);
    setInitialSnapshot({ table1: [], table2: [] });
    setHasLoadedData(true);
    showToast(`Đã khởi tạo Báo cáo trắng Tuần ${metadata.tuan}/${metadata.nam} cho ${currentUser?.department_name}`);
  };

  // Nạp dữ liệu mẫu thử nghiệm khi người dùng chủ động bấm
  const handleLoadSampleData = () => {
    setTable1(initialDataSample.table1);
    setTable2(initialDataSample.table2);
    setInitialSnapshot({
      table1: JSON.parse(JSON.stringify(initialDataSample.table1)),
      table2: JSON.parse(JSON.stringify(initialDataSample.table2))
    });
    setHasLoadedData(true);
    setSyncedAt(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    showToast('Đã nạp dữ liệu thử nghiệm!');
  };

  // Login Handler
  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('currentUser', JSON.stringify(user));
    } catch (e) {
      console.error('Lỗi khi lưu currentUser vào localStorage:', e);
    }
    setMetadata(prev => ({
      ...prev,
      don_vi: user.department_name,
      nguoi_lap: user.full_name
    }));
    showToast(`Đã chuyển sang tài khoản "${user.full_name}" (${user.department_code})`);
  };

  // Logout Handler
  const handleLogout = () => {
    try {
      localStorage.removeItem('currentUser');
    } catch (e) { }
    setCurrentUser(null);
    setMetadata(prev => ({
      ...prev,
      don_vi: "Chưa chọn phòng ban",
      nguoi_lap: "Chưa đăng nhập"
    }));
    setTable1([]);
    setTable2([]);
    setInitialSnapshot({ table1: [], table2: [] });
    setHasLoadedData(false);
    setIsLoginOpen(true);
    showToast('Đã đăng xuất tài khoản.');
  };

  // Select Report from History Drawer
  const handleSelectReportFromHistory = (reportId: string, week: number, year: number) => {
    setMetadata(prev => ({ ...prev, tuan: week, tuan_tiep: week + 1, nam: year }));
    loadReportFromDB(currentUser?.department_id || 'dept_vp', week, year, reportId);
    showToast(`Đã nạp báo cáo Tuần ${week}/${year}`);
  };

  // CORE ACTION: Kế thừa nhiệm vụ chưa hoàn thành sang Tuần mới
  const handleConfirmCarryOver = async () => {
    if (!currentUser) return;
    setIsLoading(true);

    const res = await triggerCarryOver(
      currentUser.department_id,
      metadata.tuan,
      metadata.nam,
      currentUser.id
    );

    setIsLoading(false);

    if (res && res.success) {
      const nextW = res.target_week;
      const nextY = res.target_year;
      setRecentlyCreatedWeek(nextW);
      setMetadata(prev => ({
        ...prev,
        tuan: nextW,
        tuan_tiep: nextW + 1,
        nam: nextY
      }));

      // Nạp dữ liệu báo cáo tuần mới đã được tự động kết chuyển
      await loadReportFromDB(currentUser.department_id, nextW, nextY, res.new_report_id);

      showToast(`🎉 ${res.message}! Đã chuyển ${res.carried_over_count} nhiệm vụ dở dang sang Tuần ${nextW}.`);
    } else {
      alert("Lỗi khi kết chuyển: " + (res.error || "Không thể khởi tạo tuần mới"));
    }
  };

  // Import từ File Sheet (.xlsx / .csv)
  const handleImportFile = async (file: File) => {
    setIsLoading(true);
    try {
      const parsed = await parseExcelFile(file);
      setRecentlyCreatedWeek(metadata.tuan);
      setTable1(parsed.table1);
      setTable2(parsed.table2);

      setInitialSnapshot({
        table1: JSON.parse(JSON.stringify(parsed.table1)),
        table2: JSON.parse(JSON.stringify(parsed.table2))
      });

      setHasLoadedData(true);
      const currentTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      setSyncedAt(currentTime);

      // Lưu tự động vào CSDL
      saveReportData({
        metadata: { ...metadata, department_id: currentUser?.department_id, account_id: currentUser?.id },
        table1: parsed.table1,
        table2: parsed.table2
      });

      showToast(`Đã import thành công tệp "${file.name}" (${parsed.table1.length + parsed.table2.length} nhiệm vụ)!`);
    } catch (err: any) {
      alert("Lỗi khi đọc file: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Export ra File Sheet (.xlsx)
  const handleExportExcel = () => {
    try {
      exportReportToExcel(metadata, table1, table2);
      showToast('Đã xuất file Excel báo cáo thành công!');
    } catch (err: any) {
      console.error('Error exporting Excel:', err);
      alert('Lỗi khi xuất file Excel: ' + (err?.message || err));
    }
  };

  // Đồng bộ lại từ CSDL
  const handleSync = async () => {
    if (currentUser) {
      await loadReportFromDB(currentUser.department_id, metadata.tuan, metadata.nam);
      showToast("Đã đồng bộ dữ liệu mới nhất từ CSDL!");
    }
  };

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleReset = () => {
    handleSync();
  };

  // BR13: Khôi phục
  const handleRestore = () => {
    if (initialSnapshot.table1.length === 0 && initialSnapshot.table2.length === 0) {
      alert("Chưa có snapshot dữ liệu để khôi phục.");
      return;
    }
    setTable1(JSON.parse(JSON.stringify(initialSnapshot.table1)));
    setTable2(JSON.parse(JSON.stringify(initialSnapshot.table2)));
    showToast("Đã khôi phục dữ liệu về trạng thái ban đầu!");
  };

  // Xóa nhanh toàn bộ nhiệm vụ & kế hoạch tuần
  const handleClearAllTasks = () => {
    if (table1.length === 0 && table2.length === 0) {
      showToast("Báo cáo tuần hiện tại đã trống!");
      return;
    }
    if (window.confirm("⚠️ BẠN CÓ CHẮC CHẮN MUỐN XÓA TOÀN BỘ NHIỆM VỤ VÀ KẾ HOẠCH TRONG TUẦN NÀY KHÔNG?\n\nHành động này sẽ xóa tất cả công việc ở cả Bảng I và Bảng II. Bạn có thể nhấn 'Đồng bộ' hoặc 'Khôi phục' để tải lại dữ liệu cũ nếu chưa bấm 'Lưu Báo Cáo'.")) {
      setTable1([]);
      setTable2([]);
      showToast("Đã xóa sạch toàn bộ nội dung công việc & kế hoạch tuần này!");
    }
  };

  const handleClearTable1 = () => {
    if (table1.length === 0) return;
    if (window.confirm("⚠️ Bạn có chắc chắn muốn xóa tất cả nhiệm vụ trong BẢNG I (Kết quả thực hiện công tác) không?")) {
      setTable1([]);
      showToast("Đã xóa toàn bộ nhiệm vụ Bảng I!");
    }
  };

  const handleClearTable2 = () => {
    if (table2.length === 0) return;
    if (window.confirm("⚠️ Bạn có chắc chắn muốn xóa tất cả kế hoạch trong BẢNG II (Kế hoạch tuần tiếp theo) không?")) {
      setTable2([]);
      showToast("Đã xóa toàn bộ kế hoạch Bảng II!");
    }
  };

  const handleScrollToRow = (rowId: string) => {
    setHighlightedRowId(rowId);
    const element = document.getElementById(`row_${rowId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => {
      setHighlightedRowId(null);
    }, 2000);
  };

  // Kế thừa bằng Kanban Planner
  const handleConfirmKanbanPlan = async (
    plannedTasks: KanbanTaskItem[],
    completedTasks: KanbanTaskItem[],
    cancelledTasks: KanbanTaskItem[]
  ) => {
    if (!currentUser) return;
    setIsLoading(true);

    const targetWeek = metadata.tuan + 1;
    const targetYear = metadata.nam;
    const targetReportId = `rpt_${currentUser.id}_w${targetWeek}_${targetYear}`;

    // Hàm xác định Bảng I hay Bảng II cho nhiệm vụ kế hoạch
    const isTable2Task = (t: KanbanTaskItem) => {
      if (t.targetTable === 2) return true;
      if (t.targetTable === 1) return false;
      // Mặc định: Nếu nhiệm vụ có nguồn từ BẢNG II (Kế hoạch tuần trước) thì giữ nguyên ở BẢNG II
      return t.originalTable === 2 || t.source === 'planned_table2';
    };

    // Tách các nhiệm vụ được gán vào Bảng I (thực hiện) vs Bảng II (kế hoạch tiếp theo)
    const table1Candidates = plannedTasks.filter(t => !isTable2Task(t));
    const table2Candidates = plannedTasks.filter(t => isTable2Task(t));

    // Table 1 (Nhiệm vụ thực hiện tuần mới - BẢNG I)
    const newTable1: TaskTable1[] = table1Candidates.map((t, idx) => ({
      id: `t1_kb_${t.id}_${idx}`,
      noi_dung: t.noi_dung,
      nhom: (t.nhom === 'Đột xuất' ? 'Đột xuất' : 'Thường xuyên') as 'Thường xuyên' | 'Đột xuất',
      thoi_gian: t.thoi_gian || 'Trong tuần',
      trien_khai: t.trien_khai || 'Triển khai theo kế hoạch Kanban',
      tien_do: 'Đang thực hiện',
      parent_task_id: t.parent_task_id || null
    }));

    // Table 2 (Kế hoạch tuần tiếp - BẢNG II) - Chỉ đưa các nhiệm vụ thuộc Bảng II
    const newTable2: TaskTable2[] = table2Candidates.map((t, idx) => ({
      id: `t2_kb_${t.id}_${idx}`,
      noi_dung: t.noi_dung,
      nhom: (t.nhom === 'Đột xuất' ? 'Đột xuất' : 'Thường xuyên') as 'Thường xuyên' | 'Đột xuất',
      thoi_gian_du_kien: t.thoi_gian || 'Trong tuần',
      san_pham_du_kien: t.san_pham_du_kien || 'Kế hoạch công tác',
      parent_task_id: t.parent_task_id || null
    }));

    // Cập nhật trạng thái Hoàn thành / Hủy cho nhiệm vụ tuần hiện tại
    let updatedTable1 = [...table1];
    completedTasks.forEach(t => {
      const idx = updatedTable1.findIndex(item => item.id === t.parent_task_id || item.noi_dung === t.noi_dung);
      if (idx !== -1) {
        updatedTable1[idx] = { ...updatedTable1[idx], tien_do: 'Hoàn thành' };
      }
    });

    cancelledTasks.forEach(t => {
      const idx = updatedTable1.findIndex(item => item.id === t.parent_task_id || item.noi_dung === t.noi_dung);
      if (idx !== -1) {
        updatedTable1[idx] = { ...updatedTable1[idx], tien_do: 'Hủy / Kết thúc' };
      }
    });

    // Save current week report with updated completed/cancelled tasks
    const currentReportId = metadata.report_id || `rpt_${currentUser.id}_w${metadata.tuan}_${metadata.nam}`;
    await saveReportData({
      metadata: {
        ...metadata,
        report_id: currentReportId,
        department_id: currentUser.department_id,
        account_id: currentUser.id
      },
      table1: updatedTable1,
      table2
    });

    // Save target week report
    const targetMetadata: ReportMetadata = {
      ...metadata,
      report_id: targetReportId,
      tuan: targetWeek,
      tuan_tiep: targetWeek + 1,
      nam: targetYear
    };

    setMetadata(targetMetadata);
    setRecentlyCreatedWeek(targetWeek);
    setTable1(newTable1);
    setTable2(newTable2);
    setHasLoadedData(true);

    await saveReportData({
      metadata: {
        ...targetMetadata,
        department_id: currentUser.department_id,
        account_id: currentUser.id
      },
      table1: newTable1,
      table2: newTable2
    });

    setIsLoading(false);
    showToast(`🎯 Khởi tạo Báo cáo Tuần ${targetWeek}/${targetYear} thành công bằng Kanban! (${plannedTasks.length} kế hoạch, ${completedTasks.length} hoàn thành, ${cancelledTasks.length} hủy)`);
  };

  // Lưu Báo Cáo vào CSDL
  const handleSaveReport = async () => {
    if (!currentUser) return;
    setIsLoading(true);

    const targetReportId = metadata.report_id || `rpt_${currentUser.id}_w${metadata.tuan}_${metadata.nam}`;

    const payload = {
      metadata: {
        ...metadata,
        report_id: targetReportId,
        department_id: currentUser.department_id,
        account_id: currentUser.id,
        tuan: metadata.tuan,
        nam: metadata.nam
      },
      table1,
      table2,
      client_last_updated_at: lastSaveUpdatedAt
    };

    let res = await saveReportData(payload);

    // Concurrency conflict check
    if (res && res.conflict) {
      setIsLoading(false);
      const userConfirm = window.confirm(`${res.message}\n\nBạn có muốn GHI ĐÈ thay đổi của bạn lên CSDL không?`);
      if (userConfirm) {
        setIsLoading(true);
        res = await saveReportData({ ...payload, force_save: true });
      } else {
        showToast('Đã hủy lưu để giữ dữ liệu CSDL.');
        return;
      }
    }

    setIsLoading(false);

    if (res && res.success) {
      const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      setSyncedAt(nowStr);
      setRecentlyCreatedWeek(metadata.tuan);
      setMetadata(prev => ({ ...prev, report_id: targetReportId }));
      setLastSaveUpdatedAt(new Date().toISOString());
      setInitialSnapshot({
        table1: JSON.parse(JSON.stringify(table1)),
        table2: JSON.parse(JSON.stringify(table2))
      });
      setHasLoadedData(true);
      showToast(`💾 Đã lưu thành công Báo cáo Tuần ${metadata.tuan}/${metadata.nam} (${table1.length + table2.length} nhiệm vụ) vào CSDL!`);
    } else {
      alert("Lỗi khi lưu báo cáo: " + (res.error || "Không thể kết nối máy chủ CSDL"));
    }
  };

  // Phím tắt Ctrl+S để Lưu nhanh báo cáo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveReport();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser, metadata, table1, table2]);

  // Xuất file Word .docx
  const handleGenerateWord = () => {
    if (!hasLoadedData || (table1.length === 0 && table2.length === 0)) {
      alert("Vui lòng Import File Sheet hoặc Đồng bộ dữ liệu trước khi xuất báo cáo!");
      return;
    }
    exportWordReport({
      metadata: {
        ...metadata,
        don_vi: currentUser?.department_name || metadata.don_vi,
        nguoi_lap: currentUser?.full_name || metadata.nguoi_lap
      },
      table1,
      table2
    });
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden text-slate-800 dark:text-slate-100 bg-[#f9f9ff] dark:bg-slate-950 transition-colors duration-300">
      {/* HEADER CỐ ĐỊNH */}
      <Header
        metadata={metadata}
        setMetadata={setMetadata}
        recentlyCreatedWeek={recentlyCreatedWeek}
        currentUser={currentUser}
        onSelectReport={(reportId) => {
          // If notification clicked, load that specific report
          fetchReportDetail('', 0, 0, reportId, currentUser?.id).then(res => {
            if (res && res.success && res.data) {
              setMetadata(prev => ({
                ...res.data.metadata,
                don_vi: res.data.metadata.don_vi,
                nguoi_lap: res.data.metadata.nguoi_lap
              }));
              setUserPermission(res.data.metadata.user_permission || 'VIEW');
              setTable1(res.data.table1 || []);
              setTable2(res.data.table2 || []);
              setHasLoadedData(true);
              showToast(`Đã chuyển tới Báo cáo được chia sẻ! (Quyền: ${res.data.metadata.user_permission})`);
            }
          });
        }}
      />

      {/* THANH CÔNG CỤ CỐ ĐỊNH */}
      <Toolbar
        metadata={metadata}
        setMetadata={setMetadata}
        recentlyCreatedWeek={recentlyCreatedWeek}
        onSync={handleSync}
        onReset={handleReset}
        onRestore={handleRestore}
        syncedAt={syncedAt}
        totalTasks={table1.length + table2.length}
        onGenerateWord={handleGenerateWord}
        onOpenPreview={() => setIsPreviewOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        isLoading={isLoading}
        onImportFile={handleImportFile}
        onExportExcel={handleExportExcel}
        onClearAll={handleClearAllTasks}
        currentUser={currentUser}
        userPermission={userPermission}
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenCarryOver={() => setIsCarryOverOpen(true)}
        onOpenKanbanPlanner={() => setIsKanbanPlannerOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenShare={() => setIsShareOpen(true)}
        onSave={handleSaveReport}
        onSwitchToPersonalReport={() => {
          if (!currentUser) return;
          const personalReportId = `rpt_${currentUser.id}_w${metadata.tuan}_${metadata.nam}`;
          loadReportFromDB(currentUser.department_id, metadata.tuan, metadata.nam, personalReportId);
          showToast(`Đã chuyển sang Báo cáo Cá nhân của bạn cho Tuần ${metadata.tuan}!`);
        }}
      />

      {/* THÔNG BÁO TOAST */}
      {statusMessage && (
        <div className="bg-emerald-600 text-white px-6 py-2.5 text-xs font-semibold flex items-center justify-between shadow-md z-50 transition-all animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-200" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-emerald-200 hover:text-white cursor-pointer font-bold">✕</button>
        </div>
      )}

      {/* NỘI DUNG CHÍNH (Layout Grid) */}
      <main className="flex-1 overflow-hidden grid grid-cols-12 gap-0 relative">
        {!hasLoadedData ? (
          /* Màn hình khởi tạo chưa có dữ liệu */
          <div className="col-span-12 flex flex-col items-center justify-center p-8 bg-slate-50/80 dark:bg-slate-950/90 overflow-y-auto transition-colors duration-300">
            <div className="max-w-4xl w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-8 space-y-6 text-center transition-colors duration-300">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 dark:bg-slate-800 text-[#005dac] dark:text-blue-400 border border-blue-100 dark:border-slate-700 shadow-2xs mb-2">
                <FileSpreadsheet className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-[#001e30] dark:text-white tracking-tight">
                  BÁO CÁO TUẦN {metadata.tuan}/{metadata.nam} - {currentUser?.department_name || 'ĐƠN VỊ'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl mx-auto leading-relaxed">
                  Chưa có dữ liệu báo cáo cho tuần này. Bạn có thể tạo báo cáo mới, lập kế hoạch dạng Kanban kéo thả, kế thừa nhiệm vụ dở dang từ tuần trước hoặc import từ tệp Excel.
                </p>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 max-w-3xl mx-auto pt-2">
                <button
                  onClick={handleStartBlankReport}
                  className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-600 to-[#005dac] hover:from-blue-700 hover:to-[#004786] text-white rounded-xl shadow-md cursor-pointer transition-all hover:scale-[1.02] group"
                >
                  <PlusCircle className="w-6 h-6 text-blue-100 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-xs">📝 Tạo Báo Cáo Mới</span>
                  <span className="text-[10px] text-blue-100 mt-0.5">Soạn thảo trắng sạch</span>
                </button>

                <button
                  onClick={() => setIsKanbanPlannerOpen(true)}
                  className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white rounded-xl shadow-md cursor-pointer transition-all hover:scale-[1.02] group"
                >
                  <Layout className="w-6 h-6 text-purple-200 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-xs">🎯 Kế Hoạch Kanban</span>
                  <span className="text-[10px] text-purple-200 mt-0.5">Phân loại kéo thả mượt mà</span>
                </button>

                <button
                  onClick={() => setIsCarryOverOpen(true)}
                  className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl shadow-md cursor-pointer transition-all hover:scale-[1.02] group"
                >
                  <Sparkles className="w-6 h-6 text-amber-100 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-xs">⚡ Kế thừa Nhiệm vụ</span>
                  <span className="text-[10px] text-amber-100 mt-0.5">Lấy việc dở dang tuần trước</span>
                </button>

                <label className="flex flex-col items-center justify-center p-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-md cursor-pointer transition-all hover:scale-[1.02] group">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleImportFile(e.target.files[0]);
                        e.target.value = '';
                      }
                    }}
                    className="hidden"
                  />
                  <Upload className="w-6 h-6 text-amber-300 mb-1.5 group-hover:bounce" />
                  <span className="font-bold text-xs">Import File Excel</span>
                  <span className="text-[10px] text-slate-300 mt-0.5">Đọc &amp; điền Form Word</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-center gap-4 text-xs">
                <button
                  onClick={downloadExcelTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition-all font-medium cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  Tải Mẫu File Excel chuẩn (.xlsx)
                </button>

                <button
                  onClick={handleLoadSampleData}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg border border-amber-200 transition-all font-medium cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Nạp Dữ Liệu Thử Nghiệm (Demo)
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* MÀN HÌNH CHÍNH CÓ DỮ LIỆU */
          <>
            <TableEditor
              table1={table1}
              setTable1={setTable1}
              table2={table2}
              setTable2={setTable2}
              highlightedRowId={highlightedRowId}
              tuan={metadata.tuan}
              tuanTiep={metadata.tuan_tiep}
              nam={metadata.nam}
              isReadOnly={userPermission === 'VIEW'}
              onOpenProofModal={(row) => setPendingMainProofTask(row)}
              onOpenDetailModal={(row, mode) => {
                setActiveMainDetailTask({
                  id: row.id,
                  noi_dung: row.noi_dung,
                  nhom: row.nhom,
                  thoi_gian: row.thoi_gian,
                  trien_khai: row.trien_khai,
                  tien_do: row.tien_do,
                  san_pham: row.san_pham,
                  file_minh_chung: row.file_minh_chung,
                  file_original_name: row.file_original_name,
                  source: 'unfinished_table1'
                });
                setActiveMainDetailMode(mode);
              }}
              onClearTable1={handleClearTable1}
              onClearTable2={handleClearTable2}
            />

            <ValidationPanel
              errors={validationErrors}
              onScrollToRow={handleScrollToRow}
              table1={table1}
            />
          </>
        )}
      </main>

      {/* THANH TRẠNG THÁI CỐ ĐỊNH */}
      <Footer table1={table1} table2={table2} />

      {/* MODAL XEM TRƯỚC / IN / TẢI BÁO CÁO */}
      <PreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        table1={table1}
        table2={table2}
        metadata={{
          ...metadata,
          don_vi: currentUser?.department_name || metadata.don_vi,
          nguoi_lap: currentUser?.full_name || metadata.nguoi_lap
        }}
        setMetadata={setMetadata}
        onDownloadWord={handleGenerateWord}
      />

      {/* MODAL MÃ GOOGLE APPS SCRIPT */}
      <ConfigModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* MODAL ĐĂNG NHẬP XÁC THỰC PHÒNG BAN */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* DRAWER LỊCH SỬ BÁO CÁO TUẦN */}
      <ReportHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        currentUser={currentUser}
        onSelectReport={handleSelectReportFromHistory}
        onRequestCarryOver={(reportId, week, year) => {
          setMetadata(prev => ({ ...prev, tuan: week, tuan_tiep: week + 1, nam: year }));
          setIsHistoryOpen(false);
          setIsCarryOverOpen(true);
        }}
      />

      {/* MODAL KẾ THỪA NHIỆM VỤ SANG TUẦN MỚI */}
      <CarryOverModal
        isOpen={isCarryOverOpen}
        onClose={() => setIsCarryOverOpen(false)}
        sourceWeek={metadata.tuan}
        sourceYear={metadata.nam}
        table1={table1}
        table2={table2}
        currentUser={currentUser}
        onConfirmCarryOver={handleConfirmCarryOver}
      />

      {/* MODAL LẬP KẾ HOẠCH DẠNG KANBAN */}
      <KanbanPlannerModal
        isOpen={isKanbanPlannerOpen}
        onClose={() => setIsKanbanPlannerOpen(false)}
        sourceWeek={metadata.tuan}
        sourceYear={metadata.nam}
        table1={table1}
        table2={table2}
        currentUser={currentUser}
        onConfirmKanbanPlan={handleConfirmKanbanPlan}
      />

      {/* MODAL TRANG QUẢN TRỊ ADMIN */}
      <AdminPanelModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        departments={departments}
        onRefreshData={loadDepartmentsList}
      />

      {/* MODAL CHIA SẺ BÁO CÁO */}
      {currentUser && (
        <ShareReportModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          reportId={metadata.report_id || `rpt_${currentUser.id}_w${metadata.tuan}_${metadata.nam}`}
          reportTitle={`Báo cáo Tuần ${metadata.tuan}/${metadata.nam} - ${currentUser.full_name}`}
          currentUser={currentUser}
        />
      )}

      {/* MODAL XÁC NHẬN MINH CHỨNG HOÀN THÀNH MAIN PAGE */}
      <CompletionProofModal
        isOpen={!!pendingMainProofTask}
        taskTitle={pendingMainProofTask?.noi_dung || ''}
        onClose={() => setPendingMainProofTask(null)}
        onConfirm={(proofData) => {
          if (!pendingMainProofTask) return;
          setTable1(prev =>
            prev.map(t =>
              t.id === pendingMainProofTask.id
                ? {
                  ...t,
                  tien_do: 'Hoàn thành',
                  san_pham: proofData.san_pham,
                  file_minh_chung: proofData.file_minh_chung,
                  file_original_name: proofData.file_original_name,
                  isEdited: true
                }
                : t
            )
          );
          setPendingMainProofTask(null);
        }}
      />

      {/* MODAL XEM CHI TIẾT & CHỈNH SỬA MAIN PAGE */}
      <TaskDetailModal
        isOpen={!!activeMainDetailTask}
        mode={activeMainDetailMode}
        task={activeMainDetailTask}
        onClose={() => setActiveMainDetailTask(null)}
        onSave={(updatedTask) => {
          setTable1(prev =>
            prev.map(t =>
              t.id === updatedTask.id
                ? {
                  ...t,
                  noi_dung: updatedTask.noi_dung,
                  nhom: (updatedTask.nhom === 'Đột xuất' ? 'Đột xuất' : 'Thường xuyên') as any,
                  thoi_gian: updatedTask.thoi_gian || 'Trong tuần',
                  trien_khai: updatedTask.trien_khai || '',
                  tien_do: updatedTask.tien_do || 'Đang thực hiện',
                  san_pham: updatedTask.san_pham || '',
                  file_minh_chung: updatedTask.file_minh_chung || '',
                  file_original_name: updatedTask.file_original_name || '',
                  isEdited: true
                }
                : t
            )
          );
        }}
      />

      {/* MODAL LỰA CHỌN BÁO CÁO DÙNG CHUNG VS CÁ NHÂN */}
      <ReportChoiceModal
        isOpen={isChoiceModalOpen}
        weekNumber={sharedChoiceData?.week || metadata.tuan}
        year={sharedChoiceData?.year || metadata.nam}
        sharedOwnerName={sharedChoiceData?.ownerName || 'Tổ trưởng'}
        onClose={() => setIsChoiceModalOpen(false)}
        onSelectSharedReport={() => {
          setIsChoiceModalOpen(false);
          showToast(`Đã mở Báo cáo Dùng chung của ${sharedChoiceData?.ownerName || 'Tổ trưởng'}`);
        }}
        onSelectPersonalReport={() => {
          setIsChoiceModalOpen(false);
          if (!currentUser) return;
          const personalReportId = `rpt_${currentUser.id}_w${metadata.tuan}_${metadata.nam}`;
          loadReportFromDB(currentUser.department_id, metadata.tuan, metadata.nam, personalReportId);
          showToast(`Đã chuyển sang Báo cáo Cá nhân của bạn cho Tuần ${metadata.tuan}!`);
        }}
      />
    </div>
  );
}
