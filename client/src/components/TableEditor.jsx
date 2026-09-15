import React from 'react';
import { Pencil, Plus, Trash2, Fact, ArrowRight } from 'lucide-react';
import { processTable1, processTable2, classifyTask } from '../utils/reportUtils';

export function TableEditor({
  table1,
  setTable1,
  table2,
  setTable2,
  highlightedRowId,
  tuan,
  tuanTiep,
  nam
}) {
  const p1 = processTable1(table1);
  const p2 = processTable2(table2);

  const updateTable1Field = (id, field, value) => {
    setTable1(prev =>
      prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value, isEdited: true };
          if (field === 'noi_dung') updated.nhom = classifyTask(value);
          return updated;
        }
        return item;
      })
    );
  };

  const updateTable2Field = (id, field, value) => {
    setTable2(prev =>
      prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value, isEdited: true };
          if (field === 'noi_dung') updated.nhom = classifyTask(value);
          return updated;
        }
        return item;
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Bảng I */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-300 overflow-hidden">
        <div className="bg-blue-100 px-6 py-3 font-bold text-blue-900">
          BẢNG I: KẾT QUẢ THỰC HIỆN CÔNG TÁC (TUẦN {tuan} / {nam})
        </div>
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 w-12 text-center">STT</th>
              <th className="p-3">Nội dung</th>
              <th className="p-3">Thời gian</th>
              <th className="p-3">Triển khai</th>
              <th className="p-3">Tiến độ</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-slate-200 font-bold"><td colSpan={5} className="p-2">I. Nhiệm vụ thường xuyên ({p1.txStats.done}/{p1.txStats.total} hoàn thành)</td></tr>
            {p1.thuongXuyen.map(row => (
              <tr key={row.id} className="border-b border-slate-200">
                <td className="p-3 text-center">{row.stt}</td>
                <td className="p-3 font-medium">{row.noi_dung}</td>
                <td className="p-3">{row.thoi_gian}</td>
                <td className="p-3">{row.trien_khai}</td>
                <td className="p-3 font-semibold">{row.tien_do}</td>
              </tr>
            ))}
            <tr className="bg-slate-200 font-bold"><td colSpan={5} className="p-2">II. Nhiệm vụ đột xuất ({p1.dxStats.done}/{p1.dxStats.total} hoàn thành)</td></tr>
            {p1.dotXuat.map(row => (
              <tr key={row.id} className="border-b border-slate-200">
                <td className="p-3 text-center">{row.stt}</td>
                <td className="p-3 font-medium">{row.noi_dung}</td>
                <td className="p-3">{row.thoi_gian}</td>
                <td className="p-3">{row.trien_khai}</td>
                <td className="p-3 font-semibold">{row.tien_do}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
