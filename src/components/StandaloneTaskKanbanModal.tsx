import React, { useState, useEffect } from 'react';
import {
  X, Plus, ShieldAlert, Clock, CheckCircle2, AlertCircle, Calendar,
  User, Send, CornerDownRight, FileText, ChevronRight, Sparkles, Filter,
  ArrowRight, Award, Upload, Check, MessageSquare, Trash2, Rocket, Eye,
  Layers, ChevronDown, Sliders, Users, FileSpreadsheet, Search, CheckSquare, Square, Trash, UserCheck
} from 'lucide-react';
import { ExcelImportModal } from './ExcelImportModal';
import {
  fetchStandaloneTasks,
  fetchAccountsByPosition,
  createStandaloneTaskApi,
  assignStandaloneTaskApi,
  stageStandaloneTaskAssigneeApi,
  bulkStageStandaloneTaskAssigneesApi,
  bulkDeleteStandaloneTasksApi,
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
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const [newPriority, setNewPriority] = useState('THUONG');
  const [newDueDate, setNewDueDate] = useState('');

  // Search & Multi-select States for Task Pool
  const [poolSearchQuery, setPoolSearchQuery] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // Bulk Assign Modal States
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [bulkTargetPosition, setBulkTargetPosition] = useState('');
  const [bulkCandidateAssignees, setBulkCandidateAssignees] = useState<any[]>([]);
  const [bulkAssigneeId, setBulkAssigneeId] = useState('');
  const [bulkInstructionNote, setBulkInstructionNote] = useState('');
  const [bulkDueDate, setBulkDueDate] = useState('');
  const [bulkAssignedDate, setBulkAssignedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Drop target & Assignee selection state
  const [assignModalData, setAssignModalData] = useState<{ taskIds: string[]; targetPosition: string } | null>(null);
  const [candidateAssignees, setCandidateAssignees] = useState<any[]>([]);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');
  const [instructionNote, setInstructionNote] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [assignedDate, setAssignedDate] = useState<string>(new Date().toISOString().split('T')[0]);

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

  // Sub-tab Navigation state
  const [activeTab, setActiveTab] = useState<'personal' | 'management'>('personal');
  const [personalSearchQuery, setPersonalSearchQuery] = useState('');

  // Drag over states
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // 1. Phân quyền lọc cấp bậc giao việc theo Thứ Cấp Tài Khoản Đăng Nhập
  const getCurrentUserRank = (): number => {
    const posKey = currentAccount?.position_level || 'CHUYEN_VIEN';
    const pos = ALL_POSITION_LEVELS.find(p => p.key === posKey);
    if (currentAccount?.role === 'ADMIN') return 0; // Admin sees all
    return pos ? pos.rank : 6;
  };

  const userRank = getCurrentUserRank();

  useEffect(() => {
    if (isOpen) {
      loadTasks();
      // Default tab: if specialist (rank 6) -> personal, else -> management
      if (userRank === 6) {
        setActiveTab('personal');
      } else {
        setActiveTab('management');
      }
    }
  }, [isOpen, currentAccount?.id, userRank]);

  const loadTasks = async () => {
    setLoading(true);
    const res = await fetchStandaloneTasks(currentAccount?.id);
    if (res.success) {
      setTasks(res.tasks || []);
    }
    setLoading(false);
  };

  // Determine positions that this user can assign tasks to (ranks > userRank STRICTLY - No same rank!)
  const visibleTargetPositions = ALL_POSITION_LEVELS.filter(p => {
    if (userRank === 0) return true; // Admin sees all 6 levels
    return p.rank > userRank; // Strictly smaller rank level (greater rank number)
  });


  // Task Pool Multi-select handlers
  const handleToggleSelectTask = (taskId: string) => {
    setSelectedTaskIds(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleToggleSelectAllPool = (filteredIds: string[]) => {
    if (filteredIds.length === 0) return;
    const isAllSelected = filteredIds.every(id => selectedTaskIds.includes(id));
    if (isAllSelected) {
      setSelectedTaskIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedTaskIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTaskIds.length === 0) return;
    if (!window.confirm(`⚠️ XÁC NHẬN XÓA HÀNG LOẠT?\n\nBạn có chắc chắn muốn xóa ${selectedTaskIds.length} nhiệm vụ đã chọn khỏi Kho Chung?`)) {
      return;
    }

    const res = await bulkDeleteStandaloneTasksApi(selectedTaskIds);
    if (res.success) {
      setSelectedTaskIds([]);
      loadTasks();
    } else {
      alert(res.error || 'Xóa hàng loạt thất bại');
    }
  };

  const handleOpenBulkAssignModal = async () => {
    if (selectedTaskIds.length === 0) return;
    const defaultPos = visibleTargetPositions[0]?.key || 'CHUYEN_VIEN';
    setBulkTargetPosition(defaultPos);
    const res = await fetchAccountsByPosition(defaultPos);
    const accounts = res.accounts || [];
    setBulkCandidateAssignees(accounts);
    setBulkAssigneeId(accounts[0]?.id || '');
    setBulkInstructionNote('');
    setBulkDueDate('');
    setBulkAssignedDate(new Date().toISOString().split('T')[0]);
    setIsBulkAssignOpen(true);
  };

  const handleBulkTargetPositionChange = async (posKey: string) => {
    setBulkTargetPosition(posKey);
    const res = await fetchAccountsByPosition(posKey);
    const accounts = res.accounts || [];
    setBulkCandidateAssignees(accounts);
    setBulkAssigneeId(accounts[0]?.id || '');
  };

  const handleConfirmBulkAssign = async () => {
    if (!bulkAssigneeId || selectedTaskIds.length === 0) return;

    const res = await bulkStageStandaloneTaskAssigneesApi({
      task_ids: selectedTaskIds,
      assignee_id: bulkAssigneeId,
      position_level: bulkTargetPosition,
      instruction_note: bulkInstructionNote,
      assigner_id: currentAccount?.id || 'acc_admin',
      assigned_date: bulkAssignedDate,
      due_date: bulkDueDate
    });

    if (res.success) {
      setIsBulkAssignOpen(false);
      setSelectedTaskIds([]);
      loadTasks();
    } else {
      alert(res.error || 'Giao việc hàng loạt thất bại');
    }
  };

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

    let targetIds: string[] = [];
    if (selectedTaskIds.includes(draggedTaskId)) {
      targetIds = [...selectedTaskIds];
    } else {
      targetIds = [draggedTaskId];
    }
    setDraggedTaskId(null);
    if (targetIds.length === 0) return;

    const res = await fetchAccountsByPosition(positionKey);
    const accounts = res.accounts || [];
    setCandidateAssignees(accounts);
    if (accounts.length > 0) {
      setSelectedAssigneeId(accounts[0].id);
    } else {
      setSelectedAssigneeId('');
    }
    setInstructionNote('');

    const firstTask = tasks.find(t => t.id === targetIds[0]);
    setAssignDueDate(firstTask?.due_date || '');
    setAssignedDate(new Date().toISOString().split('T')[0]);
    setAssignModalData({ taskIds: targetIds, targetPosition: positionKey });
  };

  const handleConfirmAssign = async () => {
    if (!assignModalData || !selectedAssigneeId || assignModalData.taskIds.length === 0) return;

    let res;
    if (assignModalData.taskIds.length === 1) {
      res = await stageStandaloneTaskAssigneeApi({
        task_id: assignModalData.taskIds[0],
        assignee_id: selectedAssigneeId,
        position_level: assignModalData.targetPosition,
        instruction_note: instructionNote,
        assigner_id: currentAccount?.id || 'acc_admin',
        assigned_date: assignedDate || new Date().toISOString().split('T')[0]
      });
    } else {
      res = await bulkStageStandaloneTaskAssigneesApi({
        task_ids: assignModalData.taskIds,
        assignee_id: selectedAssigneeId,
        position_level: assignModalData.targetPosition,
        instruction_note: instructionNote,
        assigner_id: currentAccount?.id || 'acc_admin',
        assigned_date: assignedDate || new Date().toISOString().split('T')[0],
        due_date: assignDueDate
      });
    }

    if (res.success) {
      setAssignModalData(null);
      setSelectedTaskIds([]);
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
      // Security/Scope check: Show task only if created by me, assigned by me, or if I am ADMIN
      const isMyManagementTask = currentAccount?.role === 'ADMIN' ||
        t.created_by === currentAccount?.id ||
        t.current_assigner_id === currentAccount?.id;

      let isAssignedByMeInStaging = false;
      try {
        const assignees = typeof t.assigned_assignees === 'string' ? JSON.parse(t.assigned_assignees || '[]') : (t.assigned_assignees || []);
        isAssignedByMeInStaging = assignees.some((a: any) => a.assigner_id === currentAccount?.id);
      } catch (e) {
        isAssignedByMeInStaging = false;
      }

      if (!isMyManagementTask && !isAssignedByMeInStaging) {
        return false;
      }

      if (t.target_position_level && t.target_position_level.split(',').includes(posKey)) return true;
      try {
        const assignees = typeof t.assigned_assignees === 'string' ? JSON.parse(t.assigned_assignees || '[]') : (t.assigned_assignees || []);
        return assignees.some((a: any) => a.position_level === posKey);
      } catch (e) {
        return false;
      }
    });
  };


  const getRoleTasksPendingCount = (posKey: string) => {
    return getRoleTasks(posKey).filter(t => !t.is_dispatched).length;
  };

  const getRoleTasksDispatchedCount = (posKey: string) => {
    return getRoleTasks(posKey).filter(t => t.is_dispatched === 1).length;
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

  const unassignedTasks = tasks.filter(t => {
    if (t.is_pool_hidden) return false;
    const isPoolTask = (!t.is_dispatched || t.status === 'KHO_VIEC' || !t.target_position_level);
    if (!isPoolTask) return false;
    if (currentAccount?.role === 'ADMIN') return true;
    return t.created_by === currentAccount?.id || t.current_assigner_id === currentAccount?.id;
  });

  const pendingPublishTasks = tasks.filter(t => {
    if (t.is_dispatched) return false;
    if (!t.assigned_assignees || t.assigned_assignees === '[]' || t.assigned_assignees === '') return false;
    if (currentAccount?.role === 'ADMIN') return true;
    if (t.created_by === currentAccount?.id || t.current_assigner_id === currentAccount?.id) return true;
    try {
      const assignees = typeof t.assigned_assignees === 'string' ? JSON.parse(t.assigned_assignees || '[]') : (t.assigned_assignees || []);
      return assignees.some((a: any) => a.assigner_id === currentAccount?.id);
    } catch (e) {
      return false;
    }
  });


  const filteredUnassignedTasks = unassignedTasks.filter(t => {
    if (!poolSearchQuery.trim()) return true;
    const q = poolSearchQuery.toLowerCase();
    return (
      (t.title && t.title.toLowerCase().includes(q)) ||
      (t.task_code && t.task_code.toLowerCase().includes(q)) ||
      (t.priority && t.priority.toLowerCase().includes(q))
    );
  });

  const personalTasks = tasks.filter(t => {
    if (!currentAccount?.id) return false;
    if (t.current_assignee_id === currentAccount.id) return true;
    try {
      const assignees = typeof t.assigned_assignees === 'string' ? JSON.parse(t.assigned_assignees || '[]') : (t.assigned_assignees || []);
      return assignees.some((a: any) => a.account_id === currentAccount.id);
    } catch (e) {
      return false;
    }
  });

  const filteredPersonalTasks = personalTasks.filter(t => {
    if (!personalSearchQuery.trim()) return true;
    const q = personalSearchQuery.toLowerCase();
    return (
      (t.title && t.title.toLowerCase().includes(q)) ||
      (t.task_code && t.task_code.toLowerCase().includes(q)) ||
      (t.priority && t.priority.toLowerCase().includes(q))
    );
  });

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
                Phạm vi giao việc phân cấp: <strong className="text-purple-300">{visibleTargetPositions.length > 0 ? visibleTargetPositions.map(p => p.label).join(' → ') : 'Không có cấp dưới để giao việc'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'management' && (
              <button
                onClick={handlePublishPlan}
                disabled={isPublishing || pendingPublishTasks.length === 0}
                className={`flex items-center gap-2 px-4 py-2 text-white rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  pendingPublishTasks.length > 0 
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-900/40 active:scale-95' 
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                }`}
                title="Phát hành chính thức kế hoạch giao việc, phát thông báo & đẩy vào báo cáo tuần người nhận"
              >
                <Rocket className="w-4 h-4 text-emerald-100" />
                <span>
                  {isPublishing 
                    ? 'Đang Ban Hành...' 
                    : `Phát Hành Kế Hoạch Giao Việc ${pendingPublishTasks.length > 0 ? `(${pendingPublishTasks.length} NV)` : ''}`}
                </span>
              </button>
            )}

            <button
              onClick={() => setIsExcelImportOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white rounded-xl font-medium text-xs transition-all shadow-md cursor-pointer border border-teal-500/30"
              title="Nhập hàng loạt nhiệm vụ từ File Excel Sổ Văn Bản Đến"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-100" />
              <span>Import Excel</span>
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

        {/* SUB-TAB NAVIGATION BAR */}
        <div className="px-6 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('personal')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'personal'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/40 border border-purple-500/50'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <User className="w-4 h-4 text-purple-300" />
              <span>📥 Kho Nhiệm Vụ Cá Nhân ({personalTasks.length})</span>
              {personalTasks.filter(t => t.status !== 'DA_HOAN_THANH').length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-slate-950">
                  {personalTasks.filter(t => t.status !== 'DA_HOAN_THANH').length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('management')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'management'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-900/40 border border-indigo-500/50'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Sliders className="w-4 h-4 text-indigo-300" />
              <span>🚀 Điều Hành Giao Việc (Cho Cấp Dưới)</span>
              {pendingPublishTasks.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-slate-950 animate-pulse">
                  {pendingPublishTasks.length} chờ ban hành
                </span>
              )}
            </button>
          </div>

          <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-2">
            <span>Tài khoản: <strong className="text-purple-300">{currentAccount?.full_name || 'Cán bộ'}</strong></span>
            <span>•</span>
            <span>Cấp bậc: <strong className="text-purple-300">{ALL_POSITION_LEVELS.find(p => p.key === currentAccount?.position_level)?.label || 'Chuyên Viên'}</strong></span>
          </div>
        </div>

        {/* MAIN BODY AREA */}
        {activeTab === 'personal' ? (
          /* TAB 1: KHO NHIỆM VỤ CÁ NHÂN */
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950/70 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 p-3.5 border border-slate-800 rounded-xl shadow-md">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-sm text-slate-100">Danh Sách Nhiệm Vụ Được Giao Thụ Lý</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-purple-300 border border-slate-700">
                  {filteredPersonalTasks.length}/{personalTasks.length} Nhiệm vụ
                </span>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm mã NV, tiêu đề, độ khẩn..."
                  value={personalSearchQuery}
                  onChange={(e) => setPersonalSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {filteredPersonalTasks.length === 0 ? (
              <div className="h-64 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-xs text-slate-500 p-6 text-center">
                <CheckCircle2 className="w-10 h-10 text-slate-700 mb-3" />
                <h4 className="font-bold text-sm text-slate-300 mb-1">Chưa có nhiệm vụ cá nhân nào</h4>
                <p className="text-xs text-slate-500">Các nhiệm vụ do cấp trên phát hành giao cho bạn sẽ tự động xuất hiện tại đây.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPersonalTasks.map(task => {
                  const isCompleted = task.status === 'DA_HOAN_THANH';
                  return (
                    <div
                      key={task.id}
                      className={`p-4 rounded-2xl border flex flex-col justify-between transition-all shadow-lg ${
                        isCompleted
                          ? 'bg-slate-900/50 border-emerald-900/50 opacity-90'
                          : 'bg-slate-900 border-slate-800 hover:border-purple-500/50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono font-bold text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/50">
                            {task.task_code}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                              task.priority === 'KHAN_CAP' ? 'bg-red-950 text-red-400 border border-red-800/50' :
                              task.priority === 'KHAN' ? 'bg-amber-950 text-amber-400 border border-amber-800/50' :
                              'bg-slate-800 text-slate-400'
                            }`}>
                              {task.priority === 'KHAN_CAP' ? 'Khẩn cấp' : task.priority === 'KHAN' ? 'Khẩn' : 'Thường'}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              isCompleted ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' :
                              'bg-indigo-950 text-indigo-300 border border-indigo-800/60'
                            }`}>
                              {isCompleted ? 'Đã hoàn thành' : 'Đang thực hiện'}
                            </span>
                          </div>
                        </div>

                        <h4 className="font-bold text-sm text-slate-100 mb-1.5 line-clamp-2">
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-xs text-slate-400 mb-3 line-clamp-3 bg-slate-950/50 p-2 rounded-lg border border-slate-800/60">
                            {task.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="truncate">Giao bởi: <strong className="text-slate-200">{task.assigner_name || 'Lãnh đạo'}</strong></span>
                          <div className="flex items-center gap-1 text-slate-400">
                            <Calendar className="w-3.5 h-3.5 text-purple-400" />
                            <span>{task.due_date || 'Chưa đặt hạn'}</span>
                          </div>
                        </div>

                        {task.completion_proof && (
                          <div className="text-[11px] bg-emerald-950/40 border border-emerald-800/40 p-2 rounded-lg text-emerald-300">
                            <strong>Sản phẩm/Minh chứng:</strong> {task.completion_proof}
                          </div>
                        )}

                        {!isCompleted ? (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setCompletionProof('');
                                setProofFileUrl('');
                                setCompletionModalTask(task);
                              }}
                              className="flex-1 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4 text-white" />
                              <span>Báo Cáo Hoàn Thành</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRequestedDueDate(task.due_date || '');
                                setExtensionReason('');
                                setExtensionModalTask(task);
                              }}
                              className="px-3 py-1.5 bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-700/50 rounded-xl text-xs font-semibold cursor-pointer"
                              title="Xin gia hạn thời hạn nhiệm vụ"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="py-1.5 bg-emerald-950/60 border border-emerald-700/50 rounded-xl text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5">
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>Đã hoàn thành & Đồng bộ</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* TAB 2: MANAGEMENT DASHBOARD (ĐIỀU HÀNH GIAO VIỆC) */
          visibleTargetPositions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950/70">
              <div className="w-16 h-16 rounded-2xl bg-purple-950/80 border border-purple-800/50 flex items-center justify-center mb-4 shadow-xl">
                <ShieldAlert className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-base font-bold text-slate-200 mb-2">Tài Khoản Chuyên Viên (Cấp 6) Là Cấp Thực Thi Trực Tiếp</h3>
              <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
                Theo quy định phân cấp thẩm quyền, Chuyên Viên không thể giao việc cho Chuyên Viên khác (không giao cùng cấp). 
                Vui lòng chuyển sang <strong className="text-purple-300 font-semibold">"Kho Nhiệm Vụ Cá Nhân"</strong> ở tab trên để theo dõi các công việc được giao.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('personal')}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-900/40 transition-all cursor-pointer flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                <span>Chuyển sang Kho Nhiệm Vụ Cá Nhân</span>
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden grid grid-cols-12 gap-4 p-4 bg-slate-950/70">
              
              {/* LEFT SIDEBAR: KHO NHIỆM VỤ CHUNG (30% WIDTH - 4 COLS) */}
              <div className="col-span-12 lg:col-span-4 flex flex-col bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-3 border-b border-slate-800 bg-slate-900 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-slate-400" />
                      <h3 className="font-bold text-sm text-slate-200">Kho Nhiệm Vụ Chung</h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-slate-800 text-purple-300 border border-slate-700">
                      {filteredUnassignedTasks.length}/{unassignedTasks.length} Nhiệm vụ
                    </span>
                  </div>

                  {/* SEARCH BAR */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm mã NV, tiêu đề, độ khẩn..."
                      value={poolSearchQuery}
                      onChange={(e) => setPoolSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                    />
                    {poolSearchQuery && (
                      <button
                        onClick={() => setPoolSearchQuery('')}
                        className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-200 text-xs font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* MULTI-SELECT & BULK ACTION BAR */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => handleToggleSelectAllPool(filteredUnassignedTasks.map(t => t.id))}
                      className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-purple-300 cursor-pointer font-medium"
                    >
                      {filteredUnassignedTasks.length > 0 && filteredUnassignedTasks.every(t => selectedTaskIds.includes(t.id)) ? (
                        <CheckSquare className="w-4 h-4 text-purple-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500" />
                      )}
                      <span>Chọn Tất Cả ({selectedTaskIds.length})</span>
                    </button>

                    {selectedTaskIds.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleOpenBulkAssignModal}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow cursor-pointer"
                          title="Giao tất cả nhiệm vụ đã chọn"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Giao ({selectedTaskIds.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleBulkDelete}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow cursor-pointer"
                          title="Xóa tất cả nhiệm vụ đã chọn"
                        >
                          <Trash className="w-3.5 h-3.5" />
                          <span>Xóa ({selectedTaskIds.length})</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {filteredUnassignedTasks.length === 0 ? (
                    <div className="h-40 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-xs text-slate-500 p-4 text-center">
                      <CheckCircle2 className="w-8 h-8 text-slate-700 mb-2" />
                      {poolSearchQuery ? 'Không tìm thấy nhiệm vụ nào khớp với từ khóa tìm kiếm' : 'Hiện không có nhiệm vụ mới trong Kho Chung. Bấm nút "+ Thêm NV Mới" ở trên để khởi tạo!'}
                    </div>
                  ) : (
                    filteredUnassignedTasks.map(task => {
                      let stagedAssignees: any[] = [];
                      try {
                        stagedAssignees = typeof task.assigned_assignees === 'string' 
                          ? JSON.parse(task.assigned_assignees || '[]') 
                          : (task.assigned_assignees || []);
                      } catch (e) {
                        stagedAssignees = [];
                      }
                      const isSelected = selectedTaskIds.includes(task.id);

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          className={`p-3 bg-slate-900 hover:bg-slate-800/90 border rounded-xl shadow-md cursor-grab active:cursor-grabbing transition-all group relative ${
                            isSelected ? 'border-purple-500 bg-purple-950/20' : 'border-slate-800 hover:border-purple-500/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleToggleSelectTask(task.id);
                                }}
                                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500 cursor-pointer shrink-0"
                              />
                              <span className="text-[10px] font-mono text-purple-400 font-bold bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/50">
                                {task.task_code}
                              </span>
                            </div>
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
                                    <div key={a.account_id} className="flex flex-col text-[11px] bg-indigo-900/50 px-2 py-1 rounded text-indigo-100">
                                      <div className="flex items-center justify-between font-semibold">
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
                                      <div className="text-[9px] text-indigo-300/80 flex items-center gap-2 mt-0.5">
                                        <span>Giao bởi: <strong>{a.assigner_name || 'Lãnh đạo'}</strong></span>
                                        {a.assigned_date && <span>• Ngày giao: {a.assigned_date}</span>}
                                      </div>
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
                    const pendingCount = getRoleTasksPendingCount(pos.key);
                    const dispatchedCount = getRoleTasksDispatchedCount(pos.key);
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
                            <div className="flex items-center gap-1">
                              {pendingCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-slate-950 animate-pulse">
                                  {pendingCount} chờ phát hành
                                </span>
                              )}
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-slate-900/80 text-white border border-slate-700">
                                {assignedRoleTasks.length} NV
                              </span>
                            </div>
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
                            {assignedRoleTasks.length > 0 
                              ? `${dispatchedCount} đã giao ${pendingCount > 0 ? `(${pendingCount} chờ ban hành)` : ''}` 
                              : 'Chưa có việc giao'}
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
          )
        )}

        {/* BOTTOM ACTION DROPZONES (3 ZONES) - ONLY FOR MANAGEMENT TAB */}
        {activeTab === 'management' && visibleTargetPositions.length > 0 && (
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
        )}


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
                            <div key={a.account_id} className="flex flex-col bg-purple-950/40 border border-purple-800/40 px-2.5 py-1.5 rounded-lg text-xs space-y-0.5">
                              <div className="flex items-center justify-between">
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
                              <div className="text-[10px] text-purple-300/80 flex items-center gap-3">
                                <span>👤 Người giao: <strong>{a.assigner_name || 'Lãnh đạo'}</strong></span>
                                {a.assigned_date && <span>📅 Ngày giao: <strong>{a.assigned_date}</strong></span>}
                              </div>
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
              {assignModalData.taskIds && assignModalData.taskIds.length > 1 ? (
                <span>Đang chọn <strong className="text-purple-300 font-bold">{assignModalData.taskIds.length} nhiệm vụ</strong> để giao đồng thời</span>
              ) : (
                <span>Nhiệm vụ: <strong className="text-slate-200">{tasks.find(t => t.id === assignModalData.taskIds?.[0])?.title || 'Nhiệm vụ đã chọn'}</strong></span>
              )}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Ngày Giao Việc (*)</label>
                  <input
                    type="date"
                    required
                    value={assignedDate}
                    onChange={(e) => setAssignedDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Hạn Hoàn Thành</label>
                  <input
                    type="date"
                    value={assignDueDate}
                    onChange={(e) => setAssignDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
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

      {/* BULK ASSIGN MODAL */}
      {isBulkAssignOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-100">
            <h3 className="text-lg font-bold mb-2 text-indigo-300 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-400" />
              Giao Việc Hàng Loạt ({selectedTaskIds.length} Nhiệm Vụ)
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Bạn đang thực hiện giao <strong className="text-indigo-300 font-bold">{selectedTaskIds.length} nhiệm vụ</strong> đã chọn cho một nhân sự.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Chọn Cấp Bậc Thụ Lý (*)
                </label>
                <select
                  value={bulkTargetPosition}
                  onChange={(e) => handleBulkTargetPositionChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  {visibleTargetPositions.map(pos => (
                    <option key={pos.key} value={pos.key}>
                      Cấp [{pos.rank}] - {pos.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Chọn Người Thụ Lý (*)
                </label>
                {bulkCandidateAssignees.length === 0 ? (
                  <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-xl text-xs text-red-300">
                    Chưa có tài khoản thuộc cấp bậc này.
                  </div>
                ) : (
                  <select
                    value={bulkAssigneeId}
                    onChange={(e) => setBulkAssigneeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    {bulkCandidateAssignees.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.full_name} ({acc.username})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Ngày Giao Việc (*)</label>
                  <input
                    type="date"
                    required
                    value={bulkAssignedDate}
                    onChange={(e) => setBulkAssignedDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Hạn Hoàn Thành Đồng Loạt</label>
                  <input
                    type="date"
                    value={bulkDueDate}
                    onChange={(e) => setBulkDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Ghi Chú Chỉ Đạo Kèm Theo</label>
                <textarea
                  rows={2}
                  placeholder="Yêu cầu hoặc lưu ý chung cho tất cả các nhiệm vụ..."
                  value={bulkInstructionNote}
                  onChange={(e) => setBulkInstructionNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-5 mt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsBulkAssignOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={!bulkAssigneeId}
                onClick={handleConfirmBulkAssign}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium shadow-lg shadow-indigo-900/40 cursor-pointer"
              >
                Xác Nhận Giao {selectedTaskIds.length} NV
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

      {/* EXCEL IMPORT MODAL */}
      <ExcelImportModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        currentAccount={currentAccount}
        onImportSuccess={loadTasks}
        existingTasks={tasks}
      />

    </div>
  );
};

