import React, { useState, useRef } from 'react';
import {
  X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Sparkles,
  Search, Check, ShieldAlert, ArrowRight, FileText, Calendar, Filter,
  Trash2, Download, AlertTriangle, RefreshCw, CopyCheck, AlertOctagon
} from 'lucide-react';
import {
  parseIncomingDocExcel,
  IncomingDocTask,
  buildIncomingDocDescription,
  downloadIncomingDocExcelTemplate
} from '../utils/excelParser';
import { batchImportStandaloneTasksApi } from '../services/api';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAccount: any;
  onImportSuccess: () => void;
  existingTasks?: any[];
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  currentAccount,
  onImportSuccess,
  existingTasks = []
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedTasks, setParsedTasks] = useState<IncomingDocTask[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'UNIQUE_ONLY' | 'DUPLICATES_ONLY'>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSetDueDate, setAutoSetDueDate] = useState(true);
  const [structureErrorMsg, setStructureErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      await processFile(selectedFile);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      await processFile(droppedFile);
    }
  };

  const processFile = async (inputFile: File) => {
    setFile(inputFile);
    setParsing(true);
    setStructureErrorMsg(null);
    try {
      const res = await parseIncomingDocExcel(inputFile, existingTasks);
      setParsedTasks(res.tasks);
    } catch (err: any) {
      console.error("Lỗi parse file Excel:", err);
      const errMsg = err.message || '';
      if (errMsg.includes('STRUCT_ERROR')) {
        setStructureErrorMsg(errMsg.replace('STRUCT_ERROR:', '').trim());
      } else {
        setStructureErrorMsg(`Cấu trúc file Excel không tương thích với bảng Sổ Văn Bản Đến. Chi tiết: ${errMsg}`);
      }
      setFile(null);
      setParsedTasks([]);
    } finally {
      setParsing(false);
    }
  };

  const handleToggleSelectAll = (checked: boolean) => {
    setParsedTasks(prev =>
      prev.map(item => item.isValid ? { ...item, selected: checked } : item)
    );
  };

  const handleToggleItem = (id: string) => {
    setParsedTasks(prev =>
      prev.map(item => item.id === id ? { ...item, selected: !item.selected } : item)
    );
  };

  const handleDeleteItem = (id: string) => {
    setParsedTasks(prev => prev.filter(item => item.id !== id));
  };

  const handleDeselectDuplicates = () => {
    setParsedTasks(prev =>
      prev.map(item => item.isDuplicate ? { ...item, selected: false } : item)
    );
  };

  const handleDeleteDuplicates = () => {
    setParsedTasks(prev => prev.filter(item => !item.isDuplicate));
  };

  const handleUpdateTaskField = (id: string, field: keyof IncomingDocTask, val: any) => {
    setParsedTasks(prev =>
      prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: val };
          if (field === 'priority') {
            updated.do_khan = val === 'KHAN_CAP' ? 'Hỏa tốc' : val === 'KHAN' ? 'Khẩn' : 'Thường';
          }
          updated.description = buildIncomingDocDescription(updated);
          const isValid = Boolean(updated.title && updated.title.trim().length > 0);
          updated.isValid = isValid;
          updated.selected = isValid ? updated.selected : false;
          return updated;
        }
        return item;
      })
    );
  };

  const handleImportSubmit = async () => {
    const selectedItems = parsedTasks.filter(t => t.selected && t.isValid);
    if (selectedItems.length === 0) {
      alert('Vui lòng chọn ít nhất 1 nhiệm vụ hợp lệ để Nhập!');
      return;
    }

    setIsSubmitting(true);

    const tasksToImport = selectedItems.map(item => {
      let computedDueDate = item.due_date || '';
      if (!computedDueDate && autoSetDueDate && item.ngay_den) {
        try {
          const parts = item.ngay_den.split('/');
          if (parts.length === 3) {
            const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            d.setDate(d.getDate() + 7);
            computedDueDate = d.toISOString().split('T')[0];
          }
        } catch {
          // ignore date parse error
        }
      }

      return {
        title: item.title,
        description: item.description,
        priority: item.priority,
        due_date: computedDueDate,
        task_code: item.so_den ? `SĐ-${item.so_den}` : undefined
      };
    });

    const res = await batchImportStandaloneTasksApi({
      tasks: tasksToImport,
      created_by: currentAccount?.id || 'acc_admin'
    });

    setIsSubmitting(false);

    if (res.success) {
      alert(`🎉 NHẬP KHO THÀNH CÔNG!\n${res.message}`);
      onImportSuccess();
      onClose();
    } else {
      alert(`❌ Lỗi Nhập Kho:\n${res.error || 'Không thể nhập dữ liệu'}`);
    }
  };

  const selectedCount = parsedTasks.filter(t => t.selected && t.isValid).length;
  const validCount = parsedTasks.filter(t => t.isValid).length;
  const invalidCount = parsedTasks.filter(t => !t.isValid).length;
  const duplicateCount = parsedTasks.filter(t => t.isDuplicate).length;

  const filteredTasks = parsedTasks.filter(t => {
    // Filter search
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.so_den.includes(searchQuery) ||
      t.so_ky_hieu.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.xu_ly_chinh.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Filter duplicate mode
    if (filterMode === 'UNIQUE_ONLY') return !t.isDuplicate;
    if (filterMode === 'DUPLICATES_ONLY') return Boolean(t.isDuplicate);
    return true;
  });

  return (
    <div className="fixed inset-0 z-[350] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 md:p-6 overflow-hidden">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-6xl h-[88vh] flex flex-col overflow-hidden text-slate-100">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20 shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 bg-clip-text text-transparent">
                  Import Kho Nhiệm Vụ Từ Excel Sổ Văn Bản Đến
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Chuẩn Sổ Văn Bản
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tự động bóc tách Trích yếu, Số đến, Tác giả, Độ khẩn và Cán bộ xử lý chính đưa vào Kho Chung
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadIncomingDocExcelTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-semibold rounded-xl border border-slate-700 transition-all cursor-pointer"
              title="Tải về file Excel mẫu chuẩn Sổ Văn Bản Đến 2026"
            >
              <Download className="w-3.5 h-3.5 text-teal-400" />
              <span>Tải File Mẫu</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-4">
          
          {/* CẢNH BÁO SAI CẤU TRÚC FILE EXCEL */}
          {structureErrorMsg && (
            <div className="bg-rose-950/40 border-2 border-rose-800/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4 my-auto shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-rose-900/60 border border-rose-600 flex items-center justify-center text-rose-300 animate-bounce">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="max-w-xl space-y-2">
                <h3 className="text-lg font-bold text-rose-200">
                  CẢNH BÁO: FILE EXCEL KHÔNG ĐÚNG CẤU TRÚC!
                </h3>
                <p className="text-xs text-rose-300/90 leading-relaxed">
                  {structureErrorMsg}
                </p>
                <div className="text-[11px] text-slate-400 pt-2 bg-slate-950/60 p-3 rounded-xl border border-rose-900/50 text-left">
                  📌 <strong>Cấu trúc file hợp lệ phải bao gồm các cột:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-300">
                    <li><code className="text-teal-300">Ngày đến</code>, <code className="text-teal-300">Số đến</code>, <code className="text-teal-300">Tác giả</code></li>
                    <li><code className="text-teal-300">Số, ký hiệu văn bản</code>, <code className="text-teal-300">Ngày tháng năm văn bản</code></li>
                    <li><code className="text-teal-300">Tên loại và trích yếu nội dung văn bản</code></li>
                    <li><code className="text-teal-300">Độ khẩn</code>, <code className="text-teal-300">Xử lý chính</code></li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={downloadIncomingDocExcelTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải File Mẫu Chuẩn (.xlsx)</span>
                </button>

                <button
                  onClick={() => {
                    setStructureErrorMsg(null);
                    fileInputRef.current?.click();
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-cyan-400" />
                  <span>Chọn File Khác</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: UPLOAD BOX (When no tasks loaded and no error) */}
          {parsedTasks.length === 0 && !structureErrorMsg && (
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-teal-500/80 bg-slate-950/40 hover:bg-slate-950/80 rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all flex-1 my-auto cursor-pointer group select-none"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileChange}
                onClick={e => {
                  (e.target as HTMLInputElement).value = '';
                }}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center pointer-events-none">
                <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:scale-110 group-hover:bg-teal-500/20 transition-all mb-4">
                  {parsing ? (
                    <Sparkles className="w-8 h-8 animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8" />
                  )}
                </div>

                <h3 className="text-base font-semibold text-slate-200 mb-1">
                  {parsing ? 'Đang bóc tách dữ liệu từ File Excel...' : 'Kéo thả File Excel Sổ Văn Bản Đến vào đây'}
                </h3>
                <p className="text-xs text-slate-400 max-w-md mb-4">
                  Hỗ trợ tệp định dạng <code className="text-teal-300 bg-slate-800 px-1.5 py-0.5 rounded">.xlsx</code> hoặc <code className="text-teal-300 bg-slate-800 px-1.5 py-0.5 rounded">.xls</code> cấu trúc bảng Sổ lưu cấp số văn bản đến cơ quan.
                </p>

                <div className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-teal-900/40 transition-all group-hover:scale-105">
                  Chọn File Từ Máy Tính
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW TABLE & ACTION BAR */}
          {parsedTasks.length > 0 && !structureErrorMsg && (
            <>
              {/* BANNER CẢNH BÁO TRÙNG LẶP (Nếu phát hiện nhiệm vụ trùng) */}
              {duplicateCount > 0 && (
                <div className="bg-amber-950/40 border border-amber-600/60 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-amber-200 shrink-0 shadow-md">
                  <div className="flex items-center gap-2 text-xs">
                    <AlertOctagon className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <strong className="text-amber-300 font-bold">CẢNH BÁO TRÙNG LẶP: </strong>
                      <span>Phát hiện <strong>{duplicateCount}</strong> nhiệm vụ trùng với dữ liệu đã có trong Kho Chung hoặc trùng trong cùng file. Hệ thống đã tự động bỏ chọn các dòng này.</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleDeselectDuplicates}
                      className="px-3 py-1 bg-amber-900/60 hover:bg-amber-800 text-amber-200 rounded-lg text-xs font-semibold border border-amber-700/60 transition-all cursor-pointer"
                    >
                      Bỏ Chọn Dòng Trùng
                    </button>
                    <button
                      onClick={handleDeleteDuplicates}
                      className="px-3 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-200 rounded-lg text-xs font-semibold border border-rose-800/60 transition-all cursor-pointer"
                    >
                      Xóa Hẳn Dòng Trùng ({duplicateCount})
                    </button>
                  </div>
                </div>
              )}

              {/* TOP STATS & SEARCH / FILTER BAR */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800 shrink-0">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                    <FileText className="w-4 h-4 text-teal-400" />
                    <span>Tổng số dòng: <strong className="text-white">{parsedTasks.length}</strong></span>
                  </div>

                  {duplicateCount > 0 && (
                    <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-0.5 border border-slate-700">
                      <button
                        onClick={() => setFilterMode('ALL')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                          filterMode === 'ALL' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Tất cả ({parsedTasks.length})
                      </button>
                      <button
                        onClick={() => setFilterMode('UNIQUE_ONLY')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                          filterMode === 'UNIQUE_ONLY' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Chưa trùng ({parsedTasks.length - duplicateCount})
                      </button>
                      <button
                        onClick={() => setFilterMode('DUPLICATES_ONLY')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                          filterMode === 'DUPLICATES_ONLY' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        ⚠️ Trùng ({duplicateCount})
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-teal-300 font-bold bg-teal-950/60 px-2.5 py-1 rounded-lg border border-teal-800/60">
                    <span>Đã chọn: {selectedCount} / {validCount}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Search input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Tìm trích yếu, số đến..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="bg-slate-900 text-slate-200 text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-teal-500 w-48"
                    />
                  </div>

                  <button
                    onClick={() => {
                      setParsedTasks([]);
                      setFile(null);
                      setStructureErrorMsg(null);
                      fileInputRef.current?.click();
                    }}
                    className="text-xs text-teal-400 hover:text-teal-300 underline cursor-pointer"
                  >
                    Chọn file khác
                  </button>
                </div>
              </div>

              {/* TABLE CONTAINER - PREVIEW TABLE */}
              <div className="flex-1 overflow-auto rounded-xl border border-slate-800 bg-slate-950/40">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px] sticky top-0 z-10 border-b border-slate-800">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={validCount > 0 && selectedCount === validCount}
                          onChange={e => handleToggleSelectAll(e.target.checked)}
                          className="rounded accent-teal-500 cursor-pointer"
                        />
                      </th>
                      <th className="p-3 w-28">Số đến / Ngày</th>
                      <th className="p-3 w-40">Tác giả / Ký hiệu</th>
                      <th className="p-3">Tên loại & Trích yếu nội dung nhiệm vụ (Sửa trực tiếp)</th>
                      <th className="p-3 w-32 text-center">Độ khẩn</th>
                      <th className="p-3 w-36">Xử lý chính</th>
                      <th className="p-3 w-16 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredTasks.map((item) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          item.isDuplicate
                            ? 'bg-amber-950/20'
                            : !item.isValid
                            ? 'bg-rose-950/10'
                            : item.selected
                            ? 'bg-teal-950/20'
                            : ''
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            disabled={!item.isValid}
                            onChange={() => handleToggleItem(item.id)}
                            className="rounded accent-teal-500 cursor-pointer disabled:opacity-30"
                          />
                        </td>
                        <td className="p-3 font-medium text-teal-300 space-y-1">
                          <input
                            type="text"
                            value={item.so_den}
                            onChange={e => handleUpdateTaskField(item.id, 'so_den', e.target.value)}
                            className="w-full bg-slate-900 text-teal-300 px-1.5 py-0.5 rounded border border-slate-700/60 focus:border-teal-500 text-xs font-semibold"
                            placeholder="Số đến"
                          />
                          <div className="text-[10px] text-slate-400">{item.ngay_den || 'Hôm nay'}</div>
                        </td>
                        <td className="p-3 text-slate-300 space-y-1">
                          <div className="font-semibold text-slate-200 truncate max-w-[150px]" title={item.tac_gia}>
                            {item.tac_gia || 'Nội bộ'}
                          </div>
                          <input
                            type="text"
                            value={item.so_ky_hieu}
                            onChange={e => handleUpdateTaskField(item.id, 'so_ky_hieu', e.target.value)}
                            className="w-full bg-slate-900 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700/60 focus:border-teal-500 text-[10px]"
                            placeholder="Số ký hiệu VB"
                          />
                        </td>
                        <td className="p-3">
                          <div className="space-y-1">
                            <textarea
                              value={item.title}
                              onChange={e => handleUpdateTaskField(item.id, 'title', e.target.value)}
                              rows={2}
                              className="w-full bg-slate-900/90 text-slate-100 p-2 rounded border border-slate-700/80 focus:outline-none focus:border-teal-500 text-xs resize-none"
                              placeholder="Nhập/chỉnh sửa trích yếu nội dung..."
                            />
                            {item.isDuplicate && (
                              <div className="text-[10px] text-amber-400 flex items-center gap-1 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60" title={item.duplicateReason}>
                                <AlertOctagon className="w-3 h-3 text-amber-400 shrink-0" />
                                <span>{item.duplicateReason}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <select
                            value={item.priority}
                            onChange={e => handleUpdateTaskField(item.id, 'priority', e.target.value)}
                            className={`w-full text-xs font-bold px-2 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                              item.priority === 'KHAN_CAP'
                                ? 'bg-rose-950 text-rose-300 border-rose-800'
                                : item.priority === 'KHAN'
                                ? 'bg-amber-950 text-amber-300 border-amber-800'
                                : 'bg-slate-900 text-slate-300 border-slate-700'
                            }`}
                          >
                            <option value="THUONG">Thường</option>
                            <option value="KHAN">Khẩn</option>
                            <option value="KHAN_CAP">Hỏa Tốc</option>
                          </select>
                        </td>
                        <td className="p-3 text-slate-300">
                          <input
                            type="text"
                            value={item.xu_ly_chinh}
                            onChange={e => handleUpdateTaskField(item.id, 'xu_ly_chinh', e.target.value)}
                            className="w-full bg-slate-900 text-cyan-300 px-2 py-1 rounded border border-slate-700 focus:border-teal-500 text-xs font-medium"
                            placeholder="Cán bộ xử lý"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Xóa dòng nhiệm vụ này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* BOTTOM OPTIONS & ACTION BAR */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800 shrink-0">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoSetDueDate}
                    onChange={e => setAutoSetDueDate(e.target.checked)}
                    className="rounded accent-teal-500"
                  />
                  <span>Tự động đặt Hạn xử lý dự kiến (+7 ngày kể từ Ngày đến văn bản)</span>
                </label>

                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-all cursor-pointer"
                  >
                    Hủy
                  </button>

                  <button
                    onClick={handleImportSubmit}
                    disabled={isSubmitting || selectedCount === 0}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-40 text-white rounded-xl font-bold text-xs shadow-lg shadow-teal-900/40 transition-all active:scale-95 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Sparkles className="w-4 h-4 animate-spin" />
                        <span>Đang Nhập Kho...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Thêm Vào Kho Nhiệm Vụ ({selectedCount} Nhiệm Vụ)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
