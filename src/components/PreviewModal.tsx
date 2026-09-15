import React, { useRef } from 'react';
import { X, FileSpreadsheet, Printer } from 'lucide-react';
import { TaskTable1, TaskTable2, ReportMetadata, processTable1, processTable2 } from '../utils/reportUtils';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  table1: TaskTable1[];
  table2: TaskTable2[];
  metadata: ReportMetadata;
  onDownloadWord: () => void;
}

function formatNgayLap(rawDate?: string): string {
  if (!rawDate || !rawDate.trim()) {
    const now = new Date();
    return `Thành phố Hồ Chí Minh, ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
  }

  const val = rawDate.trim();
  if (val.toLowerCase().startsWith('thành phố')) return val;
  if (val.toLowerCase().startsWith('ngày') || val.toLowerCase().includes('tháng')) {
    return `Thành phố Hồ Chí Minh, ${val}`;
  }

  // Định dạng chuỗi ngày dạng dd/mm/yyyy
  if (val.includes('/')) {
    const parts = val.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parts[2];
      if (!isNaN(day) && !isNaN(month)) {
        return `Thành phố Hồ Chí Minh, ngày ${day} tháng ${month} năm ${year}`;
      }
    }
  } else if (val.includes('-')) {
    const parts = val.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month)) {
        return `Thành phố Hồ Chí Minh, ngày ${day} tháng ${month} năm ${year}`;
      }
    }
  }

  return `Thành phố Hồ Chí Minh, ${val}`;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  table1,
  table2,
  metadata,
  onDownloadWord
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const p1 = processTable1(table1);
  const p2 = processTable2(table2);

  const handlePrint = () => {
    if (!printRef.current) return;

    // Tạo Iframe ẩn riêng biệt để cô lập hoàn toàn nội dung in với giao diện web
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = 'none';

    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document;
    if (!doc) return;

    const contentHtml = printRef.current.innerHTML;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title></title>
          <style>
            /* 
              Cấu hình lề trang in A4 chuẩn NĐ 30/2020/NĐ-CP cho TẤT CẢ CÁC TRANG (Trang 1, Trang 2, Trang 3...):
              - Trên (Top): 2cm (20mm)
              - Phải (Right): 2cm (20mm)
              - Dưới (Bottom): 2cm (20mm)
              - Trái (Left): 3cm (30mm)
            */
            @page {
              size: A4 portrait;
              margin: 20mm 20mm 20mm 30mm;
            }
            body {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              font-family: 'Times New Roman', Times, serif;
              font-size: 13pt;
              color: #000000;
              background: #ffffff;
              line-height: 1.4;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .whitespace-nowrap { white-space: nowrap !important; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .text-justify { text-align: justify; }
            .font-bold { font-weight: bold; }
            .font-normal { font-weight: normal; }
            .italic { font-style: italic; }
            .uppercase { text-transform: uppercase; }
            .underline { text-decoration: underline; }
            .indent-8 { text-indent: 2rem; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .items-start { align-items: flex-start; }
            .mx-auto { margin-left: auto; margin-right: auto; }
            .mb-1 { margin-bottom: 0.25rem; }
            .mb-1\.5 { margin-bottom: 0.375rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .mt-1 { margin-top: 0.25rem; }
            .mt-2 { margin-top: 0.5rem; }
            .pt-1 { padding-top: 0.25rem; }
            .pt-4 { padding-top: 1rem; }
            .pl-4 { padding-left: 1rem; }
            .px-1 { padding-left: 0.25rem; padding-right: 0.25rem; }
            .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
            .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
            .py-1.5 { padding-top: 0.375rem; padding-bottom: 0.375rem; }
            .w-full { width: 100%; }
            .w-12 { width: 3rem; }
            .w-16 { width: 4rem; }
            .w-28 { width: 7rem; }
            .w-32 { width: 8rem; }
            .w-36 { width: 9rem; }
            .h-20 { height: 5rem; }
            .h-\\[1px\\] { height: 1px; background-color: #000000 !important; }
            .bg-black { background-color: #000000 !important; }
            .bg-slate-50 { background-color: #f8fafc; }
            .bg-slate-100 { background-color: #f1f5f9; }
            .border-t { border-top: 1px solid #000000 !important; }
            .border-black { border-color: #000000 !important; }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 0.5rem;
              margin-bottom: 0.5rem;
              font-size: 11pt;
              page-break-inside: auto;
            }
            th, td {
              border: 1px solid #000000;
              padding: 5px 6px;
              vertical-align: top;
            }
            th {
              background-color: #f8fafc;
              font-weight: bold;
              text-align: center;
            }
            tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            thead {
              display: table-header-group;
            }
            .text-\\[11pt\\] { font-size: 11pt; }
            .text-\\[11\\.5pt\\] { font-size: 11.5pt; }
            .text-\\[12pt\\] { font-size: 12pt; }
            .text-\\[13pt\\] { font-size: 13pt; }
            .text-\\[14pt\\] { font-size: 14pt; }
            .text-\\[9\\.5pt\\] { font-size: 9.5pt; }
            .leading-tight { line-height: 1.25; }
            .leading-snug { line-height: 1.375; }
            .leading-relaxed { line-height: 1.625; }
            .space-y-0\\.5 > * + * { margin-top: 0.125rem; }
          </style>
        </head>
        <body>
          ${contentHtml}
        </body>
      </html>
    `);
    doc.close();

    printFrame.contentWindow?.focus();
    setTimeout(() => {
      printFrame.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
      }, 1000);
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-[#005dac] text-white px-6 py-3.5 flex items-center justify-between">
          <h3 className="font-bold text-base flex items-center gap-2">
            <span>Xem trước Báo cáo Hành chính (Mẫu chuẩn NĐ 30/2020/NĐ-CP)</span>
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onDownloadWord}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" /> Tải file Word (.docx)
            </button>
            <button
              onClick={handlePrint}
              className="bg-white text-[#005dac] hover:bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" /> In / Lưu PDF
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - Paper Preview */}
        <div className="p-8 overflow-y-auto bg-slate-100 flex-1">
          <div
            ref={printRef}
            className="print-paper-content bg-white p-10 max-w-[210mm] mx-auto shadow-md border border-slate-200 text-slate-900 leading-normal print:p-0 print:shadow-none print:border-none"
            style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '13pt' }}
          >
            {/* THỂ THỨC HÀNH CHÍNH VĂN BẢN (NĐ 30/2020/NĐ-CP) */}
            <div className="flex justify-center items-start mb-2 w-full gap-16">
              {/* Bên trái: Cơ quan chủ quản & Đơn vị */}
              <div className="text-center text-[12pt] leading-tight">
                <div className="uppercase font-normal">
                  <span className="whitespace-nowrap">BAN QUẢN LÝ CÁC KHU LIÊN HỢP</span>
                  <br />
                  <span className="whitespace-nowrap">XỬ LÝ CHẤT THẢI THÀNH PHỐ</span>
                </div>
                <div className="font-bold uppercase text-[12pt] mt-0.5">{'VĂN PHÒNG'}</div>
                <div className="w-16 border-t border-black mx-auto mt-1" />
              </div>

              {/* Bên phải: Quốc hiệu & Tiêu ngữ */}
              <div className="text-center text-[12pt] leading-tight">
                <div className="font-bold uppercase text-[12pt] whitespace-nowrap">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div className="font-bold text-[13pt] whitespace-nowrap mt-0.5">Độc lập – Tự do – Hạnh phúc</div>
                <div className="w-36 border-t border-black mx-auto mt-1" />
              </div>
            </div>

            {/* Địa danh và Ngày tháng năm */}
            <div className="text-right italic text-[13pt] mb-6">
              {formatNgayLap(metadata.ngay_lap)}
            </div>

            {/* TIÊU ĐỀ BÁO CÁO */}
            <div className="text-center font-bold uppercase text-[14pt] mb-1">
              BÁO CÁO
            </div>
            <div className="text-center font-bold text-[13pt] mb-4">
              Kết quả thực hiện nhiệm vụ Tuần {metadata.tuan} trọng tâm công tác Tuần {metadata.tuan_tiep}
            </div>

            {/* KÍNH GỬI VÀ LỜI MỞ ĐẦU */}
            <div className="mb-4">
              <div className="font-bold text-center mb-2 text-[13pt]">
                Kính gửi: Chánh Văn Phòng.
              </div>
              <div className="text-justify indent-8 leading-relaxed">
                Báo cáo tình hình thực hiện nhiệm vụ Tuần {metadata.tuan} và phương hướng thực hiện nhiệm vụ trọng tâm công tác Tuần {metadata.tuan_tiep} như sau:
              </div>
            </div>

            {/* MỤC I: BẢNG KẾT QUẢ CÔNG TÁC */}
            <div className="mb-6">
              <div className="font-bold text-[13pt] mb-2">
                I. Kết quả thực hiện công tác Tuần {metadata.tuan}
              </div>

              <table className="w-full border-collapse border border-black text-[11pt]">
                <thead>
                  <tr className="bg-slate-50 font-bold text-center">
                    <th className="border border-black px-2 py-1.5 w-12">STT</th>
                    <th className="border border-black px-2 py-1.5">Nội dung nhiệm vụ/ công tác được giao<sup>1</sup>.</th>
                    <th className="border border-black px-2 py-1.5 w-32">Thời gian được giao hoàn thiện nhiệm vụ</th>
                    <th className="border border-black px-2 py-1.5">Triển khai thực hiện<sup>2</sup>.</th>
                    <th className="border border-black px-2 py-1.5 w-28">Tiến độ thực hiện<sup>3</sup>.</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Nhóm I */}
                  <tr className="bg-slate-50">
                    <td className="border border-black px-2 py-1 text-center font-bold">I</td>
                    <td colSpan={4} className="border border-black px-2 py-1 font-bold italic">
                      Nhiệm vụ thường xuyên (<span className="font-bold px-1">{p1.txStats.done}</span> / {p1.txStats.total} Nhiệm vụ hoàn thành/tổng số nhiệm vụ được giao trong tuần)
                    </td>
                  </tr>
                  {p1.thuongXuyen.map(row => (
                    <tr key={row.id}>
                      <td className="border border-black px-2 py-1 text-center">{row.stt}</td>
                      <td className="border border-black px-2 py-1">{row.noi_dung}</td>
                      <td className="border border-black px-2 py-1 text-center">{row.thoi_gian}</td>
                      <td className="border border-black px-2 py-1">{row.trien_khai}</td>
                      <td className="border border-black px-2 py-1 text-center">{row.tien_do}</td>
                    </tr>
                  ))}

                  {/* Nhóm II */}
                  <tr className="bg-slate-50">
                    <td className="border border-black px-2 py-1 text-center font-bold">II</td>
                    <td colSpan={4} className="border border-black px-2 py-1 font-bold italic">
                      Nhiệm vụ theo bút phê, chỉ đạo đột xuất (cuộc họp, giao ban, Phần mềm quản lý văn bản…) (<span className="font-bold px-1">{p1.dxStats.done}</span>/{p1.dxStats.total} Nhiệm vụ, công văn hoàn thành/tổng số nhiệm vụ, công văn được giao trong tuần)
                    </td>
                  </tr>
                  {p1.dotXuat.map(row => (
                    <tr key={row.id}>
                      <td className="border border-black px-2 py-1 text-center">{row.stt}</td>
                      <td className="border border-black px-2 py-1">{row.noi_dung}</td>
                      <td className="border border-black px-2 py-1 text-center">{row.thoi_gian}</td>
                      <td className="border border-black px-2 py-1">{row.trien_khai}</td>
                      <td className="border border-black px-2 py-1 text-center">{row.tien_do}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Chú thích Bảng I */}
              <div className="mt-2 text-[9.5pt] leading-tight space-y-0.5">
                <div className="w-36 h-[1px] bg-black mb-1.5" />
                <div><sup>1</sup> Nêu đầu mục nhiệm vụ mang tính bao quát, tổng thể</div>
                <div><sup>2</sup> Các công việc đã triển khai thực hiện liên quan đến nhiệm vụ đã thực hiện trong tuần, kèm sản phẩm cụ thể (nếu có).</div>
                <div><sup>3</sup> Đánh giá tiến độ thực hiện công việc: Hoàn thành – đúng hạn, hoàn thành – trễ hạn, đang thực hiện – chưa tới hạn, đang thực hiện – quá hạn.</div>
              </div>
            </div>

            {/* MỤC II: KẾ HOẠCH CÔNG TÁC TUẦN TIẾP THEO */}
            <div className="mb-6">
              <div className="font-bold text-[13pt] mb-2">
                II. Kế hoạch thực hiện công tác Tuần {metadata.tuan_tiep} (Tuần tiếp theo)
              </div>

              <table className="w-full border-collapse border border-black text-[11pt]">
                <thead>
                  <tr className="bg-slate-50 font-bold text-center">
                    <th className="border border-black px-2 py-1.5 w-12">STT</th>
                    <th className="border border-black px-2 py-1.5">Nhiệm vụ/công tác</th>
                    <th className="border border-black px-2 py-1.5 w-32">Thời gian dự kiến hoàn thành</th>
                    <th className="border border-black px-2 py-1.5">Nội dung và sản phẩm dự kiến thực hiện<sup>4</sup>.</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-slate-50">
                    <td className="border border-black px-2 py-1 text-center font-bold">I</td>
                    <td colSpan={3} className="border border-black px-2 py-1 font-bold">
                      Nhiệm vụ thường xuyên
                    </td>
                  </tr>
                  {p2.thuongXuyen.map(row => (
                    <tr key={row.id}>
                      <td className="border border-black px-2 py-1 text-center">{row.stt}</td>
                      <td className="border border-black px-2 py-1">{row.noi_dung}</td>
                      <td className="border border-black px-2 py-1 text-center">{row.thoi_gian_du_kien}</td>
                      <td className="border border-black px-2 py-1">{row.san_pham_du_kien}</td>
                    </tr>
                  ))}

                  <tr className="bg-slate-50">
                    <td className="border border-black px-2 py-1 text-center font-bold">II</td>
                    <td colSpan={3} className="border border-black px-2 py-1 font-bold">
                      Nhiệm vụ theo bút phê, chỉ đạo đột xuất (cuộc họp, giao ban, Phần mềm quản lý văn bản…)
                    </td>
                  </tr>
                  {p2.dotXuat.map(row => (
                    <tr key={row.id}>
                      <td className="border border-black px-2 py-1 text-center">{row.stt}</td>
                      <td className="border border-black px-2 py-1">{row.noi_dung}</td>
                      <td className="border border-black px-2 py-1 text-center">{row.thoi_gian_du_kien}</td>
                      <td className="border border-black px-2 py-1">{row.san_pham_du_kien}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Chú thích Bảng II */}
              <div className="mt-2 text-[9.5pt] leading-tight space-y-0.5">
                <div className="w-36 h-[1px] bg-black mb-1.5" />
                <div><sup>4</sup> Nội dung dự kiến thực hiện bao gồm các nhiệm vụ con liên quan đến nhiệm vụ tổng thể, bao quát được giao.</div>
                <div>Sản phẩm dự kiến: Quyết định, Công văn, Phiếu trình, Tờ trình….</div>
              </div>
            </div>

            {/* MỤC III: KHÓ KHĂN, VƯỚNG MẮC */}
            <div className="mb-6">
              <div className="font-bold text-[13pt] mb-1">
                III. Khó khăn, vướng mắc, đề xuất kiến nghị (nếu có)
              </div>
              <div className="pl-4">
                {metadata.kho_khan || 'Không'}
              </div>
            </div>

            {/* CHỮ KÝ HÀNH CHÍNH & NƠI NHẬN (CẮT GÓC CHUẨN NĐ 30/2020/NĐ-CP) */}
            <div className="flex justify-between items-start text-[11pt] pt-4">
              {/* Nơi nhận (Góc dưới bên trái) */}
              <div className="text-left leading-snug">
                <div className="font-bold italic text-[12pt]">Nơi nhận:</div>
                <div className="text-[11pt]">
                  <div>- Như trên;</div>
                  <div>- Bộ phận Tổng hợp;</div>
                  <div>- Lưu: VP.</div>
                </div>
              </div>

              {/* Chức danh & Chữ ký (Góc dưới bên phải) */}
              <div className="text-center">
                <div className="font-bold uppercase text-[12pt]">NGƯỜI BÁO CÁO</div>
                <div className="h-20" /> {/* Khoảng trống 3-4 dòng cho chữ ký */}
                <div className="font-bold text-[13pt]">{'Trần Thuận Hóa'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};