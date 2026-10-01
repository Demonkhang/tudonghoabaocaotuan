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
import { StandaloneTaskKanbanModal } from './components/StandaloneTaskKanbanModal';
import { UserProfileModal } from './components/UserProfileModal';
import { HomeDashboard } from './components/HomeDashboard';
import { DocInspectionModal, DocInspectionStatItem, ConsolidatedReportMetaItem } from './components/DocInspectionModal';
import { ConfirmModal, ConfirmModalProps } from './components/ConfirmModal';
import { SignatureSetupModal } from './components/SignatureSetupModal';
import { ApprovalChainModal } from './components/ApprovalChainModal';
import { DigitalSignatureModal } from './components/DigitalSignatureModal';
import { fetchReportSignaturesApi } from './services/api';
import { FileSpreadsheet, Upload, Download, Sparkles, CheckCircle, History, PlusCircle, Layout } from 'lucide-react';
import {
  TaskTable1,
  TaskTable2,
  ReportMetadata,
  validateReport,
  toInputDate
} from './utils/reportUtils';
import { exportWordReport, fetchReportDetail, saveReportData, triggerCarryOver, fetchReportHistory, fetchSyncedDirectiveTasks, fetchConsolidatedReportDetail, saveConsolidatedReportData, exportConsolidatedWordReport } from './services/api';
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
  const [isStandaloneTaskKanbanOpen, setIsStandaloneTaskKanbanOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState<boolean>(false);
  const [isSignatureSetupOpen, setIsSignatureSetupOpen] = useState<boolean>(false);
  const [isApprovalChainOpen, setIsApprovalChainOpen] = useState<boolean>(false);
  const [isDigitalSignatureOpen, setIsDigitalSignatureOpen] = useState<boolean>(false);
  const [reportSignatures, setReportSignatures] = useState<any[]>([]);
  const [userPermission, setUserPermission] = useState<'OWNER' | 'ADMIN' | 'EDIT' | 'VIEW' | 'NO_ACCESS'>('OWNER');
  const [confirmModalConfig, setConfirmModalConfig] = useState<ConfirmModalProps | null>(null);

  // Consolidated Office Report States (Nghị định 30)
  const [reportType, setReportType] = useState<'SINGLE' | 'CONSOLIDATED_OFFICE'>('SINGLE');
  const [activeTeamCode, setActiveTeamCode] = useState<'VAN_THU' | 'CDS' | 'OFFICE_MASTER'>('OFFICE_MASTER');
  const [docInspectionStats, setDocInspectionStats] = useState<DocInspectionStatItem[]>([]);
  const [consolidatedMeta, setConsolidatedMeta] = useState<ConsolidatedReportMetaItem>(() => {
    const savedUser = (() => {
      try {
        const saved = localStorage.getItem('currentUser');
        if (saved) return JSON.parse(saved);
      } catch (e) { }
      return null;
    })();

    return {
      to_truong_name: 'Trần Thuận Hòa',
      nguoi_lap_name: savedUser?.full_name || '',
      pho_chanh_van_phong_name: 'Nguyễn Đức Thắng',
      chanh_van_phong_name: 'Hoàng Văn Dương',
      ending_note: 'Trên đây là báo cáo tình hình thực hiện nhiệm vụ Tuần và kế hoạch thực hiện nhiệm vụ trọng tâm công tác Tuần tiếp theo. Kính trình Lãnh đạo phòng xem xét./.'
    };
  });
  const [isDocInspectionModalOpen, setIsDocInspectionModalOpen] = useState<boolean>(false);

  // Main navigation view tab state: 'dashboard' (Trang chủ) | 'editor' (Soạn báo cáo)
  const [activeMainTab, setActiveMainTab] = useState<'dashboard' | 'editor'>('dashboard');

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

  // Tự động tìm báo cáo mới nhất hoặc báo cáo đang làm dở từ localStorage khi ứng dụng khởi động hoặc reload (F5)
  useEffect(() => {
    if (!currentUser) return;

    const autoLoadLatestReportOnStart = async () => {
      setIsLoading(true);
      try {
        const userKey = currentUser.id;
        const lastSavedType = localStorage.getItem(`lastReportType_${userKey}`);
        const lastActiveWeek = localStorage.getItem(`lastActiveWeek_${userKey}`);
        const lastActiveYear = localStorage.getItem(`lastActiveYear_${userKey}`);

        const targetWeek = lastActiveWeek ? parseInt(lastActiveWeek, 10) : metadata.tuan;
        const targetYear = lastActiveYear ? parseInt(lastActiveYear, 10) : metadata.nam;

        setMetadata(prev => ({
          ...prev,
          tuan: targetWeek,
          tuan_tiep: targetWeek + 1,
          nam: targetYear
        }));
        setRecentlyCreatedWeek(targetWeek);

        if (lastSavedType === 'CONSOLIDATED_OFFICE') {
          await loadConsolidatedReport(targetWeek, targetYear);
        } else {
          const personalReportId = `rpt_${userKey}_w${targetWeek}_${targetYear}`;
          await loadReportFromDB(currentUser.department_id, targetWeek, targetYear, personalReportId);
        }
      } catch (err) {
        console.warn('Lỗi autoLoadLatestReportOnStart:', err);
        const personalReportId = `rpt_${currentUser.id}_w${metadata.tuan}_${metadata.nam}`;
        await loadReportFromDB(currentUser.department_id, metadata.tuan, metadata.nam, personalReportId);
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
      setConsolidatedMeta(prev => ({
        ...prev,
        nguoi_lap_name: currentUser.full_name
      }));
    }

    autoLoadLatestReportOnStart();
  }, [currentUser?.id, currentUser?.department_id]);

  // Tự động đồng bộ hai chiều giữa metadata.nguoi_lap và consolidatedMeta.nguoi_lap_name khi người dùng chỉnh sửa
  useEffect(() => {
    if (metadata.nguoi_lap !== undefined && metadata.nguoi_lap !== consolidatedMeta.nguoi_lap_name) {
      setConsolidatedMeta(prev => ({ ...prev, nguoi_lap_name: metadata.nguoi_lap }));
    }
  }, [metadata.nguoi_lap]);

  useEffect(() => {
    if (consolidatedMeta.nguoi_lap_name !== undefined && consolidatedMeta.nguoi_lap_name !== metadata.nguoi_lap) {
      setMetadata(prev => ({ ...prev, nguoi_lap: consolidatedMeta.nguoi_lap_name }));
    }
  }, [consolidatedMeta.nguoi_lap_name]);

  // Tải báo cáo khi người dùng chủ động chọn đổi Tuần / Năm trên dropdown sau khi đã khởi động xong
  useEffect(() => {
    if (currentUser && isInitialLoadDone) {
      localStorage.setItem(`lastActiveWeek_${currentUser.id}`, String(metadata.tuan));
      localStorage.setItem(`lastActiveYear_${currentUser.id}`, String(metadata.nam));
      if (reportType === 'CONSOLIDATED_OFFICE') {
        loadConsolidatedReport(metadata.tuan, metadata.nam);
      } else {
        const targetId = `rpt_${currentUser.id}_w${metadata.tuan}_${metadata.nam}`;
        loadReportFromDB(currentUser.department_id, metadata.tuan, metadata.nam, targetId);
      }
    }
  }, [metadata.tuan, metadata.nam]);

  const loadReportFromDB = async (deptId: string, week: number, year: number, reportId?: string) => {
    setIsLoading(true);
    setReportType('SINGLE');
    if (currentUser?.id) {
      localStorage.setItem(`lastReportType_${currentUser.id}`, 'SINGLE');
      localStorage.setItem(`lastActiveWeek_${currentUser.id}`, String(week));
      localStorage.setItem(`lastActiveYear_${currentUser.id}`, String(year));
    }
    const targetReportId = reportId || (currentUser?.id ? `rpt_${currentUser.id}_w${week}_${year}` : undefined);
    const res = await fetchReportDetail(deptId, week, year, targetReportId, currentUser?.id);

    let fetchedTable1: TaskTable1[] = [];
    let fetchedTable2: TaskTable2[] = [];

    if (res && res.success && res.data) {
      fetchedTable1 = res.data.table1 || [];
      fetchedTable2 = res.data.table2 || [];
    }

    // Tự động nạp Nhiệm vụ Phân Cấp được giao từ Kho Chung nếu có
    if (currentUser?.id) {
      try {
        const dirRes = await fetchSyncedDirectiveTasks(currentUser.id, week, year);
        if (dirRes && dirRes.success && Array.isArray(dirRes.directive_tasks)) {
          const dirItems: TaskTable1[] = dirRes.directive_tasks.map((dt: any) => ({
            id: `dir_${dt.id}`,
            noi_dung: dt.title,
            thoi_gian: dt.due_date || 'Chưa định',
            trien_khai: dt.completion_proof || dt.description || 'Đang triển khai chỉ đạo cấp trên',
            tien_do: dt.status === 'HOAN_THANH' ? 'Hoàn thành' : dt.status === 'DE_XUAT_GIA_HAN' ? 'Hoàn thành trễ' : 'Đang thực hiện',
            nhom: 'Thường xuyên',
            is_directive_task: true,
            assigner_name: dt.assigner_name || 'Lãnh đạo',
            task_code: dt.task_code,
            isEdited: false
          }));

          const existingIds = new Set(fetchedTable1.map(t => t.id));
          for (const item of dirItems) {
            if (!existingIds.has(item.id)) {
              fetchedTable1.unshift(item);
            }
          }
        }
      } catch (e) {
        console.warn('Không thể nạp nhiệm vụ chỉ đạo:', e);
      }
    }

    setIsLoading(false);

    if (res && res.success && res.data) {
      const valid1 = fetchedTable1.filter((t: any) => (t.noi_dung || '').trim().length > 0);
      const valid2 = fetchedTable2.filter((t: any) => (t.noi_dung || '').trim().length > 0);
      const hasAnyTask = valid1.length > 0 || valid2.length > 0;

      const meta = res.data.metadata;
      setUserPermission(meta.user_permission || 'OWNER');
      setLastSaveUpdatedAt(meta.updated_at || null);

      const loadedNguoiLap = meta.nguoi_lap;
      const isOldDefault = !loadedNguoiLap || loadedNguoiLap.includes('Nguyễn Thị Mai') || loadedNguoiLap === 'Chưa đăng nhập';
      const finalNguoiLap = isOldDefault ? (currentUser?.full_name || meta.nguoi_lap) : meta.nguoi_lap;

      setMetadata(prev => ({
        ...meta,
        don_vi: meta.don_vi || currentUser?.department_name,
        nguoi_lap: finalNguoiLap
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
    setConsolidatedMeta(prev => ({
      ...prev,
      nguoi_lap_name: user.full_name
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

  // Nạp Báo cáo tuần tổng hợp Văn phòng (Nghị định 30)
  const loadConsolidatedReport = async (week: number, year: number, teamCode: 'VAN_THU' | 'CDS' | 'OFFICE_MASTER' = 'OFFICE_MASTER') => {
    setIsLoading(true);
    setReportType('CONSOLIDATED_OFFICE');
    setActiveTeamCode(teamCode);
    if (currentUser?.id) {
      localStorage.setItem(`lastReportType_${currentUser.id}`, 'CONSOLIDATED_OFFICE');
      localStorage.setItem(`lastActiveWeek_${currentUser.id}`, String(week));
      localStorage.setItem(`lastActiveYear_${currentUser.id}`, String(year));
    }

    const res = await fetchConsolidatedReportDetail(week, year, currentUser?.department_id, currentUser?.id);
    setIsLoading(false);

    if (res && res.success && res.data) {
      const data = res.data;
      const rawNguoiLap = data.consolidated_meta?.nguoi_lap_name || data.metadata?.nguoi_lap;
      const isOldDefault = !rawNguoiLap || rawNguoiLap.includes('Nguyễn Thị Mai') || rawNguoiLap === 'Chưa đăng nhập';
      const finalNguoiLap = isOldDefault ? (currentUser?.full_name || metadata.nguoi_lap || '') : rawNguoiLap;

      setMetadata(prev => ({
        ...prev,
        ...data.metadata,
        tuan: week,
        tuan_tiep: week + 1,
        nam: year,
        don_vi: 'VĂN PHÒNG',
        nguoi_lap: finalNguoiLap
      }));

      const loadedT1: TaskTable1[] = data.table1 || [];
      const loadedT2: TaskTable2[] = data.table2 || [];

      setTable1(loadedT1);
      setTable2(loadedT2);
      setInitialSnapshot({
        table1: JSON.parse(JSON.stringify(loadedT1)),
        table2: JSON.parse(JSON.stringify(loadedT2))
      });

      if (data.doc_inspection_stats) setDocInspectionStats(data.doc_inspection_stats);

      const metaObj = data.consolidated_meta || {};
      setConsolidatedMeta({
        to_truong_name: metaObj.to_truong_name || 'Trần Thuận Hòa',
        nguoi_lap_name: finalNguoiLap,
        pho_chanh_van_phong_name: metaObj.pho_chanh_van_phong_name || 'Nguyễn Đức Thắng',
        chanh_van_phong_name: metaObj.chanh_van_phong_name || 'Hoàng Văn Dương',
        ending_note: metaObj.ending_note || 'Trên đây là báo cáo tình hình thực hiện nhiệm vụ Tuần và kế hoạch thực hiện nhiệm vụ trọng tâm công tác Tuần tiếp theo. Kính trình Lãnh đạo phòng xem xét./.'
      });
      const rId = data.metadata?.report_id || `rpt_consolidated_office_w${week}_${year}`;
      fetchReportSignaturesApi(rId).then(sigRes => {
        if (sigRes && sigRes.success) setReportSignatures(sigRes.signatures || []);
      });

      setHasLoadedData(true);
      showToast(`Đã nạp Form Báo cáo tuần tổng hợp Văn phòng (Nghị định 30) Tuần ${week}/${year}`);
    } else {
      showToast(`Tạo mới Báo cáo tuần tổng hợp Văn phòng Tuần ${week}/${year}`);
    }
  };

  // Select Report from History Drawer
  const handleSelectReportFromHistory = async (reportId: string, week: number, year: number) => {
    setMetadata(prev => ({ ...prev, tuan: week, tuan_tiep: week + 1, nam: year, report_id: reportId }));
    if (reportId.includes('consolidated')) {
      await loadConsolidatedReport(week, year);
    } else {
      setReportType('SINGLE');
      await loadReportFromDB(currentUser?.department_id || 'dept_vp', week, year, reportId);
    }

    try {
      const sigRes = await fetchReportSignaturesApi(reportId);
      if (sigRes && sigRes.success) {
        setReportSignatures(sigRes.signatures || []);
      }
    } catch (e) {
      console.warn('Lỗi nạp chữ ký:', e);
    }

    showToast(`Đã nạp báo cáo Tuần ${week}/${year}`);
  };

  // CORE ACTION: Kế thừa nhiệm vụ Thường xuyên & Chưa hoàn thành sang Tuần mới
  const handleConfirmCarryOver = async (selectedTaskIds?: string[]) => {
    if (!currentUser) return;
    setIsLoading(true);

    const res = await triggerCarryOver(
      currentUser.department_id,
      metadata.tuan,
      metadata.nam,
      currentUser.id,
      selectedTaskIds
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

      // QUAN TRỌNG: Bảo toàn đúng vị trí Form & Không gian làm việc khi kết chuyển sang tuần mới
      if (reportType === 'CONSOLIDATED_OFFICE') {
        await loadConsolidatedReport(nextW, nextY, activeTeamCode);
      } else {
        await loadReportFromDB(currentUser.department_id, nextW, nextY, res.new_report_id);
      }

      const formNameStr = reportType === 'CONSOLIDATED_OFFICE'
        ? (activeTeamCode === 'VAN_THU' ? 'Tổ Văn thư – Lưu trữ' : activeTeamCode === 'CDS' ? 'Tổ Chuyển đổi số' : 'Master Tổng Hợp NĐ30')
        : 'Form Báo cáo Đơn';

      showToast(`🎉 ${res.message}! Đã chuyển đến đúng vị trí ${formNameStr} ở Tuần ${nextW}.`);
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
    setConfirmModalConfig({
      isOpen: true,
      title: 'Xóa toàn bộ báo cáo tuần',
      message: "⚠️ BẠN CÓ CHẮC CHẮN MUỐN XÓA TOÀN BỘ NHIỆM VỤ VÀ KẾ HOẠCH TRONG TUẦN NÀY KHÔNG?\n\nHành động này sẽ xóa tất cả công việc ở cả Bảng I và Bảng II.",
      type: 'danger',
      confirmText: 'Xóa toàn bộ',
      cancelText: 'Hủy bỏ',
      onConfirm: () => {
        setConfirmModalConfig(null);
        setTable1([]);
        setTable2([]);
        showToast("Đã xóa sạch toàn bộ nội dung công việc & kế hoạch tuần này!");
      },
      onCancel: () => setConfirmModalConfig(null)
    });
  };

  const handleClearTable1 = () => {
    if (table1.length === 0) return;
    setConfirmModalConfig({
      isOpen: true,
      title: 'Xóa sạch Bảng I',
      message: "⚠️ Bạn có chắc chắn muốn xóa tất cả nhiệm vụ trong BẢNG I (Kết quả thực hiện công tác) không?",
      type: 'danger',
      confirmText: 'Xóa Bảng I',
      cancelText: 'Hủy bỏ',
      onConfirm: () => {
        setConfirmModalConfig(null);
        setTable1([]);
        showToast("Đã xóa toàn bộ nhiệm vụ Bảng I!");
      },
      onCancel: () => setConfirmModalConfig(null)
    });
  };

  const handleClearTable2 = () => {
    if (table2.length === 0) return;
    setConfirmModalConfig({
      isOpen: true,
      title: 'Xóa sạch Bảng II',
      message: "⚠️ Bạn có chắc chắn muốn xóa tất cả kế hoạch trong BẢNG II (Kế hoạch tuần tiếp theo) không?",
      type: 'danger',
      confirmText: 'Xóa Bảng II',
      cancelText: 'Hủy bỏ',
      onConfirm: () => {
        setConfirmModalConfig(null);
        setTable2([]);
        showToast("Đã xóa toàn bộ kế hoạch Bảng II!");
      },
      onCancel: () => setConfirmModalConfig(null)
    });
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
    const isConsolidated = reportType === 'CONSOLIDATED_OFFICE';
    const targetReportId = isConsolidated
      ? `rpt_consolidated_office_w${targetWeek}_${targetYear}`
      : `rpt_${currentUser.id}_w${targetWeek}_${targetYear}`;

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
      tien_do: t.tien_do || 'Đang thực hiện',
      san_pham: t.san_pham || '',
      is_starred: Boolean(t.is_starred),
      is_recurring: Boolean(t.is_recurring),
      team_code: t.team_code || 'VAN_THU',
      parent_task_id: t.parent_task_id || null
    }));

    // Table 2 (Kế hoạch tuần tiếp - BẢNG II) - Chỉ đưa các nhiệm vụ thuộc Bảng II
    const newTable2: TaskTable2[] = table2Candidates.map((t, idx) => ({
      id: `t2_kb_${t.id}_${idx}`,
      noi_dung: t.noi_dung,
      nhom: (t.nhom === 'Đột xuất' ? 'Đột xuất' : 'Thường xuyên') as 'Thường xuyên' | 'Đột xuất',
      thoi_gian_du_kien: t.thoi_gian || 'Trong tuần',
      san_pham_du_kien: t.san_pham_du_kien || 'Kế hoạch công tác',
      is_starred: Boolean(t.is_starred),
      is_recurring: Boolean(t.is_recurring),
      team_code: t.team_code || 'VAN_THU',
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

    // 1. Save current week report with updated completed/cancelled tasks
    if (isConsolidated) {
      const currentReportId = metadata.report_id || `rpt_consolidated_office_w${metadata.tuan}_${metadata.nam}`;
      await saveConsolidatedReportData({
        metadata: {
          ...metadata,
          report_id: currentReportId,
          department_id: currentUser.department_id,
          account_id: currentUser.id
        },
        table1: updatedTable1,
        table2,
        doc_inspection_stats: docInspectionStats,
        consolidated_meta: consolidatedMeta
      });
    } else {
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
    }

    // 2. Save target week report & update UI state
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
    setInitialSnapshot({
      table1: JSON.parse(JSON.stringify(newTable1)),
      table2: JSON.parse(JSON.stringify(newTable2))
    });
    setHasLoadedData(true);

    if (isConsolidated) {
      await saveConsolidatedReportData({
        metadata: {
          ...targetMetadata,
          department_id: currentUser.department_id,
          account_id: currentUser.id
        },
        table1: newTable1,
        table2: newTable2,
        doc_inspection_stats: docInspectionStats,
        consolidated_meta: consolidatedMeta
      });
      localStorage.setItem('lastReportType', 'CONSOLIDATED_OFFICE');
      localStorage.setItem('lastActiveWeek', String(targetWeek));
      localStorage.setItem('lastActiveYear', String(targetYear));
    } else {
      await saveReportData({
        metadata: {
          ...targetMetadata,
          department_id: currentUser.department_id,
          account_id: currentUser.id
        },
        table1: newTable1,
        table2: newTable2
      });
      localStorage.setItem('lastReportType', 'SINGLE');
      localStorage.setItem('lastActiveWeek', String(targetWeek));
      localStorage.setItem('lastActiveYear', String(targetYear));
    }

    setIsLoading(false);
    showToast(`🎯 Khởi tạo Báo cáo Tuần ${targetWeek}/${targetYear} thành công bằng Kanban! (${plannedTasks.length} kế hoạch, ${completedTasks.length} hoàn thành, ${cancelledTasks.length} hủy)`);
  };

  // Lưu Báo Cáo vào CSDL (Tự động nhận diện loại Form Single / Consolidated NĐ30)
  const handleSaveReport = async () => {
    if (!currentUser) return;
    setIsLoading(true);

    if (reportType === 'CONSOLIDATED_OFFICE') {
      const masterReportId = `rpt_consolidated_office_w${metadata.tuan}_${metadata.nam}`;
      const res = await saveConsolidatedReportData({
        metadata: {
          ...metadata,
          report_id: masterReportId,
          department_id: currentUser.department_id,
          account_id: currentUser.id
        },
        table1,
        table2,
        doc_inspection_stats: docInspectionStats,
        consolidated_meta: consolidatedMeta
      });
      setIsLoading(false);
      if (res && res.success) {
        setMetadata(prev => ({ ...prev, report_id: masterReportId }));
        setInitialSnapshot({
          table1: JSON.parse(JSON.stringify(table1)),
          table2: JSON.parse(JSON.stringify(table2))
        });
        setLastSaveUpdatedAt(new Date().toISOString());
        setHasLoadedData(true);
        localStorage.setItem('lastReportType', 'CONSOLIDATED_OFFICE');
        localStorage.setItem('lastActiveWeek', String(metadata.tuan));
        localStorage.setItem('lastActiveYear', String(metadata.nam));
        showToast('🎉 Đã lưu thành công Báo cáo tuần tổng hợp Văn phòng (Nghị định 30)!');
      } else {
        alert('Lỗi khi lưu Báo cáo tổng hợp: ' + (res?.error || 'Không thể lưu'));
      }
      return;
    }

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
  }, [currentUser, metadata, table1, table2, reportType, docInspectionStats, consolidatedMeta]);

  // Xuất file Word .docx
  const handleGenerateWord = async () => {
    if (!hasLoadedData || (table1.length === 0 && table2.length === 0)) {
      alert("Vui lòng Import File Sheet hoặc Đồng bộ dữ liệu trước khi xuất báo cáo!");
      return;
    }
    if (reportType === 'CONSOLIDATED_OFFICE') {
      await exportConsolidatedWordReport({
        metadata: {
          ...metadata,
          don_vi: 'VĂN PHÒNG',
          nguoi_lap: currentUser?.full_name || metadata.nguoi_lap
        },
        table1,
        table2,
        doc_inspection_stats: docInspectionStats,
        consolidated_meta: consolidatedMeta
      });
    } else {
      exportWordReport({
        metadata: {
          ...metadata,
          don_vi: currentUser?.department_name || metadata.don_vi,
          nguoi_lap: currentUser?.full_name || metadata.nguoi_lap
        },
        table1,
        table2
      });
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden text-slate-800 dark:text-slate-100 bg-[#f9f9ff] dark:bg-slate-950 transition-colors duration-300">
      {/* HEADER CỐ ĐỊNH */}
      {/* HEADER CỐ ĐỊNH */}
      <Header
        metadata={metadata}
        setMetadata={setMetadata}
        recentlyCreatedWeek={recentlyCreatedWeek}
        currentUser={currentUser}
        onOpenUserProfile={() => setIsUserProfileOpen(true)}
        onOpenSignatureSetup={() => setIsSignatureSetupOpen(true)}
        activeMainTab={activeMainTab}
        onSelectMainTab={setActiveMainTab}
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
              setActiveMainTab('editor');
              showToast(`Đã chuyển tới Báo cáo được chia sẻ! (Quyền: ${res.data.metadata.user_permission})`);
            }
          });
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

      {/* MÀN HÌNH CHÍNH: DÀNH CHO DÁSHBOARD HOẶC BẢNG SOẠN BÁO CÁO */}
      {activeMainTab === 'dashboard' ? (
        <div className="flex-1 overflow-y-auto">
          <HomeDashboard
            currentUser={currentUser}
            departments={departments}
            table1={table1}
            table2={table2}
            currentWeek={metadata.tuan}
            onNavigateToEditor={() => {
              if (!hasLoadedData) {
                handleStartBlankReport();
              }
              setActiveMainTab('editor');
            }}
            onOpenTaskDetail={(task) => {
              setActiveMainDetailTask({
                id: task.id || 'dt_' + Date.now(),
                noi_dung: task.title || task.noi_dung || '',
                nhom: task.group || task.nhom || 'Thường xuyên',
                thoi_gian: task.dueDate || task.thoi_gian || 'Trong tuần',
                trien_khai: task.content || task.trien_khai || '',
                tien_do: task.statusLabel || task.tien_do || 'Đang thực hiện',
                san_pham: task.san_pham || '',
                file_minh_chung: task.proofUrl || task.file_minh_chung || '',
                file_original_name: task.file_original_name || '',
                source: 'unfinished_table1'
              });
              setActiveMainDetailMode('view');
            }}
            onEditTask={(task) => {
              setActiveMainDetailTask({
                id: task.id || 'dt_' + Date.now(),
                noi_dung: task.title || task.noi_dung || '',
                nhom: task.group || task.nhom || 'Thường xuyên',
                thoi_gian: task.dueDate || task.thoi_gian || 'Trong tuần',
                trien_khai: task.content || task.trien_khai || '',
                tien_do: task.statusLabel || task.tien_do || 'Đang thực hiện',
                san_pham: task.san_pham || '',
                file_minh_chung: task.proofUrl || task.file_minh_chung || '',
                file_original_name: task.file_original_name || '',
                source: 'unfinished_table1'
              });
              setActiveMainDetailMode('edit');
            }}
            onDeleteTask={(taskId) => {
              const cleanId = taskId.replace('t1_', '').replace('t2_', '').replace('sa_', '');
              setTable1(prev => prev.filter(item => item.id !== cleanId && item.id !== taskId));
              setTable2(prev => prev.filter(item => item.id !== cleanId && item.id !== taskId));
              showToast('Đã xóa nhiệm vụ khỏi danh sách báo cáo tuần!');
            }}
            onOpenStandaloneKanban={() => setIsStandaloneTaskKanbanOpen(true)}
          />
        </div>
      ) : (
        <>
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
            onOpenStandaloneTaskKanban={() => setIsStandaloneTaskKanbanOpen(true)}
            onOpenAdmin={() => setIsAdminOpen(true)}
            onOpenShare={() => setIsShareOpen(true)}
            onSave={handleSaveReport}
            onSwitchToPersonalReport={() => {
              if (!currentUser) return;
              setReportType('SINGLE');
              const personalReportId = `rpt_${currentUser.id}_w${metadata.tuan}_${metadata.nam}`;
              loadReportFromDB(currentUser.department_id, metadata.tuan, metadata.nam, personalReportId);
              showToast(`Đã chuyển sang Báo cáo Cá nhân của bạn cho Tuần ${metadata.tuan}!`);
            }}
            reportType={reportType}
            activeTeamCode={activeTeamCode}
            onOpenReportChoice={() => setIsChoiceModalOpen(true)}
            onSelectTeamCode={(team) => {
              setActiveTeamCode(team);
              showToast(`Đã chuyển sang góc nhìn: ${team === 'VAN_THU' ? 'Tổ Văn thư - Lưu trữ' : team === 'CDS' ? 'Tổ Chuyển đổi số' : 'Master Tổng Hợp NĐ30'}`);
            }}
            onOpenDocInspectionModal={() => setIsDocInspectionModalOpen(true)}
            onOpenSignatureSetup={() => setIsSignatureSetupOpen(true)}
            onOpenApprovalChain={() => setIsApprovalChainOpen(true)}
            onOpenDigitalSignature={() => setIsDigitalSignatureOpen(true)}
          />

          {/* NỘI DUNG CHÍNH (Layout Grid Editor) */}
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
              currentUser={currentUser}
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
              reportType={reportType}
              activeTeamCode={activeTeamCode}
              docInspectionStats={docInspectionStats}
              setDocInspectionStats={setDocInspectionStats}
              consolidatedMeta={consolidatedMeta}
              setConsolidatedMeta={setConsolidatedMeta}
              metadata={metadata}
              setMetadata={setMetadata}
              onSaveReport={handleSaveReport}
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
    </>
  )}

      {/* MODAL XEM TRƯỚC / IN / TẢI BÁO CÁO */}
      <PreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        table1={table1}
        table2={table2}
        metadata={{
          ...metadata,
          don_vi: reportType === 'CONSOLIDATED_OFFICE' ? 'VĂN PHÒNG' : (currentUser?.department_name || metadata.don_vi),
          nguoi_lap: currentUser?.full_name || metadata.nguoi_lap
        }}
        setMetadata={setMetadata}
        onDownloadWord={handleGenerateWord}
        reportType={reportType}
        docInspectionStats={docInspectionStats}
        consolidatedMeta={consolidatedMeta}
        reportSignatures={reportSignatures}
        currentAccountId={currentUser?.id}
        onFinalizeReportSuccess={() => {
          showToast('🎉 Báo cáo tuần đã được CHỐT THÀNH CÔNG!');
          setMetadata(prev => ({ ...prev, approval_status: 'APPROVED', status: 'APPROVED' }));
        }}
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

      {/* DRAWER LỊCH SỬ BÁO CÁO TUẦN & MỤC CHỜ DUYỆT */}
      <ReportHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        currentUser={currentUser}
        onSelectReport={handleSelectReportFromHistory}
        onOpenDigitalSignature={() => setIsDigitalSignatureOpen(true)}
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
        reportType={reportType}
        activeTeamCode={activeTeamCode}
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

      {/* MODAL LỰA CHỌN BÁO CÁO DÙNG CHUNG VS CÁ NHÂN VS NGHỊ ĐỊNH 30 */}
      <ReportChoiceModal
        isOpen={isChoiceModalOpen}
        weekNumber={sharedChoiceData?.week || metadata.tuan}
        year={sharedChoiceData?.year || metadata.nam}
        sharedOwnerName={sharedChoiceData?.ownerName || ''}
        onClose={() => setIsChoiceModalOpen(false)}
        onSelectConsolidatedReport={(teamCode) => {
          setIsChoiceModalOpen(false);
          loadConsolidatedReport(metadata.tuan, metadata.nam, teamCode);
        }}
        onSelectSharedReport={() => {
          setIsChoiceModalOpen(false);
          showToast(`Đã mở Báo cáo Dùng chung của ${sharedChoiceData?.ownerName || 'Tổ trưởng'}`);
        }}
        onSelectPersonalReport={() => {
          setIsChoiceModalOpen(false);
          setReportType('SINGLE');
          if (!currentUser) return;
          const personalReportId = `rpt_${currentUser.id}_w${metadata.tuan}_${metadata.nam}`;
          loadReportFromDB(currentUser.department_id, metadata.tuan, metadata.nam, personalReportId);
          showToast(`Đã chuyển sang Báo cáo Cá nhân của bạn cho Tuần ${metadata.tuan}!`);
        }}
      />

      {/* MODAL MỤC III THỂ THỨC CÔNG VĂN & 4 CHỮ KÝ NGHỊ ĐỊNH 30 */}
      <DocInspectionModal
        isOpen={isDocInspectionModalOpen}
        onClose={() => setIsDocInspectionModalOpen(false)}
        stats={docInspectionStats}
        meta={consolidatedMeta}
        onSave={(updatedStats, updatedMeta) => {
          setDocInspectionStats(updatedStats);
          setConsolidatedMeta(updatedMeta);
          showToast('Đã cập nhật thông tin Mục III và Ma trận 4 Chữ ký!');
        }}
      />

      {/* MODAL KHO NHIỆM VỤ CHUNG ĐỘC LẬP & GIAO VIỆC PHÂN CẤP */}
      <StandaloneTaskKanbanModal
        isOpen={isStandaloneTaskKanbanOpen}
        onClose={() => {
          setIsStandaloneTaskKanbanOpen(false);
          // Refresh weekly report data in case tasks were assigned/completed
          if (currentUser) {
            loadReportFromDB(currentUser.department_id, metadata.tuan, metadata.nam);
          }
        }}
        currentAccount={currentUser}
      />

      {/* MODAL CẬP NHẬT THÔNG TIN CÁ NHÂN */}
      <UserProfileModal
        isOpen={isUserProfileOpen}
        onClose={() => setIsUserProfileOpen(false)}
        currentUser={currentUser}
        onOpenSignatureSetup={() => setIsSignatureSetupOpen(true)}
        onUpdateSuccess={(updatedUser) => {
          setCurrentUser(updatedUser);
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
          setMetadata(prev => ({
            ...prev,
            nguoi_lap: updatedUser.full_name,
            don_vi: updatedUser.department_name || prev.don_vi
          }));
          setConsolidatedMeta(prev => ({
            ...prev,
            nguoi_lap_name: updatedUser.full_name
          }));
        }}
      />

      {/* MODAL CÀI ĐẶT CHỮ KÝ TAY & MÃ PIN 6 SỐ */}
      {isSignatureSetupOpen && (
        <SignatureSetupModal
          currentUser={currentUser}
          onClose={() => setIsSignatureSetupOpen(false)}
          onSuccess={(sigUrl) => {
            showToast('🎉 Đã lưu Chữ ký cá nhân & Mã PIN 6 số thành công!');
            if (currentUser) {
              const updatedUser = { ...currentUser, signature_url: sigUrl };
              setCurrentUser(updatedUser);
              localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            }
          }}
        />
      )}

      {/* MODAL TRÌNH DUYỆT BÁO CÁO TUẦN */}
      {isApprovalChainOpen && (
        <ApprovalChainModal
          reportId={metadata.report_id || `rpt_${currentUser?.id || 'sys'}_w${metadata.tuan}_${metadata.nam}`}
          currentAccountId={currentUser?.id || ''}
          onClose={() => setIsApprovalChainOpen(false)}
          onSuccess={() => {
            showToast('🎉 Đã gửi trình nộp Báo cáo tuần cho Lãnh đạo duyệt thành công!');
          }}
        />
      )}

      {/* MODAL XÁC NHẬN KÝ SỐ BẰNG MÃ PIN */}
      {isDigitalSignatureOpen && (
        <DigitalSignatureModal
          reportId={metadata.report_id || `rpt_${currentUser?.id || 'sys'}_w${metadata.tuan}_${metadata.nam}`}
          currentUser={currentUser}
          onClose={() => setIsDigitalSignatureOpen(false)}
          onSuccess={(signature) => {
            setReportSignatures(prev => [...prev, signature]);
            showToast('🎉 Ký số và Phê duyệt Báo cáo tuần thành công!');
          }}
          onOpenSignatureSetup={() => setIsSignatureSetupOpen(true)}
        />
      )}

      {confirmModalConfig && (
        <ConfirmModal
          {...confirmModalConfig}
        />
      )}
    </div>
  );
}
