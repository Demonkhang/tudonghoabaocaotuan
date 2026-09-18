import React, { useState, useEffect } from 'react';
import {
  X, Plus, ShieldAlert, Clock, CheckCircle2, AlertCircle, Calendar,
  User, Send, CornerDownRight, FileText, ChevronRight, Sparkles, Filter,
  ArrowRight, Award, Upload, Check, MessageSquare, Trash2, Rocket, Eye,
  Layers, ChevronDown, Sliders, Users
} from 'lucide-react';
import {
  fetchStandaloneTasks,
  fetchAccountsByPosition,
  createStandaloneTaskApi,
  assignStandaloneTaskApi,
  stageStandaloneTaskAssigneeApi,
  unstageStandaloneTaskAssigneeApi,
  dismissStandaloneTaskFromPoolApi,
  requestTaskExtensionApi,
  completeStandaloneTaskApi,
  deleteStandaloneTaskApi,
  publishAssignmentPlanApi
} from '../services/api';

interface StandaloneTaskKanbanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAccount: any;
}

export interface PositionDef {
  key: string;
  rank: number;
  label: string;
  desc: string;
  badge: string;
  color: string;
}

export const ALL_POSITION_LEVELS: PositionDef[] = [
  { key: 'GIAM_DOC', rank: 1, label: 'Giám Đốc', desc: 'Lãnh đạo cao nhất Ban Quản lý', badge: 'bg-purple-900/80 text-purple-200 border-purple-700', color: 'border-purple-500/50 bg-purple-950/20 text-purple-300' },
  { key: 'PHO_GIAM_DOC', rank: 2, label: 'Phó Giám Đốc', desc: 'Lãnh đạo phụ trách khối/lĩnh vực', badge: 'bg-blue-900/80 text-blue-200 border-blue-700', color: 'border-blue-500/50 bg-blue-950/20 text-blue-300' },
  { key: 'TRUONG_PHONG', rank: 3, label: 'Trưởng Phòng', desc: 'Quản lý điều hành phòng ban', badge: 'bg-cyan-900/80 text-cyan-200 border-cyan-700', color: 'border-cyan-500/50 bg-cyan-950/20 text-cyan-300' },
  { key: 'PHO_PHONG', rank: 4, label: 'Phó Phòng', desc: 'Phụ trách chuyên môn kỹ thuật', badge: 'bg-emerald-900/80 text-emerald-200 border-emerald-700', color: 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300' },
  { key: 'TO_TRUONG', rank: 5, label: 'Tổ Trưởng', desc: 'Đánh giá & Quản lý nhóm', badge: 'bg-amber-900/80 text-amber-200 border-amber-700', color: 'border-amber-500/50 bg-amber-950/20 text-amber-300' },
  { key: 'CHUYEN_VIEN', rank: 6, label: 'Chuyên Viên', desc: 'Thực hiện trực tiếp nhiệm vụ', badge: 'bg-rose-900/80 text-rose-200 border-rose-700', color: 'border-rose-500/50 bg-rose-950/20 text-rose-300' },
];

export const StandaloneTaskKanbanModal: React.FC<StandaloneTaskKanbanModalProps> = ({
  isOpen,
  onClose,
  currentAccount
}) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('THUONG');
  const [newDueDate, setNewDueDate] = useState('');

  // Drop target & Assignee selection state
  const [assignModalData, setAssignModalData] = useState<{ task: any; targetPosition: string } | null>(null);
  const [candidateAssignees, setCandidateAssignees] = useState<any[]>([]);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');
  const [instructionNote, setInstructionNote] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');

  // Extension Modal
  const [extensionModalTask, setExtensionModalTask] = useState<any | null>(null);
  const [requestedDueDate, setRequestedDueDate] = useState('');
  const [extensionReason, setExtensionReason] = useState('');

  // Completion Modal
  const [completionModalTask, setCompletionModalTask] = useState<any | null>(null);
  const [completionProof, setCompletionProof] = useState('');
  const [proofFileUrl, setProofFileUrl] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  // View Tasks Modal for a specific position level
  const [viewRoleTasksPosition, setViewRoleTasksPosition] = useState<PositionDef | null>(null);

  // Drag over states
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTasks();
    }
  }, [isOpen]);

  const loadTasks = async () => {
    setLoading(true);
    const res = await fetchStandaloneTasks(currentAccount?.id);
    if (res.success) {
      setTasks(res.tasks || []);
    }
    setLoading(false);
  };

  // 1. Phân quyền lọc cấp bậc giao việc theo Thứ Cấp Tài Khoản Đăng Nhập
  const getCurrentUserRank = (): number => {
    const posKey = currentAccount?.position_level || 'CHUYEN_VIEN';
    const pos = ALL_POSITION_LEVELS.find(p => p.key === posKey);
    if (currentAccount?.role === 'ADMIN') return 0; // Admin sees all
    return pos ? pos.rank : 6;
  };

  const userRank = getCurrentUserRank();

  // Determine positions that this user can assign tasks to (ranks > userRank)
  const visibleTargetPositions = ALL_POSITION_LEVELS.filter(p => {
    if (userRank === 0) return true; // Admin sees all 6 levels
    return p.rank > userRank || (userRank === 6 && p.rank === 6);
  });

  // Actions: Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const res = await createStandaloneTaskApi({
      title: newTitle,
      description: newDesc,
      created_by: currentAccount?.id || 'acc_admin',
      priority: newPriority,
      due_date: newDueDate
    });

    if (res.success) {
      setNewTitle('');
      setNewDesc('');
      setIsCreateModalOpen(false);
      loadTasks();
    } else {
      alert(res.error || 'Lỗi khi tạo nhiệm vụ mới');
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent, zoneKey: string) => {
    e.preventDefault();
    setDragOverZone(zoneKey);
  };

  const handleDragLeave = () => {
    setDragOverZone(null);
  };

  // Drop on a Role Target Card
  const handleDropOnPosition = async (positionKey: string) => {
    setDragOverZone(null);
    if (!draggedTaskId) return;

    const task = tasks.find(t => t.id === draggedTaskId);
    setDraggedTaskId(null);
    if (!task) return;

    const res = await fetchAccountsByPosition(positionKey);
    const accounts = res.accounts || [];
    setCandidateAssignees(accounts);
    if (accounts.length > 0) {
      setSelectedAssigneeId(accounts[0].id);
    } else {
      setSelectedAssigneeId('');
    }
    setInstructionNote('');
    setAssignDueDate(task.due_date || '');
    setAssignModalData({ task, targetPosition: positionKey });
  };

  const handleConfirmAssign = async () => {
    if (!assignModalData || !selectedAssigneeId) return;

    const res = await stageStandaloneTaskAssigneeApi({
      task_id: assignModalData.task.id,
      assignee_id: selectedAssigneeId,
      position_level: assignModalData.targetPosition,
      instruction_note: instructionNote
    });

    if (res.success) {
      setAssignModalData(null);
      loadTasks();
    } else {
      alert(res.error || 'Tạm chọn người nhận việc thất bại');
    }
  };

  const handleUnstageAssignee = async (taskId: string, assigneeId: string) => {
    const res = await unstageStandaloneTaskAssigneeApi({
      task_id: taskId,
      assignee_id: assigneeId
    });

    if (res.success) {
      loadTasks();
    } else {
      alert(res.error || 'Bỏ chọn người nhận thất bại');
    }
  };

  const handleDismissPoolTask = async (taskId: string) => {
    const res = await dismissStandaloneTaskFromPoolApi(taskId);
    if (res.success) {
      loadTasks();
    } else {
      alert(res.error || 'Ẩn nhiệm vụ khỏi kho chung thất bại');
    }
  };

  const getRoleTasks = (posKey: string) => {
    return tasks.filter(t => {
      if (!t.is_dispatched) return false;
      if (t.target_position_level && t.target_position_level.split(',').includes(posKey)) return true;
      try {
        const assignees = typeof t.assigned_assignees === 'string' ? JSON.parse(t.assigned_assignees || '[]') : (t.assigned_assignees || []);
        return assignees.some((a: any) => a.position_level === posKey);
      } catch (e) {
        return false;
      }
    });
  };

  // Drop Zone 1: Extension Request
  const handleDropOnExtensionZone = () => {
    setDragOverZone(null);
    if (!draggedTaskId) return;
    const task = tasks.find(t => t.id === draggedTaskId);
    setDraggedTaskId(null);
    if (!task) return;

    setRequestedDueDate(task.due_date || '');
    setExtensionReason('');
    setExtensionModalTask(task);
  };

  const handleConfirmExtension = async () => {
    if (!extensionModalTask || !requestedDueDate || !extensionReason) {
      alert('Vui lòng điền đầy đủ ngày hạn mới và lý do gia hạn');
      return;
    }

    const res = await requestTaskExtensionApi({
      task_id: extensionModalTask.id,
      requester_id: currentAccount?.id || 'acc_admin',
      requested_due_date: requestedDueDate,
      reason: extensionReason
    });

    if (res.success) {
      setExtensionModalTask(null);
      loadTasks();
    } else {
      alert(res.error || 'Gửi đề xuất gia hạn thất bại');
    }
  };

  // Drop Zone 2: Completion
  const handleDropOnCompletionZone = () => {
    setDragOverZone(null);
    if (!draggedTaskId) return;
    const task = tasks.find(t => t.id === draggedTaskId);
    setDraggedTaskId(null);
    if (!task) return;

    setCompletionProof('');
    setProofFileUrl('');
    setCompletionModalTask(task);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload-evidence', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setProofFileUrl(data.fileUrl);
      } else {
        alert('Tải file thất bại');
      }
    } catch (err) {
      console.error('File upload err:', err);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleConfirmCompletion = async () => {
    if (!completionModalTask) return;

    const res = await completeStandaloneTaskApi({
      task_id: completionModalTask.id,
      account_id: currentAccount?.id || 'acc_admin',
      completion_proof: completionProof,
      proof_file_url: proofFileUrl
    });

    if (res.success) {
      setCompletionModalTask(null);
      loadTasks();
    } else {
      alert(res.error || 'Hoàn thành nhiệm vụ thất bại');
    }
  };

  // Drop Zone 3: Delete / Recall Task
  const handleDropOnDeleteZone = async () => {
    setDragOverZone(null);
    if (!draggedTaskId) return;
    const task = tasks.find(t => t.id === draggedTaskId);
    setDraggedTaskId(null);
    if (!task) return;

    if (!window.confirm(`XÁC NHẬN THU HỒI / XÓA NHIỆM VỤ?\n\nBạn có chắc chắn muốn xóa nhiệm vụ [${task.task_code}]: "${task.title}" khỏi kho chung?`)) {
      return;
    }

    const res = await deleteStandaloneTaskApi(task.id);
    if (res.success) {
      loadTasks();
    } else {
      alert(res.error || 'Lỗi khi xóa nhiệm vụ');
    }
  };

  // Header Action: Publish Assignment Plan
  const handlePublishPlan = async () => {
    if (!currentAccount?.id) return;
    if (!window.confirm('🚀 CHÍNH THỨC BAN HÀNH KẾ HOẠCH GIAO VIỆC?\n\nHệ thống sẽ gửi thông báo đến từng cá nhân được giao nhiệm vụ và tự động đẩy nhiệm vụ vào Kho Báo Cáo Tuần của họ!')) {
      return;
    }

    setIsPublishing(true);
    const res = await publishAssignmentPlanApi(currentAccount.id);
    setIsPublishing(false);

    if (res.success) {
      alert(`✅ BAN HÀNH THÀNH CÔNG!\n${res.message}`);
      loadTasks();
    } else {
      alert(res.error || 'Lỗi khi ban hành kế hoạch');
    }
  };

  if (!isOpen) return null;

  const unassignedTasks = tasks.filter(t => !t.is_pool_hidden && (!t.is_dispatched || t.status === 'KHO_VIEC' || !t.target_position_level));
  const pendingPublishTasks = tasks.filter(t => !t.is_dispatched && t.assigned_assignees && t.assigned_assignees !== '[]' && t.assigned_assignees !== '');

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 md:p-6 overflow-hidden">
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-7xl h-[92vh] max-h-[92vh] flex flex-col overflow-hidden text-slate-100 my-auto">
        
        {/* HEADER BAR */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
              <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold bg-gradient-to-r from-purple-300 via-indigo-200 to-cyan-200 bg-clip-text text-transparent">
                  Kho Nhiệm Vụ Chung &amp; Điều Hành Phân Cấp
                </h2>
                {currentAccount && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                    {ALL_POSITION_LEVELS.find(p => p.key === currentAccount.position_level)?.label || 'Cán bộ'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Phạm vi giao việc phân cấp: <strong className="text-purple-300">{visibleTargetPositions.map(p => p.label).join(' → ')}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePublishPlan}
              disabled={isPublishing}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-900/40 transition-all active:scale-95 cursor-pointer"
              title="Phát hành chính thức kế hoạch giao việc, phát thông báo & đẩy vào báo cáo tuần người nhận"
            >
              <Rocket className="w-4 h-4 text-emerald-100" />
              <span>
                {isPublishing 
                  ? 'Đang Ban Hành...' 
                  : `Phát Hành Kế Hoạch Giao Việc ${pendingPublishTasks.length > 0 ? `(${pendingPublishTasks.length} NV)` : ''}`}
              </span>
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium text-xs transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm NV Mới</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MAIN DASHBOARD BODY (GRID CARD LAYOUT - 100% NO HORIZONTAL SCROLL) */}
        <div className="flex-1 overflow-hidden grid grid-cols-12 gap-4 p-4 bg-slate-950/70">
          
          {/* LEFT SIDEBAR: KHO NHIỆM VỤ CHUNG (30% WIDTH - 4 COLS) */}
          <div className="col-span-12 lg:col-span-4 flex flex-col bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-3.5 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-400" />
                <h3 className="font-bold text-sm text-slate-200">Kho Nhiệm Vụ Chung</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-slate-800 text-purple-300 border border-slate-700">
                {unassignedTasks.length} Nhiệm vụ
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {unassignedTasks.length === 0 ? (
                <div className="h-40 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-xs text-slate-500 p-4 text-center">
                  <CheckCircle2 className="w-8 h-8 text-slate-700 mb-2" />
                  Hiện không có nhiệm vụ mới trong Kho Chung. Bấm nút "+ Thêm NV Mới" ở trên để khởi tạo!
                </div>
              ) : (
                unassignedTasks.map(task => {
                  let stagedAssignees: any[] = [];
                  try {
                    stagedAssignees = typeof task.assigned_assignees === 'string' 
                      ? JSON.parse(task.assigned_assignees || '[]') 
                      : (task.assigned_assignees || []);
                  } catch (e) {
                    stagedAssignees = [];
                  }

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className="p-3 bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-purple-500/50 rounded-xl shadow-md cursor-grab active:cursor-grabbing transition-all group relative"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono text-purple-400 font-bold bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/50">
                          {task.task_code}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          task.priority === 'KHAN_CAP' ? 'bg-red-950 text-red-400 border border-red-800/50' :
                          task.priority === 'KHAN' ? 'bg-amber-950 text-amber-400 border border-amber-800/50' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {task.priority === 'KHAN_CAP' ? 'Khẩn cấp' : task.priority === 'KHAN' ? 'Khẩn' : 'Thường'}
                        </span>
                      </div>

                      <h4 className="font-semibold text-xs text-slate-100 group-hover:text-purple-200 transition-colors mb-2 line-clamp-2">
                        {task.title}
                      </h4>

                      {/* MULTI-ASSIGNEE STAGING BADGE COUNTER */}
                      {stagedAssignees.length > 0 && !task.is_dispatched && (
                        <div className="mt-2 bg-indigo-950/80 border border-indigo-700/60 rounded-lg p-2 text-xs space-y-1">
                          <div className="flex items-center justify-between text-indigo-200 font-bold text-[11px]">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-indigo-400" />
                              Dự kiến giao: {stagedAssignees.length} người
                            </span>
                            <span className="text-[9px] text-amber-400 animate-pulse font-medium">(Chưa phát hành)</span>
                          </div>
                          <div className="space-y-1">
                            {stagedAssignees.map((a: any) => {
                              const posLabel = ALL_POSITION_LEVELS.find(p => p.key === a.position_level)?.label || a.position_level;
                              return (
                                <div key={a.account_id} className="flex items-center justify-between text-[11px] bg-indigo-900/50 px-2 py-0.5 rounded text-indigo-100">
                                  <span className="truncate max-w-[170px]">• {a.full_name} ({posLabel})</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUnstageAssignee(task.id, a.account_id);
                                    }}
                                    className="text-red-400 hover:text-red-200 font-bold ml-1 text-xs px-1 cursor-pointer"
                                    title="Xóa / Rút người nhận này (nếu xóa hết sẽ tự về kho)"
                                  >
                                    ✕
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* DISPATCHED / PUBLISHED TASK DISMISS BUTTON */}
                      {task.is_dispatched === 1 && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDismissPoolTask(task.id);
                            }}
                            className="w-full py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                            title="Nhiệm vụ đã phát hành xong. Bấm để ẩn / dọn dẹp khỏi Kho Chung"
                          >
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>✅ Đã Giao - Dọn Dẹp Kho</span>
                          </button>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 mt-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{task.due_date ? task.due_date : 'Chưa đặt hạn'}</span>
                        </div>
                        <span className="text-[10px] text-purple-400 font-medium">Kéo thả sang vai trò →</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT AREA: GRID ROLE TARGET CARDS (70% WIDTH - 8 COLS - NO HORIZONTAL SCROLL) */}
          <div className="col-span-12 lg:col-span-8 flex flex-col overflow-hidden">
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                Các Ô Cấp Bậc Thẩm Quyền Giao Việc ({visibleTargetPositions.length} Cấp Thụ Lý)
              </h3>
              <span className="text-[11px] text-slate-500">Kéo thẻ nhiệm vụ ở kho thả trực tiếp vào các Ô dưới đây</span>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-1">
              {visibleTargetPositions.map(pos => {
                const assignedRoleTasks = getRoleTasks(pos.key);
                const isDragOver = dragOverZone === pos.key;

                return (
                  <div
                    key={pos.key}
                    onDragOver={(e) => handleDragOver(e, pos.key)}
                    onDragLeave={handleDragLeave}
                    onDrop={() => handleDropOnPosition(pos.key)}
                    className={`flex flex-col justify-between p-4 rounded-2xl border ${pos.color} ${
                      isDragOver ? 'ring-2 ring-purple-500 bg-purple-950/40 scale-[1.02] shadow-xl shadow-purple-900/30' : ''
                    } transition-all duration-200 shadow-lg relative group overflow-hidden min-h-[170px]`}
                  >
                    {/* Header Role Card */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${pos.badge}`}>
                          Cấp [{pos.rank}]
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-slate-900/80 text-white border border-slate-700">
                          {assignedRoleTasks.length} NV
                        </span>
                      </div>

                      <h4 className="font-bold text-base text-slate-100 flex items-center gap-1.5">
                        <User className="w-4 h-4 text-purple-400" />
                        {pos.label}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{pos.desc}</p>
                    </div>

                    {/* Interactive Drop Box inside Role Card */}
                    <div className="mt-3 py-3 px-2 border-2 border-dashed border-slate-700/60 group-hover:border-purple-500/50 rounded-xl bg-slate-900/60 flex items-center justify-center text-center transition-colors">
                      <span className="text-[11px] font-medium text-slate-400 group-hover:text-purple-300">
                        📥 Thả thẻ vào đây để giao cho {pos.label}
                      </span>
                    </div>

                    {/* Footer View Tasks Button */}
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        {assignedRoleTasks.length > 0 ? `${assignedRoleTasks.length} nhiệm vụ đã giao` : 'Chưa có việc giao'}
                      </span>
                      <button
                        onClick={() => setViewRoleTasksPosition(pos)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-purple-900/60 text-purple-300 hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem ({assignedRoleTasks.length})</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* BOTTOM ACTION DROPZONES (3 ZONES) */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/95 flex flex-col md:flex-row gap-3 shrink-0">
          {/* Dropzone 1: Extension Request */}
          <div
            onDragOver={(e) => handleDragOver(e, 'EXT')}
            onDragLeave={handleDragLeave}
            onDrop={handleDropOnExtensionZone}
            className={`flex-1 border-2 border-dashed rounded-xl p-2.5 flex items-center justify-center gap-3 transition-all ${
              dragOverZone === 'EXT' 
                ? 'border-amber-500 bg-amber-950/40 scale-[1.01] shadow-lg shadow-amber-900/30 text-amber-300' 
                : 'border-amber-500/40 bg-amber-950/10 text-amber-400/80 hover:border-amber-500 hover:bg-amber-950/20'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
            <div className="text-left">
              <span className="font-bold text-xs block text-amber-300">📥 DROP ZONE 1: ĐỀ XUẤT GIA HẠN</span>
              <span className="text-[10px] text-amber-400/70">Thả thẻ vào để trình gia hạn deadline</span>
            </div>
          </div>

          {/* Dropzone 2: Complete Task */}
          <div
            onDragOver={(e) => handleDragOver(e, 'CMP')}
            onDragLeave={handleDragLeave}
            onDrop={handleDropOnCompletionZone}
            className={`flex-1 border-2 border-dashed rounded-xl p-2.5 flex items-center justify-center gap-3 transition-all ${
              dragOverZone === 'CMP' 
                ? 'border-emerald-500 bg-emerald-950/40 scale-[1.01] shadow-lg shadow-emerald-900/30 text-emerald-300' 
                : 'border-emerald-500/40 bg-emerald-950/10 text-emerald-400/80 hover:border-emerald-500 hover:bg-emerald-950/20'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce shrink-0" />
            <div className="text-left">
              <span className="font-bold text-xs block text-emerald-300">✅ DROP ZONE 2: HOÀN THÀNH NV</span>
              <span className="text-[10px] text-emerald-400/70">Thả thẻ vào để nộp báo cáo hoàn thành</span>
            </div>
          </div>

          {/* Dropzone 3: Delete / Recall Task */}
          <div
            onDragOver={(e) => handleDragOver(e, 'DEL')}
            onDragLeave={handleDragLeave}
            onDrop={handleDropOnDeleteZone}
            className={`flex-1 border-2 border-dashed rounded-xl p-2.5 flex items-center justify-center gap-3 transition-all ${
              dragOverZone === 'DEL' 
                ? 'border-rose-500 bg-rose-950/40 scale-[1.01] shadow-lg shadow-rose-900/30 text-rose-300' 
                : 'border-rose-500/40 bg-rose-950/10 text-rose-400/80 hover:border-rose-500 hover:bg-rose-950/20'
            }`}
          >
            <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
            <div className="text-left">
              <span className="font-bold text-xs block text-rose-300">🗑️ DROP ZONE 3: XÓA / THU HỒI NV</span>
              <span className="text-[10px] text-rose-400/70">Thả thẻ vào để thu hồi hoặc xóa nhiệm vụ</span>
            </div>
          </div>
        </div>

      </div>

      {/* VIEW ROLE TASKS MODAL (Popup xem danh sách việc thuộc 1 cấp bậc) */}
      {viewRoleTasksPosition && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl text-slate-100 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${viewRoleTasksPosition.badge}`}>
                  Cấp [{viewRoleTasksPosition.rank}]
                </span>
                <h3 className="text-base font-bold text-slate-100">
                  Danh sách Nhiệm vụ Giao cho {viewRoleTasksPosition.label}
                </h3>
              </div>
              <button
                onClick={() => setViewRoleTasksPosition(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto my-4 space-y-3">
              {getRoleTasks(viewRoleTasksPosition.key).length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Chưa có nhiệm vụ nào được giao cho cấp {viewRoleTasksPosition.label}.
                </div>
              ) : (
                getRoleTasks(viewRoleTasksPosition.key).map(t => {
                  let assigneesList: any[] = [];
                  try {
                    assigneesList = typeof t.assigned_assignees === 'string'
                      ? JSON.parse(t.assigned_assignees || '[]')
                      : (t.assigned_assignees || []);
                  } catch (e) {
                    assigneesList = [];
                  }
                  const matchingAssignees = assigneesList.filter(a => a.position_level === viewRoleTasksPosition.key);

                  return (
                    <div key={t.id} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-purple-400">{t.task_code}</span>
                        <span className="text-[11px] text-slate-400">Hạn: {t.due_date || 'Chưa định'}</span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-100">{t.title}</h4>

                      {matchingAssignees.length > 0 ? (
                        <div className="text-xs text-purple-300 space-y-1">
                          <p className="font-semibold text-slate-300 mb-1">👥 Nhân sự cấp {viewRoleTasksPosition.label} được giao:</p>
                          {matchingAssignees.map(a => (
                            <div key={a.account_id} className="flex items-center justify-between bg-purple-950/40 border border-purple-800/40 px-2.5 py-1 rounded-lg text-xs">
                              <span className="text-purple-200">• <strong>{a.full_name}</strong> {a.instruction_note ? `(Ghi chú: ${a.instruction_note})` : ''}</span>
                              <button
                                type="button"
                                onClick={() => handleUnstageAssignee(t.id, a.account_id)}
                                className="text-red-400 hover:text-red-200 font-bold text-[11px] ml-2 px-1.5 py-0.5 rounded bg-red-950/60 hover:bg-red-900/80 transition-colors cursor-pointer"
                                title="Rút / Xóa nhiệm vụ khỏi người này (Nếu hết người nhận sẽ tự trả về kho)"
                              >
                                ✕ Rút việc
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : t.assignee_name ? (
                        <p className="text-xs text-purple-300">
                          👤 Thụ lý: <strong>{t.assignee_name}</strong> (Giao bởi: {t.assigner_name || 'Lãnh đạo'})
                        </p>
                      ) : null}

                      {t.status && (
                        <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-xs">
                          <span className="text-slate-400">Trạng thái:</span>
                          <span className="font-bold text-emerald-400">{t.status}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setViewRoleTasksPosition(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW TASK MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-100">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-purple-300">
              <Plus className="w-5 h-5 text-purple-400" />
              Thêm Nhiệm Vụ Mới Vào Kho Chung
            </h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tên Nhiệm Vụ (*)</label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tên nhiệm vụ hoặc chỉ đạo..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Mô Tả Nhiệm Vụ / Ghi Chú</label>
                <textarea
                  rows={3}
                  placeholder="Chi tiết yêu cầu, sản phẩm đầu ra mong muốn..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mức Độ Ưu Tiên</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="THUONG">Thường</option>
                    <option value="KHAN">Khẩn</option>
                    <option value="KHAN_CAP">Khẩn cấp</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Hạn Hoàn Thành</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-purple-900/40"
                >
                  Tạo Nhiệm Vụ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGNEE SELECTOR MODAL (Bật lên khi thả thẻ vào Cột Cấp Bậc) */}
      {assignModalData && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-100">
            <h3 className="text-lg font-bold mb-2 text-indigo-300 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-400" />
              Giao Việc Cho Cấp {ALL_POSITION_LEVELS.find(c => c.key === assignModalData.targetPosition)?.label}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Nhiệm vụ: <strong className="text-slate-200">{assignModalData.task.title}</strong>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Chọn Người Thụ Lý Dự Kiến (*)
                </label>
                {candidateAssignees.length === 0 ? (
                  <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-xl text-xs text-red-300">
                    Hiện chưa có tài khoản nào thuộc cấp bậc này trong hệ thống. Hãy tạo người dùng ở trang Admin Panel.
                  </div>
                ) : (
                  <select
                    value={selectedAssigneeId}
                    onChange={(e) => setSelectedAssigneeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    {candidateAssignees.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.full_name} ({acc.username})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Hạn Hoàn Thành Cho Cấp Dưới</label>
                <input
                  type="date"
                  value={assignDueDate}
                  onChange={(e) => setAssignDueDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Ghi Chú Chỉ Đạo Kèm Theo</label>
                <textarea
                  rows={2}
                  placeholder="Nhập yêu cầu chi tiết hoặc lưu ý cho người nhận..."
                  value={instructionNote}
                  onChange={(e) => setInstructionNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-5 mt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAssignModalData(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={!selectedAssigneeId}
                onClick={handleConfirmAssign}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium shadow-lg shadow-indigo-900/40 cursor-pointer"
              >
                Xác Nhận Giao Việc
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXTENSION MODAL (Drop zone 1) */}
      {extensionModalTask && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-100">
            <h3 className="text-lg font-bold mb-2 text-amber-300 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              Đề Xuất Gia Hạn Deadline Nhiệm Vụ
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Nhiệm vụ: <strong className="text-slate-200">{extensionModalTask.title}</strong>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Hạn Hoàn Thành Mới Đề Xuất (*)
                </label>
                <input
                  type="date"
                  required
                  value={requestedDueDate}
                  onChange={(e) => setRequestedDueDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Lý Do Trình Gia Hạn (*)
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Trình bày lý do vướng mắc hoặc phát sinh cần thêm thời gian..."
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-5 mt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setExtensionModalTask(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmExtension}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-amber-900/40"
              >
                Gửi Đề Xuất Gia Hạn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETION MODAL (Drop zone 2) */}
      {completionModalTask && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-100">
            <h3 className="text-lg font-bold mb-2 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Báo Cáo Hoàn Thành Nhiệm Vụ
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Nhiệm vụ: <strong className="text-slate-200">{completionModalTask.title}</strong>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mô Tả Sản Phẩm / Kết Quả Đạt Được
                </label>
                <textarea
                  rows={3}
                  placeholder="Ghi rõ nội dung kết quả hoàn thành..."
                  value={completionProof}
                  onChange={(e) => setCompletionProof(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Đính Kèm File Minh Chứng (nếu có)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-950 file:text-emerald-300 hover:file:bg-emerald-900"
                  />
                  {uploadingFile && <span className="text-xs text-emerald-400 animate-pulse">Uploading...</span>}
                </div>
                {proofFileUrl && (
                  <p className="text-[11px] text-emerald-400 mt-1 truncate">
                    ✅ Đã tải: {proofFileUrl}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-5 mt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCompletionModalTask(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmCompletion}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-emerald-900/40"
              >
                Báo Cáo Hoàn Thành
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
