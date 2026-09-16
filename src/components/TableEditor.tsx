import React from 'react';
import { Pencil, Plus, Trash2, ClipboardList, ArrowRight } from 'lucide-react';
import { TaskTable1, TaskTable2, processTable1, processTable2, classifyTask } from '../utils/reportUtils';

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
}

export const TableEditor: React.FC<TableEditorProps> = ({
  table1,
  setTable1,
  table2,
  setTable2,
  highlightedRowId,
  tuan,
  tuanTiep,
  nam,
  isReadOnly = false
}) => {
  const p1 = processTable1(table1);
  const p2 = processTable2(table2);

  // Cập nhật trường dữ liệu Bảng 1
  const updateTable1Field = (id: string, field: keyof TaskTable1, value: any) => {
    setTable1(prev =>
      prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value, isEdited: true };
          // Nếu đổi nội dung, tự phân loại nhóm (BR03)
          if (field === 'noi_dung') {
            updated.nhom = classifyTask(value);
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Cập nhật trường dữ liệu Bảng 2
  const updateTable2Field = (id: string, field: keyof TaskTable2, value: any) => {
    setTable2(prev =>
      prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value, isEdited: true };
          if (field === 'noi_dung') {
            updated.nhom = classifyTask(value);
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Thêm dòng mới Bảng 1
  const addTable1Row = (nhom: 'Thường xuyên' | 'Đột xuất') => {
    const newId = `t1_${Date.now()}`;
    const newTask: TaskTable1 = {
      id: newId,
      noi_dung: 'Nhiệm vụ mới...',
      thoi_gian: new Date().toLocaleDateString('vi-VN'),
      trien_khai: 'Đang triển khai',
      tien_do: 'Đang thực hiện',
      nhom,
      isEdited: true
    };
    setTable1([...table1, newTask]);
  };

  // Thêm dòng mới Bảng 2
  const addTable2Row = (nhom: 'Thường xuyên' | 'Đột xuất') => {
    const newId = `t2_${Date.now()}`;
    const newTask: TaskTable2 = {
      id: newId,
      noi_dung: 'Kế hoạch công tác mới...',
      thoi_gian_du_kien: 'Trong tuần',
      san_pham_du_kien: 'Sản phẩm hoàn thành',
      nhom,
      isEdited: true
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

  return (
    <section className="col-span-12 lg:col-span-9 overflow-y-auto p-6 bg-[#f9f9ff] space-y-6 scroll-smooth pb-16">
      {/* ==================== BẢNG I ==================== */}
      <div className="bg-white rounded-xl shadow-xs border border-[#c1c6d4] overflow-hidden">
        <div className="bg-[#cbe6ff] px-6 py-3 border-b border-[#c1c6d4] flex justify-between items-center">
          <h2 className="font-semibold text-lg text-[#001e30] flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#005dac]" />
            <span>BẢNG I: KẾT QUẢ THỰC HIỆN CÔNG TÁC</span>
          </h2>
          <span className="text-xs uppercase font-bold tracking-wider text-[#4e677c]">
            Tuần {tuan} / {nam}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#e6e8f0]">
              <tr className="text-xs uppercase text-[#414752] font-semibold border-b border-[#c1c6d4]">
                <th className="px-4 py-3 w-12 text-center">STT</th>
                <th className="px-4 py-3">Nội dung nhiệm vụ</th>
                <th className="px-4 py-3 w-40">Thời gian hoàn thành</th>
                <th className="px-4 py-3">Triển khai thực hiện</th>
                <th className="px-4 py-3 w-48">Tiến độ</th>
                <th className="px-3 py-3 w-12 text-center">Xóa</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {/* NHÓM I: THƯỜNG XUYÊN */}
              <tr className="bg-[#f2f3fc]">
                <td colSpan={6} className="px-4 py-2 font-bold text-[#005dac] border-b border-[#c1c6d4]">
                  <div className="flex justify-between items-center">
                    <span>
                      I. Nhiệm vụ thường xuyên ({p1.txStats.done}/{p1.txStats.total} nhiệm vụ hoàn thành)
                    </span>
                    <button
                      onClick={() => addTable1Row('Thường xuyên')}
                      className="text-xs font-semibold text-[#005dac] bg-white px-2.5 py-1 rounded border border-[#005dac]/30 hover:bg-[#005dac] hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm nhiệm vụ
                    </button>
                  </div>
                </td>
              </tr>

              {p1.thuongXuyen.map(row => (
                <tr
                  key={row.id}
                  id={`row_${row.id}`}
                  className={`border-b border-[#c1c6d4] transition-colors group ${
                    highlightedRowId === row.id
                      ? 'bg-amber-100 ring-2 ring-amber-500'
                      : row.thoi_gian === 'Chưa nhập'
                      ? 'bg-red-50/70 hover:bg-red-100/80'
                      : 'hover:bg-[#f2f3fc]'
                  }`}
                >
                  <td className="px-4 py-3 text-center font-bold text-[#414752]">{row.stt}</td>
                  
                  {/* Nội dung Inline Edit */}
                  <td className="px-4 py-3 relative">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={row.noi_dung}
                        onChange={e => updateTable1Field(row.id, 'noi_dung', e.target.value)}
                        className="w-full bg-transparent border-b border-transparent hover:border-[#717783] focus:border-[#005dac] focus:bg-white focus:outline-hidden px-1 py-0.5 rounded text-slate-800 font-medium"
                      />
                      {row.isEdited && (
                        <span className="flex items-center text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold shrink-0 border border-amber-300" title="Đã sửa (BR12)">
                          <Pencil className="w-3 h-3 mr-0.5" /> Đã sửa
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Thời gian */}
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={row.thoi_gian}
                      onChange={e => updateTable1Field(row.id, 'thoi_gian', e.target.value)}
                      className={`w-full bg-transparent border-b border-transparent hover:border-[#717783] focus:border-[#005dac] focus:bg-white focus:outline-hidden px-1 py-0.5 rounded ${
                        row.thoi_gian === 'Chưa nhập' ? 'text-red-600 font-semibold italic' : 'text-slate-700'
                      }`}
                    />
                  </td>

                  {/* Triển khai */}
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={row.trien_khai}
                      onChange={e => updateTable1Field(row.id, 'trien_khai', e.target.value)}
                      className="w-full bg-transparent border-b border-transparent hover:border-[#717783] focus:border-[#005dac] focus:bg-white focus:outline-hidden px-1 py-0.5 rounded text-slate-700"
                    />
                  </td>

                  {/* Tiến độ Dropdown Select */}
                  <td className="px-4 py-3">
                    <select
                      value={row.tien_do}
                      onChange={e => updateTable1Field(row.id, 'tien_do', e.target.value)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-full cursor-pointer focus:outline-hidden border-none ${
                        row.tien_do === 'Hoàn thành'
                          ? 'bg-emerald-600 text-white'
                          : row.tien_do === 'Đang thực hiện'
                          ? 'bg-[#005dac] text-white'
                          : row.tien_do === 'Hoàn thành trễ'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-500 text-white'
                      }`}
                    >
                      <option value="Hoàn thành" className="bg-white text-slate-800 font-medium">Hoàn thành</option>
                      <option value="Đang thực hiện" className="bg-white text-slate-800 font-medium">Đang thực hiện</option>
                      <option value="Hoàn thành trễ" className="bg-white text-slate-800 font-medium">Hoàn thành trễ</option>
                      <option value="Chưa thực hiện" className="bg-white text-slate-800 font-medium">Chưa thực hiện</option>
                    </select>
                  </td>

                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => deleteTable1Row(row.id)}
                      className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                      title="Xóa dòng này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {/* NHÓM II: ĐỘT XUẤT */}
              <tr className="bg-[#f2f3fc]">
                <td colSpan={6} className="px-4 py-2 font-bold text-[#005dac] border-b border-[#c1c6d4]">
                  <div className="flex justify-between items-center">
                    <span>
                      II. Nhiệm vụ đột xuất ({p1.dxStats.done}/{p1.dxStats.total} nhiệm vụ hoàn thành)
                    </span>
                    <button
                      onClick={() => addTable1Row('Đột xuất')}
                      className="text-xs font-semibold text-[#005dac] bg-white px-2.5 py-1 rounded border border-[#005dac]/30 hover:bg-[#005dac] hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm nhiệm vụ
                    </button>
                  </div>
                </td>
              </tr>

              {p1.dotXuat.map(row => (
                <tr
                  key={row.id}
                  id={`row_${row.id}`}
                  className={`border-b border-[#c1c6d4] transition-colors group ${
                    highlightedRowId === row.id
                      ? 'bg-amber-100 ring-2 ring-amber-500'
                      : 'hover:bg-[#f2f3fc]'
                  }`}
                >
                  <td className="px-4 py-3 text-center font-bold text-[#414752]">{row.stt}</td>
                  
                  <td className="px-4 py-3 relative">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={row.noi_dung}
                        onChange={e => updateTable1Field(row.id, 'noi_dung', e.target.value)}
                        className="w-full bg-transparent border-b border-transparent hover:border-[#717783] focus:border-[#005dac] focus:bg-white focus:outline-hidden px-1 py-0.5 rounded text-slate-800 font-medium"
                      />
                      {row.isEdited && (
                        <span className="flex items-center text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold shrink-0 border border-amber-300" title="Đã sửa">
                          <Pencil className="w-3 h-3 mr-0.5" /> Đã sửa
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={row.thoi_gian}
                      onChange={e => updateTable1Field(row.id, 'thoi_gian', e.target.value)}
                      className="w-full bg-transparent border-b border-transparent hover:border-[#717783] focus:border-[#005dac] focus:bg-white focus:outline-hidden px-1 py-0.5 rounded text-slate-700"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={row.trien_khai}
                      onChange={e => updateTable1Field(row.id, 'trien_khai', e.target.value)}
                      className="w-full bg-transparent border-b border-transparent hover:border-[#717783] focus:border-[#005dac] focus:bg-white focus:outline-hidden px-1 py-0.5 rounded text-slate-700"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <select
                      value={row.tien_do}
                      onChange={e => updateTable1Field(row.id, 'tien_do', e.target.value)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-full cursor-pointer focus:outline-hidden border-none ${
                        row.tien_do === 'Hoàn thành'
                          ? 'bg-emerald-600 text-white'
                          : row.tien_do === 'Đang thực hiện'
                          ? 'bg-[#005dac] text-white'
                          : row.tien_do === 'Hoàn thành trễ'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-500 text-white'
                      }`}
                    >
                      <option value="Hoàn thành" className="bg-white text-slate-800">Hoàn thành</option>
                      <option value="Đang thực hiện" className="bg-white text-slate-800">Đang thực hiện</option>
                      <option value="Hoàn thành trễ" className="bg-white text-slate-800">Hoàn thành trễ</option>
                      <option value="Chưa thực hiện" className="bg-white text-slate-800">Chưa thực hiện</option>
                    </select>
                  </td>

                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => deleteTable1Row(row.id)}
                      className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== BẢNG II ==================== */}
      <div className="bg-white rounded-xl shadow-xs border border-[#c1c6d4] overflow-hidden">
        <div className="bg-[#ffdbc7] px-6 py-3 border-b border-[#c1c6d4] flex justify-between items-center">
          <h2 className="font-semibold text-lg text-[#311300] flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-[#ba5b00]" />
            <span>BẢNG II: KẾ HOẠCH THỰC HIỆN TUẦN TIẾP THEO</span>
          </h2>
          <span className="text-xs uppercase font-bold tracking-wider text-[#733600]">
            Tuần {tuanTiep} / {nam}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#e6e8f0]">
              <tr className="text-xs uppercase text-[#414752] font-semibold border-b border-[#c1c6d4]">
                <th className="px-4 py-3 w-12 text-center">STT</th>
                <th className="px-4 py-3">Nhiệm vụ/Công tác</th>
                <th className="px-4 py-3 w-40">Thời gian dự kiến</th>
                <th className="px-4 py-3">Nội dung và sản phẩm dự kiến</th>
                <th className="px-3 py-3 w-12 text-center">Xóa</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {/* NHÓM I: THƯỜNG XUYÊN */}
              <tr className="bg-[#fff3ec]">
                <td colSpan={5} className="px-4 py-2 font-bold text-[#ba5b00] border-b border-[#c1c6d4]">
                  <div className="flex justify-between items-center">
                    <span>I. Nhiệm vụ thường xuyên ({p2.txTotal} kế hoạch)</span>
                    <button
                      onClick={() => addTable2Row('Thường xuyên')}
                      className="text-xs font-semibold text-[#ba5b00] bg-white px-2.5 py-1 rounded border border-[#ba5b00]/30 hover:bg-[#ba5b00] hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm kế hoạch
                    </button>
                  </div>
                </td>
              </tr>

              {p2.thuongXuyen.map(row => (
                <tr
                  key={row.id}
                  id={`row_${row.id}`}
                  className={`border-b border-[#c1c6d4] transition-colors ${
                    highlightedRowId === row.id
                      ? 'bg-amber-100 ring-2 ring-amber-500'
                      : 'hover:bg-[#f2f3fc]'
                  }`}
                >
                  <td className="px-4 py-3 text-center font-bold text-[#414752]">{row.stt}</td>
                  
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={row.noi_dung}
                      onChange={e => updateTable2Field(row.id, 'noi_dung', e.target.value)}
                      className="w-full bg-transparent border-b border-transparent hover:border-[#717783] focus:border-[#ba5b00] focus:bg-white focus:outline-hidden px-1 py-0.5 rounded text-slate-800 font-medium"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={row.thoi_gian_du_kien}
                      onChange={e => updateTable2Field(row.id, 'thoi_gian_du_kien', e.target.value)}
                      className="w-full bg-transparent border-b border-transparent hover:border-[#717783] focus:border-[#ba5b00] focus:bg-white focus:outline-hidden px-1 py-0.5 rounded text-slate-700"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={row.san_pham_du_kien}
                      onChange={e => updateTable2Field(row.id, 'san_pham_du_kien', e.target.value)}
                      className="w-full bg-transparent border-b border-transparent hover:border-[#717783] focus:border-[#ba5b00] focus:bg-white focus:outline-hidden px-1 py-0.5 rounded text-slate-700"
                    />
                  </td>

                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => deleteTable2Row(row.id)}
                      className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {/* NHÓM II: ĐỘT XUẤT */}
              <tr className="bg-[#fff3ec]">
                <td colSpan={5} className="px-4 py-2 font-bold text-[#ba5b00] border-b border-[#c1c6d4]">
                  <div className="flex justify-between items-center">
                    <span>II. Nhiệm vụ đột xuất ({p2.dxTotal} kế hoạch)</span>
                    <button
                      onClick={() => addTable2Row('Đột xuất')}
                      className="text-xs font-semibold text-[#ba5b00] bg-white px-2.5 py-1 rounded border border-[#ba5b00]/30 hover:bg-[#ba5b00] hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm kế hoạch
                    </button>
                  </div>
                </td>
              </tr>

              {p2.dotXuat.map(row => (
                <tr
                  key={row.id}
                  id={`row_${row.id}`}
                  className={`border-b border-[#c1c6d4] transition-colors ${
                    highlightedRowId === row.id
                      ? 'bg-amber-100 ring-2 ring-amber-500'
                      : 'hover:bg-[#f2f3fc]'
                  }`}
                >
                  <td className="px-4 py-3 text-center font-bold text-[#414752]">{row.stt}</td>
                  
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={row.noi_dung}
                      onChange={e => updateTable2Field(row.id, 'noi_dung', e.target.value)}
                      className="w-full bg-transparent border-b border-transparent hover:border-[#717783] focus:border-[#ba5b00] focus:bg-white focus:outline-hidden px-1 py-0.5 rounded text-slate-800 font-medium"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={row.thoi_gian_du_kien}
                      onChange={e => updateTable2Field(row.id, 'thoi_gian_du_kien', e.target.value)}
                      className="w-full bg-transparent border-b border-transparent hover:border-[#717783] focus:border-[#ba5b00] focus:bg-white focus:outline-hidden px-1 py-0.5 rounded text-slate-700"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={row.san_pham_du_kien}
                      onChange={e => updateTable2Field(row.id, 'san_pham_du_kien', e.target.value)}
                      className="w-full bg-transparent border-b border-transparent hover:border-[#717783] focus:border-[#ba5b00] focus:bg-white focus:outline-hidden px-1 py-0.5 rounded text-slate-700"
                    />
                  </td>

                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => deleteTable2Row(row.id)}
                      className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
