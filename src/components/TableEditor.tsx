import React, { useState } from 'react';
import { Pencil, Plus, Trash2, ClipboardList, ArrowRight, Eye, Edit3, Paperclip, FileCheck, PenTool, Star, GripVertical } from 'lucide-react';
import { TaskTable1, TaskTable2, ReportMetadata, processTable1, processTable2, classifyTask } from '../utils/reportUtils';
import { DocInspectionStatItem, ConsolidatedReportMetaItem } from './DocInspectionModal';
import { ConfirmModal, ConfirmModalProps } from './ConfirmModal';

interface TableEditorProps {
  table1: TaskTable1[];
  setTable1: React.Dispatch<React.SetStateAction<TaskTable1[]>>;
  table2: TaskTable2[];
  setTable2: React.Dispatch<React.SetStateAction<TaskTable2[]>>;
  highlightedRowId: string | null;
  tuan: number;
  tuanTiep: number;
  nam: number;
  isReadOnly?: boolean;
  onOpenProofModal?: (row: TaskTable1) => void;
  onOpenDetailModal?: (row: TaskTable1, mode: 'view' | 'edit') => void;
  onClearTable1?: () => void;
  onClearTable2?: () => void;
  reportType?: 'SINGLE' | 'CONSOLIDATED_OFFICE';
  activeTeamCode?: 'VAN_THU' | 'CDS' | 'OFFICE_MASTER';
  docInspectionStats?: DocInspectionStatItem[];
  setDocInspectionStats?: React.Dispatch<React.SetStateAction<DocInspectionStatItem[]>>;
  consolidatedMeta?: ConsolidatedReportMetaItem;
  setConsolidatedMeta?: React.Dispatch<React.SetStateAction<ConsolidatedReportMetaItem>>;
  metadata?: ReportMetadata;
  setMetadata?: React.Dispatch<React.SetStateAction<ReportMetadata>>;
  currentUser?: any;
  onSaveReport?: () => void;
}

const getStarredRecurringStorageKey = (deptId?: string) => `kanban_starred_recurring_tasks_${deptId || 'dept_vp'}`;
const getUnstarredStorageKey = (deptId?: string) => `kanban_unstarred_keys_${deptId || 'dept_vp'}`;

export const markTaskAsUnstarredInStorage = (deptId: string | undefined, taskNoiDung: string) => {
  try {
    const taskKey = (taskNoiDung || '').toLowerCase().trim();
    if (!taskKey) return;
    const keys = [getUnstarredStorageKey(deptId)];
    if (deptId && deptId !== 'dept_vp') keys.push(getUnstarredStorageKey('dept_vp'));
    keys.forEach(k => {
      const existing: string[] = JSON.parse(localStorage.getItem(k) || '[]');
      if (!existing.includes(taskKey)) {
        existing.push(taskKey);
        localStorage.setItem(k, JSON.stringify(existing));
      }
    });
  } catch (e) {
    console.warn('Lỗi lưu unstarred key:', e);
  }
};

export const clearTaskUnstarredInStorage = (deptId: string | undefined, taskNoiDung: string) => {
  try {
    const taskKey = (taskNoiDung || '').toLowerCase().trim();
    if (!taskKey) return;
    const keys = [getUnstarredStorageKey(deptId)];
    if (deptId && deptId !== 'dept_vp') keys.push(getUnstarredStorageKey('dept_vp'));
    keys.forEach(k => {
      const existing: string[] = JSON.parse(localStorage.getItem(k) || '[]');
      const filtered = existing.filter(x => x !== taskKey);
      localStorage.setItem(k, JSON.stringify(filtered));
    });
  } catch (e) {
    console.warn('Lỗi xóa unstarred key:', e);
  }
};

export const isTaskUnstarredInStorage = (deptId: string | undefined, taskNoiDung: string): boolean => {
  try {
    const taskKey = (taskNoiDung || '').toLowerCase().trim();
    if (!taskKey) return false;
    const keys = [getUnstarredStorageKey(deptId)];
    if (deptId && deptId !== 'dept_vp') keys.push(getUnstarredStorageKey('dept_vp'));
    return keys.some(k => {
      const existing: string[] = JSON.parse(localStorage.getItem(k) || '[]');
      return existing.includes(taskKey);
    });
  } catch (e) {
    return false;
  }
};

export const saveStarredTaskToStorage = (deptId: string | undefined, task: { noi_dung: string; thoi_gian?: string; san_pham?: string; trien_khai?: string }) => {
  try {
    const taskKey = (task.noi_dung || '').toLowerCase().trim();
    if (!taskKey) return;

    // Clear any explicit un-starred state when starring again
    clearTaskUnstarredInStorage(deptId, task.noi_dung);

    const keysToSave = [getStarredRecurringStorageKey(deptId)];
    if (deptId && deptId !== 'dept_vp') {
      keysToSave.push(getStarredRecurringStorageKey('dept_vp'));
    }

    keysToSave.forEach(key => {
      const existingRaw = localStorage.getItem(key);
      let list: any[] = existingRaw ? JSON.parse(existingRaw) : [];
      if (!list.some(item => (item.noi_dung || '').toLowerCase().trim() === taskKey)) {
        list.push({
          id: `starred_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          noi_dung: task.noi_dung,
          nhom: 'Thường xuyên',
          thoi_gian: task.thoi_gian || 'Thường xuyên',
          trien_khai: task.trien_khai || '',
          tien_do: 'Đang thực hiện',
          san_pham: task.san_pham || '',
          is_recurring: true,
          is_starred: true
        });
        localStorage.setItem(key, JSON.stringify(list));
      }
    });
  } catch (e) {
    console.warn('Lỗi lưu starred task:', e);
  }
};

export const removeStarredTaskFromStorage = (deptId: string | undefined, taskNoiDung: string) => {
  try {
    const taskKey = taskNoiDung.toLowerCase().trim();
    if (!taskKey) return;

    // Mark as explicitly un-starred
    markTaskAsUnstarredInStorage(deptId, taskNoiDung);

    const keysToRemove = [getStarredRecurringStorageKey(deptId)];
    if (deptId && deptId !== 'dept_vp') {
      keysToRemove.push(getStarredRecurringStorageKey('dept_vp'));
    }

    keysToRemove.forEach(key => {
      const existingRaw = localStorage.getItem(key);
      if (!existingRaw) return;
      let list: any[] = JSON.parse(existingRaw);
      const filtered = list.filter(item => (item.noi_dung || '').toLowerCase().trim() !== taskKey);
      localStorage.setItem(key, JSON.stringify(filtered));
    });
  } catch (e) {
    console.warn('Lỗi xóa starred task:', e);
  }
};

export const isTaskStarredInStorage = (deptId: string | undefined, taskNoiDung: string): boolean => {
  try {
    const taskKey = (taskNoiDung || '').toLowerCase().trim();
    if (!taskKey) return false;

    if (isTaskUnstarredInStorage(deptId, taskNoiDung)) {
      return false;
    }

    const key = getStarredRecurringStorageKey(deptId);
    const existingRaw = localStorage.getItem(key);
    if (existingRaw) {
      const list: any[] = JSON.parse(existingRaw);
      if (list.some(item => (item.noi_dung || '').toLowerCase().trim() === taskKey)) return true;
    }

    if (deptId && deptId !== 'dept_vp') {
      const fallbackKey = getStarredRecurringStorageKey('dept_vp');
      const fallbackRaw = localStorage.getItem(fallbackKey);
      if (fallbackRaw) {
        const list: any[] = JSON.parse(fallbackRaw);
        if (list.some(item => (item.noi_dung || '').toLowerCase().trim() === taskKey)) return true;
      }
    }
    return false;
  } catch (e) {
    return false;
  }
};

export const TableEditor: React.FC<TableEditorProps> = ({
  table1,
  setTable1,
  table2,
  setTable2,
  highlightedRowId,
  tuan,
  tuanTiep,
  nam,
  isReadOnly = false,
  onOpenProofModal,
  onOpenDetailModal,
  onClearTable1,
  onClearTable2,
  reportType = 'SINGLE',
  activeTeamCode = 'OFFICE_MASTER',
  docInspectionStats = [],
  setDocInspectionStats,
  consolidatedMeta,
  setConsolidatedMeta,
  metadata,
  setMetadata,
  currentUser,
  onSaveReport
}) => {
  const [confirmModalConfig, setConfirmModalConfig] = useState<ConfirmModalProps | null>(null);

  // Drag and drop states for reordering tasks
  const [draggedTable1Id, setDraggedTable1Id] = useState<string | null>(null);
  const [dragOverTable1Id, setDragOverTable1Id] = useState<string | null>(null);
  const [draggedTable2Id, setDraggedTable2Id] = useState<string | null>(null);
  const [dragOverTable2Id, setDragOverTable2Id] = useState<string | null>(null);

  const handleTable1DragStart = (e: React.DragEvent, id: string) => {
    setDraggedTable1Id(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTable1DragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedTable1Id !== id) {
      setDragOverTable1Id(id);
    }
  };

  const handleTable1Drop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedTable1Id && draggedTable1Id !== targetId) {
      const srcIdx = table1.findIndex(t => t.id === draggedTable1Id);
      const tgtIdx = table1.findIndex(t => t.id === targetId);
      if (srcIdx !== -1 && tgtIdx !== -1) {
        const updated = [...table1];
        const [removed] = updated.splice(srcIdx, 1);
        updated.splice(tgtIdx, 0, removed);
        setTable1(updated);
      }
    }
    setDraggedTable1Id(null);
    setDragOverTable1Id(null);
  };

  const handleTable2DragStart = (e: React.DragEvent, id: string) => {
    setDraggedTable2Id(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTable2DragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedTable2Id !== id) {
      setDragOverTable2Id(id);
    }
  };

  const handleTable2Drop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedTable2Id && draggedTable2Id !== targetId) {
      const srcIdx = table2.findIndex(t => t.id === draggedTable2Id);
      const tgtIdx = table2.findIndex(t => t.id === targetId);
      if (srcIdx !== -1 && tgtIdx !== -1) {
        const updated = [...table2];
        const [removed] = updated.splice(srcIdx, 1);
        updated.splice(tgtIdx, 0, removed);
        setTable2(updated);
      }
    }
    setDraggedTable2Id(null);
    setDragOverTable2Id(null);
  };

  // Cập nhật trường dữ liệu Bảng 1
  const updateTable1Field = (id: string, field: keyof TaskTable1, value: any) => {
    const item = table1.find(t => t.id === id);
    if (field === 'tien_do' && value === 'Hoàn thành' && item && !item.file_minh_chung && !item.san_pham) {
      if (onOpenProofModal) {
        onOpenProofModal(item);
        return;
      }
    }

    setTable1(prev =>
      prev.map(it => {
        if (it.id === id) {
          const oldNoiDung = it.noi_dung;
          const isStarred = Boolean(it.is_starred) || isTaskStarredInStorage(currentUser?.department_id, oldNoiDung);
          const updated = { ...it, [field]: value, isEdited: true };
          if (field === 'noi_dung' && !it.nhom) {
            updated.nhom = classifyTask(value);
          }
          if (field === 'noi_dung' && isStarred && value !== oldNoiDung) {
            if (oldNoiDung) removeStarredTaskFromStorage(currentUser?.department_id, oldNoiDung);
            if (value && value.trim()) saveStarredTaskToStorage(currentUser?.department_id, updated);
            updated.is_starred = true;
            updated.is_recurring = true;
          }
          return updated;
        }
        return it;
      })
    );
  };

  // Toggle Đánh sao Bảng 1
  const toggleStarTable1 = (id: string) => {
    const targetTask = table1.find(it => it.id === id);
    if (!targetTask) return;

    const isCurrentlyStarred = Boolean(targetTask.is_starred) || isTaskStarredInStorage(currentUser?.department_id, targetTask.noi_dung);
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
          saveStarredTaskToStorage(currentUser?.department_id, targetTask);
        } else {
          removeStarredTaskFromStorage(currentUser?.department_id, targetTask.noi_dung);
        }

        setTable1(prev =>
          prev.map(it => {
            if (it.id === id) {
              const nextStar = !isCurrentlyStarred;
              return {
                ...it,
                is_starred: nextStar,
                is_recurring: nextStar,
                nhom: nextStar ? 'Thường xuyên' : it.nhom,
                isEdited: true
              };
            }
            return it;
          })
        );
        setTimeout(() => {
          onSaveReport?.();
        }, 100);
      },
      onCancel: () => setConfirmModalConfig(null)
    });
  };

  // Toggle Đánh sao Bảng 2
  const toggleStarTable2 = (id: string) => {
    const targetTask = table2.find(it => it.id === id);
    if (!targetTask) return;

    const isCurrentlyStarred = Boolean(targetTask.is_starred) || isTaskStarredInStorage(currentUser?.department_id, targetTask.noi_dung);
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
          saveStarredTaskToStorage(currentUser?.department_id, {
            noi_dung: targetTask.noi_dung,
            thoi_gian: targetTask.thoi_gian_du_kien,
            san_pham: targetTask.san_pham_du_kien
          });
        } else {
          removeStarredTaskFromStorage(currentUser?.department_id, targetTask.noi_dung);
        }

        setTable2(prev =>
          prev.map(it => {
            if (it.id === id) {
              const nextStar = !isCurrentlyStarred;
              return {
                ...it,
                is_starred: nextStar,
                is_recurring: nextStar,
                nhom: nextStar ? 'Thường xuyên' : it.nhom,
                isEdited: true
              };
            }
            return it;
          })
        );
        setTimeout(() => {
          onSaveReport?.();
        }, 100);
      },
      onCancel: () => setConfirmModalConfig(null)
    });
  };

  // Cập nhật trường dữ liệu Bảng 2
  const updateTable2Field = (id: string, field: keyof TaskTable2, value: any) => {
    setTable2(prev =>
      prev.map(item => {
        if (item.id === id) {
          const oldNoiDung = item.noi_dung;
          const isStarred = Boolean(item.is_starred) || isTaskStarredInStorage(currentUser?.department_id, oldNoiDung);
          const updated = { ...item, [field]: value, isEdited: true };
          if (field === 'noi_dung' && !item.nhom) {
            updated.nhom = classifyTask(value);
          }
          if (field === 'noi_dung' && isStarred && value !== oldNoiDung) {
            if (oldNoiDung) removeStarredTaskFromStorage(currentUser?.department_id, oldNoiDung);
            if (value && value.trim()) {
              saveStarredTaskToStorage(currentUser?.department_id, {
                noi_dung: value,
                thoi_gian: item.thoi_gian_du_kien,
                san_pham: item.san_pham_du_kien
              });
            }
            updated.is_starred = true;
            updated.is_recurring = true;
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Thêm dòng mới Bảng 1
  const addTable1Row = (nhom: 'Thường xuyên' | 'Đột xuất', targetTeamCode?: 'VAN_THU' | 'CDS') => {
    const selectedTeam = targetTeamCode || (activeTeamCode === 'CDS' ? 'CDS' : 'VAN_THU');
    const newId = `${selectedTeam.toLowerCase()}_t1_${Date.now()}`;
    const newTask: TaskTable1 = {
      id: newId,
      noi_dung: 'Nhiệm vụ mới...',
      thoi_gian: new Date().toLocaleDateString('vi-VN'),
      trien_khai: 'Đang triển khai',
      tien_do: 'Đang thực hiện',
      nhom,
      team_code: selectedTeam,
      isEdited: true,
      is_starred: false
    };
    setTable1([...table1, newTask]);
  };

  // Thêm dòng mới Bảng 2
  const addTable2Row = (nhom: 'Thường xuyên' | 'Đột xuất', targetTeamCode?: 'VAN_THU' | 'CDS') => {
    const selectedTeam = targetTeamCode || (activeTeamCode === 'CDS' ? 'CDS' : 'VAN_THU');
    const newId = `${selectedTeam.toLowerCase()}_t2_${Date.now()}`;
    const newTask: TaskTable2 = {
      id: newId,
      noi_dung: 'Kế hoạch công tác mới...',
      thoi_gian_du_kien: 'Trong tuần',
      san_pham_du_kien: 'Sản phẩm hoàn thành',
      nhom,
      team_code: selectedTeam,
      isEdited: true,
      is_starred: false
    };
    setTable2([...table2, newTask]);
  };

  // Xóa dòng Bảng 1
  const deleteTable1Row = (id: string) => {
    setTable1(table1.filter(t => t.id !== id));
  };

  // Xóa dòng Bảng 2
  const deleteTable2Row = (id: string) => {
    setTable2(table2.filter(t => t.id !== id));
  };

  // Helper render 1 hàng Bảng I
  const renderTable1Row = (row: TaskTable1 & { stt: number }) => {
    const isStarred = Boolean(row.is_starred) || isTaskStarredInStorage(currentUser?.department_id, row.noi_dung);

    return (
      <tr
        key={row.id}
        id={`row_${row.id}`}
        draggable={!isReadOnly}
        onDragStart={(e) => handleTable1DragStart(e, row.id)}
        onDragOver={(e) => handleTable1DragOver(e, row.id)}
        onDrop={(e) => handleTable1Drop(e, row.id)}
        onDragEnd={() => { setDraggedTable1Id(null); setDragOverTable1Id(null); }}
        className={`border-b border-[#c1c6d4] dark:border-slate-800 transition-all group ${
          draggedTable1Id === row.id ? 'opacity-30 bg-blue-100 dark:bg-blue-950' : ''
        } ${
          dragOverTable1Id === row.id ? 'border-t-2 border-t-blue-500 bg-blue-50/70 dark:bg-blue-900/40' : ''
        } ${
          highlightedRowId === row.id
            ? 'bg-amber-100 dark:bg-amber-950/70 ring-2 ring-amber-500'
            : row.thoi_gian === 'Chưa nhập'
            ? 'bg-red-50/70 dark:bg-red-950/40 hover:bg-red-100/80 dark:hover:bg-red-900/50'
            : 'hover:bg-[#f2f3fc] dark:hover:bg-slate-800/40'
        }`}
      >
        <td className="px-3 py-3 text-center font-bold text-[#414752] dark:text-slate-300 select-none">
          <div className="flex items-center justify-center gap-1 cursor-grab active:cursor-grabbing" title="Cầm kéo để sắp xếp thứ tự nhiệm vụ">
            {!isReadOnly && <GripVertical className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />}
            <span>{row.stt}</span>
          </div>
        </td>
        
        {/* Nội dung Inline Edit */}
        <td className="px-4 py-3 relative">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {row.is_directive_task && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-purple-900/80 text-purple-200 px-2 py-0.5 rounded-md border border-purple-700/60 shadow-xs">
                  <span>👑 Được Giao / Phân Cấp</span>
                  {row.task_code && <span className="opacity-75 font-mono">({row.task_code})</span>}
                </span>
              )}
              {row.assigner_name && (
                <span className="text-[10px] text-purple-400 font-medium">
                  Giao bởi: {row.assigner_name}
                </span>
              )}
              {isStarred && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/40">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>Nhiệm vụ mẫu / Lặp lại</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => toggleStarTable1(row.id)}
                className="p-1 rounded hover:bg-amber-500/20 transition-colors cursor-pointer shrink-0"
                title={isStarred ? "Bỏ gắn sao nhiệm vụ lặp lại" : "Đánh sao nhiệm vụ lặp lại / thường xuyên"}
              >
                <Star
                  className={`w-4 h-4 transition-transform hover:scale-125 ${
                    isStarred ? 'fill-amber-400 text-amber-400' : 'text-slate-400 hover:text-amber-400'
                  }`}
                />
              </button>

              <input
                type="text"
                readOnly={row.is_directive_task}
                value={row.noi_dung}
                onChange={e => updateTable1Field(row.id, 'noi_dung', e.target.value)}
                className={`w-full bg-transparent border-b border-transparent hover:border-[#717783] dark:hover:border-slate-500 focus:border-[#005dac] dark:focus:border-blue-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden px-1 py-0.5 rounded text-slate-800 dark:text-slate-100 font-medium ${
                  row.is_directive_task ? 'font-semibold text-purple-900 dark:text-purple-200 cursor-not-allowed' : ''
                }`}
                title={row.is_directive_task ? 'Nhiệm vụ phân cấp từ cấp trên - không thể sửa tên' : ''}
              />
              {row.isEdited && !row.is_directive_task && (
                <span className="flex items-center text-[10px] bg-amber-100 dark:bg-amber-950 dark:text-amber-300 text-amber-800 px-1.5 py-0.5 rounded font-bold shrink-0 border border-amber-300 dark:border-amber-700" title="Đã sửa">
                  <Pencil className="w-3 h-3 mr-0.5" /> Đã sửa
                </span>
              )}
            </div>
          </div>
        </td>

        {/* Thời gian */}
        <td className="px-4 py-3">
          <input
            type="text"
            readOnly={row.is_directive_task}
            value={row.thoi_gian}
            onChange={e => updateTable1Field(row.id, 'thoi_gian', e.target.value)}
            className={`w-full bg-transparent border-b border-transparent hover:border-[#717783] dark:hover:border-slate-500 focus:border-[#005dac] dark:focus:border-blue-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden px-1 py-0.5 rounded ${
              row.is_directive_task ? 'font-bold text-purple-700 dark:text-purple-300 cursor-not-allowed' :
              row.thoi_gian === 'Chưa nhập' ? 'text-red-600 dark:text-red-400 font-semibold italic' : 'text-slate-700 dark:text-slate-200'
            }`}
            title={row.is_directive_task ? 'Hạn xử lý do Cấp trên ấn định' : ''}
          />
        </td>

        {/* Triển khai */}
        <td className="px-4 py-3">
          <input
            type="text"
            value={row.trien_khai}
            onChange={e => updateTable1Field(row.id, 'trien_khai', e.target.value)}
            className="w-full bg-transparent border-b border-transparent hover:border-[#717783] dark:hover:border-slate-500 focus:border-[#005dac] dark:focus:border-blue-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden px-1 py-0.5 rounded text-slate-700 dark:text-slate-200 font-medium"
          />
        </td>

        {/* Tiến độ Dropdown Select */}
        <td className="px-4 py-3">
          <select
            value={row.tien_do}
            onChange={e => updateTable1Field(row.id, 'tien_do', e.target.value)}
            className={`text-xs font-bold px-2.5 py-1 rounded-full cursor-pointer focus:outline-hidden border-none ${
              row.tien_do === 'Hoàn thành'
                ? 'bg-emerald-600 text-white dark:bg-emerald-600'
                : row.tien_do === 'Đang thực hiện'
                ? 'bg-[#005dac] text-white dark:bg-blue-600'
                : row.tien_do === 'Hoàn thành trễ'
                ? 'bg-amber-600 text-white dark:bg-amber-600'
                : 'bg-slate-500 text-white dark:bg-slate-600'
            }`}
          >
            <option value="Hoàn thành" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium">Hoàn thành</option>
            <option value="Đang thực hiện" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium">Đang thực hiện</option>
            <option value="Hoàn thành trễ" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium">Hoàn thành trễ</option>
            <option value="Chưa thực hiện" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium">Chưa thực hiện</option>
          </select>
        </td>

        <td className="px-3 py-3 text-center">
          <div className="flex items-center justify-center gap-1">
            {row.file_minh_chung && (
              <span title={`File minh chứng: ${row.file_original_name || 'Đã đính kèm'}`}>
                <Paperclip className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </span>
            )}

            {row.tien_do === 'Hoàn thành' ? (
              <button
                onClick={() => onOpenDetailModal?.(row, 'view')}
                className="p-1 text-[#005dac] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 rounded cursor-pointer transition-all"
                title="Xem chi tiết nhiệm vụ & Tải file minh chứng"
              >
                <Eye className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => onOpenDetailModal?.(row, 'edit')}
                className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer transition-all"
                title="Chỉnh sửa chi tiết nhiệm vụ"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}

            {!isReadOnly && (
              <button
                onClick={() => deleteTable1Row(row.id)}
                className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                title="Xóa dòng này"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  // Helper render 1 hàng Bảng II
  const renderTable2Row = (row: TaskTable2 & { stt: number }) => {
    const isStarred = Boolean(row.is_starred) || isTaskStarredInStorage(currentUser?.department_id, row.noi_dung);

    return (
      <tr
        key={row.id}
        id={`row_${row.id}`}
        draggable={!isReadOnly}
        onDragStart={(e) => handleTable2DragStart(e, row.id)}
        onDragOver={(e) => handleTable2DragOver(e, row.id)}
        onDrop={(e) => handleTable2Drop(e, row.id)}
        onDragEnd={() => { setDraggedTable2Id(null); setDragOverTable2Id(null); }}
        className={`border-b border-[#c1c6d4] dark:border-slate-800 transition-all group ${
          draggedTable2Id === row.id ? 'opacity-30 bg-amber-100 dark:bg-amber-950' : ''
        } ${
          dragOverTable2Id === row.id ? 'border-t-2 border-t-amber-500 bg-amber-50/70 dark:bg-amber-900/40' : ''
        } ${
          highlightedRowId === row.id
            ? 'bg-amber-100 dark:bg-amber-950/70 ring-2 ring-amber-500'
            : 'hover:bg-[#f2f3fc] dark:hover:bg-slate-800/40'
        }`}
      >
        <td className="px-3 py-3 text-center font-bold text-[#414752] dark:text-slate-300 select-none">
          <div className="flex items-center justify-center gap-1 cursor-grab active:cursor-grabbing" title="Cầm kéo để sắp xếp thứ tự nhiệm vụ">
            {!isReadOnly && <GripVertical className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />}
            <span>{row.stt}</span>
          </div>
        </td>
        
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => toggleStarTable2(row.id)}
              className="p-1 rounded hover:bg-amber-500/20 transition-colors cursor-pointer shrink-0"
              title={isStarred ? "Bỏ gắn sao nhiệm vụ lặp lại" : "Đánh sao nhiệm vụ lặp lại / thường xuyên"}
            >
              <Star
                className={`w-4 h-4 transition-transform hover:scale-125 ${
                  isStarred ? 'fill-amber-400 text-amber-400' : 'text-slate-400 hover:text-amber-400'
                }`}
              />
            </button>

            <input
              type="text"
              value={row.noi_dung}
              onChange={e => updateTable2Field(row.id, 'noi_dung', e.target.value)}
              className="w-full bg-transparent border-b border-transparent hover:border-[#717783] dark:hover:border-slate-500 focus:border-[#ba5b00] dark:focus:border-amber-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden px-1 py-0.5 rounded text-slate-800 dark:text-slate-100 font-medium"
            />
          </div>
        </td>

        <td className="px-4 py-3">
          <input
            type="text"
            value={row.thoi_gian_du_kien}
            onChange={e => updateTable2Field(row.id, 'thoi_gian_du_kien', e.target.value)}
            className="w-full bg-transparent border-b border-transparent hover:border-[#717783] dark:hover:border-slate-500 focus:border-[#ba5b00] dark:focus:border-amber-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden px-1 py-0.5 rounded text-slate-700 dark:text-slate-200"
          />
        </td>

        <td className="px-4 py-3">
          <input
            type="text"
            value={row.san_pham_du_kien}
            onChange={e => updateTable2Field(row.id, 'san_pham_du_kien', e.target.value)}
            className="w-full bg-transparent border-b border-transparent hover:border-[#717783] dark:hover:border-slate-500 focus:border-[#ba5b00] dark:focus:border-amber-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden px-1 py-0.5 rounded text-slate-700 dark:text-slate-200 font-medium"
          />
        </td>

        <td className="px-3 py-3 text-center">
          {!isReadOnly && (
            <button
              onClick={() => deleteTable2Row(row.id)}
              className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </td>
      </tr>
    );
  };


  // Phân loại dữ liệu theo view đang chọn
  const isConsolidated = reportType === 'CONSOLIDATED_OFFICE';

  // Lấy dữ liệu riêng cho từng team
  const vtTable1 = table1.filter(t => (t.team_code || 'VAN_THU') === 'VAN_THU');
  const cdsTable1 = table1.filter(t => t.team_code === 'CDS');
  const vtTable2 = table2.filter(t => (t.team_code || 'VAN_THU') === 'VAN_THU');
  const cdsTable2 = table2.filter(t => t.team_code === 'CDS');

  // Processed data cho các góc nhìn
  const p1_single = processTable1(table1);
  const p2_single = processTable2(table2);

  const p1_vt = processTable1(vtTable1);
  const p1_cds = processTable1(cdsTable1);
  const p2_vt = processTable2(vtTable2);
  const p2_cds = processTable2(cdsTable2);

  // Chọn bộ data để render nếu đang ở mode ĐƠN hoặc MODE NHẬP RIÊNG
  const activeTable1 = isConsolidated
    ? (activeTeamCode === 'VAN_THU' ? vtTable1 : activeTeamCode === 'CDS' ? cdsTable1 : table1)
    : table1;
  const activeTable2 = isConsolidated
    ? (activeTeamCode === 'VAN_THU' ? vtTable2 : activeTeamCode === 'CDS' ? cdsTable2 : table2)
    : table2;

  const p1_active = processTable1(activeTable1);
  const p2_active = processTable2(activeTable2);

  // Danh sách 6 phòng ban mặc định cho Mục III Thể thức
  const defaultDeptStatsList: DocInspectionStatItem[] = [
    { department_name: 'Văn phòng', total_checked: 1, error_count: 0 },
    { department_name: 'Phòng Kế hoạch Tài chính', total_checked: 12, error_count: 0 },
    { department_name: 'Phòng Quản lý Dự án', total_checked: 11, error_count: 4 },
    { department_name: 'Phòng Giám sát Khu liên hợp', total_checked: 5, error_count: 1 },
    { department_name: 'Phòng Giám sát Khối lượng', total_checked: 0, error_count: 0 },
    { department_name: 'Phòng Kiểm tra Môi trường', total_checked: 11, error_count: 2 }
  ];

  const activeStatsList = docInspectionStats && docInspectionStats.length > 0
    ? docInspectionStats
    : defaultDeptStatsList;

  return (
    <section className="col-span-12 lg:col-span-9 overflow-y-auto p-6 bg-[#f9f9ff] dark:bg-slate-900 space-y-6 scroll-smooth pb-16 transition-colors duration-300">
      
      {/* Banner thông báo chế độ Form */}
      {isConsolidated && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-4 rounded-xl border border-blue-500/30 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg shrink-0 ${activeTeamCode === 'VAN_THU' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : activeTeamCode === 'CDS' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm flex items-center gap-2">
                <span>FORM TỔNG HỢP VĂN PHÒNG (NGHỊ ĐỊNH 30)</span>
                <span className={`text-[10px] uppercase px-2 py-0.5 rounded font-extrabold border ${
                  activeTeamCode === 'VAN_THU' ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/30' :
                  activeTeamCode === 'CDS' ? 'bg-blue-500/30 text-blue-200 border-blue-400/30' :
                  'bg-amber-500/30 text-amber-200 border-amber-400/30'
                }`}>
                  {activeTeamCode === 'VAN_THU' ? '📁 Form Tổ Văn thư' : activeTeamCode === 'CDS' ? '📁 Form Tổ Chuyển đổi số' : '🏛️ Master Tổng hợp 2 Tổ'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {activeTeamCode === 'VAN_THU' && 'Bạn đang trong Workspace nhập dữ liệu của Tổ Văn thư – Lưu trữ.'}
                {activeTeamCode === 'CDS' && 'Bạn đang trong Workspace nhập dữ liệu của Tổ Chuyển đổi số.'}
                {activeTeamCode === 'OFFICE_MASTER' && 'Góc nhìn Master: Hiển thị phân nhóm đầy đủ nhiệm vụ của cả 2 Tổ (Văn thư & Chuyển đổi số).'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ==================== BẢNG I ==================== */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-[#c1c6d4] dark:border-slate-800 overflow-hidden">
        <div className="bg-[#cbe6ff] dark:bg-slate-800 px-6 py-3 border-b border-[#c1c6d4] dark:border-slate-700 flex justify-between items-center">
          <h2 className="font-bold text-lg text-[#001e30] dark:text-blue-300 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#005dac] dark:text-blue-400" />
            <span>BẢNG I: KẾT QUẢ THỰC HIỆN CÔNG TÁC</span>
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase font-extrabold tracking-wider text-[#4e677c] dark:text-slate-300">
              Tuần {tuan} / {nam}
            </span>
            {!isReadOnly && table1.length > 0 && onClearTable1 && (
              <button
                onClick={onClearTable1}
                className="text-xs font-bold text-red-600 dark:text-red-400 bg-white/80 dark:bg-slate-700/80 hover:bg-red-50 dark:hover:bg-red-950/60 px-2.5 py-1 rounded border border-red-200 dark:border-red-900 transition-all flex items-center gap-1 cursor-pointer"
                title="Xóa nhanh tất cả nhiệm vụ Bảng I"
              >
                <Trash2 className="w-3.5 h-3.5" /> Xóa Bảng I
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#e6e8f0] dark:bg-slate-800/90">
              <tr className="text-xs uppercase text-[#414752] dark:text-slate-300 font-bold border-b border-[#c1c6d4] dark:border-slate-700">
                <th className="px-4 py-3 w-12 text-center">STT</th>
                <th className="px-4 py-3">Nội dung nhiệm vụ</th>
                <th className="px-4 py-3 w-40">Thời gian hoàn thành</th>
                <th className="px-4 py-3">Triển khai thực hiện</th>
                <th className="px-4 py-3 w-48">Tiến độ</th>
                <th className="px-3 py-3 w-12 text-center">Xóa</th>
              </tr>
            </thead>
            <tbody className="text-sm">

              {/* TRƯỜNG HỢP 1: GÓC NHÌN MASTER TỔNG HỢP (OFFICE_MASTER) */}
              {isConsolidated && activeTeamCode === 'OFFICE_MASTER' ? (
                <>
                  {/* I. NHÓM THƯỜNG XUYÊN */}
                  <tr className="bg-[#f2f3fc] dark:bg-slate-800/70">
                    <td colSpan={6} className="px-4 py-2 font-extrabold text-[#005dac] dark:text-blue-300 border-b border-[#c1c6d4] dark:border-slate-700">
                      I. Nhiệm vụ thường xuyên ({p1_vt.txStats.done + p1_cds.txStats.done}/{p1_vt.txStats.total + p1_cds.txStats.total} nhiệm vụ hoàn thành)
                    </td>
                  </tr>

                  {/* 1. Bộ phận Văn thư - Lưu trữ */}
                  <tr className="bg-[#eef6ff] dark:bg-slate-800/40">
                    <td colSpan={6} className="px-6 py-2 font-bold text-emerald-700 dark:text-emerald-300 border-b border-emerald-200 dark:border-slate-700">
                      <div className="flex justify-between items-center">
                        <span>1. Bộ phận Văn thư – Lưu trữ ({p1_vt.txStats.done}/{p1_vt.txStats.total} hoàn thành)</span>
                        <button
                          onClick={() => addTable1Row('Thường xuyên', 'VAN_THU')}
                          className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-700 px-2.5 py-1 rounded border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Thêm nhiệm vụ Văn thư
                        </button>
                      </div>
                    </td>
                  </tr>
                  {p1_vt.thuongXuyen.length > 0 ? (
                    p1_vt.thuongXuyen.map(row => renderTable1Row(row))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-2 text-xs italic text-slate-400">Chưa có nhiệm vụ thường xuyên của Tổ Văn thư</td>
                    </tr>
                  )}

                  {/* 2. Bộ phận Chuyển đổi số */}
                  <tr className="bg-[#eef6ff] dark:bg-slate-800/40">
                    <td colSpan={6} className="px-6 py-2 font-bold text-blue-700 dark:text-blue-300 border-b border-blue-200 dark:border-slate-700">
                      <div className="flex justify-between items-center">
                        <span>2. Bộ phận Chuyển đổi số ({p1_cds.txStats.done}/{p1_cds.txStats.total} hoàn thành)</span>
                        <button
                          onClick={() => addTable1Row('Thường xuyên', 'CDS')}
                          className="text-xs font-semibold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-700 px-2.5 py-1 rounded border border-blue-300 dark:border-blue-700 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Thêm nhiệm vụ CĐS
                        </button>
                      </div>
                    </td>
                  </tr>
                  {p1_cds.thuongXuyen.length > 0 ? (
                    p1_cds.thuongXuyen.map(row => renderTable1Row(row))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-2 text-xs italic text-slate-400">Chưa có nhiệm vụ thường xuyên của Tổ CĐS</td>
                    </tr>
                  )}

                  {/* II. NHÓM ĐỘT XUẤT */}
                  <tr className="bg-[#f2f3fc] dark:bg-slate-800/70">
                    <td colSpan={6} className="px-4 py-2 font-extrabold text-[#005dac] dark:text-blue-300 border-b border-[#c1c6d4] dark:border-slate-700">
                      II. Nhiệm vụ đột xuất ({p1_vt.dxStats.done + p1_cds.dxStats.done}/{p1_vt.dxStats.total + p1_cds.dxStats.total} nhiệm vụ hoàn thành)
                    </td>
                  </tr>

                  {/* 1. Bộ phận Văn thư - Lưu trữ */}
                  <tr className="bg-[#eef6ff] dark:bg-slate-800/40">
                    <td colSpan={6} className="px-6 py-2 font-bold text-emerald-700 dark:text-emerald-300 border-b border-emerald-200 dark:border-slate-700">
                      <div className="flex justify-between items-center">
                        <span>1. Bộ phận Văn thư – Lưu trữ ({p1_vt.dxStats.done}/{p1_vt.dxStats.total} hoàn thành)</span>
                        <button
                          onClick={() => addTable1Row('Đột xuất', 'VAN_THU')}
                          className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-700 px-2.5 py-1 rounded border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Thêm nhiệm vụ Văn thư
                        </button>
                      </div>
                    </td>
                  </tr>
                  {p1_vt.dotXuat.length > 0 ? (
                    p1_vt.dotXuat.map(row => renderTable1Row(row))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-2 text-xs italic text-slate-400">Chưa có nhiệm vụ đột xuất của Tổ Văn thư</td>
                    </tr>
                  )}

                  {/* 2. Bộ phận Chuyển đổi số */}
                  <tr className="bg-[#eef6ff] dark:bg-slate-800/40">
                    <td colSpan={6} className="px-6 py-2 font-bold text-blue-700 dark:text-blue-300 border-b border-blue-200 dark:border-slate-700">
                      <div className="flex justify-between items-center">
                        <span>2. Bộ phận Chuyển đổi số ({p1_cds.dxStats.done}/{p1_cds.dxStats.total} hoàn thành)</span>
                        <button
                          onClick={() => addTable1Row('Đột xuất', 'CDS')}
                          className="text-xs font-semibold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-700 px-2.5 py-1 rounded border border-blue-300 dark:border-blue-700 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Thêm nhiệm vụ CĐS
                        </button>
                      </div>
                    </td>
                  </tr>
                  {p1_cds.dotXuat.length > 0 ? (
                    p1_cds.dotXuat.map(row => renderTable1Row(row))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-2 text-xs italic text-slate-400">Chưa có nhiệm vụ đột xuất của Tổ CĐS</td>
                    </tr>
                  )}
                </>
              ) : (
                /* TRƯỜNG HỢP 2: BÁO CÁO ĐƠN HOẶC SOI RIÊNG VĂN THƯ / CĐS */
                <>
                  {/* NHÓM I: THƯỜNG XUYÊN */}
                  <tr className="bg-[#f2f3fc] dark:bg-slate-800/50">
                    <td colSpan={6} className="px-4 py-2 font-extrabold text-[#005dac] dark:text-blue-300 border-b border-[#c1c6d4] dark:border-slate-700">
                      <div className="flex justify-between items-center">
                        <span>
                          I. Nhiệm vụ thường xuyên ({p1_active.txStats.done}/{p1_active.txStats.total} nhiệm vụ hoàn thành)
                        </span>
                        <button
                          onClick={() => addTable1Row('Thường xuyên')}
                          className="text-xs font-semibold text-[#005dac] dark:text-blue-300 bg-white dark:bg-slate-700 px-2.5 py-1 rounded border border-[#005dac]/30 dark:border-slate-600 hover:bg-[#005dac] dark:hover:bg-blue-600 hover:text-white dark:hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Thêm nhiệm vụ
                        </button>
                      </div>
                    </td>
                  </tr>
                  {p1_active.thuongXuyen.map(row => renderTable1Row(row))}

                  {/* NHÓM II: ĐỘT XUẤT */}
                  <tr className="bg-[#f2f3fc] dark:bg-slate-800/50">
                    <td colSpan={6} className="px-4 py-2 font-extrabold text-[#005dac] dark:text-blue-300 border-b border-[#c1c6d4] dark:border-slate-700">
                      <div className="flex justify-between items-center">
                        <span>
                          II. Nhiệm vụ đột xuất ({p1_active.dxStats.done}/{p1_active.dxStats.total} nhiệm vụ hoàn thành)
                        </span>
                        <button
                          onClick={() => addTable1Row('Đột xuất')}
                          className="text-xs font-semibold text-[#005dac] dark:text-blue-300 bg-white dark:bg-slate-700 px-2.5 py-1 rounded border border-[#005dac]/30 dark:border-slate-600 hover:bg-[#005dac] dark:hover:bg-blue-600 hover:text-white dark:hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Thêm nhiệm vụ
                        </button>
                      </div>
                    </td>
                  </tr>
                  {p1_active.dotXuat.map(row => renderTable1Row(row))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== BẢNG II ==================== */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-[#c1c6d4] dark:border-slate-800 overflow-hidden">
        <div className="bg-[#ffdbc7] dark:bg-gradient-to-r dark:from-amber-950/60 dark:to-slate-800 px-6 py-3 border-b border-[#c1c6d4] dark:border-slate-700 flex justify-between items-center">
          <h2 className="font-bold text-lg text-[#311300] dark:text-amber-300 flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-[#ba5b00] dark:text-amber-400" />
            <span>BẢNG II: KẾ HOẠCH THỰC HIỆN TUẦN TIẾP THEO</span>
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase font-extrabold tracking-wider text-[#733600] dark:text-amber-300/80">
              Tuần {tuanTiep} / {nam}
            </span>
            {!isReadOnly && table2.length > 0 && onClearTable2 && (
              <button
                onClick={onClearTable2}
                className="text-xs font-bold text-red-600 dark:text-red-400 bg-white/80 dark:bg-slate-700/80 hover:bg-red-50 dark:hover:bg-red-950/60 px-2.5 py-1 rounded border border-red-200 dark:border-red-900 transition-all flex items-center gap-1 cursor-pointer"
                title="Xóa nhanh tất cả kế hoạch Bảng II"
              >
                <Trash2 className="w-3.5 h-3.5" /> Xóa Bảng II
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#e6e8f0] dark:bg-slate-800/90">
              <tr className="text-xs uppercase text-[#414752] dark:text-slate-300 font-bold border-b border-[#c1c6d4] dark:border-slate-700">
                <th className="px-4 py-3 w-12 text-center">STT</th>
                <th className="px-4 py-3">Nhiệm vụ/Công tác</th>
                <th className="px-4 py-3 w-40">Thời gian dự kiến</th>
                <th className="px-4 py-3">Nội dung và sản phẩm dự kiến</th>
                <th className="px-3 py-3 w-12 text-center">Xóa</th>
              </tr>
            </thead>
            <tbody className="text-sm">

              {/* TRƯỜNG HỢP 1: MASTER TỔNG HỢP */}
              {isConsolidated && activeTeamCode === 'OFFICE_MASTER' ? (
                <>
                  {/* I. NHÓM THƯỜNG XUYÊN */}
                  <tr className="bg-[#fff3ec] dark:bg-amber-950/30">
                    <td colSpan={5} className="px-4 py-2 font-extrabold text-[#ba5b00] dark:text-amber-400 border-b border-[#c1c6d4] dark:border-slate-700">
                      I. Nhiệm vụ thường xuyên ({p2_vt.txTotal + p2_cds.txTotal} kế hoạch)
                    </td>
                  </tr>

                  {/* 1. Bộ phận Văn thư */}
                  <tr className="bg-[#fff8f3] dark:bg-slate-800/40">
                    <td colSpan={5} className="px-6 py-2 font-bold text-emerald-700 dark:text-emerald-300 border-b border-emerald-200 dark:border-slate-700">
                      <div className="flex justify-between items-center">
                        <span>1. Bộ phận Văn thư – Lưu trữ ({p2_vt.txTotal} kế hoạch)</span>
                        <button
                          onClick={() => addTable2Row('Thường xuyên', 'VAN_THU')}
                          className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-700 px-2.5 py-1 rounded border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Thêm kế hoạch Văn thư
                        </button>
                      </div>
                    </td>
                  </tr>
                  {p2_vt.thuongXuyen.length > 0 ? (
                    p2_vt.thuongXuyen.map(row => renderTable2Row(row))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-2 text-xs italic text-slate-400">Chưa có kế hoạch thường xuyên của Tổ Văn thư</td>
                    </tr>
                  )}

                  {/* 2. Bộ phận Chuyển đổi số */}
                  <tr className="bg-[#fff8f3] dark:bg-slate-800/40">
                    <td colSpan={5} className="px-6 py-2 font-bold text-blue-700 dark:text-blue-300 border-b border-blue-200 dark:border-slate-700">
                      <div className="flex justify-between items-center">
                        <span>2. Bộ phận Chuyển đổi số ({p2_cds.txTotal} kế hoạch)</span>
                        <button
                          onClick={() => addTable2Row('Thường xuyên', 'CDS')}
                          className="text-xs font-semibold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-700 px-2.5 py-1 rounded border border-blue-300 dark:border-blue-700 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Thêm kế hoạch CĐS
                        </button>
                      </div>
                    </td>
                  </tr>
                  {p2_cds.thuongXuyen.length > 0 ? (
                    p2_cds.thuongXuyen.map(row => renderTable2Row(row))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-2 text-xs italic text-slate-400">Chưa có kế hoạch thường xuyên của Tổ CĐS</td>
                    </tr>
                  )}

                  {/* II. NHÓM ĐỘT XUẤT */}
                  <tr className="bg-[#fff3ec] dark:bg-amber-950/30">
                    <td colSpan={5} className="px-4 py-2 font-extrabold text-[#ba5b00] dark:text-amber-400 border-b border-[#c1c6d4] dark:border-slate-700">
                      II. Nhiệm vụ đột xuất ({p2_vt.dxTotal + p2_cds.dxTotal} kế hoạch)
                    </td>
                  </tr>

                  {/* 1. Bộ phận Văn thư */}
                  <tr className="bg-[#fff8f3] dark:bg-slate-800/40">
                    <td colSpan={5} className="px-6 py-2 font-bold text-emerald-700 dark:text-emerald-300 border-b border-emerald-200 dark:border-slate-700">
                      <div className="flex justify-between items-center">
                        <span>1. Bộ phận Văn thư – Lưu trữ ({p2_vt.dxTotal} kế hoạch)</span>
                        <button
                          onClick={() => addTable2Row('Đột xuất', 'VAN_THU')}
                          className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-700 px-2.5 py-1 rounded border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Thêm kế hoạch Văn thư
                        </button>
                      </div>
                    </td>
                  </tr>
                  {p2_vt.dotXuat.length > 0 ? (
                    p2_vt.dotXuat.map(row => renderTable2Row(row))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-2 text-xs italic text-slate-400">Chưa có kế hoạch đột xuất của Tổ Văn thư</td>
                    </tr>
                  )}

                  {/* 2. Bộ phận Chuyển đổi số */}
                  <tr className="bg-[#fff8f3] dark:bg-slate-800/40">
                    <td colSpan={5} className="px-6 py-2 font-bold text-blue-700 dark:text-blue-300 border-b border-blue-200 dark:border-slate-700">
                      <div className="flex justify-between items-center">
                        <span>2. Bộ phận Chuyển đổi số ({p2_cds.dxTotal} kế hoạch)</span>
                        <button
                          onClick={() => addTable2Row('Đột xuất', 'CDS')}
                          className="text-xs font-semibold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-700 px-2.5 py-1 rounded border border-blue-300 dark:border-blue-700 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Thêm kế hoạch CĐS
                        </button>
                      </div>
                    </td>
                  </tr>
                  {p2_cds.dotXuat.length > 0 ? (
                    p2_cds.dotXuat.map(row => renderTable2Row(row))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-2 text-xs italic text-slate-400">Chưa có kế hoạch đột xuất của Tổ CĐS</td>
                    </tr>
                  )}
                </>
              ) : (
                /* TRƯỜNG HỢP 2: BÁO CÁO ĐƠN HOẶC SOI RIÊNG VĂN THƯ / CĐS */
                <>
                  {/* NHÓM I: THƯỜNG XUYÊN */}
                  <tr className="bg-[#fff3ec] dark:bg-amber-950/20">
                    <td colSpan={5} className="px-4 py-2 font-extrabold text-[#ba5b00] dark:text-amber-400 border-b border-[#c1c6d4] dark:border-slate-700">
                      <div className="flex justify-between items-center">
                        <span>I. Nhiệm vụ thường xuyên ({p2_active.txTotal} kế hoạch)</span>
                        <button
                          onClick={() => addTable2Row('Thường xuyên')}
                          className="text-xs font-semibold text-[#ba5b00] dark:text-amber-300 bg-white dark:bg-slate-800 px-2.5 py-1 rounded border border-[#ba5b00]/30 dark:border-amber-700/50 hover:bg-[#ba5b00] dark:hover:bg-amber-600 hover:text-white dark:hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Thêm kế hoạch
                        </button>
                      </div>
                    </td>
                  </tr>
                  {p2_active.thuongXuyen.map(row => renderTable2Row(row))}

                  {/* NHÓM II: ĐỘT XUẤT */}
                  <tr className="bg-[#fff3ec] dark:bg-amber-950/20">
                    <td colSpan={5} className="px-4 py-2 font-extrabold text-[#ba5b00] dark:text-amber-400 border-b border-[#c1c6d4] dark:border-slate-700">
                      <div className="flex justify-between items-center">
                        <span>II. Nhiệm vụ đột xuất ({p2_active.dxTotal} kế hoạch)</span>
                        <button
                          onClick={() => addTable2Row('Đột xuất')}
                          className="text-xs font-semibold text-[#ba5b00] dark:text-amber-300 bg-white dark:bg-slate-800 px-2.5 py-1 rounded border border-[#ba5b00]/30 dark:border-amber-700/50 hover:bg-[#ba5b00] dark:hover:bg-amber-600 hover:text-white dark:hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Thêm kế hoạch
                        </button>
                      </div>
                    </td>
                  </tr>
                  {p2_active.dotXuat.map(row => renderTable2Row(row))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== MỤC III & IV (TRỰC TIẾP TRÊN MÀN HÌNH NHẬP LIỆU) ==================== */}
      {(isConsolidated || activeTeamCode === 'VAN_THU') && (
        <div className="space-y-6 pt-2">
          {/* MỤC III: BẢNG KIỂM TRA THỂ THỨC 6 PHÒNG */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-[#c1c6d4] dark:border-slate-800 overflow-hidden">
            <div className="bg-emerald-100 dark:bg-emerald-950/60 px-6 py-3 border-b border-[#c1c6d4] dark:border-slate-700 flex justify-between items-center">
              <h2 className="font-bold text-lg text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                <span>MỤC III: KẾT QUẢ KIỂM TRA THỂ THỨC VÀ CHÍNH TẢ CÔNG VĂN PHÁT HÀNH</span>
              </h2>
              <span className="text-xs font-bold bg-white/80 dark:bg-slate-800 px-2.5 py-1 rounded text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-slate-700">
                6 Phòng ban được kiểm tra
              </span>
            </div>

            <div className="p-4 overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-[#e6e8f0] dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-300 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-2.5 w-12 text-center">STT</th>
                    <th className="px-4 py-2.5">Tên Phòng ban</th>
                    <th className="px-4 py-2.5 text-center w-44">Tổng số VB kiểm tra</th>
                    <th className="px-4 py-2.5 text-center w-36">Số lỗi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {activeStatsList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 text-center font-bold text-slate-600 dark:text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">{item.department_name}</td>
                      <td className="px-4 py-2.5 text-center">
                        <input
                          type="number"
                          min="0"
                          disabled={isReadOnly}
                          value={item.total_checked}
                          onChange={(e) => {
                            if (!setDocInspectionStats) return;
                            const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                            const updated = [...activeStatsList];
                            updated[idx] = { ...updated[idx], total_checked: val };
                            setDocInspectionStats(updated);
                          }}
                          className="w-24 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-center font-bold text-emerald-700 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <input
                          type="number"
                          min="0"
                          disabled={isReadOnly}
                          value={item.error_count}
                          onChange={(e) => {
                            if (!setDocInspectionStats) return;
                            const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                            const updated = [...activeStatsList];
                            updated[idx] = { ...updated[idx], error_count: val };
                            setDocInspectionStats(updated);
                          }}
                          className={`w-20 bg-white dark:bg-slate-800 border rounded px-2 py-1 text-center font-bold focus:ring-2 ${
                            item.error_count > 0 ? 'border-rose-400 text-rose-600 dark:text-rose-400' : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* MỤC IV: KHÓ KHĂN & ĐỀ XUẤT KIẾN NGHỊ & 4 CHỮ KÝ */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-[#c1c6d4] dark:border-slate-800 overflow-hidden">
            <div className="bg-indigo-100 dark:bg-indigo-950/60 px-6 py-3 border-b border-[#c1c6d4] dark:border-slate-700 flex justify-between items-center">
              <h2 className="font-bold text-lg text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                <PenTool className="w-5 h-5 text-indigo-700 dark:text-indigo-400" />
                <span>MỤC IV: KHÓ KHĂN, VƯỚNG MẮC & ĐỀ XUẤT KIẾN NGHỊ & CHỮ KÝ</span>
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Nội dung Khó khăn vướng mắc */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span>IV. Nội dung Khó khăn, vướng mắc, đề xuất kiến nghị (nếu có):</span>
                </label>
                <textarea
                  rows={3}
                  disabled={isReadOnly}
                  value={metadata?.kho_khan || ''}
                  onChange={(e) => {
                    if (setMetadata) {
                      setMetadata(prev => ({ ...prev, kho_khan: e.target.value }));
                    }
                  }}
                  placeholder="- Ghi rõ các khó khăn vướng mắc phát sinh trong tuần (Ví dụ: Chuyên viên đi học, hồ sơ chưa nộp về Văn thư...)"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Lời kết báo cáo trình lãnh đạo */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span>Lời kết báo cáo (Trình Lãnh đạo phòng xem xét):</span>
                </label>
                <textarea
                  rows={2}
                  disabled={isReadOnly}
                  value={consolidatedMeta?.ending_note || 'Trên đây là báo cáo tình hình thực hiện nhiệm vụ Tuần và kế hoạch thực hiện nhiệm vụ trọng tâm công tác Tuần tiếp theo. Kính trình Lãnh đạo phòng xem xét./.'}
                  onChange={(e) => {
                    if (setConsolidatedMeta) {
                      setConsolidatedMeta(prev => ({
                        ...prev,
                        ending_note: e.target.value
                      }));
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* 4 Chữ ký phê duyệt */}
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                  <span>Ma trận 4 Chữ ký Phê duyệt (Chuẩn Nghị định 30):</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">1. Ý kiến Tổ trưởng:</label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={consolidatedMeta?.to_truong_name || 'Trần Thuận Hòa'}
                      onChange={(e) => {
                        if (setConsolidatedMeta) {
                          setConsolidatedMeta(prev => ({ ...prev, to_truong_name: e.target.value }));
                        }
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">2. Người lập báo cáo:</label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={consolidatedMeta?.nguoi_lap_name || metadata?.nguoi_lap || ''}
                      onChange={(e) => {
                        if (setConsolidatedMeta) {
                          setConsolidatedMeta(prev => ({ ...prev, nguoi_lap_name: e.target.value }));
                        }
                        if (setMetadata) {
                          setMetadata(prev => ({ ...prev, nguoi_lap: e.target.value }));
                        }
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">3. Ý kiến Phó Chánh VP:</label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={consolidatedMeta?.pho_chanh_van_phong_name || 'Nguyễn Đức Thắng'}
                      onChange={(e) => {
                        if (setConsolidatedMeta) {
                          setConsolidatedMeta(prev => ({ ...prev, pho_chanh_van_phong_name: e.target.value }));
                        }
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">4. Ý kiến Chánh VP:</label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={consolidatedMeta?.chanh_van_phong_name || 'Hoàng Văn Dương'}
                      onChange={(e) => {
                        if (setConsolidatedMeta) {
                          setConsolidatedMeta(prev => ({ ...prev, chanh_van_phong_name: e.target.value }));
                        }
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmModalConfig && (
        <ConfirmModal
          {...confirmModalConfig}
        />
      )}
    </section>
  );
};

