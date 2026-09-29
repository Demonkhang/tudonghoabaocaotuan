import React, { useState, useEffect } from 'react';
import {
  Layout,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Plus,
  Search,
  AlertCircle,
  Check,
  RotateCcw,
  ListTodo,
  FileSpreadsheet,
  ChevronRight,
  ShieldCheck,
  Ban,
  Paperclip,
  Eye,
  Edit3,
  FileCheck,
  Star,
  CheckSquare,
  Square,
  Copy,
  Trash2,
  Layers,
  BookmarkCheck,
  RefreshCw,
  Crown
} from 'lucide-react';
import { TaskTable1, TaskTable2 } from '../utils/reportUtils';
import { UserProfile } from './LoginModal';
import { fetchCandidateTasks } from '../services/api';
import { BulkAddTaskModal } from './BulkAddTaskModal';
import { CompletionProofModal } from './CompletionProofModal';
import { TaskDetailModal } from './TaskDetailModal';
import { saveStarredTaskToStorage, removeStarredTaskFromStorage, isTaskStarredInStorage, isTaskUnstarredInStorage } from './TableEditor';
import { ConfirmModal, ConfirmModalProps } from './ConfirmModal';

export interface KanbanTaskItem {
  id: string;
  noi_dung: string;
  nhom?: string; // 'Thường xuyên' | 'Đột xuất'
  thoi_gian?: string;
  trien_khai?: string;
  tien_do?: string;
  san_pham?: string;
  file_minh_chung?: string;
  file_original_name?: string;
  san_pham_du_kien?: string;
  source: 'unfinished_table1' | 'planned_table2' | 'imported_file' | 'custom_added' | 'standalone_assigned';
  originalTable?: 1 | 2;
  targetTable?: 1 | 2;
  parent_task_id?: string;
  is_recurring?: boolean;     // ⭐ Tag lặp lại / Thường xuyên
  is_starred?: boolean;       // ⭐ Gắn dấu sao nhiệm vụ mẫu
  is_directive_task?: boolean; // 👑 Nhiệm vụ từ kho phân cấp giao xuống hoặc được giao
  assigner_name?: string;      // Tên người/lãnh đạo giao nhiệm vụ
  task_code?: string;          // Mã nhiệm vụ (ví dụ NV-2026-001)
  team_code?: 'VAN_THU' | 'CDS'; // 🏢 Bộ phận (Văn thư / Chuyển đổi số)
  week_number?: number;        // 📅 Tuần báo cáo/khởi tạo nhiệm vụ
}

export type ColumnId = 'backlog' | 'nextWeek' | 'completed' | 'cancelled' | 'trash';

interface KanbanPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceWeek: number;
  sourceYear: number;
  table1: TaskTable1[];
  table2: TaskTable2[];
  currentUser: UserProfile | null;
  onConfirmKanbanPlan: (
    plannedTasks: KanbanTaskItem[],
    completedTasks: KanbanTaskItem[],
    cancelledTasks: KanbanTaskItem[]
  ) => Promise<void>;
}

export function KanbanPlannerModal({
  isOpen,
  onClose,
  sourceWeek,
  sourceYear,
  table1,
  table2,
  currentUser,
  onConfirmKanbanPlan
}: KanbanPlannerModalProps) {
  const [columns, setColumns] = useState<Record<ColumnId, KanbanTaskItem[]>>({
    backlog: [],
    nextWeek: [],
    completed: [],
    cancelled: [],
    trash: []
  });

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [activeDropCol, setActiveDropCol] = useState<ColumnId | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState<ConfirmModalProps | null>(null);

  // Multi-select & Sub-tab states
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [backlogSubTab, setBacklogSubTab] = useState<'ALL' | 'RECURRING' | 'ASSIGNED' | 'TRASH'>('ALL');
  const [starredSubMode, setStarredSubMode] = useState<'WEEKLY' | 'ALL'>('WEEKLY');

  // Proof Verification & Task Detail/Edit modals
  const [pendingProofTask, setPendingProofTask] = useState<KanbanTaskItem | null>(null);
  const [activeDetailTask, setActiveDetailTask] = useState<KanbanTaskItem | null>(null);
  const [activeDetailMode, setActiveDetailMode] = useState<'view' | 'edit'>('view');

  // Helpers for LocalStorage persistence of trashed & permanently deleted items
  const getTrashStorageKey = () => `kanban_trash_tasks_${currentUser?.department_id || 'dept_vp'}_${currentUser?.id || 'anon'}`;
  const getDeletedKeysStorageKey = () => `kanban_deleted_keys_${currentUser?.department_id || 'dept_vp'}_${currentUser?.id || 'anon'}`;

  const saveTrashToStorage = (trashList: KanbanTaskItem[]) => {
    try {
      localStorage.setItem(getTrashStorageKey(), JSON.stringify(trashList));
    } catch (e) {
      console.warn('Lỗi lưu localStorage thùng rác:', e);
    }
  };

  const saveDeletedKeyToStorage = (keys: string[]) => {
    try {
      const existing = JSON.parse(localStorage.getItem(getDeletedKeysStorageKey()) || '[]');
      const merged = Array.from(new Set([...existing, ...keys]));
      localStorage.setItem(getDeletedKeysStorageKey(), JSON.stringify(merged));
    } catch (e) {
      console.warn('Lỗi lưu deleted keys:', e);
    }
  };

  // Trash Action Handlers
  const handleMoveTaskToTrash = (taskId: string) => {
    setColumns(prev => {
      let taskToTrash: KanbanTaskItem | null = null;
      const nextCols = { ...prev };
      (Object.keys(nextCols) as ColumnId[]).forEach(col => {
        if (col !== 'trash') {
          const found = nextCols[col].find(t => t.id === taskId);
          if (found) {
            taskToTrash = found;
            nextCols[col] = nextCols[col].filter(t => t.id !== taskId);
          }
        }
      });

      if (taskToTrash) {
        if (!nextCols.trash.some(t => t.id === taskId)) {
          nextCols.trash = [taskToTrash, ...nextCols.trash];
        }
        saveTrashToStorage(nextCols.trash);
      }
      return nextCols;
    });
    setSelectedTaskIds(prev => prev.filter(id => id !== taskId));
  };

  const handleRestoreTaskFromTrash = (taskId: string) => {
    setColumns(prev => {
      const taskToRestore = prev.trash.find(t => t.id === taskId);
      if (!taskToRestore) return prev;

      const nextTrash = prev.trash.filter(t => t.id !== taskId);
      saveTrashToStorage(nextTrash);

      return {
        ...prev,
        trash: nextTrash,
        backlog: [taskToRestore, ...prev.backlog]
      };
    });
    setSelectedTaskIds(prev => prev.filter(id => id !== taskId));
  };

  const handlePermanentlyDeleteTask = (taskId: string) => {
    setColumns(prev => {
      const taskToDelete = prev.trash.find(t => t.id === taskId);
      if (taskToDelete) {
        const key = taskToDelete.noi_dung.toLowerCase().trim();
        saveDeletedKeyToStorage([key]);
      }
      const nextTrash = prev.trash.filter(t => t.id !== taskId);
      saveTrashToStorage(nextTrash);
      return {
        ...prev,
        trash: nextTrash
      };
    });
    setSelectedTaskIds(prev => prev.filter(id => id !== taskId));
  };

  const handleEmptyTrash = () => {
    if (columns.trash.length === 0) return;
    setConfirmModalConfig({
      isOpen: true,
      title: 'Dọn sạch thùng rác',
      message: `Bạn có chắc chắn muốn XÓA VĨNH VIỄN tất cả ${columns.trash.length} nhiệm vụ trong thùng rác không?\n\nHành động này không thể hoàn tác.`,
      type: 'danger',
      confirmText: 'Xóa vĩnh viễn',
      cancelText: 'Hủy bỏ',
      onConfirm: () => {
        setConfirmModalConfig(null);
        const keysToDelete = columns.trash.map(t => t.noi_dung.toLowerCase().trim());
        saveDeletedKeyToStorage(keysToDelete);
        saveTrashToStorage([]);

        setColumns(prev => ({
          ...prev,
          trash: []
        }));
        setSelectedTaskIds([]);
      },
      onCancel: () => setConfirmModalConfig(null)
    });
  };

  const handleBatchMoveToTrash = () => {
    if (selectedTaskIds.length === 0) return;
    setColumns(prev => {
      const nextCols = { ...prev };
      const tasksToTrash: KanbanTaskItem[] = [];

      (Object.keys(nextCols) as ColumnId[]).forEach(col => {
        if (col !== 'trash') {
          const remaining: KanbanTaskItem[] = [];
          nextCols[col].forEach(t => {
            if (selectedTaskIds.includes(t.id)) {
              tasksToTrash.push(t);
            } else {
              remaining.push(t);
            }
          });
          nextCols[col] = remaining;
        }
      });

      const existingTrashIds = new Set(nextCols.trash.map(t => t.id));
      const newTrashItems = tasksToTrash.filter(t => !existingTrashIds.has(t.id));
      nextCols.trash = [...newTrashItems, ...nextCols.trash];
      saveTrashToStorage(nextCols.trash);
      return nextCols;
    });
    setSelectedTaskIds([]);
  };

  const handleBatchRestoreFromTrash = () => {
    if (selectedTaskIds.length === 0) return;
    setColumns(prev => {
      const tasksToRestore = prev.trash.filter(t => selectedTaskIds.includes(t.id));
      const nextTrash = prev.trash.filter(t => !selectedTaskIds.includes(t.id));
      saveTrashToStorage(nextTrash);

      return {
        ...prev,
        trash: nextTrash,
        backlog: [...tasksToRestore, ...prev.backlog]
      };
    });
    setSelectedTaskIds([]);
  };

  const handleBatchPermanentlyDelete = () => {
    if (selectedTaskIds.length === 0) return;
    setConfirmModalConfig({
      isOpen: true,
      title: 'Xóa vĩnh viễn nhiệm vụ đã chọn',
      message: `Bạn có chắc muốn XÓA VĨNH VIỄN ${selectedTaskIds.length} nhiệm vụ đã chọn trong thùng rác không?`,
      type: 'danger',
      confirmText: 'Xóa vĩnh viễn',
      cancelText: 'Hủy bỏ',
      onConfirm: () => {
        setConfirmModalConfig(null);
        setColumns(prev => {
          const tasksToDelete = prev.trash.filter(t => selectedTaskIds.includes(t.id));
          const keysToDelete = tasksToDelete.map(t => t.noi_dung.toLowerCase().trim());
          saveDeletedKeyToStorage(keysToDelete);

          const nextTrash = prev.trash.filter(t => !selectedTaskIds.includes(t.id));
          saveTrashToStorage(nextTrash);

          return {
            ...prev,
            trash: nextTrash
          };
        });
        setSelectedTaskIds([]);
      },
      onCancel: () => setConfirmModalConfig(null)
    });
  };

  // Load candidate tasks into backlog when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const loadCandidateTasks = async () => {
      setIsLoadingCandidates(true);
      const initialBacklog: KanbanTaskItem[] = [];
      const addedSet = new Set<string>();

      // Load saved trash & deleted keys from localStorage
      let savedTrash: KanbanTaskItem[] = [];
      let savedDeletedKeys: string[] = [];
      try {
        const rawTrash = localStorage.getItem(getTrashStorageKey());
        if (rawTrash) savedTrash = JSON.parse(rawTrash);
        const rawDeleted = localStorage.getItem(getDeletedKeysStorageKey());
        if (rawDeleted) savedDeletedKeys = JSON.parse(rawDeleted);
      } catch (e) {
        console.warn('Lỗi đọc localStorage thùng rác:', e);
      }

      const deletedSet = new Set(savedDeletedKeys.map(k => k.toLowerCase().trim()));
      const trashKeySet = new Set(savedTrash.map(t => t.noi_dung.toLowerCase().trim()));

      const addUniqueItem = (item: KanbanTaskItem, isFromActiveReport = false) => {
        const key = item.noi_dung.toLowerCase().trim();
        if (!key) return;

        // Nếu KHÔNG phải từ báo cáo active hiện tại (ví dụ từ CSDL lịch sử), mới lọc theo savedDeletedKeys / savedTrash
        if (!isFromActiveReport) {
          if (deletedSet.has(key)) return;
          if (trashKeySet.has(key)) return;
        }

        // Kiểm tra xem nhiệm vụ có bị người dùng bỏ gắn sao hay không
        const isUnstarred = isTaskUnstarredInStorage(currentUser?.department_id, item.noi_dung);
        if (isUnstarred) {
          item.is_starred = false;
          item.is_recurring = false;
        } else {
          const starredInStore = isTaskStarredInStorage(currentUser?.department_id, item.noi_dung);
          if (starredInStore) {
            item.is_starred = true;
            item.is_recurring = true;
            item.nhom = 'Thường xuyên';
          }
        }

        const existingItem = initialBacklog.find(it => it.noi_dung.toLowerCase().trim() === key);
        if (existingItem) {
          if (!isUnstarred && item.is_starred) {
            existingItem.is_starred = true;
            existingItem.is_recurring = true;
            existingItem.nhom = 'Thường xuyên';
          }
          return;
        }

        if (addedSet.has(key)) return;
        addedSet.add(key);

        initialBacklog.push(item);
      };

      // 1. Unfinished & Starred tasks from active memory Table 1 (Ưu tiên cao nhất từ Giao diện)
      table1.forEach(t => {
        const lowerProgress = (t.tien_do || '').toLowerCase().trim();
        const isUnstarred = isTaskUnstarredInStorage(currentUser?.department_id, t.noi_dung);
        const isStarred = !isUnstarred && (Boolean(t.is_starred) || isTaskStarredInStorage(currentUser?.department_id, t.noi_dung));
        const category = isStarred ? 'Thường xuyên' : (t.nhom || 'Thường xuyên');
        const isRecurring = category === 'Thường xuyên' || String(category).toLowerCase().includes('thường xuyên') || Boolean(t.is_recurring) || isStarred;
        const isDirective =
          Boolean(t.is_directive_task) ||
          Boolean((t as any).assigner_name) ||
          Boolean((t as any).task_code) ||
          (t.noi_dung && (
            t.noi_dung.startsWith('[NV-') ||
            t.noi_dung.startsWith('[SĐ') ||
            t.noi_dung.startsWith('[CV') ||
            t.noi_dung.startsWith('[VB') ||
            t.noi_dung.startsWith('[TB') ||
            t.noi_dung.toLowerCase().includes('phân công') ||
            t.noi_dung.toLowerCase().includes('giao xuống') ||
            t.noi_dung.toLowerCase().includes('phân cấp')
          )) ||
          (category as string) === 'Phân cấp' ||
          (category as string) === 'Được giao';

        if (t.noi_dung && t.noi_dung.trim().length > 0 && !lowerProgress.includes('hủy') && !lowerProgress.includes('kết thúc') && !lowerProgress.includes('dừng')) {
          addUniqueItem({
            id: `k_t1_${t.id}`,
            noi_dung: t.noi_dung,
            nhom: category,
            thoi_gian: t.thoi_gian || 'Trong tuần',
            trien_khai: t.trien_khai || '',
            tien_do: t.tien_do || 'Đang thực hiện',
            san_pham: t.san_pham || '',
            file_minh_chung: t.file_minh_chung || '',
            file_original_name: t.file_original_name || '',
            source: 'unfinished_table1',
            originalTable: 1,
            parent_task_id: t.id,
            is_recurring: isRecurring,
            is_starred: isStarred,
            is_directive_task: isDirective,
            assigner_name: (t as any).assigner_name,
            task_code: (t as any).task_code,
            team_code: t.team_code || 'VAN_THU',
            week_number: sourceWeek
          }, true);
        }
      });

      // 2. Planned tasks from active memory Table 2 (Ưu tiên từ Giao diện)
      table2.forEach(t => {
        const isUnstarred = isTaskUnstarredInStorage(currentUser?.department_id, t.noi_dung);
        const isStarred = !isUnstarred && (Boolean(t.is_starred) || isTaskStarredInStorage(currentUser?.department_id, t.noi_dung));
        const category = isStarred ? 'Thường xuyên' : (t.nhom || 'Thường xuyên');
        const isRecurring = category === 'Thường xuyên' || String(category).toLowerCase().includes('thường xuyên') || Boolean(t.is_recurring) || isStarred;
        const isDirective =
          Boolean((t as any).is_directive_task) ||
          Boolean((t as any).assigner_name) ||
          Boolean((t as any).task_code) ||
          (t.noi_dung && (
            t.noi_dung.startsWith('[NV-') ||
            t.noi_dung.startsWith('[SĐ') ||
            t.noi_dung.startsWith('[CV') ||
            t.noi_dung.startsWith('[VB') ||
            t.noi_dung.startsWith('[TB') ||
            t.noi_dung.toLowerCase().includes('phân công') ||
            t.noi_dung.toLowerCase().includes('giao xuống') ||
            t.noi_dung.toLowerCase().includes('phân cấp')
          )) ||
          (category as string) === 'Phân cấp' ||
          (category as string) === 'Được giao';

        if (t.noi_dung && t.noi_dung.trim().length > 0) {
          addUniqueItem({
            id: `k_t2_${t.id}`,
            noi_dung: t.noi_dung,
            nhom: category,
            thoi_gian: t.thoi_gian_du_kien || 'Trong tuần',
            san_pham_du_kien: t.san_pham_du_kien || '',
            source: 'planned_table2',
            originalTable: 2,
            parent_task_id: t.id,
            is_recurring: isRecurring,
            is_starred: isStarred,
            is_directive_task: isDirective,
            assigner_name: (t as any).assigner_name,
            task_code: (t as any).task_code,
            team_code: t.team_code || 'VAN_THU',
            week_number: sourceWeek
          }, true);
        }
      });

      // 3. Candidate tasks from CSDL (Bổ sung nhiệm vụ lịch sử chưa có trên màn hình)
      const deptId = currentUser?.department_id || 'dept_vp';
      try {
        const dbRes = await fetchCandidateTasks(deptId, currentUser?.id);
        if (dbRes && dbRes.success && Array.isArray(dbRes.tasks)) {
          dbRes.tasks.forEach((t: any) => {
            const lowerProgress = (t.tien_do || '').toLowerCase().trim();
            const isUnstarred = isTaskUnstarredInStorage(currentUser?.department_id, t.noi_dung);
            const isStarred = !isUnstarred && (Boolean(t.is_starred) || isTaskStarredInStorage(currentUser?.department_id, t.noi_dung));
            const category = isStarred ? 'Thường xuyên' : (t.category || t.nhom || 'Thường xuyên');
            const isRecurring = category === 'Thường xuyên' || String(category).toLowerCase().includes('thường xuyên') || Boolean(t.is_recurring) || isStarred;
            const isDirective =
              Boolean(t.is_directive_task) ||
              t.source === 'standalone_assigned' ||
              Boolean(t.assigner_name) ||
              Boolean(t.task_code) ||
              (t.noi_dung && (
                t.noi_dung.startsWith('[NV-') ||
                t.noi_dung.startsWith('[SĐ') ||
                t.noi_dung.startsWith('[CV') ||
                t.noi_dung.startsWith('[VB') ||
                t.noi_dung.startsWith('[TB') ||
                t.noi_dung.toLowerCase().includes('phân công') ||
                t.noi_dung.toLowerCase().includes('giao xuống') ||
                t.noi_dung.toLowerCase().includes('phân cấp')
              )) ||
              category === 'Phân cấp' ||
              category === 'Được giao';
            
            if (t.noi_dung && t.noi_dung.trim().length > 0 && !lowerProgress.includes('hủy') && !lowerProgress.includes('kết thúc') && !lowerProgress.includes('dừng')) {
              addUniqueItem({
                id: `k_db_${t.id}`,
                noi_dung: t.noi_dung,
                nhom: category,
                thoi_gian: t.thoi_gian || 'Trong tuần',
                trien_khai: t.trien_khai || '',
                tien_do: t.tien_do || 'Đang thực hiện',
                san_pham: t.san_pham || '',
                file_minh_chung: t.file_minh_chung || '',
                file_original_name: t.file_original_name || '',
                source: t.source || 'unfinished_table1',
                originalTable: t.table_type || 1,
                parent_task_id: t.standalone_task_id || t.id,
                is_recurring: isRecurring,
                is_starred: isStarred,
                is_directive_task: isDirective,
                assigner_name: t.assigner_name,
                task_code: t.task_code,
                team_code: t.team_code || (t.department_id === 'dept_cds' ? 'CDS' : 'VAN_THU'),
                week_number: t.week_number || t.assigned_week
              });
            }
          });
        }
      } catch (errDb) {
        console.warn('Lỗi fetchCandidateTasks:', errDb);
      }

      // 4. Starred Recurring tasks from localStorage
      try {
        const key = `kanban_starred_recurring_tasks_${currentUser?.department_id || 'dept_vp'}`;
        const rawStarred = localStorage.getItem(key);
        if (rawStarred) {
          const starredList: any[] = JSON.parse(rawStarred);
          starredList.forEach(st => {
            if (st.noi_dung && st.noi_dung.trim().length > 0) {
              const isUnstarred = isTaskUnstarredInStorage(currentUser?.department_id, st.noi_dung);
              if (!isUnstarred) {
                addUniqueItem({
                  id: `k_starred_${st.id || Date.now()}`,
                  noi_dung: st.noi_dung,
                  nhom: 'Thường xuyên',
                  thoi_gian: st.thoi_gian || 'Thường xuyên',
                  trien_khai: st.trien_khai || '',
                  tien_do: st.tien_do || 'Đang thực hiện',
                  san_pham: st.san_pham || '',
                  source: 'custom_added',
                  is_recurring: true,
                  is_starred: true
                });
              }
            }
          });
        }
      } catch (e) {
        console.warn('Lỗi đọc starred recurring tasks:', e);
      }

      setColumns({
        backlog: initialBacklog,
        nextWeek: [],
        completed: [],
        cancelled: [],
        trash: savedTrash
      });

      setSelectedTaskIds([]);
      setIsLoadingCandidates(false);
    };

    loadCandidateTasks();
    setSearchQuery('');
    setShowConfirmDialog(false);
  }, [isOpen, currentUser?.department_id, table1, table2]);

  if (!isOpen) return null;

  const targetWeek = sourceWeek + 1;
  const targetYear = sourceYear;

  // Toggle multi-select for a task
  const toggleSelectTask = (taskId: string) => {
    setSelectedTaskIds(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  // Toggle star / recurring status for a task
  const toggleStarTask = (taskId: string) => {
    let targetTask: KanbanTaskItem | null = null;
    (Object.keys(columns) as ColumnId[]).forEach(col => {
      const found = columns[col].find(item => item.id === taskId);
      if (found) targetTask = found;
    });
    if (!targetTask) return;

    const isCurrentlyStarred = Boolean((targetTask as KanbanTaskItem).is_starred);
    const title = isCurrentlyStarred ? 'Bỏ nhiệm vụ lặp lại' : 'Lưu vào nhiệm vụ lặp lại';
    const message = isCurrentlyStarred
      ? 'Xác nhận bỏ nhiệm vụ này khỏi Mục lặp lại (Nhiệm vụ Thường xuyên Lặp lại) trong Kho Kanban Tuần?'
      : 'Xác nhận đưa nhiệm vụ này vào Mục lặp lại (Nhiệm vụ Thường xuyên Lặp lại) trong Kho Kanban Tuần?';

    setConfirmModalConfig({
      isOpen: true,
      title,
      message,
      type: 'star',
      confirmText: isCurrentlyStarred ? 'Xác nhận Bỏ sao' : 'Xác nhận Đưa vào Kho',
      cancelText: 'Hủy bỏ',
      onConfirm: () => {
        setConfirmModalConfig(null);
        if (!isCurrentlyStarred) {
          saveStarredTaskToStorage(currentUser?.department_id, targetTask as KanbanTaskItem);
        } else {
          removeStarredTaskFromStorage(currentUser?.department_id, (targetTask as KanbanTaskItem).noi_dung);
        }

        setColumns(prev => {
          const nextCols = { ...prev };
          (Object.keys(nextCols) as ColumnId[]).forEach(col => {
            nextCols[col] = nextCols[col].map(item => {
              if (item.id === taskId) {
                const nextStar = !item.is_starred;
                return {
                  ...item,
                  is_starred: nextStar,
                  is_recurring: nextStar,
                  nhom: nextStar ? 'Thường xuyên' : item.nhom
                };
              }
              return item;
            });
          });
          return nextCols;
        });
      },
      onCancel: () => setConfirmModalConfig(null)
    });
  };

  // 1-Click Duplicate / Re-use task to Next Week
  const handleReuseTaskToNextWeek = (task: KanbanTaskItem) => {
    const duplicatedTask: KanbanTaskItem = {
      ...task,
      id: `k_reuse_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tien_do: task.tien_do || 'Đang thực hiện',
      targetTable: task.targetTable || task.originalTable || 1,
      source: 'custom_added',
      is_starred: Boolean(task.is_starred),
      is_recurring: Boolean(task.is_recurring),
      team_code: task.team_code
    };

    setColumns(prev => ({
      ...prev,
      nextWeek: [duplicatedTask, ...prev.nextWeek]
    }));
  };

  // Move item between columns
  const moveTask = (taskId: string, targetCol: ColumnId) => {
    let itemToMove: KanbanTaskItem | null = null;
    const newCols = { ...columns };

    (Object.keys(newCols) as ColumnId[]).forEach(col => {
      const found = newCols[col].find(item => item.id === taskId);
      if (found) {
        itemToMove = found;
      }
    });

    if (!itemToMove) return;

    if (targetCol === 'completed' && !itemToMove.file_minh_chung && !itemToMove.san_pham) {
      setPendingProofTask(itemToMove);
      return;
    }

    (Object.keys(newCols) as ColumnId[]).forEach(col => {
      newCols[col] = newCols[col].filter(item => item.id !== taskId);
    });

    const updatedItem = {
      ...itemToMove,
      tien_do: targetCol === 'completed' ? 'Hoàn thành' : targetCol === 'cancelled' ? 'Hủy / Kết thúc' : itemToMove.tien_do
    };

    newCols[targetCol] = [updatedItem, ...newCols[targetCol]];
    setColumns(newCols);
  };

  // Move multiple items between columns
  const moveMultipleTasks = (taskIds: string[], targetCol: ColumnId) => {
    if (taskIds.length === 0) return;
    setColumns(prev => {
      const nextCols = { ...prev };
      const tasksToMove: KanbanTaskItem[] = [];

      (Object.keys(nextCols) as ColumnId[]).forEach(col => {
        const remaining: KanbanTaskItem[] = [];
        nextCols[col].forEach(item => {
          if (taskIds.includes(item.id)) {
            const updatedItem = {
              ...item,
              tien_do: targetCol === 'completed' ? 'Hoàn thành' : targetCol === 'cancelled' ? 'Hủy / Kết thúc' : item.tien_do
            };
            tasksToMove.push(updatedItem);
          } else {
            remaining.push(item);
          }
        });
        nextCols[col] = remaining;
      });

      nextCols[targetCol] = [...tasksToMove, ...nextCols[targetCol]];
      return nextCols;
    });

    setSelectedTaskIds([]);
  };

  // BATCH OPERATIONS ON SELECTED TASKS
  const handleBatchMoveToNextWeek = () => {
    if (selectedTaskIds.length === 0) return;
    moveMultipleTasks(selectedTaskIds, 'nextWeek');
  };

  const handleBatchDuplicateToNextWeek = () => {
    if (selectedTaskIds.length === 0) return;
    const allTasks: KanbanTaskItem[] = [];
    (Object.values(columns) as KanbanTaskItem[][]).forEach(col => allTasks.push(...col));

    const selectedTasks = allTasks.filter(t => selectedTaskIds.includes(t.id));
    const duplicates: KanbanTaskItem[] = selectedTasks.map((t, idx) => ({
      ...t,
      id: `k_dup_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      tien_do: t.tien_do || 'Đang thực hiện',
      targetTable: t.targetTable || t.originalTable || 1,
      source: 'custom_added',
      is_starred: Boolean(t.is_starred),
      is_recurring: Boolean(t.is_recurring),
      team_code: t.team_code
    }));

    setColumns(prev => ({
      ...prev,
      nextWeek: [...duplicates, ...prev.nextWeek]
    }));

    setSelectedTaskIds([]);
  };

  const handleBatchMarkCompleted = () => {
    if (selectedTaskIds.length === 0) return;
    moveMultipleTasks(selectedTaskIds, 'completed');
  };

  const handleBatchToggleStarred = () => {
    if (selectedTaskIds.length === 0) return;
    setColumns(prev => {
      const nextCols = { ...prev };
      (Object.keys(nextCols) as ColumnId[]).forEach(col => {
        nextCols[col] = nextCols[col].map(item => {
          if (selectedTaskIds.includes(item.id)) {
            const nextStar = !item.is_starred;
            if (nextStar) {
              saveStarredTaskToStorage(currentUser?.department_id, item);
            } else {
              removeStarredTaskFromStorage(currentUser?.department_id, item.noi_dung);
            }
            return {
              ...item,
              is_starred: nextStar,
              is_recurring: nextStar,
              nhom: nextStar ? 'Thường xuyên' : item.nhom
            };
          }
          return item;
        });
      });
      return nextCols;
    });
  };

  const handleBatchCancelTasks = () => {
    if (selectedTaskIds.length === 0) return;
    moveMultipleTasks(selectedTaskIds, 'cancelled');
  };

  // Toggle task targetTable (Bảng I vs Bảng II)
  const toggleTaskTargetTable = (taskId: string) => {
    setColumns(prev => {
      const nextCols = { ...prev };
      const nextWeekTasks = nextCols.nextWeek.map(item => {
        if (item.id === taskId) {
          const currentIsTable2 = item.targetTable === 2 || (!item.targetTable && (item.originalTable === 2 || item.source === 'planned_table2'));
          return {
            ...item,
            targetTable: (currentIsTable2 ? 1 : 2) as 1 | 2
          };
        }
        return item;
      });
      return { ...nextCols, nextWeek: nextWeekTasks };
    });
  };

  // Confirm proof modal handler
  const handleConfirmProof = (proofData: { san_pham: string; file_minh_chung: string; file_original_name: string }) => {
    if (!pendingProofTask) return;

    const updatedTask: KanbanTaskItem = {
      ...pendingProofTask,
      san_pham: proofData.san_pham,
      file_minh_chung: proofData.file_minh_chung,
      file_original_name: proofData.file_original_name,
      tien_do: 'Hoàn thành'
    };

    setColumns(prev => {
      const nextCols = { ...prev };
      (Object.keys(nextCols) as ColumnId[]).forEach(col => {
        nextCols[col] = nextCols[col].filter(item => item.id !== updatedTask.id);
      });
      nextCols.completed = [updatedTask, ...nextCols.completed];
      return nextCols;
    });

    setPendingProofTask(null);
  };

  // Save changes from TaskDetailModal
  const handleSaveTaskDetail = (updatedTask: KanbanTaskItem) => {
    setColumns(prev => {
      const nextCols = { ...prev };
      (Object.keys(nextCols) as ColumnId[]).forEach(col => {
        const idx = nextCols[col].findIndex(item => item.id === updatedTask.id);
        if (idx !== -1) {
          nextCols[col][idx] = updatedTask;
        }
      });
      return nextCols;
    });
  };

  // Add bulk tasks to target column
  const handleAddBulkTasks = (newItems: KanbanTaskItem[], targetCol: ColumnId) => {
    setColumns(prev => ({
      ...prev,
      [targetCol]: [...newItems, ...prev[targetCol]]
    }));
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedItemId(taskId);

    if (!selectedTaskIds.includes(taskId) && selectedTaskIds.length > 0) {
      setSelectedTaskIds(prev => [...prev, taskId]);
    }
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    setActiveDropCol(null);
  };

  const handleDragOver = (e: React.DragEvent, colId: ColumnId) => {
    e.preventDefault();
    if (activeDropCol !== colId) {
      setActiveDropCol(colId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetCol: ColumnId) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedItemId;

    const isSelectedGroupDrag =
      selectedTaskIds.length > 0 &&
      (taskId ? selectedTaskIds.includes(taskId) : true);

    if (isSelectedGroupDrag) {
      moveMultipleTasks(selectedTaskIds, targetCol);
    } else if (taskId) {
      moveTask(taskId, targetCol);
    }

    setDraggedItemId(null);
    setActiveDropCol(null);
  };

  // Handle final submission
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmKanbanPlan(columns.nextWeek, columns.completed, columns.cancelled);
      onClose();
    } catch (err) {
      console.error('Lỗi khởi tạo Kanban Plan:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper kiêm tra nhiệm vụ được đánh sao THỰC SỰ THUỘC TUẦN HIỆN TẠI (sourceWeek)
  const isWeeklyStarredTask = (item: KanbanTaskItem) => {
    if (!item.is_starred) return false;
    return (
      item.source === 'unfinished_table1' ||
      item.source === 'planned_table2' ||
      (item.week_number === sourceWeek && item.source !== 'custom_added')
    );
  };

  // Filter items by search query & sub-tabs
  const filterItems = (items: KanbanTaskItem[], isBacklog = false) => {
    let filtered = items;
    if (isBacklog) {
      if (backlogSubTab === 'ALL') {
        // Tab Tất cả: Hiển thị nhiệm vụ 'Đang thực hiện', nhiệm vụ kế hoạch Table 2, hoặc nhiệm vụ được gắn sao
        filtered = filtered.filter(item => {
          const lowerProgress = (item.tien_do || '').toLowerCase().trim();
          const isInProgress = lowerProgress.includes('đang thực hiện') || lowerProgress.includes('đang triển khai') || (item.source === 'unfinished_table1' && !lowerProgress.includes('hoàn thành'));
          return isInProgress || item.is_starred || item.source === 'planned_table2' || item.source === 'custom_added' || item.is_directive_task;
        });
      } else if (backlogSubTab === 'TRASH') {
        filtered = columns.trash;
      } else if (backlogSubTab === 'RECURRING') {
        if (starredSubMode === 'WEEKLY') {
          filtered = filtered.filter(isWeeklyStarredTask);
        } else {
          filtered = filtered.filter(
            item => item.nhom === 'Thường xuyên' || item.is_recurring || item.is_starred
          );
        }
      } else if (backlogSubTab === 'ASSIGNED') {
        filtered = filtered.filter(
          item =>
            item.is_directive_task ||
            item.source === 'standalone_assigned' ||
            Boolean(item.assigner_name) ||
            Boolean(item.task_code) ||
            (item.noi_dung && (
              item.noi_dung.startsWith('[NV-') ||
              item.noi_dung.startsWith('[SĐ') ||
              item.noi_dung.startsWith('[CV') ||
              item.noi_dung.startsWith('[VB') ||
              item.noi_dung.startsWith('[TB')
            )) ||
            item.nhom === 'Phân cấp' ||
            item.nhom === 'Được giao'
        );
      }
    }
    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase();
    return filtered.filter(
      item => item.noi_dung.toLowerCase().includes(q) || (item.nhom || '').toLowerCase().includes(q)
    );
  };

  const visibleBacklogItems = filterItems(columns.backlog, true);
  const isAllBacklogSelected =
    visibleBacklogItems.length > 0 &&
    visibleBacklogItems.every(item => selectedTaskIds.includes(item.id));

  const toggleSelectAllBacklog = () => {
    if (isAllBacklogSelected) {
      const visibleIds = new Set(visibleBacklogItems.map(i => i.id));
      setSelectedTaskIds(prev => prev.filter(id => !visibleIds.has(id)));
    } else {
      const visibleIds = visibleBacklogItems.map(i => i.id);
      setSelectedTaskIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const recurringBacklogCount = columns.backlog.filter(
    item => item.nhom === 'Thường xuyên' || item.is_recurring || item.is_starred
  ).length;

  const weeklyStarredBacklogCount = columns.backlog.filter(isWeeklyStarredTask).length;

  const assignedBacklogCount = columns.backlog.filter(
    item =>
      item.is_directive_task ||
      item.source === 'standalone_assigned' ||
      Boolean(item.assigner_name) ||
      Boolean(item.task_code) ||
      (item.noi_dung && (
        item.noi_dung.startsWith('[NV-') ||
        item.noi_dung.startsWith('[SĐ') ||
        item.noi_dung.startsWith('[CV') ||
        item.noi_dung.startsWith('[VB') ||
        item.noi_dung.startsWith('[TB')
      )) ||
      item.nhom === 'Phân cấp' ||
      item.nhom === 'Được giao'
  ).length;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[200] p-2 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-700/80 shadow-2xl w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden relative">
        
        {/* FLOATING BULK ACTION TOOLBAR */}
        {selectedTaskIds.length > 0 && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[220] bg-slate-800/95 border border-blue-500/50 shadow-2xl rounded-2xl px-5 py-3 flex items-center gap-3 text-xs backdrop-blur-md animate-bounceIn">
            <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
              <CheckSquare className="w-4 h-4 text-blue-400" />
              <span className="font-extrabold text-white">Đã chọn ({selectedTaskIds.length})</span>
              <button
                onClick={toggleSelectAllBacklog}
                className="text-[10px] underline text-blue-300 hover:text-white cursor-pointer ml-1 font-bold"
              >
                {isAllBacklogSelected ? "Bỏ chọn tất cả" : "Chọn toàn bộ kho"}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {backlogSubTab === 'TRASH' ? (
                <>
                  <button
                    onClick={handleBatchRestoreFromTrash}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-1.5 transition-all shadow"
                    title="Khôi phục các nhiệm vụ đã chọn về Kho nhiệm vụ"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Khôi Phục ({selectedTaskIds.length})</span>
                  </button>

                  <button
                    onClick={handleBatchPermanentlyDelete}
                    className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 text-white rounded-lg font-bold flex items-center gap-1.5 transition-all shadow"
                    title="Xóa vĩnh viễn các nhiệm vụ đã chọn"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa Vĩnh Viễn ({selectedTaskIds.length})</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleBatchMoveToNextWeek}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-1.5 transition-all shadow"
                    title="Chuyển tất cả nhiệm vụ đã chọn vào Kế hoạch Tuần Tới"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Kế Hoạch Tuần Tới</span>
                  </button>

                  <button
                    onClick={handleBatchDuplicateToNextWeek}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold flex items-center gap-1.5 transition-all shadow"
                    title="Tạo bản sao tất cả nhiệm vụ đã chọn vào Kế hoạch Tuần Tới"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Tái Sử Dụng (Bản Sao)</span>
                  </button>

                  <button
                    onClick={handleBatchToggleStarred}
                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg font-bold flex items-center gap-1.5 transition-all"
                    title="Gắn / Bỏ gắn tag lặp lại (Thường xuyên)"
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>Gắn Tag Lặp Lại</span>
                  </button>

                  <button
                    onClick={handleBatchMarkCompleted}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1.5 transition-all shadow"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Hoàn Thành</span>
                  </button>

                  <button
                    onClick={handleBatchCancelTasks}
                    className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/60 rounded-lg font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Hủy / Dừng</span>
                  </button>

                  <button
                    onClick={handleBatchMoveToTrash}
                    className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-lg font-bold flex items-center gap-1.5 transition-all"
                    title="Chuyển các nhiệm vụ đã chọn vào Thùng rác"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Bỏ vào Thùng Rác ({selectedTaskIds.length})</span>
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => setSelectedTaskIds([])}
              className="ml-2 p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Bỏ chọn tất cả"
            >
              ✕
            </button>
          </div>
        )}

        {/* TOP HEADER */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 border-b border-slate-700/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
              <Layout className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white tracking-wide">
                  LẬP KẾ HOẠCH BÁO CÁO KANBAN
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                  Tuần {targetWeek}/{targetYear}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Đơn vị: <span className="font-semibold text-slate-200">{currentUser?.department_name || 'Văn phòng'}</span> • Kéo thả hoặc chọn nhiều nhiệm vụ để phân loại tuần tới
              </p>
            </div>
          </div>

          {/* Search bar & Controls */}
          <div className="flex items-center gap-3">
            <div className="relative w-64 hidden md:block">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm nhiệm vụ..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-lg font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* MAIN KANBAN BOARD CONTAINER */}
        <div className="flex-1 p-3 sm:p-5 grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4 overflow-hidden bg-slate-950/60">
          
          {/* COL 1: KHO NHIỆM VỤ (BACKLOG) WITH SUB-TABS */}
          <KanbanColumn
            title={backlogSubTab === 'TRASH' ? "🗑️ Thùng Rác Nhiệm Vụ" : "📦 Kho Nhiệm Vụ"}
            subtitle={backlogSubTab === 'TRASH' ? "Nhiệm vụ đã xóa / Có thể khôi phục" : "Chờ phân loại"}
            count={filterItems(columns.backlog, true).length}
            totalCount={backlogSubTab === 'TRASH' ? columns.trash.length : columns.backlog.length}
            colId="backlog"
            colorTheme={backlogSubTab === 'TRASH' ? "rose" : "slate"}
            isDropTarget={activeDropCol === 'backlog'}
            onDragOver={e => handleDragOver(e, 'backlog')}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, 'backlog')}
            headerExtra={
              <div className="grid grid-cols-4 gap-1 mt-2 p-1 bg-slate-950/70 rounded-xl border border-slate-800 text-[10px]">
                <button
                  onClick={() => setBacklogSubTab('ALL')}
                  className={`py-1 px-1 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer truncate ${
                    backlogSubTab === 'ALL'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Tất cả nhiệm vụ trong kho"
                >
                  <ListTodo className="w-3 h-3 shrink-0" />
                  <span className="truncate">Tất cả ({columns.backlog.length})</span>
                </button>
                <button
                  onClick={() => setBacklogSubTab('RECURRING')}
                  className={`py-1 px-1 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer truncate ${
                    backlogSubTab === 'RECURRING'
                      ? 'bg-amber-500 text-slate-950 shadow font-extrabold'
                      : 'text-amber-400/80 hover:text-amber-300'
                  }`}
                  title="Nhiệm vụ lặp lại / Thường xuyên"
                >
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                  <span className="truncate">Nhiệm vụ sao ({recurringBacklogCount})</span>
                </button>
                <button
                  onClick={() => setBacklogSubTab('ASSIGNED')}
                  className={`py-1 px-1 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer truncate ${
                    backlogSubTab === 'ASSIGNED'
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow font-extrabold'
                      : 'text-amber-300/80 hover:text-amber-200'
                  }`}
                  title="Nhiệm vụ phân cấp giao xuống hoặc được giao từ cấp trên"
                >
                  <Crown className="w-3 h-3 text-amber-300 shrink-0" />
                  <span className="truncate">Được giao ({assignedBacklogCount})</span>
                </button>
                <button
                  onClick={() => setBacklogSubTab('TRASH')}
                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    const taskId = e.dataTransfer.getData('text/plain') || draggedItemId;
                    if (selectedTaskIds.length > 0 && selectedTaskIds.includes(taskId)) {
                      handleBatchMoveToTrash();
                    } else if (taskId) {
                      handleMoveTaskToTrash(taskId);
                    }
                  }}
                  className={`py-1 px-1 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer truncate ${
                    backlogSubTab === 'TRASH'
                      ? 'bg-rose-700 text-white shadow font-extrabold ring-1 ring-rose-400'
                      : 'text-rose-400/80 hover:text-rose-300 hover:bg-rose-950/40'
                  }`}
                  title="Kéo thả vào đây hoặc bấm để xem Thùng Rác"
                >
                  <Trash2 className="w-3 h-3 text-rose-400 shrink-0" />
                  <span className="truncate">Thùng rác ({columns.trash.length})</span>
                </button>
              </div>
            }
          >
            {/* Thanh chuyển đổi Chế độ Sao khi chọn Tab Nhiệm Vụ Sao */}
            {backlogSubTab === 'RECURRING' && (
              <div className="mb-3 p-1.5 bg-slate-950/80 rounded-xl border border-amber-500/30 flex flex-col gap-1.5">
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <button
                    onClick={() => setStarredSubMode('WEEKLY')}
                    className={`py-1 px-2 rounded-lg font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      starredSubMode === 'WEEKLY'
                        ? 'bg-amber-400 text-slate-950 shadow-md ring-1 ring-amber-300'
                        : 'text-amber-300/80 hover:text-amber-200 hover:bg-slate-800'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />
                    <span>Sao Tuần {sourceWeek} ({weeklyStarredBacklogCount})</span>
                  </button>
                  <button
                    onClick={() => setStarredSubMode('ALL')}
                    className={`py-1 px-2 rounded-lg font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      starredSubMode === 'ALL'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'text-amber-300/80 hover:text-amber-200 hover:bg-slate-800'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                    <span>Tất cả sao ({recurringBacklogCount})</span>
                  </button>
                </div>

                {starredSubMode === 'WEEKLY' && visibleBacklogItems.length > 0 && (
                  <div className="pt-1.5 px-1 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-amber-300 font-extrabold truncate text-[10px]">
                      ⭐ {visibleBacklogItems.length} nhiệm vụ sao Tuần {sourceWeek}
                    </span>
                    <button
                      onClick={() => {
                        const starredIds = visibleBacklogItems.map(i => i.id);
                        moveMultipleTasks(starredIds, 'nextWeek');
                      }}
                      className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-md font-extrabold flex items-center gap-1 shrink-0 transition-all shadow text-[10px] cursor-pointer"
                      title={`Chuyển tất cả ${visibleBacklogItems.length} nhiệm vụ sao tuần này sang Kế Hoạch Tuần Tới`}
                    >
                      <ArrowRight className="w-3 h-3" />
                      <span>Chuyển sang Tuần {targetWeek}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
            {/* Nút Chọn Tất Cả & Thêm Nhiệm Vụ Hàng Loạt / Dọn Thùng Rác */}
            {backlogSubTab === 'TRASH' ? (
              <div className="flex items-center gap-1.5 mb-3">
                <button
                  onClick={toggleSelectAllBacklog}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                    isAllBacklogSelected
                      ? 'bg-rose-600 text-white border-rose-400'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  {isAllBacklogSelected ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5 text-white" />
                      <span>Bỏ chọn tất cả</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                      <span>Chọn tất cả ({visibleBacklogItems.length})</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleEmptyTrash}
                  disabled={columns.trash.length === 0}
                  className="py-1.5 px-2.5 bg-rose-900/60 hover:bg-rose-800 disabled:opacity-40 border border-rose-700/60 text-rose-200 rounded-xl text-[11px] font-bold cursor-pointer transition-all flex items-center justify-center gap-1 shadow-xs shrink-0"
                  title="Xóa vĩnh viễn tất cả nhiệm vụ trong thùng rác"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Dọn sạch ({columns.trash.length})</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mb-3">
                <button
                  onClick={toggleSelectAllBacklog}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                    isAllBacklogSelected
                      ? 'bg-blue-600 text-white border-blue-400'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                  title={isAllBacklogSelected ? "Bỏ chọn tất cả nhiệm vụ đang hiển thị" : "Chọn tất cả nhiệm vụ đang hiển thị trong kho"}
                >
                  {isAllBacklogSelected ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5 text-white" />
                      <span>Bỏ chọn tất cả</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                      <span>Chọn tất cả ({visibleBacklogItems.length})</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setIsBulkModalOpen(true)}
                  className="py-1.5 px-2.5 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 hover:from-blue-600/40 hover:to-indigo-600/40 border border-blue-500/40 text-blue-200 rounded-xl text-[11px] font-bold cursor-pointer transition-all flex items-center justify-center gap-1 shadow-xs shrink-0"
                  title="Thêm nhiệm vụ hàng loạt"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-400" />
                  <span>+ Thêm mới</span>
                </button>
              </div>
            )}

            {/* VÙNG THẢ RÁC TRỰC QUAN TRONG KHO (VISUAL DROP ZONE BOX) */}
            {backlogSubTab !== 'TRASH' && (
              <div
                onDragOver={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (activeDropCol !== 'trash') setActiveDropCol('trash');
                }}
                onDragLeave={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (activeDropCol === 'trash') setActiveDropCol(null);
                }}
                onDrop={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  const taskId = e.dataTransfer.getData('text/plain') || draggedItemId;
                  if (selectedTaskIds.length > 0 && selectedTaskIds.includes(taskId)) {
                    handleBatchMoveToTrash();
                  } else if (taskId) {
                    handleMoveTaskToTrash(taskId);
                  }
                  setDraggedItemId(null);
                  setActiveDropCol(null);
                }}
                onClick={() => setBacklogSubTab('TRASH')}
                className={`p-2.5 rounded-xl border-2 border-dashed transition-all duration-200 text-center flex items-center justify-center gap-2 cursor-pointer mb-3 select-none ${
                  activeDropCol === 'trash'
                    ? 'bg-rose-900/90 border-rose-400 text-white scale-[1.03] shadow-xl ring-4 ring-rose-500/50 animate-pulse'
                    : draggedItemId
                    ? 'bg-rose-950/70 border-rose-500 text-rose-200 animate-pulse scale-[1.01]'
                    : 'bg-rose-950/20 border-rose-900/60 hover:border-rose-700/80 text-rose-300/80 hover:bg-rose-950/40'
                }`}
                title="Bấm để xem Thùng rác hoặc Cầm kéo nhiệm vụ bất kỳ thả vào đây để Xóa"
              >
                <Trash2 className={`w-4 h-4 text-rose-400 shrink-0 ${activeDropCol === 'trash' ? 'animate-bounce scale-125' : ''}`} />
                <span className="text-xs font-bold truncate">
                  {activeDropCol === 'trash' ? 'THẢ RA ĐỂ XÓA VÀO THÙNG RÁC! 🗑️' : 'Kéo thả nhiệm vụ vào đây để Xóa (Thùng Rác)'}
                </span>
              </div>
            )}

            {filterItems(columns.backlog, true).length === 0 ? (
              <EmptyColPlaceholder
                text={
                  backlogSubTab === 'TRASH'
                    ? 'Thùng rác trống. Các nhiệm vụ lặp lại ⭐ hoặc nhiệm vụ bị xóa sẽ xuất hiện ở đây.'
                    : backlogSubTab === 'RECURRING'
                    ? 'Chưa có nhiệm vụ thường xuyên / lặp lại nào được đánh dấu ⭐'
                    : backlogSubTab === 'ASSIGNED'
                    ? 'Chưa có nhiệm vụ nào được phân cấp giao xuống hoặc được giao 👑'
                    : 'Kho nhiệm vụ trống'
                }
              />
            ) : (
              filterItems(columns.backlog, true).map(item => (
                <KanbanTaskCard
                  key={item.id}
                  item={item}
                  isSelected={selectedTaskIds.includes(item.id)}
                  onToggleSelect={() => toggleSelectTask(item.id)}
                  onToggleStar={() => toggleStarTask(item.id)}
                  onMoveToTrash={backlogSubTab !== 'TRASH' ? () => handleMoveTaskToTrash(item.id) : undefined}
                  onDragStart={e => handleDragStart(e, item.id)}
                  onDragEnd={handleDragEnd}
                  actions={
                    backlogSubTab === 'TRASH'
                      ? [
                          {
                            label: 'Khôi phục ↩',
                            color: 'bg-blue-700/80 hover:bg-blue-600 text-white font-bold',
                            onClick: () => handleRestoreTaskFromTrash(item.id)
                          },
                          {
                            label: 'Xóa vĩnh viễn ❌',
                            color: 'bg-rose-900/80 hover:bg-rose-800 text-rose-200 font-bold border border-rose-700/60',
                            onClick: () => handlePermanentlyDeleteTask(item.id)
                          }
                        ]
                      : [
                          {
                            label: '🚀 Tái sử dụng',
                            color: 'bg-amber-600/90 hover:bg-amber-500 text-white font-bold',
                            onClick: () => handleReuseTaskToNextWeek(item)
                          },
                          {
                            label: 'Kế hoạch 🚀',
                            color: 'bg-blue-600/80 hover:bg-blue-600 text-white',
                            onClick: () => moveTask(item.id, 'nextWeek')
                          },
                          {
                            label: 'Hoàn thành ✅',
                            color: 'bg-emerald-600/80 hover:bg-emerald-600 text-white',
                            onClick: () => moveTask(item.id, 'completed')
                          },
                          {
                            label: '🗑️ Thùng rác',
                            color: 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60',
                            onClick: () => handleMoveTaskToTrash(item.id)
                          }
                        ]
                  }
                />
              ))
            )}
          </KanbanColumn>

          {/* COL 2: KẾ HOẠCH TUẦN TỚI (NEXT WEEK PLAN) */}
          <KanbanColumn
            title="🚀 Kế Hoạch Tuần Tới"
            subtitle="Triển khai tuần sau"
            count={filterItems(columns.nextWeek).length}
            totalCount={columns.nextWeek.length}
            colId="nextWeek"
            colorTheme="blue"
            isDropTarget={activeDropCol === 'nextWeek'}
            onDragOver={e => handleDragOver(e, 'nextWeek')}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, 'nextWeek')}
          >
            {filterItems(columns.nextWeek).length === 0 ? (
              <EmptyColPlaceholder text="Kéo thả nhiệm vụ vào đây để đưa vào Kế hoạch tuần tới" />
            ) : (
              filterItems(columns.nextWeek).map(item => {
                const isTable2 = item.targetTable === 2 || (!item.targetTable && (item.originalTable === 2 || item.source === 'planned_table2'));
                return (
                  <KanbanTaskCard
                    key={item.id}
                    item={item}
                    isSelected={selectedTaskIds.includes(item.id)}
                    onToggleSelect={() => toggleSelectTask(item.id)}
                    onToggleStar={() => toggleStarTask(item.id)}
                    badgeText={isTable2 ? '🎯 BẢNG II: Kế hoạch tiếp theo' : '📌 BẢNG I: Thực hiện tuần tới'}
                    badgeColor={isTable2 ? 'bg-amber-500/25 text-amber-300 border-amber-500/50 font-bold' : 'bg-blue-500/25 text-blue-300 border-blue-500/50 font-bold'}
                    onDragStart={e => handleDragStart(e, item.id)}
                    onDragEnd={handleDragEnd}
                    actions={[
                      {
                        label: isTable2 ? '➡️ Sang Bảng I' : '➡️ Sang Bảng II',
                        color: isTable2 ? 'bg-blue-700/90 hover:bg-blue-600 text-white' : 'bg-amber-700/90 hover:bg-amber-600 text-white',
                        onClick: () => toggleTaskTargetTable(item.id)
                      },
                      {
                        label: '✏️ Sửa',
                        color: 'bg-slate-700 hover:bg-slate-600 text-slate-200',
                        onClick: () => {
                          setActiveDetailTask(item);
                          setActiveDetailMode('edit');
                        }
                      },
                      {
                        label: 'Trả về ↩',
                        color: 'bg-slate-700 hover:bg-slate-600 text-slate-200',
                        onClick: () => moveTask(item.id, 'backlog')
                      },
                      {
                        label: 'Hoàn thành ✅',
                        color: 'bg-emerald-600/80 hover:bg-emerald-600 text-white',
                        onClick: () => moveTask(item.id, 'completed')
                      }
                    ]}
                  />
                );
              })
            )}
          </KanbanColumn>

          {/* COL 3: ĐÃ HOÀN THÀNH (COMPLETED) */}
          <KanbanColumn
            title="✅ Đã Hoàn Thành"
            subtitle="Đóng & Lưu CSDL"
            count={filterItems(columns.completed).length}
            totalCount={columns.completed.length}
            colId="completed"
            colorTheme="emerald"
            isDropTarget={activeDropCol === 'completed'}
            onDragOver={e => handleDragOver(e, 'completed')}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, 'completed')}
          >
            {filterItems(columns.completed).length === 0 ? (
              <EmptyColPlaceholder text="Kéo thả nhiệm vụ hoàn thành vào đây để lưu CSDL" />
            ) : (
              filterItems(columns.completed).map(item => (
                <KanbanTaskCard
                  key={item.id}
                  item={item}
                  isSelected={selectedTaskIds.includes(item.id)}
                  onToggleSelect={() => toggleSelectTask(item.id)}
                  onToggleStar={() => toggleStarTask(item.id)}
                  badgeText="Xác nhận hoàn thành"
                  badgeColor="bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  onDragStart={e => handleDragStart(e, item.id)}
                  onDragEnd={handleDragEnd}
                  actions={[
                    {
                      label: '👁️ Xem chi tiết',
                      color: 'bg-emerald-700/80 hover:bg-emerald-600 text-white',
                      onClick: () => {
                        setActiveDetailTask(item);
                        setActiveDetailMode('view');
                      }
                    },
                    {
                      label: '🚀 Tái sử dụng',
                      color: 'bg-amber-600/90 hover:bg-amber-500 text-white font-bold',
                      onClick: () => handleReuseTaskToNextWeek(item)
                    },
                    {
                      label: 'Trả về ↩',
                      color: 'bg-slate-700 hover:bg-slate-600 text-slate-200',
                      onClick: () => moveTask(item.id, 'backlog')
                    }
                  ]}
                />
              ))
            )}
          </KanbanColumn>

          {/* COL 4: HỦY / DỪNG NHIỆM VỤ (CANCELLED / ARCHIVED) */}
          <KanbanColumn
            title="🚫 Hủy / Dừng Nhiệm Vụ"
            subtitle="Kết thúc vĩnh viễn"
            count={filterItems(columns.cancelled).length}
            totalCount={columns.cancelled.length}
            colId="cancelled"
            colorTheme="rose"
            isDropTarget={activeDropCol === 'cancelled'}
            onDragOver={e => handleDragOver(e, 'cancelled')}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, 'cancelled')}
          >
            {filterItems(columns.cancelled).length === 0 ? (
              <EmptyColPlaceholder text="Kéo thả nhiệm vụ muốn hủy/kết thúc vào đây" />
            ) : (
              filterItems(columns.cancelled).map(item => (
                <KanbanTaskCard
                  key={item.id}
                  item={item}
                  isSelected={selectedTaskIds.includes(item.id)}
                  onToggleSelect={() => toggleSelectTask(item.id)}
                  onToggleStar={() => toggleStarTask(item.id)}
                  badgeText="Hủy / Kết thúc"
                  badgeColor="bg-rose-500/20 text-rose-300 border-rose-500/40"
                  onDragStart={e => handleDragStart(e, item.id)}
                  onDragEnd={handleDragEnd}
                  actions={[
                    {
                      label: '✏️ Sửa',
                      color: 'bg-slate-700 hover:bg-slate-600 text-slate-200',
                      onClick: () => {
                        setActiveDetailTask(item);
                        setActiveDetailMode('edit');
                      }
                    },
                    {
                      label: 'Khôi phục ↩',
                      color: 'bg-slate-700 hover:bg-slate-600 text-slate-200',
                      onClick: () => moveTask(item.id, 'backlog')
                    }
                  ]}
                />
              ))
            )}
          </KanbanColumn>
        </div>

        {/* FLOATING DRAG-TO-DELETE TRASH BIN OVERLAY DOCK */}
        {draggedItemId && (
          <div
            onDragOver={e => {
              e.preventDefault();
              if (activeDropCol !== 'trash') setActiveDropCol('trash');
            }}
            onDragLeave={() => {
              if (activeDropCol === 'trash') setActiveDropCol(null);
            }}
            onDrop={e => {
              e.preventDefault();
              const taskId = e.dataTransfer.getData('text/plain') || draggedItemId;
              if (selectedTaskIds.length > 0 && selectedTaskIds.includes(taskId)) {
                handleBatchMoveToTrash();
              } else if (taskId) {
                handleMoveTaskToTrash(taskId);
              }
              setDraggedItemId(null);
              setActiveDropCol(null);
            }}
            className={`fixed bottom-16 left-1/2 -translate-x-1/2 z-[300] px-8 py-3.5 rounded-2xl border-2 border-dashed transition-all duration-200 flex items-center gap-3.5 backdrop-blur-xl shadow-2xl select-none cursor-pointer ${
              activeDropCol === 'trash'
                ? 'bg-rose-600 border-rose-300 text-white scale-110 shadow-rose-900/80 ring-4 ring-rose-400/60 animate-pulse'
                : 'bg-slate-900/95 border-rose-500/80 text-rose-200 animate-bounce scale-105 shadow-xl'
            }`}
          >
            <div className={`p-2 rounded-xl transition-transform ${activeDropCol === 'trash' ? 'bg-rose-700 scale-125' : 'bg-rose-950/80'}`}>
              <Trash2 className="w-6 h-6 text-rose-300" />
            </div>
            <div className="text-left">
              <div className="font-extrabold text-xs sm:text-sm uppercase tracking-wider text-rose-200">
                {activeDropCol === 'trash' ? '🔥 THẢ RA ĐỂ XÓA VÀO THÙNG RÁC' : '🗑️ KÉO THẢ VÀO ĐÂY ĐỂ VÀO THÙNG RÁC'}
              </div>
              <p className="text-[11px] opacity-90 text-slate-300">
                Nhiệm vụ sẽ được lưu vào tab Thùng rác trong Kho
              </p>
            </div>
          </div>
        )}

        {/* FOOTER ACTIONS */}
        <div className="bg-slate-900 border-t border-slate-800 p-4 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
              Kế hoạch: <strong className="text-white ml-0.5">{columns.nextWeek.length}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              Hoàn thành: <strong className="text-white ml-0.5">{columns.completed.length}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
              Hủy/Dừng: <strong className="text-white ml-0.5">{columns.cancelled.length}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
            >
              Hủy bỏ
            </button>

            <button
              onClick={() => setShowConfirmDialog(true)}
              disabled={isSubmitting || (columns.nextWeek.length === 0 && columns.completed.length === 0 && columns.cancelled.length === 0)}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer transition-all hover:scale-[1.02] flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-blue-200" />
              <span>Tạo Kế Hoạch Tuần Tới</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CONFIRMATION DIALOG MODAL */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[250] p-4 animate-fadeIn">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-2xl space-y-5">
              <div className="flex items-center gap-3 text-blue-400">
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Xác nhận Khởi Tạo Kế Hoạch</h4>
                  <p className="text-xs text-slate-400">Báo cáo Tuần {targetWeek}/{targetYear}</p>
                </div>
              </div>

              <div className="space-y-2.5 bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-center justify-between text-blue-300">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    Đưa vào Kế hoạch tuần tới:
                  </span>
                  <strong className="text-sm font-bold bg-blue-500/20 px-2.5 py-0.5 rounded border border-blue-500/30">
                    {columns.nextWeek.length} nhiệm vụ
                  </strong>
                </div>

                <div className="flex items-center justify-between text-emerald-300">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Xác nhận Đã hoàn thành (Lưu DB):
                  </span>
                  <strong className="text-sm font-bold bg-emerald-500/20 px-2.5 py-0.5 rounded border border-emerald-500/30">
                    {columns.completed.length} nhiệm vụ
                  </strong>
                </div>

                <div className="flex items-center justify-between text-rose-300">
                  <span className="flex items-center gap-1.5">
                    <Ban className="w-4 h-4 text-rose-400" />
                    Hủy / Dừng thực hiện (Vĩnh viễn):
                  </span>
                  <strong className="text-sm font-bold bg-rose-500/20 px-2.5 py-0.5 rounded border border-rose-500/30">
                    {columns.cancelled.length} nhiệm vụ
                  </strong>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  Các nhiệm vụ trong cột <strong>Đã hoàn thành</strong> và <strong>Hủy</strong> sẽ được lưu trạng thái kết thúc vào cơ sở dữ liệu và không lặp lại ở tuần sau.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Quay lại
                </button>

                <button
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>Đang khởi tạo...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Xác nhận & Khởi Tạo Báo Cáo</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BULK ADD TASK MODAL */}
        <BulkAddTaskModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          onAddTasks={handleAddBulkTasks}
        />

        {/* COMPLETION PROOF MODAL */}
        <CompletionProofModal
          isOpen={!!pendingProofTask}
          taskTitle={pendingProofTask?.noi_dung || ''}
          onClose={() => setPendingProofTask(null)}
          onConfirm={handleConfirmProof}
        />

        {/* TASK DETAIL / EDIT MODAL */}
        <TaskDetailModal
          isOpen={!!activeDetailTask}
          mode={activeDetailMode}
          task={activeDetailTask}
          onClose={() => setActiveDetailTask(null)}
          onSave={handleSaveTaskDetail}
        />

        {/* CONFIRMATION DIALOG MODAL */}
        {confirmModalConfig && (
          <ConfirmModal
            {...confirmModalConfig}
          />
        )}
      </div>
    </div>
  );
}

// SUB-COMPONENT: COLUMN CONTAINER
interface KanbanColumnProps {
  title: string;
  subtitle: string;
  count: number;
  totalCount: number;
  colId: ColumnId;
  colorTheme: 'slate' | 'blue' | 'emerald' | 'rose';
  isDropTarget: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}

function KanbanColumn({
  title,
  subtitle,
  count,
  totalCount,
  colorTheme,
  isDropTarget,
  onDragOver,
  onDragLeave,
  onDrop,
  headerExtra,
  children
}: KanbanColumnProps) {
  const themeClasses = {
    slate: {
      headerBg: 'bg-slate-800/80 border-slate-700/80 text-slate-200',
      badge: 'bg-slate-700 text-slate-300 border-slate-600',
      dropActive: 'border-slate-500 bg-slate-800/40'
    },
    blue: {
      headerBg: 'bg-blue-950/40 border-blue-800/50 text-blue-200',
      badge: 'bg-blue-600/30 text-blue-300 border-blue-500/40',
      dropActive: 'border-blue-400 bg-blue-950/60'
    },
    emerald: {
      headerBg: 'bg-emerald-950/40 border-emerald-800/50 text-emerald-200',
      badge: 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40',
      dropActive: 'border-emerald-400 bg-emerald-950/60'
    },
    rose: {
      headerBg: 'bg-rose-950/40 border-rose-800/50 text-rose-200',
      badge: 'bg-rose-600/30 text-rose-300 border-rose-500/40',
      dropActive: 'border-rose-400 bg-rose-950/60'
    }
  }[colorTheme];

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`flex flex-col h-full rounded-2xl border transition-all duration-200 overflow-hidden ${
        isDropTarget
          ? `${themeClasses.dropActive} ring-2 ring-blue-500/50 scale-[1.01]`
          : 'bg-slate-900/90 border-slate-800/90'
      }`}
    >
      {/* Column Header */}
      <div className={`p-3 border-b flex flex-col shrink-0 ${themeClasses.headerBg}`}>
        <div className="flex items-center justify-between w-full">
          <div>
            <h4 className="text-xs font-bold tracking-wide flex items-center gap-1.5">{title}</h4>
            <p className="text-[10px] opacity-75 mt-0.5">{subtitle}</p>
          </div>
          <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${themeClasses.badge}`}>
            {count}
          </span>
        </div>

        {headerExtra}
      </div>

      {/* Column Scrollable Content */}
      <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto custom-scrollbar">
        {children}
      </div>
    </div>
  );
}

// SUB-COMPONENT: TASK CARD
interface KanbanTaskCardProps {
  key?: React.Key;
  item: KanbanTaskItem;
  badgeText?: string;
  badgeColor?: string;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onToggleStar?: () => void;
  onMoveToTrash?: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  actions: { label: string; color: string; onClick: () => void }[];
}

function KanbanTaskCard({
  item,
  badgeText,
  badgeColor,
  isSelected,
  onToggleSelect,
  onToggleStar,
  onMoveToTrash,
  onDragStart,
  onDragEnd,
  actions
}: KanbanTaskCardProps) {
  const isStarred = Boolean(item.is_starred);
  const isDirectiveTask =
    item.is_directive_task ||
    item.source === 'standalone_assigned' ||
    Boolean(item.assigner_name) ||
    Boolean(item.task_code) ||
    (item.noi_dung && (
      item.noi_dung.startsWith('[NV-') ||
      item.noi_dung.startsWith('[SĐ') ||
      item.noi_dung.startsWith('[CV') ||
      item.noi_dung.startsWith('[VB') ||
      item.noi_dung.startsWith('[TB')
    )) ||
    item.nhom === 'Phân cấp' ||
    item.nhom === 'Được giao';

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group border rounded-xl p-3 shadow-md hover:shadow-xl transition-all duration-200 cursor-grab active:cursor-grabbing space-y-2 relative ${
        isSelected
          ? 'bg-blue-950/80 border-blue-500 ring-2 ring-blue-500/40'
          : isDirectiveTask
          ? 'bg-slate-800/95 border-amber-500/50 hover:border-amber-400 ring-1 ring-amber-500/20'
          : isStarred
          ? 'bg-slate-800/95 border-amber-500/40 hover:border-amber-400'
          : 'bg-slate-800/90 hover:bg-slate-800 border-slate-700/80 hover:border-slate-600'
      }`}
    >
      {/* Header Info with Selection Checkbox & Star Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {onToggleSelect && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
              className="text-slate-400 hover:text-blue-400 transition-colors cursor-pointer"
              title={isSelected ? "Bỏ chọn" : "Chọn nhiệm vụ"}
            >
              {isSelected ? (
                <CheckSquare className="w-4 h-4 text-blue-400 fill-blue-500/20" />
              ) : (
                <Square className="w-4 h-4 text-slate-500 hover:text-slate-300" />
              )}
            </button>
          )}

          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-700/80 text-slate-300 border border-slate-600/50">
            {item.nhom || 'Thường xuyên'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {isDirectiveTask && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1" title="Nhiệm vụ phân cấp giao xuống hoặc được giao">
              <Crown className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Được giao</span>
            </span>
          )}

          {onToggleStar && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleStar(); }}
              className="p-0.5 rounded hover:bg-slate-700 transition-colors cursor-pointer"
              title={isStarred ? "Nhiệm vụ Thường Xuyên / Lặp lại" : "Gắn dấu sao Lặp lại"}
            >
              <Star
                className={`w-3.5 h-3.5 transition-transform hover:scale-110 ${
                  isStarred
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-500 hover:text-amber-300'
                }`}
              />
            </button>
          )}

          {onMoveToTrash && (
            <button
              onClick={(e) => { e.stopPropagation(); onMoveToTrash(); }}
              className="p-0.5 rounded hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
              title="Chuyển vào thùng rác"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {badgeText ? (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${badgeColor}`}>
              {badgeText}
            </span>
          ) : item.tien_do ? (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
              {item.tien_do}
            </span>
          ) : null}
        </div>
      </div>

      {/* Main Content */}
      <p className="text-xs font-medium text-slate-100 leading-relaxed group-hover:text-white">
        {item.noi_dung}
      </p>

      {/* Thông tin lãnh đạo giao task (if available) */}
      {item.assigner_name && (
        <div className="text-[10px] text-amber-300 bg-amber-950/50 p-1.5 rounded border border-amber-900/60 flex items-center gap-1">
          <Crown className="w-3 h-3 text-amber-400 shrink-0" />
          <span>Phân công bởi: <strong className="text-white">{item.assigner_name}</strong></span>
        </div>
      )}

      {/* Triển khai (if available) */}
      {item.trien_khai && (
        <div className="text-[10px] text-slate-300 bg-slate-950/60 p-1.5 rounded border border-slate-700/50">
          <span className="font-bold text-blue-300">Triển khai: </span>
          {item.trien_khai}
        </div>
      )}

      {/* Sản phẩm kết quả / File minh chứng badge */}
      {item.san_pham && (
        <div className="text-[10px] text-emerald-300 bg-emerald-950/50 p-1.5 rounded border border-emerald-900/60">
          <span className="font-bold text-emerald-400">Sản phẩm: </span>
          {item.san_pham}
        </div>
      )}

      {item.file_minh_chung && (
        <div className="text-[10px] text-blue-300 bg-blue-950/50 p-1.5 rounded border border-blue-900/60 flex items-center gap-1">
          <Paperclip className="w-3 h-3 text-blue-400 shrink-0" />
          <span className="truncate">{item.file_original_name || 'File minh chứng'}</span>
        </div>
      )}

      {/* Sub Info */}
      <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-700/50">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-500" />
          {item.thoi_gian || 'Trong tuần'}
        </span>
        {item.san_pham_du_kien && (
          <span className="truncate max-w-[120px] italic text-slate-400">
            {item.san_pham_du_kien}
          </span>
        )}
      </div>

      {/* Quick Actions Buttons */}
      <div className="flex items-center gap-1 pt-1.5 opacity-90 group-hover:opacity-100 transition-opacity flex-wrap">
        {actions.map((act, idx) => (
          <button
            key={idx}
            onClick={act.onClick}
            className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${act.color}`}
          >
            {act.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// SUB-COMPONENT: EMPTY PLACEHOLDER
function EmptyColPlaceholder({ text }: { text: string }) {
  return (
    <div className="h-32 border-2 border-dashed border-slate-800 rounded-xl flex items-center justify-center p-4 text-center">
      <p className="text-[11px] text-slate-500 italic">{text}</p>
    </div>
  );
}

