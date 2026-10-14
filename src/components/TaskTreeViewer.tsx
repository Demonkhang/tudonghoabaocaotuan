import React, { useState } from 'react';
import {
  GitFork,
  ChevronDown,
  ChevronRight,
  User,
  Clock,
  Sparkles,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowDown,
  Eye,
  X,
  FileText,
  Crown,
  Search,
  Check,
  Building2,
  Filter,
  UserCheck,
  ArrowRight,
  CornerDownRight,
  Zap,
  Activity,
  ArrowDownRight,
  CheckSquare,
  Globe
} from 'lucide-react';
import { ALL_POSITION_LEVELS, PositionDef } from './StandaloneTaskKanbanModal';
import { parseDocumentMeta, DocumentMetaBadges, decodeHtmlEntities } from './DocumentMetaBadges';

interface DelegationBranchInfo {
  branchKey: string;
  fromPos: PositionDef;
  toPos: PositionDef;
  tasks: any[];
}

interface TaskTreeViewerProps {
  tasks: any[];
  currentAccount: any;
  onSelectTask?: (task: any) => void;
}

export const TaskTreeViewer: React.FC<TaskTreeViewerProps> = ({
  tasks,
  currentAccount,
  onSelectTask
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'PERSONAL'>('ALL');
  const [activeBranch, setActiveBranch] = useState<DelegationBranchInfo | null>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  // Helper to check if a task is directly related to current logged in user (Cá nhân)
  const isTaskRelatedToUser = (t: any, acc: any): boolean => {
    if (!acc) return true;
    const accId = String(acc.id || '');
    const accName = (acc.full_name || '').toLowerCase().trim();

    // 1. Direct creator check
    if (t.creator_id && String(t.creator_id) === accId) return true;
    if (t.created_by && String(t.created_by) === accId) return true;
    if (t.creator_name && t.creator_name.toLowerCase().includes(accName)) return true;

    // 2. Direct current assignee / assigner check
    if (t.current_assignee_id && String(t.current_assignee_id) === accId) return true;
    if (t.current_assigner_id && String(t.current_assigner_id) === accId) return true;
    if (t.assignee_name && t.assignee_name.toLowerCase().includes(accName)) return true;
    if (t.assigner_name && t.assigner_name.toLowerCase().includes(accName)) return true;

    // 3. Staged assignees check
    let stagedAssignees: any[] = [];
    try {
      stagedAssignees = typeof t.assigned_assignees === 'string'
        ? JSON.parse(t.assigned_assignees || '[]')
        : (t.assigned_assignees || []);
    } catch {
      stagedAssignees = [];
    }

    if (stagedAssignees.some((a: any) =>
      (a.account_id && String(a.account_id) === accId) ||
      (a.id && String(a.id) === accId) ||
      (a.assigner_id && String(a.assigner_id) === accId) ||
      (a.full_name && a.full_name.toLowerCase().includes(accName)) ||
      (a.assigner_name && a.assigner_name.toLowerCase().includes(accName))
    )) {
      return true;
    }

    // 4. Audit Trail History steps check
    const historySteps: any[] = Array.isArray(t.history) ? t.history : [];
    if (historySteps.some((h: any) =>
      (h.assignee_id && String(h.assignee_id) === accId) ||
      (h.assigner_id && String(h.assigner_id) === accId) ||
      (h.assignee_name && h.assignee_name.toLowerCase().includes(accName)) ||
      (h.assigner_name && h.assigner_name.toLowerCase().includes(accName))
    )) {
      return true;
    }

    return false;
  };

  // Group tasks into direct delegation branches (fromPosition -> toPosition)
  const buildDelegationBranches = (): DelegationBranchInfo[] => {
    const branchMap: Record<string, { fromKey: string; toKey: string; tasksSet: Set<any> }> = {};

    const targetTasks = filterMode === 'PERSONAL'
      ? tasks.filter(t => isTaskRelatedToUser(t, currentAccount))
      : tasks;

    targetTasks.forEach(t => {
      let stagedAssignees: any[] = [];
      try {
        stagedAssignees = typeof t.assigned_assignees === 'string'
          ? JSON.parse(t.assigned_assignees || '[]')
          : (t.assigned_assignees || []);
      } catch {
        stagedAssignees = [];
      }

      const historySteps: any[] = Array.isArray(t.history) ? t.history : [];
      const creatorPos = t.created_by_position || 'GIAM_DOC';

      // 1. Audit Trail History steps
      historySteps.forEach(h => {
        const fromKey = h.from_position_level || creatorPos;
        const toKey = h.position_level || h.to_position_level || 'CHUYEN_VIEN';
        const key = `${fromKey}_TO_${toKey}`;
        if (!branchMap[key]) {
          branchMap[key] = { fromKey, toKey, tasksSet: new Set() };
        }
        branchMap[key].tasksSet.add(t);
      });

      // 2. Staged assignees steps
      stagedAssignees.forEach(a => {
        const fromKey = a.assigner_position || creatorPos;
        const toKey = a.position_level || 'CHUYEN_VIEN';
        const key = `${fromKey}_TO_${toKey}`;
        if (!branchMap[key]) {
          branchMap[key] = { fromKey, toKey, tasksSet: new Set() };
        }
        branchMap[key].tasksSet.add(t);
      });

      // 3. Direct task assignment fallback
      if (historySteps.length === 0 && stagedAssignees.length === 0 && t.target_position_level) {
        const toKey = t.target_position_level;
        const key = `${creatorPos}_TO_${toKey}`;
        if (!branchMap[key]) {
          branchMap[key] = { fromKey: creatorPos, toKey, tasksSet: new Set() };
        }
        branchMap[key].tasksSet.add(t);
      }
    });

    const result: DelegationBranchInfo[] = [];
    Object.keys(branchMap).forEach(key => {
      const { fromKey, toKey, tasksSet } = branchMap[key];
      const fromPos = ALL_POSITION_LEVELS.find(p => p.key === fromKey) || ALL_POSITION_LEVELS[0];
      const toPos = ALL_POSITION_LEVELS.find(p => p.key === toKey) || ALL_POSITION_LEVELS[5];

      result.push({
        branchKey: key,
        fromPos,
        toPos,
        tasks: Array.from(tasksSet)
      });
    });

    return result;
  };

  const allBranches = buildDelegationBranches();

  // Filter tasks in active branch by search query & filterMode
  const filteredActiveBranchTasks = activeBranch ? activeBranch.tasks.filter(t => {
    if (filterMode === 'PERSONAL' && !isTaskRelatedToUser(t, currentAccount)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (t.title && t.title.toLowerCase().includes(q)) ||
      (t.task_code && t.task_code.toLowerCase().includes(q)) ||
      (t.description && t.description.toLowerCase().includes(q))
    );
  }) : [];

  // Helper to extract full routing lifecycle steps for selectedTask
  const buildTaskLifecycle = (task: any) => {
    if (!task) return [];
    const steps: Array<{
      stepNumber: number;
      roleKey: string;
      roleLabel: string;
      assignerName: string;
      assigneeName: string;
      instructionNote: string;
      assignedDate: string;
      dueDate: string;
      isCompleted: boolean;
    }> = [];

    // Step 0: Creator Root Node
    const rootPosKey = task.created_by_position || 'GIAM_DOC';
    const rootPosLabel = ALL_POSITION_LEVELS.find(p => p.key === rootPosKey)?.label || 'Ban Lãnh Đạo';
    steps.push({
      stepNumber: 1,
      roleKey: rootPosKey,
      roleLabel: rootPosLabel,
      assignerName: task.creator_name || 'Văn thư / Ban Lãnh Đạo',
      assigneeName: 'Kho Nhiệm Vụ Phân Cấp',
      instructionNote: task.instruction_note || 'Khởi tạo & Ban hành chỉ đạo thực hiện',
      assignedDate: task.created_at ? new Date(task.created_at).toLocaleDateString('vi-VN') : 'Mới tạo',
      dueDate: task.due_date || 'Chưa định',
      isCompleted: task.status === 'DA_HOAN_THANH'
    });

    // History steps
    const historySteps: any[] = Array.isArray(task.history) ? task.history : [];
    historySteps.forEach((h: any) => {
      const posLabel = ALL_POSITION_LEVELS.find(p => p.key === h.position_level)?.label || h.position_level || 'Cán bộ thụ lý';
      steps.push({
        stepNumber: steps.length + 1,
        roleKey: h.position_level || 'CHUYEN_VIEN',
        roleLabel: posLabel,
        assignerName: h.assigner_name || 'Cấp trên',
        assigneeName: h.assignee_name || 'Cấp dưới',
        instructionNote: h.instruction_note || 'Phân công chỉ đạo thực hiện',
        assignedDate: h.assigned_at ? new Date(h.assigned_at).toLocaleDateString('vi-VN') : '',
        dueDate: h.due_date || task.due_date,
        isCompleted: task.status === 'DA_HOAN_THANH'
      });
    });

    // Staged assignees steps
    let stagedAssignees: any[] = [];
    try {
      stagedAssignees = typeof task.assigned_assignees === 'string'
        ? JSON.parse(task.assigned_assignees || '[]')
        : (task.assigned_assignees || []);
    } catch {
      stagedAssignees = [];
    }

    stagedAssignees.forEach((a: any) => {
      const posLabel = ALL_POSITION_LEVELS.find(p => p.key === a.position_level)?.label || a.position_level || 'Cán bộ thụ lý';
      const alreadyAdded = steps.some(s => s.assigneeName === a.full_name && s.roleKey === a.position_level);
      if (!alreadyAdded) {
        steps.push({
          stepNumber: steps.length + 1,
          roleKey: a.position_level || 'CHUYEN_VIEN',
          roleLabel: posLabel,
          assignerName: a.assigner_name || 'Lãnh đạo',
          assigneeName: a.full_name || 'Người nhận',
          instructionNote: a.instruction_note || 'Theo dõi & thực hiện nhiệm vụ',
          assignedDate: a.assigned_date || '',
          dueDate: a.due_date || task.due_date,
          isCompleted: task.status === 'DA_HOAN_THANH'
        });
      }
    });

    return steps;
  };

  // Map of positions for flow diagram placement
  const posMap: Record<string, PositionDef> = {
    GIAM_DOC: ALL_POSITION_LEVELS[0],
    PHO_GIAM_DOC: ALL_POSITION_LEVELS[1],
    TRUONG_PHONG: ALL_POSITION_LEVELS[2],
    PHO_PHONG: ALL_POSITION_LEVELS[3],
    TO_TRUONG: ALL_POSITION_LEVELS[4],
    CHUYEN_VIEN: ALL_POSITION_LEVELS[5],
  };

  const ALL_CONNECTIONS = [
    // 1. GIÁM ĐỐC (Cấp 1) -> Subordinates
    { key: 'GIAM_DOC_TO_PHO_GIAM_DOC', fromKey: 'GIAM_DOC', toKey: 'PHO_GIAM_DOC', fromLabel: 'Giám đốc', toLabel: 'Phó giám đốc', pathD: 'M 400 92 L 400 140', midX: 400, midY: 116 },
    { key: 'GIAM_DOC_TO_TRUONG_PHONG', fromKey: 'GIAM_DOC', toKey: 'TRUONG_PHONG', fromLabel: 'Giám đốc', toLabel: 'Trưởng phòng', pathD: 'M 300 85 Q 220 150 220 270', midX: 250, midY: 175 },
    { key: 'GIAM_DOC_TO_PHO_PHONG', fromKey: 'GIAM_DOC', toKey: 'PHO_PHONG', fromLabel: 'Giám đốc', toLabel: 'Phó phòng', pathD: 'M 500 85 Q 580 150 580 270', midX: 550, midY: 175 },
    { key: 'GIAM_DOC_TO_TO_TRUONG', fromKey: 'GIAM_DOC', toKey: 'TO_TRUONG', fromLabel: 'Giám đốc', toLabel: 'Tổ trưởng', pathD: 'M 280 65 C 90 150, 90 350, 280 420', midX: 140, midY: 240 },
    { key: 'GIAM_DOC_TO_CHUYEN_VIEN', fromKey: 'GIAM_DOC', toKey: 'CHUYEN_VIEN', fromLabel: 'Giám đốc', toLabel: 'Chuyên viên', pathD: 'M 520 65 C 710 180, 710 450, 520 550', midX: 660, midY: 300 },

    // 2. PHÓ GIÁM ĐỐC (Cấp 2) -> Subordinates
    { key: 'PHO_GIAM_DOC_TO_TRUONG_PHONG', fromKey: 'PHO_GIAM_DOC', toKey: 'TRUONG_PHONG', fromLabel: 'Phó giám đốc', toLabel: 'Trưởng phòng', pathD: 'M 300 205 Q 240 230 240 270', midX: 260, midY: 235 },
    { key: 'PHO_GIAM_DOC_TO_PHO_PHONG', fromKey: 'PHO_GIAM_DOC', toKey: 'PHO_PHONG', fromLabel: 'Phó giám đốc', toLabel: 'Phó phòng', pathD: 'M 500 205 Q 560 230 560 270', midX: 540, midY: 235 },
    { key: 'PHO_GIAM_DOC_TO_TO_TRUONG', fromKey: 'PHO_GIAM_DOC', toKey: 'TO_TRUONG', fromLabel: 'Phó giám đốc', toLabel: 'Tổ trưởng', pathD: 'M 360 212 C 330 270, 330 340, 360 400', midX: 340, midY: 306 },
    { key: 'PHO_GIAM_DOC_TO_CHUYEN_VIEN', fromKey: 'PHO_GIAM_DOC', toKey: 'CHUYEN_VIEN', fromLabel: 'Phó giám đốc', toLabel: 'Chuyên viên', pathD: 'M 440 212 C 470 300, 470 440, 440 530', midX: 460, midY: 370 },

    // 3. TRƯỞNG PHÒNG (Cấp 3) -> Subordinates & Phó phòng
    { key: 'TRUONG_PHONG_TO_PHO_PHONG', fromKey: 'TRUONG_PHONG', toKey: 'PHO_PHONG', fromLabel: 'Trưởng phòng', toLabel: 'Phó phòng', pathD: 'M 300 306 Q 400 290 500 306', midX: 400, midY: 292 },
    { key: 'TRUONG_PHONG_TO_TO_TRUONG', fromKey: 'TRUONG_PHONG', toKey: 'TO_TRUONG', fromLabel: 'Trưởng phòng', toLabel: 'Tổ trưởng', pathD: 'M 250 342 Q 280 380 300 400', midX: 275, midY: 370 },
    { key: 'TRUONG_PHONG_TO_CHUYEN_VIEN', fromKey: 'TRUONG_PHONG', toKey: 'CHUYEN_VIEN', fromLabel: 'Trưởng phòng', toLabel: 'Chuyên viên', pathD: 'M 180 342 C 150 440, 210 520, 300 550', midX: 200, midY: 450 },

    // 4. PHÓ PHÒNG (Cấp 4) -> Subordinates
    { key: 'PHO_PHONG_TO_TO_TRUONG', fromKey: 'PHO_PHONG', toKey: 'TO_TRUONG', fromLabel: 'Phó phòng', toLabel: 'Tổ trưởng', pathD: 'M 550 342 Q 520 380 500 400', midX: 525, midY: 370 },
    { key: 'PHO_PHONG_TO_CHUYEN_VIEN', fromKey: 'PHO_PHONG', toKey: 'CHUYEN_VIEN', fromLabel: 'Phó phòng', toLabel: 'Chuyên viên', pathD: 'M 620 342 C 650 440, 590 520, 500 550', midX: 600, midY: 450 },

    // 5. TỔ TRƯỞNG (Cấp 5) -> Subordinate
    { key: 'TO_TRUONG_TO_CHUYEN_VIEN', fromKey: 'TO_TRUONG', toKey: 'CHUYEN_VIEN', fromLabel: 'Tổ trưởng', toLabel: 'Chuyên viên', pathD: 'M 400 472 L 400 530', midX: 400, midY: 501 }
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/90 text-slate-100 overflow-hidden relative">
      
      {/* TOOLBAR WITH ALL / PERSONAL FILTER */}
      <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-900/40">
            <GitFork className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm bg-gradient-to-r from-purple-300 via-indigo-200 to-cyan-200 bg-clip-text text-transparent flex items-center gap-2">
              Sơ Đồ Mạng Nhánh Giao Việc Phân Cấp (Flowchart Network)
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-950 text-purple-300 border border-purple-800">
                {allBranches.length} Nhánh Kết Nối ({filterMode === 'ALL' ? 'Toàn Hệ Thống' : 'Cá Nhân'})
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Mô hình ô tròn chức danh nối với các đường thanh mảnh. Click vào **đường thanh mảnh** để mở danh sách nhiệm vụ ➔ chọn nhiệm vụ để xem **vòng đời!**
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* FILTER: XEM TẤT CẢ VS XEM CÁ NHÂN */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-700/80 gap-1">
            <button
              type="button"
              onClick={() => {
                setFilterMode('ALL');
                setActiveBranch(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterMode === 'ALL'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Xem tất cả nhiệm vụ của toàn bộ hệ thống"
            >
              <Globe className="w-3.5 h-3.5 text-purple-300" />
              <span>🌐 Xem Tất Cả (Toàn Hệ Thống)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterMode('PERSONAL');
                setActiveBranch(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterMode === 'PERSONAL'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Chỉ xem nhiệm vụ thuộc bản thân (giao đi hoặc được giao)"
            >
              <User className="w-3.5 h-3.5 text-cyan-300" />
              <span>👤 Xem Cá Nhân (Nhiệm Vụ Của Tôi)</span>
            </button>
          </div>

          {/* SEARCH BAR */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm mã NV, tiêu đề..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>
      </div>

      {/* FLOWCHART CANVAS AREA (MÔ HÌNH Ô TRÒN & CÁC ĐƯỜNG THANH MẢNH NỐI TRỰC TIẾP) */}
      <div className="flex-1 overflow-auto p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black flex flex-col items-center justify-start gap-6 relative min-h-[680px]">
        
        {/* CONTAINER FOR FLOWCHART CANVAS (800px x 640px) */}
        <div className="relative w-[800px] h-[640px] mx-auto my-2 select-none shrink-0">
          
          {/* SVG OVERLAY LAYER FOR CONNECTING LINES ("ĐƯỜNG THANH MẢNH") */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible" viewBox="0 0 800 640">
            <defs>
              <linearGradient id="activeLineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="50%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
              <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {ALL_CONNECTIONS.map(conn => {
              const branchInfo = allBranches.find(b => b.branchKey === conn.key);
              const count = branchInfo ? branchInfo.tasks.length : 0;
              const isActive = count > 0;
              const isSelected = activeBranch?.branchKey === conn.key;

              return (
                <g key={conn.key} className="pointer-events-auto cursor-pointer group">
                  {/* HIT AREA LINE */}
                  <path
                    d={conn.pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={18}
                    onClick={() => {
                      const info = branchInfo || {
                        branchKey: conn.key,
                        fromPos: posMap[conn.fromKey],
                        toPos: posMap[conn.toKey],
                        tasks: []
                      };
                      setActiveBranch(info);
                      setSelectedTask(null);
                    }}
                  />
                  {/* VISIBLE CONNECTING LINE */}
                  <path
                    d={conn.pathD}
                    fill="none"
                    stroke={isSelected ? '#f43f5e' : isActive ? 'url(#activeLineGradient)' : '#334155'}
                    strokeWidth={isSelected ? 3.5 : isActive ? 2.5 : 1.5}
                    strokeDasharray={isActive ? 'none' : '4 4'}
                    opacity={isSelected ? 1 : isActive ? 0.95 : 0.35}
                    filter={isActive ? 'url(#glowFilter)' : undefined}
                    className="transition-all duration-300 group-hover:stroke-purple-400 group-hover:stroke-[3px] group-hover:opacity-100"
                    onClick={() => {
                      const info = branchInfo || {
                        branchKey: conn.key,
                        fromPos: posMap[conn.fromKey],
                        toPos: posMap[conn.toKey],
                        tasks: []
                      };
                      setActiveBranch(info);
                      setSelectedTask(null);
                    }}
                  />
                </g>
              );
            })}
          </svg>

          {/* INTERACTIVE MIDPOINT BADGES FOR EACH LINE WITH TASKS */}
          {ALL_CONNECTIONS.map(conn => {
            const branchInfo = allBranches.find(b => b.branchKey === conn.key);
            const count = branchInfo ? branchInfo.tasks.length : 0;
            const isSelected = activeBranch?.branchKey === conn.key;

            if (count === 0) return null;

            return (
              <button
                key={`badge-${conn.key}`}
                type="button"
                style={{
                  left: `${conn.midX}px`,
                  top: `${conn.midY}px`,
                  transform: 'translate(-50%, -50%)'
                }}
                onClick={() => {
                  const info = branchInfo || {
                    branchKey: conn.key,
                    fromPos: posMap[conn.fromKey],
                    toPos: posMap[conn.toKey],
                    tasks: []
                  };
                  setActiveBranch(info);
                  setSelectedTask(null);
                }}
                className={`absolute z-20 px-2.5 py-1 rounded-full text-[11px] font-black tracking-wide transition-all duration-300 shadow-xl cursor-pointer flex items-center gap-1 border hover:scale-110 ${
                  isSelected
                    ? 'bg-rose-600 text-white border-rose-300 ring-4 ring-rose-500/40 animate-pulse'
                    : 'bg-gradient-to-r from-purple-700 via-indigo-700 to-cyan-700 text-white border-purple-300/80 shadow-purple-900/60'
                }`}
                title={`Bấm để mở danh sách ${count} nhiệm vụ: ${conn.fromLabel} ➔ ${conn.toLabel}`}
              >
                <Zap className="w-3 h-3 text-yellow-300 animate-bounce" />
                <span>{count} NV</span>
              </button>
            );
          })}

          {/* LEVEL 1: GIÁM ĐỐC (TOP OVAL) */}
          <div className="absolute left-[280px] top-[20px] w-[240px] h-[72px] z-10 rounded-[50px] bg-gradient-to-b from-purple-900/90 via-slate-900 to-slate-950 border-2 border-purple-400/80 shadow-2xl shadow-purple-900/50 flex flex-col items-center justify-center text-center p-3 transition-all hover:scale-105 group">
            <span className="text-[11px] font-mono text-purple-300 font-extrabold uppercase tracking-wider flex items-center gap-1">
              <Crown className="w-3.5 h-3.5 text-yellow-400" />
              Cấp [1]
            </span>
            <h4 className="font-black text-sm text-white group-hover:text-purple-200 transition-colors">
              Giám đốc
            </h4>
            <span className="text-[9px] text-purple-300/80">Lãnh đạo cao nhất</span>
          </div>

          {/* LEVEL 2: PHÓ GIÁM ĐỐC (UPPER MIDDLE OVAL) */}
          <div className="absolute left-[280px] top-[140px] w-[240px] h-[72px] z-10 rounded-[50px] bg-gradient-to-b from-blue-900/90 via-slate-900 to-slate-950 border-2 border-blue-400/80 shadow-2xl shadow-blue-900/40 flex flex-col items-center justify-center text-center p-3 transition-all hover:scale-105 group">
            <span className="text-[11px] font-mono text-blue-300 font-extrabold uppercase tracking-wider">
              Cấp [2]
            </span>
            <h4 className="font-black text-sm text-white group-hover:text-blue-200 transition-colors">
              Phó giám đốc
            </h4>
            <span className="text-[9px] text-blue-300/80">Phụ trách khối / lĩnh vực</span>
          </div>

          {/* LEVEL 3: TRƯỞNG PHÒNG (MIDDLE LEFT OVAL) */}
          <div className="absolute left-[60px] top-[270px] w-[240px] h-[72px] z-10 rounded-[50px] bg-gradient-to-b from-cyan-900/90 via-slate-900 to-slate-950 border-2 border-cyan-400/80 shadow-2xl shadow-cyan-900/40 flex flex-col items-center justify-center text-center p-3 transition-all hover:scale-105 group">
            <span className="text-[11px] font-mono text-cyan-300 font-extrabold uppercase tracking-wider">
              Cấp [3]
            </span>
            <h4 className="font-black text-sm text-white group-hover:text-cyan-200 transition-colors">
              Trưởng phòng
            </h4>
            <span className="text-[9px] text-cyan-300/80">Điều hành phòng ban</span>
          </div>

          {/* LEVEL 4: PHÓ PHÒNG (MIDDLE RIGHT OVAL) */}
          <div className="absolute left-[500px] top-[270px] w-[240px] h-[72px] z-10 rounded-[50px] bg-gradient-to-b from-emerald-900/90 via-slate-900 to-slate-950 border-2 border-emerald-400/80 shadow-2xl shadow-emerald-900/40 flex flex-col items-center justify-center text-center p-3 transition-all hover:scale-105 group">
            <span className="text-[11px] font-mono text-emerald-300 font-extrabold uppercase tracking-wider">
              Cấp [4]
            </span>
            <h4 className="font-black text-sm text-white group-hover:text-emerald-200 transition-colors">
              Phó phòng
            </h4>
            <span className="text-[9px] text-emerald-300/80">Phụ trách chuyên môn</span>
          </div>

          {/* LEVEL 5: TỔ TRƯỞNG (LOWER MIDDLE OVAL) */}
          <div className="absolute left-[280px] top-[400px] w-[240px] h-[72px] z-10 rounded-[50px] bg-gradient-to-b from-amber-900/90 via-slate-900 to-slate-950 border-2 border-amber-400/80 shadow-2xl shadow-amber-900/40 flex flex-col items-center justify-center text-center p-3 transition-all hover:scale-105 group">
            <span className="text-[11px] font-mono text-amber-300 font-extrabold uppercase tracking-wider">
              Cấp [5]
            </span>
            <h4 className="font-black text-sm text-white group-hover:text-amber-200 transition-colors">
              Tổ trưởng
            </h4>
            <span className="text-[9px] text-amber-300/80">Quản lý điều hành nhóm</span>
          </div>

          {/* LEVEL 6: CHUYÊN VIÊN (BOTTOM OVAL) */}
          <div className="absolute left-[280px] top-[530px] w-[240px] h-[72px] z-10 rounded-[50px] bg-gradient-to-b from-rose-900/90 via-slate-900 to-slate-950 border-2 border-rose-400/80 shadow-2xl shadow-rose-900/40 flex flex-col items-center justify-center text-center p-3 transition-all hover:scale-105 group">
            <span className="text-[11px] font-mono text-rose-300 font-extrabold uppercase tracking-wider">
              Cấp [6]
            </span>
            <h4 className="font-black text-sm text-white group-hover:text-rose-200 transition-colors">
              Chuyên viên
            </h4>
            <span className="text-[9px] text-rose-300/80">Thực hiện trực tiếp</span>
          </div>

        </div>

      </div>

      {/* SLIDE-OVER / MODAL: DANH SÁCH NHIỆM VỤ THUỘC ĐƯỜNG THANH MẢNH ĐÃ CHỌN */}
      {activeBranch && (
        <div className="fixed inset-0 z-[320] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-purple-500/50 rounded-3xl max-w-2xl w-full p-6 shadow-2xl text-slate-100 flex flex-col gap-4 max-h-[85vh] overflow-hidden">
            
            {/* HEADER */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-950 text-purple-300 rounded-2xl border border-purple-800">
                  <CornerDownRight className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                    DANH SÁCH NHIỆM VỤ THUỘC THANH MẢNH
                  </h3>
                  <p className="text-xs font-semibold text-purple-300">
                    Đoạn chỉ đạo: <strong>{activeBranch.fromPos.label}</strong> ➔ <strong>{activeBranch.toPos.label}</strong> ({filteredActiveBranchTasks.length} Nhiệm vụ - {filterMode === 'ALL' ? 'Xem Tất Cả' : 'Cá Nhân'})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveBranch(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* TASK LIST */}
            <div className="overflow-y-auto space-y-3 pr-1 flex-1">
              {filteredActiveBranchTasks.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Không tìm thấy nhiệm vụ nào thuộc thanh mảnh này ({filterMode === 'PERSONAL' ? 'Chế độ Cá nhân' : 'Chế độ Xem Tất Cả'}).
                </div>
              ) : (
                filteredActiveBranchTasks.map(task => {
                  const isSelected = selectedTask?.id === task.id;
                  const isCompleted = task.status === 'DA_HOAN_THANH';

                  return (
                    <div
                      key={task.id}
                      onClick={() => {
                        setSelectedTask(task);
                        if (onSelectTask) onSelectTask(task);
                      }}
                      className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-lg group/card ${
                        isSelected
                          ? 'bg-purple-950/60 border-purple-500 ring-2 ring-purple-500/50 shadow-purple-900/40'
                          : isCompleted
                          ? 'bg-slate-950/80 border-emerald-900/60 hover:border-emerald-500/50'
                          : 'bg-slate-950 border-slate-800 hover:border-purple-500/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-purple-300 bg-purple-950 px-2.5 py-0.5 rounded-md border border-purple-800/50">
                            {task.task_code}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isCompleted ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' : 'bg-indigo-950 text-indigo-300 border border-indigo-800/50'
                          }`}>
                            {isCompleted ? '✅ Đã hoàn thành' : '⏳ Đang thực hiện'}
                          </span>
                        </div>

                        <span className="text-xs text-slate-400 font-medium">
                          📅 Hạn: {task.due_date || 'Chưa định'}
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-slate-100 group-hover/card:text-purple-200 transition-colors mb-1.5">
                        {decodeHtmlEntities(parseDocumentMeta(task.title).cleanText || task.title)}
                      </h4>

                      <DocumentMetaBadges content={`${task.title}\n${task.description || ''}`} compact={true} />

                      <div className="flex items-center justify-between text-xs text-slate-400 pt-3.5 mt-2.5 border-t border-slate-800/80">
                        <span>Giao bởi: <strong className="text-slate-200">{task.assigner_name || task.creator_name || 'Lãnh đạo'}</strong></span>
                        <span className="text-purple-300 font-bold flex items-center gap-1.5 bg-purple-950/80 px-2.5 py-1 rounded-lg border border-purple-800/60 group-hover/card:bg-purple-900 transition-colors">
                          <Activity className="w-3.5 h-3.5 text-purple-400" />
                          <span>Bấm để xem Vòng Đời ➔</span>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* FOOTER */}
            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setActiveBranch(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                Đóng Danh Sách
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM MODAL / PANEL: VÒNG ĐỜI NHIỆM VỤ (TASK LIFECYCLE TIMELINE) */}
      {selectedTask && (() => {
        const lifecycleSteps = buildTaskLifecycle(selectedTask);
        const isCompleted = selectedTask.status === 'DA_HOAN_THANH';

        return (
          <div className="fixed inset-0 z-[360] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
            <div className="bg-slate-900 border border-purple-500/50 rounded-3xl max-w-2xl w-full p-6 shadow-2xl text-slate-100 flex flex-col gap-4 max-h-[85vh] overflow-hidden">
              
              {/* HEADER */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 border border-purple-400 text-white flex items-center justify-center shrink-0 shadow-lg shadow-purple-900/40">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-white">
                        VÒNG ĐỜI NHIỆM VỤ: <span className="font-mono text-purple-300 font-bold">[{selectedTask.task_code}]</span>
                      </h3>
                      {isCompleted ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-800/80 flex items-center gap-1 shadow-md">
                          <Check className="w-3 h-3 text-emerald-400" />
                          HOÀN THÀNH VÒNG ĐỜI
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-950 text-indigo-300 border border-indigo-800/80">
                          ĐANG THỰC HIỆN
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate max-w-lg mt-0.5">
                      {decodeHtmlEntities(parseDocumentMeta(selectedTask.title).cleanText || selectedTask.title)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedTask(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* BODY: TIMELINE VÒNG ĐỜI */}
              <div className="overflow-y-auto space-y-4 pr-1 flex-1">
                <div className="relative pl-6 space-y-4 my-2 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-purple-500 before:via-indigo-500 before:to-emerald-500">
                  {lifecycleSteps.map((step, idx) => {
                    const isStart = idx === 0;
                    const isEnd = idx === lifecycleSteps.length - 1;

                    return (
                      <div key={idx} className="relative flex flex-col md:flex-row md:items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl gap-2 hover:border-purple-500/50 transition-colors">
                        
                        {/* CONNECTOR CIRCLE WITH CHECKMARK IF COMPLETED */}
                        <div className={`absolute -left-6 top-4 w-4 h-4 rounded-full border-2 border-slate-950 flex items-center justify-center text-[9px] font-bold shadow-md ${
                          isCompleted && (isStart || isEnd)
                            ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.8)]'
                            : isStart
                            ? 'bg-purple-500 text-white shadow-[0_0_8px_rgba(168,85,247,0.8)]'
                            : isEnd
                            ? 'bg-rose-500 text-white shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                            : 'bg-indigo-500 text-white'
                        }`}>
                          {isCompleted && (isStart || isEnd) ? <Check className="w-3 h-3 text-slate-950 font-black stroke-[3]" /> : step.stepNumber}
                        </div>

                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-950 text-purple-300 border border-purple-800">
                              {step.roleLabel}
                            </span>

                            {isCompleted && isStart && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-400" />
                                ✅ [Khởi Tạo - Hoàn Thành]
                              </span>
                            )}

                            {isCompleted && isEnd && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 animate-pulse">
                                <Check className="w-3 h-3 text-emerald-400" />
                                ✅ [Hoàn Thành Vòng Đời]
                              </span>
                            )}
                          </div>

                          <div className="text-xs font-semibold text-slate-200">
                            <span>Giao từ: <strong className="text-purple-300">{step.assignerName}</strong></span>
                            <span className="mx-2 text-slate-600">➔</span>
                            <span>Đến: <strong className="text-cyan-300">{step.assigneeName}</strong></span>
                          </div>

                          {step.instructionNote && (
                            <div className="text-[11px] text-slate-300 italic bg-slate-900/90 p-2 rounded-lg border border-slate-800/80">
                              ✍️ Bút phê chỉ đạo: "{step.instructionNote}"
                            </div>
                          )}
                        </div>

                        <div className="text-right text-[10px] text-slate-400 shrink-0 space-y-0.5">
                          <div>Ngày giao: <strong className="text-slate-200">{step.assignedDate || 'Mới đây'}</strong></div>
                          <div>Hạn xử lý: <strong className="text-amber-300">{step.dueDate}</strong></div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>

              {/* FOOTER */}
              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setSelectedTask(null)}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-lg shadow-purple-900/40"
                >
                  Đóng Vòng Đời
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
};
