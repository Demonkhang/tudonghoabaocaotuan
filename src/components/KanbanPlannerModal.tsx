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
  FileCheck
} from 'lucide-react';
import { TaskTable1, TaskTable2 } from '../utils/reportUtils';
import { UserProfile } from './LoginModal';
import { fetchCandidateTasks } from '../services/api';
import { BulkAddTaskModal } from './BulkAddTaskModal';
import { CompletionProofModal } from './CompletionProofModal';
import { TaskDetailModal } from './TaskDetailModal';

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
  source: 'unfinished_table1' | 'planned_table2' | 'imported_file' | 'custom_added';
  originalTable?: 1 | 2;
  targetTable?: 1 | 2;
  parent_task_id?: string;
}

export type ColumnId = 'backlog' | 'nextWeek' | 'completed' | 'cancelled';

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
    cancelled: []
  });

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [activeDropCol, setActiveDropCol] = useState<ColumnId | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);

  // New states for Proof Verification & Task Detail/Edit modals
  const [pendingProofTask, setPendingProofTask] = useState<KanbanTaskItem | null>(null);
  const [activeDetailTask, setActiveDetailTask] = useState<KanbanTaskItem | null>(null);
  const [activeDetailMode, setActiveDetailMode] = useState<'view' | 'edit'>('view');

  // Load candidate tasks into backlog when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const loadCandidateTasks = async () => {
      setIsLoadingCandidates(true);
      const initialBacklog: KanbanTaskItem[] = [];
      const addedSet = new Set<string>();

      const addUniqueItem = (item: KanbanTaskItem) => {
        const key = item.noi_dung.toLowerCase().trim();
        if (key && !addedSet.has(key)) {
          addedSet.add(key);
          initialBacklog.push(item);
        }
      };

      // 1. Candidate tasks from CSDL (across all past reports for this department)
      const deptId = currentUser?.department_id || 'dept_vp';
      try {
        const dbRes = await fetchCandidateTasks(deptId);
        if (dbRes && dbRes.success && Array.isArray(dbRes.tasks)) {
          dbRes.tasks.forEach((t: any) => {
            const lowerProgress = (t.tien_do || '').toLowerCase().trim();
            if (t.noi_dung && t.noi_dung.trim().length > 0 && !lowerProgress.includes('hoàn thành') && !lowerProgress.includes('hủy') && !lowerProgress.includes('kết thúc') && !lowerProgress.includes('dừng')) {
              addUniqueItem({
                id: `k_db_${t.id}`,
                noi_dung: t.noi_dung,
                nhom: t.category || 'Thường xuyên',
                thoi_gian: t.thoi_gian || 'Trong tuần',
                trien_khai: t.trien_khai || '',
                tien_do: t.tien_do || 'Đang thực hiện',
                san_pham: t.san_pham || '',
                file_minh_chung: t.file_minh_chung || '',
                file_original_name: t.file_original_name || '',
                source: 'unfinished_table1',
                originalTable: t.table_type,
                parent_task_id: t.id
              });
            }
          });
        }
      } catch (err) {
        console.warn('Lỗi loadCandidateTasks:', err);
      }

      // 2. Unfinished tasks from active memory Table 1
      table1.forEach(t => {
        const lowerProgress = (t.tien_do || '').toLowerCase().trim();
        if (t.noi_dung.trim().length > 0 && !lowerProgress.includes('hoàn thành') && !lowerProgress.includes('hủy') && !lowerProgress.includes('kết thúc') && !lowerProgress.includes('dừng')) {
          addUniqueItem({
            id: `k_t1_${t.id}`,
            noi_dung: t.noi_dung,
            nhom: t.nhom || 'Thường xuyên',
            thoi_gian: t.thoi_gian || 'Trong tuần',
            trien_khai: t.trien_khai || '',
            tien_do: t.tien_do || 'Đang thực hiện',
            san_pham: t.san_pham || '',
            file_minh_chung: t.file_minh_chung || '',
            file_original_name: t.file_original_name || '',
            source: 'unfinished_table1',
            originalTable: 1,
            parent_task_id: t.id
          });
        }
      });

      // 3. Planned tasks from active memory Table 2
      table2.forEach(t => {
        if (t.noi_dung.trim().length > 0) {
          addUniqueItem({
            id: `k_t2_${t.id}`,
            noi_dung: t.noi_dung,
            nhom: t.nhom || 'Thường xuyên',
            thoi_gian: t.thoi_gian_du_kien || 'Trong tuần',
            san_pham_du_kien: t.san_pham_du_kien || '',
            source: 'planned_table2',
            originalTable: 2,
            parent_task_id: t.id
          });
        }
      });

      setColumns({
        backlog: initialBacklog,
        nextWeek: [],
        completed: [],
        cancelled: []
      });

      setIsLoadingCandidates(false);
    };

    loadCandidateTasks();
    setSearchQuery('');
    setShowConfirmDialog(false);
  }, [isOpen, currentUser?.department_id, table1, table2]);

  if (!isOpen) return null;

  const targetWeek = sourceWeek + 1;
  const targetYear = sourceYear;

  // Move item between columns
  const moveTask = (taskId: string, targetCol: ColumnId) => {
    let itemToMove: KanbanTaskItem | null = null;
    const newCols = { ...columns };

    // Find item
    (Object.keys(newCols) as ColumnId[]).forEach(col => {
      const found = newCols[col].find(item => item.id === taskId);
      if (found) {
        itemToMove = found;
      }
    });

    if (!itemToMove) return;

    // RULE: If target is 'completed' AND task has neither file nor san_pham -> Prompt Proof Modal
    if (targetCol === 'completed' && !itemToMove.file_minh_chung && !itemToMove.san_pham) {
      setPendingProofTask(itemToMove);
      return;
    }

    // Direct move
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
    if (taskId) {
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

  // Filter items by search query
  const filterItems = (items: KanbanTaskItem[]) => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      item => item.noi_dung.toLowerCase().includes(q) || (item.nhom || '').toLowerCase().includes(q)
    );
  };

  const totalTasks =
    columns.backlog.length + columns.nextWeek.length + columns.completed.length + columns.cancelled.length;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[200] p-2 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-700/80 shadow-2xl w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden">
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
                Đơn vị: <span className="font-semibold text-slate-200">{currentUser?.department_name || 'Văn phòng'}</span> • Kéo thả để phân loại nhiệm vụ tuần tới
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
          {/* COL 1: KHO NHIỆM VỤ (BACKLOG) */}
          <KanbanColumn
            title="📦 Kho Nhiệm Vụ"
            subtitle="Chờ phân loại"
            count={filterItems(columns.backlog).length}
            totalCount={columns.backlog.length}
            colId="backlog"
            colorTheme="slate"
            isDropTarget={activeDropCol === 'backlog'}
            onDragOver={e => handleDragOver(e, 'backlog')}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, 'backlog')}
          >
            {/* Nút mở Modal thêm nhiệm vụ hàng loạt */}
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="w-full mb-3 py-2 px-3 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 hover:from-blue-600/40 hover:to-indigo-600/40 border border-blue-500/40 text-blue-200 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4 text-blue-400" />
              <span>+ Thêm Nhiệm Vụ Hàng Loạt</span>
            </button>

            {filterItems(columns.backlog).length === 0 ? (
              <EmptyColPlaceholder text="Kho nhiệm vụ trống" />
            ) : (
              filterItems(columns.backlog).map(item => (
                <KanbanTaskCard
                  key={item.id}
                  item={item}
                  onDragStart={e => handleDragStart(e, item.id)}
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
                      label: 'Kế hoạch 🚀',
                      color: 'bg-blue-600/80 hover:bg-blue-600 text-white',
                      onClick: () => moveTask(item.id, 'nextWeek')
                    },
                    {
                      label: 'Hoàn thành ✅',
                      color: 'bg-emerald-600/80 hover:bg-emerald-600 text-white',
                      onClick: () => moveTask(item.id, 'completed')
                    }
                  ]}
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
                    badgeText={isTable2 ? '🎯 BẢNG II: Kế hoạch tiếp theo' : '📌 BẢNG I: Thực hiện tuần tới'}
                    badgeColor={isTable2 ? 'bg-amber-500/25 text-amber-300 border-amber-500/50 font-bold' : 'bg-blue-500/25 text-blue-300 border-blue-500/50 font-bold'}
                    onDragStart={e => handleDragStart(e, item.id)}
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
                  badgeText="Xác nhận hoàn thành"
                  badgeColor="bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  onDragStart={e => handleDragStart(e, item.id)}
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
                  badgeText="Hủy / Kết thúc"
                  badgeColor="bg-rose-500/20 text-rose-300 border-rose-500/40"
                  onDragStart={e => handleDragStart(e, item.id)}
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
      <div className={`p-3 border-b flex items-center justify-between shrink-0 ${themeClasses.headerBg}`}>
        <div>
          <h4 className="text-xs font-bold tracking-wide flex items-center gap-1.5">{title}</h4>
          <p className="text-[10px] opacity-75 mt-0.5">{subtitle}</p>
        </div>
        <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${themeClasses.badge}`}>
          {count}
        </span>
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
  onDragStart: (e: React.DragEvent) => void;
  actions: { label: string; color: string; onClick: () => void }[];
}

function KanbanTaskCard({ item, badgeText, badgeColor, onDragStart, actions }: KanbanTaskCardProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="group bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-xl p-3 shadow-md hover:shadow-xl transition-all duration-200 cursor-grab active:cursor-grabbing space-y-2 relative"
    >
      {/* Header Info */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-700/80 text-slate-300 border border-slate-600/50">
          {item.nhom || 'Thường xuyên'}
        </span>

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

      {/* Main Content */}
      <p className="text-xs font-medium text-slate-100 leading-relaxed group-hover:text-white">
        {item.noi_dung}
      </p>

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
