import React from 'react';

export function Dashboard({ totalTasks, doneTasks, pendingTasks }) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="text-xs text-slate-500 font-medium">Tổng số nhiệm vụ</div>
        <div className="text-2xl font-bold text-slate-800">{totalTasks}</div>
      </div>
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="text-xs text-emerald-600 font-medium">Hoàn thành</div>
        <div className="text-2xl font-bold text-emerald-600">{doneTasks}</div>
      </div>
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="text-xs text-blue-600 font-medium">Đang thực hiện</div>
        <div className="text-2xl font-bold text-blue-600">{pendingTasks}</div>
      </div>
    </div>
  );
}
