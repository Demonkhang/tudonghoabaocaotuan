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
import { FileSpreadsheet, Upload, Download, Sparkles, CheckCircle, History, PlusCircle, Layout } from 'lucide-react';
import {
  TaskTable1,
  TaskTable2,
  ReportMetadata,
  validateReport
} from './utils/reportUtils';
import { exportWordReport, fetchReportDetail, saveReportData, triggerCarryOver, fetchReportHistory } from './services/api';
import { parseExcelFile, downloadExcelTemplate } from './utils/excelParser';

const initialDataSample = {
  metadata: {
    tuan: 42,
    tuan_tiep: 43,
    nam: 2026,
    nguoi_lap: "Trần Thuận Hóa",
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
  const [currentUser, setCurrentUser] = useState<UserProfile | null>({
    id: 'acc_vp_hoa',
    username: 'vanphong',
    full_name: 'Trần Thuận Hóa',
    role: 'LEADER',
    department_id: 'dept_vp',
    department_name: 'Văn phòng Ban Quản lý',
    department_code: 'VP'
  });

  const [metadata, setMetadata] = useState<ReportMetadata>({
    tuan: 42,
    tuan_tiep: 43,
    nam: 2026,
    nguoi_lap: "Trần Thuận Hóa",
    don_vi: "Văn phòng Ban Quản lý",
    co_quan_cap_tren: "BAN QUẢN LÝ CÁC KHU LIÊN HỢP XỬ LÝ CHẤT THẢI THÀNH PHỐ",
    ngay_lap: "20/10/2026"
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
  const [isInitialLoadDone, setIsInitialLoadDone] = useState<boolean>(false);

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

    autoLoadLatestReportOnStart();
  }, [currentUser?.id, currentUser?.department_id]);

  // Tải báo cáo khi người dùng chủ động chọn đổi Tuần / Năm trên dropdown sau khi đã khởi động xong
  useEffect(() => {
    if (currentUser && isInitialLoadDone) {
      loadReportFromDB(currentUser.department_id, metadata.tuan, metadata.nam);
    }
  }, [metadata.tuan, metadata.nam]);

  // Kiểm tra nếu tuần không có nhiệm vụ nào thì lập tức quay về màn hình khởi tạo
  useEffect(() => {
    if (hasLoadedData) {
      const valid1 = table1.filter(t => t.noi_dung.trim().length > 0);
      const valid2 = table2.filter(t => t.noi_dung.trim().length > 0);
      if (valid1.length === 0 && valid2.length === 0) {
        setHasLoadedData(false);
      }
    }
  }, [table1, table2, hasLoadedData]);

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

      setUserPermission(res.data.metadata.user_permission || 'OWNER');
      setMetadata(prev => ({
        ...res.data.metadata,
        don_vi: res.data.metadata.don_vi || currentUser?.department_name,
        nguoi_lap: res.data.metadata.nguoi_lap || currentUser?.full_name
      }));
      setTable1(fetchedTable1);
      setTable2(fetchedTable2);
      setInitialSnapshot({
        table1: JSON.parse(JSON.stringify(fetchedTable1)),
        table2: JSON.parse(JSON.stringify(fetchedTable2))
      });
      setHasLoadedData(hasAnyTask);
      setSyncedAt(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
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
    setMetadata(prev => ({
      ...prev,
      don_vi: user.department_name,
      nguoi_lap: user.full_name
    }));
    showToast(`Đã chuyển sang tài khoản "${user.full_name}" (${user.department_code})`);
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
    const targetReportId = `rpt_${currentUser.department_id}_w${targetWeek}_${targetYear}`;

    // Tách các nhiệm vụ được gán vào Bảng I (thực hiện) vs Bảng II (kế hoạch tiếp theo)
    const table1Candidates = plannedTasks.filter(t => t.targetTable !== 2);
    const table2Candidates = plannedTasks.filter(t => t.targetTable === 2);

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
    const currentReportId = `rpt_${currentUser.department_id}_w${metadata.tuan}_${metadata.nam}`;
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

    const targetReportId = `rpt_${currentUser.department_id}_w${metadata.tuan}_${metadata.nam}`;

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
      table2
    };

    const res = await saveReportData(payload);
    setIsLoading(false);

    if (res && res.success) {
      const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      setSyncedAt(nowStr);
      setRecentlyCreatedWeek(metadata.tuan);
      setMetadata(prev => ({ ...prev, report_id: targetReportId }));
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
    <div className="flex flex-col h-screen overflow-hidden text-slate-800 bg-[#f9f9ff]">
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
        currentUser={currentUser}
        userPermission={userPermission}
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenCarryOver={() => setIsCarryOverOpen(true)}
        onOpenKanbanPlanner={() => setIsKanbanPlannerOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenShare={() => setIsShareOpen(true)}
        onSave={handleSaveReport}
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
          <div className="col-span-12 flex flex-col items-center justify-center p-8 bg-slate-50/80 overflow-y-auto">
            <div className="max-w-4xl w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-8 space-y-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 text-[#005dac] border border-blue-100 shadow-2xs mb-2">
                <FileSpreadsheet className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-[#001e30] tracking-tight">
                  BÁO CÁO TUẦN {metadata.tuan}/{metadata.nam} - {currentUser?.department_name || 'ĐƠN VỊ'}
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xl mx-auto leading-relaxed">
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
    </div>
  );
}
