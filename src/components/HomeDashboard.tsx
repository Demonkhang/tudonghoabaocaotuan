import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, PieChart, CheckCircle2, Clock, AlertTriangle, Package, Search,
  Filter, Building2, User, Calendar, ArrowUpRight, Sparkles, TrendingUp,
  Layers, RefreshCw, Eye, ChevronRight, CheckSquare, ShieldAlert, Award,
  ArrowRight, FolderOpen, ListFilter, FileText, ChevronDown, Activity,
  Pencil, Trash2, ChevronLeft, X, Save
} from 'lucide-react';
import { UserProfile } from './LoginModal';
import { DepartmentItem, AdminAccount } from './AdminPanelModal';
import { TaskTable1, TaskTable2 } from '../utils/reportUtils';
import { fetchStandaloneTasks, fetchAdminAccounts, fetchReportHistory } from '../services/api';

export interface UnifiedTask {
  id: string;
  source: 'REPORT' | 'STANDALONE';
  title: string;
  content: string;
  assigneeName: string;
  assigneeId?: string;
  departmentName: string;
  departmentId?: string;
  status: 'RESOLVED' | 'IN_PROGRESS' | 'BACKLOG' | 'STORE';
  statusLabel: string;
  group: 'Thường xuyên' | 'Đột xuất' | 'Chỉ đạo' | 'Khác';
  priority?: 'KHAN' | 'THUONG' | 'CAO';
  dueDate?: string;
  completionDate?: string;
  weekNumber?: number;
  hasProof?: boolean;
  proofUrl?: string;
  originalItem?: any;
}

interface HomeDashboardProps {
  currentUser: UserProfile | null;
  departments: DepartmentItem[];
  table1: TaskTable1[];
  table2: TaskTable2[];
  currentWeek?: number;
  onNavigateToEditor: () => void;
  onOpenTaskDetail?: (task: any) => void;
  onOpenStandaloneKanban?: () => void;
  onEditTask?: (task: any) => void;
  onDeleteTask?: (taskId: string, source: string) => void;
}

function parseWeekFromDateString(dateStr?: string): number | undefined {
  if (!dateStr) return undefined;
  const match = dateStr.match(/Tuần\s*(\d+)/i);
  if (match) return parseInt(match[1], 10);

  if (dateStr.includes('/') || dateStr.includes('-')) {
    let d: Date | null = null;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          d = new Date(year, month, day);
        }
      }
    } else {
      d = new Date(dateStr);
    }
    if (d && !isNaN(d.getTime())) {
      const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNr = target.getUTCDay() || 7;
      target.setUTCDate(target.getUTCDate() + 4 - dayNr);
      const jan1 = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
      return Math.ceil((((target.getTime() - jan1.getTime()) / 86400000) + 1) / 7);
    }
  }
  return undefined;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  currentUser,
  departments,
  table1,
  table2,
  currentWeek,
  onNavigateToEditor,
  onOpenTaskDetail,
  onOpenStandaloneKanban,
  onEditTask,
  onDeleteTask
}) => {
  // State management for raw data
  const [standaloneTasks, setStandaloneTasks] = useState<any[]>([]);
  const [historyReports, setHistoryReports] = useState<any[]>([]);
  const [accountsList, setAccountsList] = useState<AdminAccount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // 1. Primary Main Tabs State: PERSONAL (Kho nhiệm vụ cá nhân) vs DIRECTIVE (Nhiệm vụ cấp trên giao xuống)
  const [mainTab, setMainTab] = useState<'PERSONAL' | 'DIRECTIVE'>('PERSONAL');

  // 2. Pagination & Page Size State (Default max 20, selectable 20 / 50 / 100)
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [selectedUserId, setSelectedUserId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'RESOLVED' | 'IN_PROGRESS' | 'BACKLOG' | 'STORE'>('ALL');
  const [groupFilter, setGroupFilter] = useState<'ALL' | 'Thường xuyên' | 'Đột xuất' | 'Chỉ đạo'>('ALL');
  const [weekFilter, setWeekFilter] = useState<string>('ALL');
  const [personalWeekMode, setPersonalWeekMode] = useState<'CURRENT_WEEK' | 'ALL'>('CURRENT_WEEK');
  const [timeRange, setTimeRange] = useState<'THIS_WEEK' | 'LAST_4_WEEKS' | 'THIS_MONTH' | 'ALL'>('ALL');
  const [activeTab, setActiveTab] = useState<'ALL' | 'BACKLOG' | 'STORE' | 'RESOLVED'>('ALL');

  // Local state for inline edits and deletes
  const [localDeletedTaskIds, setLocalDeletedTaskIds] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<UnifiedTask | null>(null);
  const [deletingTask, setDeletingTask] = useState<UnifiedTask | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    content: string;
    group: 'Thường xuyên' | 'Đột xuất' | 'Chỉ đạo' | 'Khác';
    dueDate: string;
    status: 'RESOLVED' | 'IN_PROGRESS' | 'BACKLOG' | 'STORE';
  }>({
    title: '',
    content: '',
    group: 'Thường xuyên',
    dueDate: '',
    status: 'IN_PROGRESS'
  });

  // User role determination
  const userRole = currentUser?.role || 'STAFF';
  const isManager = userRole === 'ADMIN' || userRole === 'LEADER';
  const isAdmin = userRole === 'ADMIN';

  // Load backend data
  const loadDashboardData = async () => {
    setIsRefreshing(true);
    try {
      const [standaloneRes, historyRes, accountsRes] = await Promise.all([
        fetchStandaloneTasks(currentUser?.id),
        fetchReportHistory(
          isAdmin ? undefined : currentUser?.department_id,
          isAdmin ? undefined : currentUser?.id
        ),
        isManager ? fetchAdminAccounts() : Promise.resolve({ accounts: [] })
      ]);

      if (standaloneRes && standaloneRes.tasks) {
        setStandaloneTasks(standaloneRes.tasks);
      }
      if (historyRes && historyRes.reports) {
        setHistoryReports(historyRes.reports);
      }
      if (accountsRes && accountsRes.accounts) {
        setAccountsList(accountsRes.accounts);
      }
    } catch (err) {
      console.error('Lỗi nạp dữ liệu Dashboard:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [currentUser]);

  // Reset pagination to page 1 whenever any filter or main tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [mainTab, personalWeekMode, searchQuery, selectedDeptId, selectedUserId, statusFilter, groupFilter, weekFilter, activeTab, pageSize]);

  // Handle department filter change for Manager
  const handleDepartmentChange = (deptId: string) => {
    setSelectedDeptId(deptId);
    setSelectedUserId('ALL');
  };

  // Filter accounts according to selected department
  const filteredEmployeesForDropdown = useMemo(() => {
    if (!accountsList || accountsList.length === 0) return [];
    if (selectedDeptId === 'ALL') return accountsList;
    return accountsList.filter(acc => acc.department_id === selectedDeptId);
  }, [accountsList, selectedDeptId]);

  // Standardize and unify all tasks from Table 1, Table 2, Standalone Tasks, and Report History
  const rawUnifiedTasks = useMemo<UnifiedTask[]>(() => {
    const list: UnifiedTask[] = [];
    const defaultWeek = currentWeek || 39;

    // 1. Current Active Report - Table 1 (Kết quả thực hiện tuần này - Nhiệm vụ cá nhân / tự import)
    if (table1 && table1.length > 0) {
      table1.forEach((t) => {
        let st: 'RESOLVED' | 'IN_PROGRESS' | 'BACKLOG' | 'STORE' = 'IN_PROGRESS';
        const tienDoLower = (t.tien_do || '').toLowerCase();
        if (tienDoLower.includes('hoàn thành') || tienDoLower.includes('đã giải quyết')) {
          st = 'RESOLVED';
        } else if (tienDoLower.includes('trễ') || tienDoLower.includes('tồn đọng') || tienDoLower.includes('chậm')) {
          st = 'BACKLOG';
        }

        let gr: 'Thường xuyên' | 'Đột xuất' | 'Chỉ đạo' | 'Khác' = 'Thường xuyên';
        if (t.nhom === 'Đột xuất') gr = 'Đột xuất';
        else if (t.nhom === 'Chỉ đạo') gr = 'Chỉ đạo';

        const weekNum = (t as any).weekNumber || (t as any).assigned_week || (t as any).week_number || (t as any).tuan || defaultWeek;

        list.push({
          id: `t1_${t.id}`,
          source: 'REPORT',
          title: t.noi_dung || 'Nhiệm vụ báo cáo',
          content: t.trien_khai || '',
          assigneeName: currentUser?.full_name || 'Cá nhân',
          assigneeId: currentUser?.id,
          departmentName: currentUser?.department_name || 'Văn phòng',
          departmentId: currentUser?.department_id,
          status: st,
          statusLabel: t.tien_do || (st === 'RESOLVED' ? 'Hoàn thành' : 'Đang thực hiện'),
          group: gr,
          dueDate: t.thoi_gian,
          weekNumber: weekNum,
          hasProof: !!t.file_minh_chung,
          proofUrl: t.file_minh_chung,
          originalItem: { ...t, weekNumber: weekNum, tuan: weekNum }
        });
      });
    }

    // 2. Current Active Report - Table 2 (Công việc dự kiến tuần tới -> Kho phần việc cá nhân)
    if (table2 && table2.length > 0) {
      table2.forEach((t) => {
        let gr: 'Thường xuyên' | 'Đột xuất' | 'Chỉ đạo' | 'Khác' = 'Thường xuyên';
        if (t.nhom === 'Đột xuất') gr = 'Đột xuất';
        else if (t.nhom === 'Chỉ đạo') gr = 'Chỉ đạo';

        const weekNum = (t as any).weekNumber || (t as any).assigned_week || (t as any).week_number || (t as any).tuan || (currentWeek ? currentWeek + 1 : defaultWeek + 1);

        list.push({
          id: `t2_${t.id}`,
          source: 'REPORT',
          title: t.noi_dung || 'Nhiệm vụ dự kiến',
          content: t.san_pham_du_kien ? `Sản phẩm dự kiến: ${t.san_pham_du_kien}` : '',
          assigneeName: currentUser?.full_name || 'Cá nhân',
          assigneeId: currentUser?.id,
          departmentName: currentUser?.department_name || 'Văn phòng',
          departmentId: currentUser?.department_id,
          status: 'STORE',
          statusLabel: 'Kho / Dự kiến',
          group: gr,
          dueDate: t.thoi_gian_du_kien,
          weekNumber: weekNum,
          originalItem: { ...t, weekNumber: weekNum, tuan: weekNum }
        });
      });
    }

    // 3. Standalone Tasks (Kho Nhiệm Vụ Độc Lập - Cấp trên giao xuống)
    if (standaloneTasks && standaloneTasks.length > 0) {
      standaloneTasks.forEach((st) => {
        let statusEnum: 'RESOLVED' | 'IN_PROGRESS' | 'BACKLOG' | 'STORE' = 'IN_PROGRESS';
        const statusUpper = (st.status || '').toUpperCase();
        if (statusUpper === 'HOAN_THANH' || statusUpper === 'RESOLVED') {
          statusEnum = 'RESOLVED';
        } else if (statusUpper === 'DANG_THUC_HIEN') {
          statusEnum = 'IN_PROGRESS';
        } else if (statusUpper === 'TRE_HAN' || statusUpper === 'TON_DONG') {
          statusEnum = 'BACKLOG';
        } else if (statusUpper === 'CHUA_THUC_HIEN' || statusUpper === 'POOL' || statusUpper === 'PENDING') {
          statusEnum = 'STORE';
        }

        let gr: 'Thường xuyên' | 'Đột xuất' | 'Chỉ đạo' | 'Khác' = 'Chỉ đạo';
        if (st.category === 'THUONG_XUYEN') gr = 'Thường xuyên';
        else if (st.category === 'DOT_XUAT') gr = 'Đột xuất';

        const weekNum = st.assigned_week || st.week_number || st.weekNumber || st.tuan || parseWeekFromDateString(st.due_date) || defaultWeek;

        list.push({
          id: `sa_${st.id}`,
          source: 'STANDALONE',
          title: st.title || 'Nhiệm vụ chỉ đạo',
          content: st.description || '',
          assigneeName: st.assignee_full_name || st.creator_full_name || 'Chưa gán',
          assigneeId: st.assignee_id || st.creator_id,
          departmentName: st.department_name || 'Ban Quản Lý',
          departmentId: st.department_id,
          status: statusEnum,
          statusLabel: st.status_display || (statusEnum === 'RESOLVED' ? 'Đã hoàn thành' : statusEnum === 'STORE' ? 'Kho việc' : 'Đang xử lý'),
          group: gr,
          priority: st.priority,
          dueDate: st.due_date,
          weekNumber: weekNum,
          originalItem: { ...st, weekNumber: weekNum, tuan: weekNum }
        });
      });
    }

    // 4. History Reports Tasks
    if (historyReports && historyReports.length > 0) {
      historyReports.forEach((rep) => {
        if (rep.table1_data && Array.isArray(rep.table1_data)) {
          rep.table1_data.forEach((t: any) => {
            if (table1.some(activeT => activeT.id === t.id)) return;

            let st: 'RESOLVED' | 'IN_PROGRESS' | 'BACKLOG' | 'STORE' = 'RESOLVED';
            const tienDoLower = (t.tien_do || '').toLowerCase();
            if (tienDoLower.includes('trễ') || tienDoLower.includes('tồn đọng') || tienDoLower.includes('chậm')) {
              st = 'BACKLOG';
            } else if (tienDoLower.includes('đang thực hiện')) {
              st = 'IN_PROGRESS';
            }

            let gr: 'Thường xuyên' | 'Đột xuất' | 'Chỉ đạo' | 'Khác' = 'Thường xuyên';
            if (t.nhom === 'Đột xuất') gr = 'Đột xuất';
            else if (t.nhom === 'Chỉ đạo') gr = 'Chỉ đạo';

            const weekNum = rep.tuan || rep.week_number || rep.week || defaultWeek;

            list.push({
              id: `hist_${t.id}_${rep.id}`,
              source: 'REPORT',
              title: t.noi_dung || 'Nhiệm vụ lịch sử',
              content: t.trien_khai || '',
              assigneeName: rep.nguoi_lap || 'Nhân viên',
              assigneeId: rep.created_by_account_id,
              departmentName: rep.don_vi || 'Phòng ban',
              departmentId: rep.department_id,
              status: st,
              statusLabel: t.tien_do || 'Lịch sử báo cáo',
              group: gr,
              weekNumber: weekNum,
              dueDate: t.thoi_gian,
              hasProof: !!t.file_minh_chung,
              proofUrl: t.file_minh_chung,
              originalItem: { ...t, weekNumber: weekNum, tuan: weekNum }
            });
          });
        }
      });
    }

    return list;
  }, [table1, table2, standaloneTasks, historyReports, currentUser, currentWeek]);

  // List of available unique weeks for filtering
  const availableWeeks = useMemo(() => {
    const set = new Set<number>();
    rawUnifiedTasks.forEach(t => {
      if (t.weekNumber) set.add(t.weekNumber);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [rawUnifiedTasks]);

  // Filter out locally deleted items
  const unifiedTasks = useMemo(() => {
    return rawUnifiedTasks.filter(t => !localDeletedTaskIds.has(t.id));
  }, [rawUnifiedTasks, localDeletedTaskIds]);

  // Helper to determine if a directive task is assigned to the current logged in user
  const isAssignedToCurrentUser = useMemo(() => {
    return (task: UnifiedTask): boolean => {
      if (!currentUser?.id) return true;
      
      // 1. Direct assignee ID match
      if (task.assigneeId && task.assigneeId === currentUser.id) return true;

      // 2. Original item fields check
      const orig = task.originalItem;
      if (orig) {
        if (orig.current_assignee_id === currentUser.id) return true;
        if (orig.assignee_id === currentUser.id) return true;
        if (orig.created_by === currentUser.id) return true;
        if (orig.current_assigner_id === currentUser.id) return true;

        if (orig.assigned_assignees) {
          if (typeof orig.assigned_assignees === 'string' && orig.assigned_assignees.includes(currentUser.id)) {
            return true;
          }
          if (Array.isArray(orig.assigned_assignees)) {
            const isInArray = orig.assigned_assignees.some((a: any) => 
              a === currentUser.id || a?.id === currentUser.id || a?.assignee_id === currentUser.id || a?.account_id === currentUser.id
            );
            if (isInArray) return true;
          }
        }
      }

      // 3. Assignee name matching currentUser full_name
      if (currentUser.full_name && task.assigneeName) {
        const nameA = task.assigneeName.toLowerCase().trim();
        const nameB = currentUser.full_name.toLowerCase().trim();
        if (nameA === nameB || (nameA !== 'chưa gán' && (nameA.includes(nameB) || nameB.includes(nameA)))) {
          return true;
        }
      }

      return false;
    };
  }, [currentUser]);

  const activeReportWeek = currentWeek || 39;

  // Main tab counts calculation
  const personalTasksTotal = useMemo(() => {
    return unifiedTasks.filter(t => {
      if (t.source !== 'REPORT') return false;
      if (personalWeekMode === 'CURRENT_WEEK') {
        const taskW = t.weekNumber;
        if (taskW && taskW !== activeReportWeek && taskW !== activeReportWeek + 1) return false;
      }
      return true;
    });
  }, [unifiedTasks, personalWeekMode, activeReportWeek]);

  const directiveTasksTotal = useMemo(() => {
    return unifiedTasks.filter(t => {
      if (t.source !== 'STANDALONE' && t.group !== 'Chỉ đạo') return false;
      return isAssignedToCurrentUser(t);
    });
  }, [unifiedTasks, isAssignedToCurrentUser]);

  const personalCount = personalTasksTotal.length;
  const directiveCount = directiveTasksTotal.length;

  // Filter tasks based on Primary Main Tab (Personal vs Directive) & Search/Dropdown Filters
  const filteredTasks = useMemo(() => {
    return unifiedTasks.filter(task => {
      // 0. Primary Main Tab Filter
      if (mainTab === 'PERSONAL') {
        if (task.source !== 'REPORT') return false;

        // Filter personal tasks by "Tuần đó" vs "Tất cả"
        if (personalWeekMode === 'CURRENT_WEEK') {
          const taskW = task.weekNumber;
          if (taskW && taskW !== activeReportWeek && taskW !== activeReportWeek + 1) {
            return false;
          }
        }
      } else if (mainTab === 'DIRECTIVE') {
        if (task.source !== 'STANDALONE' && task.group !== 'Chỉ đạo') return false;

        // For DIRECTIVE tasks: Only show tasks assigned to currently logged-in account (unless manager selected a specific employee)
        if (selectedUserId === 'ALL') {
          if (!isAssignedToCurrentUser(task)) return false;
        }
      }

      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesContent = task.content.toLowerCase().includes(q);
        const matchesAssignee = task.assigneeName.toLowerCase().includes(q);
        const matchesDept = task.departmentName.toLowerCase().includes(q);
        if (!matchesTitle && !matchesContent && !matchesAssignee && !matchesDept) {
          return false;
        }
      }

      // 2. Department Filter
      if (selectedDeptId !== 'ALL') {
        if (task.departmentId && task.departmentId !== selectedDeptId) {
          const targetDept = departments.find(d => d.id === selectedDeptId);
          if (targetDept && !task.departmentName.toLowerCase().includes(targetDept.name.toLowerCase())) {
            return false;
          }
        }
      }

      // 3. User Filter
      if (selectedUserId !== 'ALL') {
        if (task.assigneeId) {
          if (task.assigneeId !== selectedUserId) return false;
        } else {
          const targetAcc = accountsList.find(a => a.id === selectedUserId);
          if (targetAcc && !task.assigneeName.toLowerCase().includes(targetAcc.full_name.toLowerCase())) {
            return false;
          }
        }
      }

      // 4. Status Filter (Dropdown filter)
      if (statusFilter !== 'ALL') {
        if (task.status !== statusFilter) return false;
      }

      // 5. Active Status Sub-Tab Filter
      if (activeTab === 'RESOLVED' && task.status !== 'RESOLVED') return false;
      if (activeTab === 'BACKLOG' && task.status !== 'BACKLOG') return false;
      if (activeTab === 'STORE' && task.status !== 'STORE') return false;

      // 6. Group Filter
      if (groupFilter !== 'ALL') {
        if (task.group !== groupFilter) return false;
      }

      // 7. Week Filter
      if (weekFilter !== 'ALL') {
        if (task.weekNumber !== parseInt(weekFilter, 10)) return false;
      }

      return true;
    });
  }, [unifiedTasks, mainTab, personalWeekMode, activeReportWeek, isAssignedToCurrentUser, searchQuery, selectedDeptId, selectedUserId, statusFilter, groupFilter, weekFilter, activeTab, departments, accountsList]);

  // Paginated Sliced Tasks based on pageSize (20, 50, 100) and currentPage
  const totalPages = Math.ceil(filteredTasks.length / pageSize) || 1;
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [filteredTasks, currentPage, pageSize]);

  // Stats Calculations for active view
  const stats = useMemo(() => {
    const total = filteredTasks.length;
    const resolved = filteredTasks.filter(t => t.status === 'RESOLVED').length;
    const inProgress = filteredTasks.filter(t => t.status === 'IN_PROGRESS').length;
    const backlog = filteredTasks.filter(t => t.status === 'BACKLOG').length;
    const store = filteredTasks.filter(t => t.status === 'STORE').length;

    const resolvedPercent = total > 0 ? Math.round((resolved / total) * 100) : 0;
    const backlogPercent = total > 0 ? Math.round((backlog / total) * 100) : 0;
    const inProgressPercent = total > 0 ? Math.round((inProgress / total) * 100) : 0;
    const storePercent = total > 0 ? Math.round((store / total) * 100) : 0;

    const thuongXuyen = filteredTasks.filter(t => t.group === 'Thường xuyên').length;
    const dotXuat = filteredTasks.filter(t => t.group === 'Đột xuất').length;
    const chiDao = filteredTasks.filter(t => t.group === 'Chỉ đạo').length;

    return {
      total,
      resolved,
      inProgress,
      backlog,
      store,
      resolvedPercent,
      backlogPercent,
      inProgressPercent,
      storePercent,
      thuongXuyen,
      dotXuat,
      chiDao
    };
  }, [filteredTasks]);

  // Hierarchical Comparison Data for Managers
  const hierarchicalComparisonData = useMemo(() => {
    if (!isManager) return [];

    if (selectedDeptId === 'ALL') {
      return departments.map(dept => {
        const deptTasks = unifiedTasks.filter(t =>
          t.departmentId === dept.id || t.departmentName.toLowerCase().includes(dept.name.toLowerCase())
        );
        const res = deptTasks.filter(t => t.status === 'RESOLVED').length;
        const bl = deptTasks.filter(t => t.status === 'BACKLOG').length;
        const ip = deptTasks.filter(t => t.status === 'IN_PROGRESS').length;

        return {
          label: dept.name.replace('PHÒNG ', 'P. ').replace('VĂN PHÒNG ', 'VP '),
          total: deptTasks.length,
          resolved: res,
          backlog: bl,
          inProgress: ip
        };
      }).filter(d => d.total > 0);
    } else {
      const empList = accountsList.filter(a => a.department_id === selectedDeptId);
      if (empList.length === 0) return [];

      return empList.map(emp => {
        const empTasks = unifiedTasks.filter(t =>
          t.assigneeId === emp.id || t.assigneeName.toLowerCase().includes(emp.full_name.toLowerCase())
        );
        const res = empTasks.filter(t => t.status === 'RESOLVED').length;
        const bl = empTasks.filter(t => t.status === 'BACKLOG').length;
        const ip = empTasks.filter(t => t.status === 'IN_PROGRESS').length;

        return {
          label: emp.full_name,
          total: empTasks.length,
          resolved: res,
          backlog: bl,
          inProgress: ip
        };
      }).filter(e => e.total > 0);
    }
  }, [isManager, selectedDeptId, departments, accountsList, unifiedTasks]);

  // Handlers for Quick Edit Modal
  const handleStartEdit = (task: UnifiedTask) => {
    if (onEditTask) {
      onEditTask(task);
      return;
    }
    setEditingTask(task);
    setEditForm({
      title: task.title,
      content: task.content,
      group: task.group,
      dueDate: task.dueDate || '',
      status: task.status
    });
  };

  const handleSaveEdit = () => {
    if (!editingTask) return;
    editingTask.title = editForm.title;
    editingTask.content = editForm.content;
    editingTask.group = editForm.group;
    editingTask.dueDate = editForm.dueDate;
    editingTask.status = editForm.status;
    editingTask.statusLabel = editForm.status === 'RESOLVED' ? 'Hoàn thành' : editForm.status === 'BACKLOG' ? 'Tồn đọng' : editForm.status === 'STORE' ? 'Kho / Dự kiến' : 'Đang thực hiện';

    setEditingTask(null);
  };

  // Handlers for Delete Task Modal
  const handleConfirmDelete = (task: UnifiedTask) => {
    setDeletingTask(task);
  };

  const handleExecuteDelete = () => {
    if (!deletingTask) return;
    setLocalDeletedTaskIds(prev => new Set(prev).add(deletingTask.id));
    if (onDeleteTask) {
      onDeleteTask(deletingTask.id, deletingTask.source);
    }
    setDeletingTask(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-4 sm:p-6 lg:p-8 transition-colors duration-300">

      {/* 1. TOP BANNER & ACTION HEADER */}
      <div className="mb-6 bg-gradient-to-r from-[#004b8c] via-[#005dac] to-[#0074ca] dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-white/10 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-3 py-1 bg-white/15 dark:bg-white/10 rounded-full text-xs font-bold tracking-wider uppercase border border-white/20 flex items-center gap-1.5 backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Trang Chủ Tổng Quan & Quản Lý Phân Cấp
              </span>
              {isManager && (
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-[11px] font-extrabold uppercase">
                  {isAdmin ? 'Lãnh Đạo Ban / Admin' : 'Trưởng / Phó Phòng'}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-sm flex items-center gap-2">
              BẢNG ĐIỀU HÀNH VÀ GIÁM SÁT HIỆU SUẤT CÔNG VIỆC
            </h1>
            <p className="text-blue-100 dark:text-slate-300 text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed opacity-95">
              Theo dõi chi tiết các phần việc đã giải quyết, tồn đọng trễ hạn, kho nhiệm vụ tập trung và quản lý phân cấp theo phòng ban & cá nhân.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={loadDashboardData}
              disabled={isRefreshing}
              className="p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-xl border border-white/20 text-white shadow-xs backdrop-blur-md flex items-center gap-2 text-xs font-bold cursor-pointer"
              title="Cập nhật lại dữ liệu Dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>

            <button
              onClick={onNavigateToEditor}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center gap-2 text-xs uppercase tracking-wide cursor-pointer border border-amber-400/50"
            >
              <FileText className="w-4 h-4" />
              Soạn Báo Cáo Tuần
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. OMNI SEARCH & HIERARCHICAL FILTERS TOOLBAR */}
      <div className="mb-6 bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">

          {/* Search Box */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm công việc, người thực hiện, từ khóa..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Manager Level Filters */}
          {isManager ? (
            <div className="md:col-span-5 grid grid-cols-2 gap-2">
              <div className="relative">
                <select
                  value={selectedDeptId}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all appearance-none cursor-pointer truncate text-slate-700 dark:text-slate-200"
                >
                  <option value="ALL">🏢 Tất cả Phòng Ban</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <Building2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all appearance-none cursor-pointer truncate text-slate-700 dark:text-slate-200"
                >
                  <option value="ALL">👤 Tất cả Nhân Viên</option>
                  {filteredEmployeesForDropdown.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.full_name} ({acc.department_code || 'NV'})
                    </option>
                  ))}
                </select>
                <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          ) : (
            <div className="md:col-span-5 flex items-center gap-2 px-3 py-2 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200/50 dark:border-blue-900/40">
              <User className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="text-xs font-semibold text-blue-900 dark:text-blue-200 truncate">
                Cá nhân: <strong className="font-black">{currentUser?.full_name || 'Nhân viên'}</strong> ({currentUser?.department_name || 'Phòng ban'})
              </span>
            </div>
          )}

          {/* Week, Group & Status Filters */}
          <div className="md:col-span-3 grid grid-cols-3 gap-1.5">
            <div className="relative">
              <select
                value={weekFilter}
                onChange={(e) => setWeekFilter(e.target.value)}
                className="w-full pl-6 pr-1 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all appearance-none cursor-pointer truncate text-slate-700 dark:text-slate-200"
              >
                <option value="ALL">📅 Tất cả tuần</option>
                {availableWeeks.map((w) => (
                  <option key={w} value={w.toString()}>
                    Tuần {w}
                  </option>
                ))}
              </select>
              <Calendar className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value as any)}
                className="w-full pl-6 pr-1 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all appearance-none cursor-pointer truncate text-slate-700 dark:text-slate-200"
              >
                <option value="ALL">📁 Tất cả nhóm</option>
                <option value="Thường xuyên">Thường xuyên</option>
                <option value="Đột xuất">Đột xuất</option>
                <option value="Chỉ đạo">Chỉ đạo</option>
              </select>
              <Filter className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full pl-6 pr-1 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all appearance-none cursor-pointer truncate text-slate-700 dark:text-slate-200"
              >
                <option value="ALL">⚡ Trạng thái</option>
                <option value="RESOLVED">Đã giải quyết</option>
                <option value="IN_PROGRESS">Đang thực hiện</option>
                <option value="BACKLOG">Tồn đọng</option>
                <option value="STORE">Kho việc</option>
              </select>
              <Activity className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-cyan-500 pointer-events-none" />
            </div>
          </div>

        </div>
      </div>

      {/* 3. KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">

        {/* Card 1: Total Tasks */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              TỔNG CÔNG VIỆC
            </span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {stats.total}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium flex items-center gap-1">
            <Activity className="w-3 h-3 text-blue-500" />
            Theo tab {mainTab === 'PERSONAL' ? 'Nhiệm vụ cá nhân' : 'Chỉ đạo cấp trên'}
          </p>
        </div>

        {/* Card 2: Resolved */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-emerald-200/80 dark:border-emerald-900/40 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              ĐÃ GIẢI QUYẾT
            </span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.resolved}
            </span>
            <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
              {stats.resolvedPercent}%
            </span>
          </div>
          <p className="text-[11px] text-emerald-600/90 dark:text-emerald-400/90 mt-1 font-medium">
            Hoàn thành tốt nhiệm vụ
          </p>
        </div>

        {/* Card 3: In Progress */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-blue-200/80 dark:border-blue-900/40 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              ĐANG THỰC HIỆN
            </span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
              {stats.inProgress}
            </span>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-300">
              ({stats.inProgressPercent}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Đang tiến hành đúng tiến độ
          </p>
        </div>

        {/* Card 4: Backlog */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-rose-200/80 dark:border-rose-900/40 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
              TỒN ĐỌNG / TRỄ HẠN
            </span>
            <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
              {stats.backlog}
            </span>
            {stats.backlog > 0 && (
              <span className="text-xs font-extrabold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 px-2 py-0.5 rounded-full border border-rose-300 dark:border-rose-800 animate-pulse">
                {stats.backlogPercent}%
              </span>
            )}
          </div>
          <p className="text-[11px] text-rose-600/90 dark:text-rose-400/90 mt-1 font-semibold">
            {stats.backlog > 0 ? '⚠️ Cần tập trung giải quyết ngay' : 'Không có tồn đọng'}
          </p>
        </div>

        {/* Card 5: Task Store / Warehouse */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-purple-200/80 dark:border-purple-900/40 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              KHO CÔNG VIỆC
            </span>
            <div className="p-2 bg-purple-50 dark:bg-purple-950/40 rounded-xl text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/50">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">
              {stats.store}
            </span>
            <span className="text-xs font-bold text-purple-600 dark:text-purple-300">
              ({stats.storePercent}%)
            </span>
          </div>
          <p className="text-[11px] text-purple-600/90 dark:text-purple-400/90 mt-1 font-medium">
            Chờ phân công & triển khai
          </p>
        </div>

      </div>

      {/* 4. VISUAL CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">

        {/* Chart 1: Donut Chart */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-blue-500" />
                Tỷ Lệ Giải Quyết & Tồn Đọng
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">SVG Donut Chart</span>
            </div>

            {stats.total === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs">
                <FolderOpen className="w-8 h-8 mb-2 opacity-50" />
                Chưa có dữ liệu phù hợp với bộ lọc
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-around gap-4 my-2">
                <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      className="text-slate-100 dark:text-slate-800"
                      strokeWidth="3.8"
                    />
                    {stats.resolvedPercent > 0 && (
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="4"
                        strokeDasharray={`${stats.resolvedPercent}, 100`}
                        className="transition-all duration-700 ease-out"
                      />
                    )}
                    {stats.backlogPercent > 0 && (
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth="4"
                        strokeDasharray={`${stats.backlogPercent}, 100`}
                        strokeDashoffset={`-${stats.resolvedPercent}`}
                        className="transition-all duration-700 ease-out"
                      />
                    )}
                    {stats.inProgressPercent > 0 && (
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="4"
                        strokeDasharray={`${stats.inProgressPercent}, 100`}
                        strokeDashoffset={`-${stats.resolvedPercent + stats.backlogPercent}`}
                        className="transition-all duration-700 ease-out"
                      />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-black text-slate-800 dark:text-white">
                      {stats.resolvedPercent}%
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                      Đã Giải Quyết
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 text-xs font-semibold w-full">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                    <span className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                      <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                      Đã giải quyết / Hoàn thành
                    </span>
                    <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                      {stats.resolved} ({stats.resolvedPercent}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
                    <span className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
                      <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                      Tồn đọng / Trễ hạn
                    </span>
                    <span className="font-extrabold text-rose-700 dark:text-rose-400">
                      {stats.backlog} ({stats.backlogPercent}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                    <span className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
                      <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                      Đang thực hiện
                    </span>
                    <span className="font-extrabold text-blue-700 dark:text-blue-400">
                      {stats.inProgress} ({stats.inProgressPercent}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40">
                    <span className="flex items-center gap-2 text-purple-800 dark:text-purple-300">
                      <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                      Kho phần việc
                    </span>
                    <span className="font-extrabold text-purple-700 dark:text-purple-400">
                      {stats.store} ({stats.storePercent}%)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Group & Hierarchical Breakdown */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                {isManager ? 'So Sánh Tiến Độ Theo Đơn Vị / Phân Cấp' : 'Phân Loại Theo Nhóm Công Việc'}
              </h3>
              {onOpenStandaloneKanban && (
                <button
                  onClick={onOpenStandaloneKanban}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Package className="w-3.5 h-3.5" />
                  Mở Kho Nhiệm Vụ Phân Cấp
                </button>
              )}
            </div>

            {isManager && hierarchicalComparisonData.length > 0 ? (
              <div className="space-y-3.5 my-2">
                {hierarchicalComparisonData.slice(0, 5).map((item, idx) => {
                  const resolvedWidth = item.total > 0 ? Math.round((item.resolved / item.total) * 100) : 0;
                  const backlogWidth = item.total > 0 ? Math.round((item.backlog / item.total) * 100) : 0;

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                          {item.label}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                          Tổng: <strong className="text-slate-900 dark:text-white font-extrabold">{item.total}</strong> (Đã xong: <span className="text-emerald-600 font-extrabold">{item.resolved}</span>, Tồn: <span className="text-rose-600 font-extrabold">{item.backlog}</span>)
                        </span>
                      </div>

                      <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${resolvedWidth}%` }}
                          className="bg-emerald-500 h-full transition-all duration-500"
                          title={`Đã giải quyết: ${item.resolved}`}
                        ></div>
                        <div
                          style={{ width: `${backlogWidth}%` }}
                          className="bg-rose-500 h-full transition-all duration-500"
                          title={`Tồn đọng: ${item.backlog}`}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4 my-3">
                <div>
                  <div className="flex justify-between items-center text-xs font-bold mb-1">
                    <span className="text-slate-700 dark:text-slate-200">
                      📌 Nhiệm vụ Thường xuyên
                    </span>
                    <span className="text-blue-600 dark:text-blue-400 font-extrabold">
                      {stats.thuongXuyen} việc ({stats.total > 0 ? Math.round((stats.thuongXuyen / stats.total) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${stats.total > 0 ? (stats.thuongXuyen / stats.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs font-bold mb-1">
                    <span className="text-slate-700 dark:text-slate-200">
                      ⚡ Nhiệm vụ Đột xuất
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 font-extrabold">
                      {stats.dotXuat} việc ({stats.total > 0 ? Math.round((stats.dotXuat / stats.total) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${stats.total > 0 ? (stats.dotXuat / stats.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs font-bold mb-1">
                    <span className="text-slate-700 dark:text-slate-200">
                      👑 Chỉ đạo Lãnh đạo cấp trên
                    </span>
                    <span className="text-purple-600 dark:text-purple-400 font-extrabold">
                      {stats.chiDao} việc ({stats.total > 0 ? Math.round((stats.chiDao / stats.total) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${stats.total > 0 ? (stats.chiDao / stats.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 5. PRIMARY 2 MAIN TABS BANNER (KHO CÁ NHÂN vs CẤP TRÊN GIAO XUỐNG) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Tab 1: Kho Nhiệm Vụ Cá Nhân */}
        <div
          onClick={() => setMainTab('PERSONAL')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex items-center justify-between group ${
            mainTab === 'PERSONAL'
              ? 'bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white border-blue-500/60 shadow-xl ring-2 ring-blue-500/40'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-blue-400 dark:hover:border-blue-600 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-3.5 relative z-10">
            <div className={`p-3.5 rounded-2xl transition-transform group-hover:scale-105 ${
              mainTab === 'PERSONAL'
                ? 'bg-blue-600/40 text-blue-200 border border-blue-400/30'
                : 'bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-slate-700'
            }`}>
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="font-black text-sm sm:text-base uppercase tracking-wide flex items-center gap-2">
                Kho Nhiệm Vụ Cá Nhân
                <span className="text-[10px] normal-case px-2 py-0.5 rounded-full font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Báo cáo tuần & Các Sao ⭐
                </span>
              </div>
              <p className={`text-xs mt-1 ${mainTab === 'PERSONAL' ? 'text-blue-200/90' : 'text-slate-500 dark:text-slate-400'}`}>
                Quản lý các sao nhiệm vụ tự import & kết quả tuần cá nhân (Có nút Sửa & Xóa)
              </p>

              {/* Personal Task Week Selector */}
              <div className="mt-2.5 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <span className="text-[11px] font-extrabold text-blue-300 dark:text-blue-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-amber-400" />
                  Hiển thị:
                </span>
                <select
                  value={personalWeekMode}
                  onChange={(e) => setPersonalWeekMode(e.target.value as 'CURRENT_WEEK' | 'ALL')}
                  className="bg-slate-950/80 text-amber-300 text-xs font-black px-2.5 py-1 rounded-xl border border-amber-400/40 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer shadow-sm"
                >
                  <option value="CURRENT_WEEK" className="bg-slate-900 text-amber-300">📌 Tuần đó (Tuần {currentWeek || 39})</option>
                  <option value="ALL" className="bg-slate-900 text-white">🌐 Tất cả các tuần</option>
                </select>
              </div>
            </div>
          </div>
          <div className="text-right shrink-0 relative z-10 pl-2">
            <span className={`text-2xl sm:text-3xl font-black ${mainTab === 'PERSONAL' ? 'text-blue-300' : 'text-blue-600 dark:text-blue-400'}`}>
              {personalCount}
            </span>
            <span className="block text-[10px] uppercase font-extrabold text-slate-400">Công việc</span>
          </div>
        </div>

        {/* Tab 2: Nhiệm Vụ Được Cấp Trên Giao Xuống */}
        <div
          onClick={() => setMainTab('DIRECTIVE')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex items-center justify-between group ${
            mainTab === 'DIRECTIVE'
              ? 'bg-gradient-to-r from-purple-900 via-slate-900 to-indigo-950 text-white border-purple-500/60 shadow-xl ring-2 ring-purple-500/40'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-purple-400 dark:hover:border-purple-600 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-3.5 relative z-10">
            <div className={`p-3.5 rounded-2xl transition-transform group-hover:scale-105 ${
              mainTab === 'DIRECTIVE'
                ? 'bg-purple-600/40 text-purple-200 border border-purple-400/30'
                : 'bg-purple-50 dark:bg-slate-800 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-slate-700'
            }`}>
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="font-black text-sm sm:text-base uppercase tracking-wide flex items-center gap-2">
                Nhiệm Vụ Được Cấp Trên Giao Xuống
                <span className="text-[10px] normal-case px-2 py-0.5 rounded-full font-extrabold bg-purple-400/20 text-purple-300 border border-purple-400/30">
                  Chỉ đạo Lãnh đạo 👑
                </span>
              </div>
              <p className={`text-xs mt-1 ${mainTab === 'DIRECTIVE' ? 'text-purple-200/90' : 'text-slate-500 dark:text-slate-400'}`}>
                Nhiệm vụ phân công độc lập từ cấp trên (Chỉ xem chi tiết / Cập nhật tiến độ)
              </p>
              <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-bold text-purple-200">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Chỉ hiển thị công việc giao cho: <strong className="text-white underline">{currentUser?.full_name || 'Acc đăng nhập'}</strong>
              </div>
            </div>
          </div>
          <div className="text-right shrink-0 relative z-10 pl-2">
            <span className={`text-2xl sm:text-3xl font-black ${mainTab === 'DIRECTIVE' ? 'text-purple-300' : 'text-purple-600 dark:text-purple-400'}`}>
              {directiveCount}
            </span>
            <span className="block text-[10px] uppercase font-extrabold text-slate-400">Công việc</span>
          </div>
        </div>
      </div>

      {/* 6. TASK DATA TABLE WITH STATUS SUB-TABS & PAGE SIZE CONTROL */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800">

        {/* Tab & Page Size Navigation Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">

          {/* Status Sub-Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ALL'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Tất Cả ({stats.total})
            </button>

            <button
              onClick={() => setActiveTab('BACKLOG')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'BACKLOG'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Cần Giải Quyết / Tồn Đọng ({stats.backlog})
            </button>

            <button
              onClick={() => setActiveTab('STORE')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'STORE'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Kho Phần Việc ({stats.store})
            </button>

            <button
              onClick={() => setActiveTab('RESOLVED')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'RESOLVED'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Đã Giải Quyết ({stats.resolved})
            </button>
          </div>

          {/* PAGE SIZE & WEEK SELECTOR DROPDOWNS */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {mainTab === 'PERSONAL' ? (
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-slate-700 shadow-xs">
                <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">Kho cá nhân:</span>
                <select
                  value={personalWeekMode}
                  onChange={(e) => setPersonalWeekMode(e.target.value as 'CURRENT_WEEK' | 'ALL')}
                  className="bg-transparent text-xs font-black text-blue-700 dark:text-blue-300 focus:outline-none cursor-pointer border-none"
                >
                  <option value="CURRENT_WEEK" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">📌 Tuần đó (Tuần {currentWeek || 39})</option>
                  <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">🌐 Tất cả các tuần</option>
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-purple-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-slate-700 text-xs font-bold text-purple-800 dark:text-purple-300">
                <ShieldAlert className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>Giao cho: <strong className="font-black text-purple-950 dark:text-white">{currentUser?.full_name || 'Acc đăng nhập'}</strong></span>
              </div>
            )}

            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Hiển thị:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-black text-blue-600 dark:text-blue-400 focus:outline-none cursor-pointer"
              >
                <option value={20}>20 nhiệm vụ</option>
                <option value={50}>50 nhiệm vụ</option>
                <option value={100}>100 nhiệm vụ</option>
              </select>
            </div>

            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Tổng <strong className="text-slate-800 dark:text-slate-100 font-extrabold">{filteredTasks.length}</strong> công việc
            </span>
          </div>

        </div>

        {/* Task Data Table */}
        {filteredTasks.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold">Không tìm thấy công việc nào phù hợp</p>
            <p className="text-xs text-slate-400 mt-1">Thử thay đổi bộ lọc, chuyển tab hoặc nhập từ khóa tìm kiếm khác</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-800/30">
                    <th className="py-3 px-3 rounded-l-xl">Nội Dung Công Việc</th>
                    <th className="py-3 px-3">Phòng Ban & Người Thực Hiện</th>
                    <th className="py-3 px-3">Nhóm / Nguồn</th>
                    <th className="py-3 px-3 text-center">Tuần Báo Cáo</th>
                    <th className="py-3 px-3">Thời Hạn</th>
                    <th className="py-3 px-3">Trạng Thái</th>
                    <th className="py-3 px-3 text-right rounded-r-xl">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {paginatedTasks.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Task Title & Content */}
                      <td className="py-3.5 px-3 max-w-md">
                        <div className="font-bold text-slate-800 dark:text-slate-100 leading-snug flex items-center gap-1.5">
                          {t.source === 'REPORT' && (
                            <span className="text-amber-400 shrink-0" title="Nhiệm vụ báo cáo cá nhân / tự import">⭐</span>
                          )}
                          <span>{t.title}</span>
                        </div>
                        {t.content && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 font-medium">
                            {t.content}
                          </div>
                        )}
                      </td>

                      {/* Department & Assignee */}
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>{t.assigneeName}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {t.departmentName}
                        </div>
                      </td>

                      {/* Group & Source Tag */}
                      <td className="py-3.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          t.group === 'Đột xuất'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50'
                            : t.group === 'Chỉ đạo'
                            ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50'
                            : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50'
                        }`}>
                          {t.group}
                        </span>
                      </td>

                      {/* Week Badge */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200/80 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/60 shadow-2xs">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>Tuần {t.weekNumber || currentWeek || 39}</span>
                        </span>
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t.dueDate || 'Chưa định'}</span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-extrabold border ${
                          t.status === 'RESOLVED'
                            ? 'bg-emerald-100/80 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                            : t.status === 'BACKLOG'
                            ? 'bg-rose-100/80 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                            : t.status === 'STORE'
                            ? 'bg-purple-100/80 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
                            : 'bg-blue-100/80 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                        }`}>
                          {t.status === 'RESOLVED' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {t.status === 'BACKLOG' && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                          {t.status === 'STORE' && <Package className="w-3 h-3 text-purple-600" />}
                          {t.status === 'IN_PROGRESS' && <Clock className="w-3 h-3 text-blue-600" />}
                          {t.statusLabel}
                        </span>
                      </td>

                      {/* Quick Actions (EDIT & DELETE FOR SELF-IMPORTED ONLY, VIEW FOR STANDALONE) */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Chi tiết button (Always available) */}
                          <button
                            onClick={() => onOpenTaskDetail && onOpenTaskDetail(t.originalItem || t)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-[11px] transition-all cursor-pointer inline-flex items-center gap-1"
                            title="Xem chi tiết công việc"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-500" />
                            <span>Chi tiết</span>
                          </button>

                          {/* Sửa & Xóa Buttons (ONLY for self-imported / report tasks) */}
                          {t.source === 'REPORT' && (
                            <>
                              <button
                                onClick={() => handleStartEdit(t)}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-bold rounded-lg text-[11px] border border-amber-200 dark:border-amber-800/60 transition-all cursor-pointer inline-flex items-center gap-1"
                                title="Chỉnh sửa nội dung nhiệm vụ cá nhân"
                              >
                                <Pencil className="w-3.5 h-3.5 text-amber-500" />
                                <span>Sửa</span>
                              </button>

                              <button
                                onClick={() => handleConfirmDelete(t)}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold rounded-lg text-[11px] border border-rose-200 dark:border-rose-800/60 transition-all cursor-pointer inline-flex items-center gap-1"
                                title="Xóa nhiệm vụ cá nhân này"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                <span>Xóa</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PAGINATION CONTROLS BAR */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
                <div className="text-slate-500 dark:text-slate-400 font-medium">
                  Hiển thị từ <strong className="text-slate-800 dark:text-slate-100 font-extrabold">{(currentPage - 1) * pageSize + 1}</strong> đến <strong className="text-slate-800 dark:text-slate-100 font-extrabold">{Math.min(currentPage * pageSize, filteredTasks.length)}</strong> trên tổng số <strong className="text-slate-800 dark:text-slate-100 font-extrabold">{filteredTasks.length}</strong> công việc
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Trước</span>
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                    .map((page, idx, arr) => {
                      const prevPage = arr[idx - 1];
                      const showEllipsis = prevPage && page - prevPage > 1;
                      return (
                        <React.Fragment key={page}>
                          {showEllipsis && <span className="px-1 text-slate-400 font-bold">...</span>}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                              currentPage === page
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>Sau</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* QUICK EDIT MODAL (For personal self-imported tasks) */}
      {editingTask && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-fadeIn">
            <button
              onClick={() => setEditingTask(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4 text-amber-600 dark:text-amber-400 font-extrabold text-base">
              <Pencil className="w-5 h-5" />
              <span>Chỉnh Sửa Nhiệm Vụ Cá Nhân</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nội dung công việc <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Chi tiết thực hiện / Sản phẩm
                </label>
                <textarea
                  rows={3}
                  value={editForm.content}
                  onChange={(e) => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nhóm công việc
                  </label>
                  <select
                    value={editForm.group}
                    onChange={(e) => setEditForm(prev => ({ ...prev, group: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="Thường xuyên">Thường xuyên</option>
                    <option value="Đột xuất">Đột xuất</option>
                    <option value="Chỉ đạo">Chỉ đạo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Trạng thái tiến độ
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="IN_PROGRESS">Đang thực hiện</option>
                    <option value="RESOLVED">Hoàn thành</option>
                    <option value="BACKLOG">Tồn đọng / Trễ hạn</option>
                    <option value="STORE">Kho / Dự kiến</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Thời hạn hoàn thành
                </label>
                <input
                  type="text"
                  value={editForm.dueDate}
                  onChange={(e) => setEditForm(prev => ({ ...prev, dueDate: e.target.value }))}
                  placeholder="VD: 25/09/2026 hoặc Trong tuần"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingTask(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-200 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Save className="w-4 h-4" />
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletingTask && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-fadeIn text-center">
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-rose-200 dark:border-rose-900">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Xác Nhận Xóa Nhiệm Vụ Cá Nhân
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Bạn có chắc chắn muốn xóa nhiệm vụ <strong className="text-slate-800 dark:text-slate-200">"{deletingTask.title}"</strong> khỏi kho nhiệm vụ cá nhân không? Hành động này không thể hoàn tác.
            </p>

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setDeletingTask(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-200 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleExecuteDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs cursor-pointer shadow-md"
              >
                Xóa Nhiệm Vụ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

