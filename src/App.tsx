import React, { useState } from 'react';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { TableEditor } from './components/TableEditor';
import { ValidationPanel } from './components/ValidationPanel';
import { Footer } from './components/Footer';
import { PreviewModal } from './components/PreviewModal';
import { ConfigModal } from './components/ConfigModal';
import { FileSpreadsheet, Upload, RefreshCw, Download, Sparkles, CheckCircle, FileText, FileCheck } from 'lucide-react';
import {
  TaskTable1,
  TaskTable2,
  ReportMetadata,
  validateReport,
  classifyTask
} from './utils/reportUtils';
import { fetchSyncedData, exportWordReport } from './services/api';
import { parseExcelFile, downloadExcelTemplate } from './utils/excelParser';

const initialDataSample = {
  metadata: {
    tuan: 42,
    tuan_tiep: 43,
    nam: 2024,
    nguoi_lap: "Trần Thuận Hóa",
    don_vi: "VĂN PHÒNG",
    co_quan_cap_tren: "BAN QUẢN LÝ CÁC KHU LIÊN HỢP XỬ LÝ CHẤT THẢI THÀNH PHỐ",
    ngay_lap: "20/10/2024"
  },
  table1: [
    {
      id: "t1_1",
      noi_dung: "Rà soát hồ sơ công chức quý IV",
      thoi_gian: "15/10/2024",
      trien_khai: "Đã hoàn thành rà soát 45 bộ hồ sơ",
      tien_do: "Hoàn thành",
      nhom: "Thường xuyên",
      isEdited: false
    },
    {
      id: "t1_2",
      noi_dung: "Báo cáo tổng kết tháng",
      thoi_gian: "Chưa nhập",
      trien_khai: "Đang soạn thảo văn bản",
      tien_do: "Đang thực hiện",
      nhom: "Thường xuyên",
      isEdited: true
    },
    {
      id: "t1_3",
      noi_dung: "Phối hợp tổ chức Hội nghị Chuyển đổi số",
      thoi_gian: "20/10/2024",
      trien_khai: "Đã gửi giấy mời, chốt danh sách đại biểu",
      tien_do: "Đang thực hiện",
      nhom: "Đột xuất",
      isEdited: false
    },
    {
      id: "t1_4",
      noi_dung: "Kiểm tra công tác lưu trữ hồ sơ",
      thoi_gian: "18/10/2024",
      trien_khai: "Đã thực hiện tại 3 đơn vị trực thuộc",
      tien_do: "Hoàn thành",
      nhom: "Thường xuyên",
      isEdited: false
    },
    {
      id: "t1_5",
      noi_dung: "Tập huấn phần mềm quản lý văn bản",
      thoi_gian: "22/10/2024",
      trien_khai: "Chuẩn bị tài liệu và phòng họp",
      tien_do: "Đang thực hiện",
      nhom: "Đột xuất",
      isEdited: false
    },
    {
      id: "t1_6",
      noi_dung: "Tổng hợp đề xuất khen thưởng",
      thoi_gian: "Chưa nhập",
      trien_khai: "Đã gửi văn bản nhắc nhở các phòng ban",
      tien_do: "Hoàn thành",
      nhom: "Thường xuyên",
      isEdited: false
    }
  ] as TaskTable1[],
  table2: [
    {
      id: "t2_1",
      noi_dung: "Tiếp nhận hồ sơ trực tuyến",
      thoi_gian_du_kien: "Hàng ngày",
      san_pham_du_kien: "100% hồ sơ được giải quyết đúng hạn",
      nhom: "Thường xuyên",
      isEdited: false
    },
    {
      id: "t2_2",
      noi_dung: "Xây dựng kế hoạch công tác quý I",
      thoi_gian_du_kien: "28/10/2024",
      san_pham_du_kien: "Dự thảo văn bản trình Lãnh đạo duyệt",
      nhom: "Thường xuyên",
      isEdited: false
    },
    {
      id: "t2_3",
      noi_dung: "Kiểm tra thực địa dự án A",
      thoi_gian_du_kien: "25/10/2024",
      san_pham_du_kien: "Biên bản ghi nhận hiện trạng chi tiết",
      nhom: "Đột xuất",
      isEdited: false
    },
    {
      id: "t2_4",
      noi_dung: "Đánh giá chất lượng dịch vụ công",
      thoi_gian_du_kien: "30/10/2024",
      san_pham_du_kien: "Báo cáo phân tích dữ liệu khảo sát hài lòng",
      nhom: "Thường xuyên",
      isEdited: false
    }
  ] as TaskTable2[]
};

export default function App() {
  const [metadata, setMetadata] = useState<ReportMetadata>(initialDataSample.metadata);

  // Bước 1: Khi mở phần mềm, không tải dữ liệu ngay
  const [hasLoadedData, setHasLoadedData] = useState<boolean>(false);
  const [table1, setTable1] = useState<TaskTable1[]>([]);
  const [table2, setTable2] = useState<TaskTable2[]>([]);

  // Snapshot lưu trạng thái ban đầu để Khôi phục (BR13)
  const [initialSnapshot, setInitialSnapshot] = useState<{
    table1: TaskTable1[];
    table2: TaskTable2[];
  }>({
    table1: [],
    table2: []
  });

  const [syncedAt, setSyncedAt] = useState<string>("Chưa đồng bộ");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  // Lấy lỗi validation (BR14)
  const validationErrors = validateReport(table1, table2);

  // Nạp dữ liệu mẫu thử nghiệm
  const handleLoadSampleData = () => {
    setTable1(initialDataSample.table1);
    setTable2(initialDataSample.table2);
    setInitialSnapshot({
      table1: JSON.parse(JSON.stringify(initialDataSample.table1)),
      table2: JSON.parse(JSON.stringify(initialDataSample.table2))
    });
    setHasLoadedData(true);
    setSyncedAt(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    showToast("Đã nạp dữ liệu mẫu thành công và tự động điền vào Form Word!");
  };

  // Import từ File Sheet (.xlsx / .csv)
  const handleImportFile = async (file: File) => {
    setIsLoading(true);
    try {
      const parsed = await parseExcelFile(file);
      setTable1(parsed.table1);
      setTable2(parsed.table2);

      setInitialSnapshot({
        table1: JSON.parse(JSON.stringify(parsed.table1)),
        table2: JSON.parse(JSON.stringify(parsed.table2))
      });

      setHasLoadedData(true);
      const currentTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      setSyncedAt(currentTime);

      showToast(`Đã import thành công tệp "${file.name}" (${parsed.table1.length + parsed.table2.length} nhiệm vụ) và tự động điền vào Form Word!`);
    } catch (err: any) {
      alert("Lỗi khi đọc file: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Đồng bộ Google Sheet
  const handleSync = async () => {
    setIsLoading(true);
    const result = await fetchSyncedData();
    setIsLoading(false);

    if (result && result.data) {
      if (result.data.metadata) setMetadata(result.data.metadata);
      if (result.data.table1) {
        const classifiedT1 = result.data.table1.map((item: any) => ({
          ...item,
          nhom: item.nhom || classifyTask(item.noi_dung),
          isEdited: false
        }));
        setTable1(classifiedT1);
      }
      if (result.data.table2) {
        const classifiedT2 = result.data.table2.map((item: any) => ({
          ...item,
          nhom: item.nhom || classifyTask(item.noi_dung),
          isEdited: false
        }));
        setTable2(classifiedT2);
      }
      if (result.syncedAt) setSyncedAt(result.syncedAt);

      setInitialSnapshot({
        table1: JSON.parse(JSON.stringify(result.data.table1 || [])),
        table2: JSON.parse(JSON.stringify(result.data.table2 || []))
      });

      setHasLoadedData(true);
      showToast("Đã đồng bộ thành công dữ liệu từ Google Sheet và tự động điền sẵn vào Mẫu Word!");
    }
  };

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Đồng bộ lại
  const handleReset = () => {
    handleSync();
  };

  // BR13: Nút Khôi phục dữ liệu ban đầu
  const handleRestore = () => {
    if (initialSnapshot.table1.length === 0 && initialSnapshot.table2.length === 0) {
      alert("Chưa có snapshot dữ liệu để khôi phục.");
      return;
    }
    setTable1(JSON.parse(JSON.stringify(initialSnapshot.table1)));
    setTable2(JSON.parse(JSON.stringify(initialSnapshot.table2)));
    showToast("Đã khôi phục dữ liệu về trạng thái ban đầu vừa nhập!");
  };

  // Cuộn đến dòng lỗi
  const handleScrollToRow = (rowId: string) => {
    setHighlightedRowId(rowId);
    const element = document.getElementById(`row_${rowId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => {
      setHighlightedRowId(null);
    }, 2000);
  };

  // Xuất file Word .docx
  const handleGenerateWord = () => {
    if (!hasLoadedData || (table1.length === 0 && table2.length === 0)) {
      alert("Vui lòng Import File Sheet hoặc Đồng bộ dữ liệu trước khi xuất báo cáo!");
      return;
    }
    exportWordReport({
      metadata,
      table1,
      table2
    });
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden text-slate-800 bg-[#f9f9ff]">
      {/* HEADER CỐ ĐỊNH */}
      <Header metadata={metadata} setMetadata={setMetadata} />

      {/* THANH CÔNG CỤ CỐ ĐỊNH */}
      <Toolbar
        metadata={metadata}
        setMetadata={setMetadata}
        onSync={handleSync}
        onReset={handleReset}
        onRestore={handleRestore}
        syncedAt={syncedAt}
        totalTasks={table1.length + table2.length}
        onGenerateWord={handleGenerateWord}
        onOpenPreview={() => setIsPreviewOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        isLoading={isLoading}
        onImportFile={handleImportFile}
      />

      {/* THÔNG BÁO TOAST */}
      {statusMessage && (
        <div className="bg-emerald-600 text-white px-6 py-2.5 text-xs font-semibold flex items-center justify-between shadow-md z-50 transition-all animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-200" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-emerald-200 hover:text-white cursor-pointer font-bold">✕</button>
        </div>
      )}

      {/* NỘI DUNG CHÍNH (Layout Grid) */}
      <main className="flex-1 overflow-hidden grid grid-cols-12 gap-0 relative">
        {!hasLoadedData ? (
          /* BƯỚC 1: Màn hình khởi tạo chưa có dữ liệu */
          <div className="col-span-12 flex flex-col items-center justify-center p-8 bg-slate-50/80 overflow-y-auto">
            <div className="max-w-3xl w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-8 space-y-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 text-[#005dac] border border-blue-100 shadow-2xs mb-2">
                <FileSpreadsheet className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-[#001e30] tracking-tight">
                  HỆ THỐNG TỰ ĐỘNG HÓA BÁO CÁO TUẦN CƠ QUAN
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xl mx-auto leading-relaxed">
                  Nhập dữ liệu từ tệp Excel / CSV hoặc Đồng bộ Google Sheet để tự động xử lý nghiệp vụ, tự chia nhóm, đánh lại số thứ tự và điền sẵn vào mẫu Word báo cáo hành chính.
                </p>
              </div>

              {/* Nút hành động chính */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto pt-2">
                <label className="flex flex-col items-center justify-center p-6 bg-[#005dac] hover:bg-[#004786] text-white rounded-xl shadow-md border border-[#004786] cursor-pointer transition-all hover:scale-[1.02] group">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleImportFile(e.target.files[0]);
                        e.target.value = '';
                      }
                    }}
                    className="hidden"
                  />
                  <Upload className="w-8 h-8 text-amber-300 mb-2 group-hover:bounce" />
                  <span className="font-bold text-sm">Import File Sheet (.xlsx / .csv)</span>
                  <span className="text-[11px] text-blue-100 mt-1">Tự động đọc &amp; điền Form Word</span>
                </label>

                <button
                  onClick={handleSync}
                  disabled={isLoading}
                  className="flex flex-col items-center justify-center p-6 bg-white hover:bg-blue-50 text-[#005dac] rounded-xl shadow-md border border-[#005dac] cursor-pointer transition-all hover:scale-[1.02] group"
                >
                  <RefreshCw className={`w-8 h-8 text-[#005dac] mb-2 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="font-bold text-sm">Đồng bộ Google Sheet</span>
                  <span className="text-[11px] text-slate-500 mt-1">Kết nối trực tiếp qua Apps Script</span>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-center gap-4 text-xs">
                <button
                  onClick={downloadExcelTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition-all font-medium cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  Tải Mẫu File Excel chuẩn (.xlsx)
                </button>

                <button
                  onClick={handleLoadSampleData}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg border border-amber-200 transition-all font-medium cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Nạp Dữ Liệu Thử Nghiệm
                </button>
              </div>

              {/* Thông tin chuẩn Word Template */}
              <div className="bg-blue-50/70 rounded-xl p-3 text-left border border-blue-100 text-xs text-slate-600 flex items-start gap-3">
                <FileCheck className="w-5 h-5 text-[#005dac] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800">Cam kết thể thức văn bản hành chính (Nghị định 30/2020/NĐ-CP):</strong>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Mẫu Word cố định được bảo lưu 100% Font chữ (Times New Roman 13-14pt), căn lề, khoảng cách dòng, Header, Footer và Bố cục bảng tự động mở rộng theo từng nhiệm vụ.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* MÀN HÌNH CHÍNH CÓ DỮ LIỆU */
          <>
            <TableEditor
              table1={table1}
              setTable1={setTable1}
              table2={table2}
              setTable2={setTable2}
              highlightedRowId={highlightedRowId}
              tuan={metadata.tuan}
              tuanTiep={metadata.tuan_tiep}
              nam={metadata.nam}
            />

            <ValidationPanel
              errors={validationErrors}
              onScrollToRow={handleScrollToRow}
              table1={table1}
            />
          </>
        )}
      </main>

      {/* THANH TRẠNG THÁI CỐ ĐỊNH */}
      <Footer table1={table1} table2={table2} />

      {/* MODAL XEM TRƯỚC / IN / TẢI BÁO CÁO */}
      <PreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        table1={table1}
        table2={table2}
        metadata={metadata}
        onDownloadWord={handleGenerateWord}
      />

      {/* MODAL MÃ GOOGLE APPS SCRIPT */}
      <ConfigModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}

