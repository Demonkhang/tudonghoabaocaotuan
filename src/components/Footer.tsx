import React from 'react';
import { ListFilter, CheckCircle2, Clock } from 'lucide-react';
import { TaskTable1, TaskTable2 } from '../utils/reportUtils';

interface FooterProps {
  table1: TaskTable1[];
  table2: TaskTable2[];
}

export const Footer: React.FC<FooterProps> = ({ table1, table2 }) => {
  const totalTasks = table1.length + table2.length;
  const thuongXuyenTotal =
    table1.filter(t => t.nhom === 'Thường xuyên').length +
    table2.filter(t => t.nhom === 'Thường xuyên').length;
  const dotXuatTotal = totalTasks - thuongXuyenTotal;

  const doneTable1 = table1.filter(t => t.tien_do === 'Hoàn thành').length;
  const pendingTable1 = table1.length - doneTable1;

  return (
    <footer className="bg-[#e0e2ea] border-t border-[#c1c6d4] px-6 py-2 flex flex-wrap items-center justify-between text-xs font-medium z-50 text-slate-700">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1.5">
          <ListFilter className="w-4 h-4 text-[#005dac]" />
          <span>
            <strong className="text-slate-900">{totalTasks}</strong> nhiệm vụ thực hiện
          </span>
        </div>

        <div className="h-4 w-px bg-[#c1c6d4]" />

        <div className="flex gap-4">
          <span>
            <strong className="text-slate-900">{thuongXuyenTotal}</strong> thường xuyên
          </span>
          <span>
            <strong className="text-slate-900">{dotXuatTotal}</strong> đột xuất
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex gap-4">
          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>{doneTable1} hoàn thành</span>
          </span>
          <span className="flex items-center gap-1 text-[#005dac] font-semibold">
            <Clock className="w-4 h-4" />
            <span>{pendingTable1} đang thực hiện</span>
          </span>
        </div>

        <div className="h-4 w-px bg-[#c1c6d4]" />

        <div className="flex items-center gap-1.5 text-slate-600">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Trực tuyến</span>
        </div>
      </div>
    </footer>
  );
};
