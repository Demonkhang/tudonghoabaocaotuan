import React, { useRef } from 'react';
import { X, FileSpreadsheet, Printer, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { TaskTable1, TaskTable2, ReportMetadata, processTable1, processTable2, formatNgayLap } from '../utils/reportUtils';
import { DocInspectionStatItem, ConsolidatedReportMetaItem } from './DocInspectionModal';

export interface ReportSignatureItem {
  id?: string;
  report_id?: string;
  account_id: string;
  account_name: string;
  position_level?: string;
  department_name?: string;
  signature_url?: string;
  signed_at: string;
  pin_verified?: boolean;
  status?: 'SIGNED' | 'REJECTED';
  note?: string;
}

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  table1: TaskTable1[];
  table2: TaskTable2[];
  metadata: ReportMetadata;
  setMetadata?: React.Dispatch<React.SetStateAction<ReportMetadata>>;
  onDownloadWord: () => void;
  reportType?: 'SINGLE' | 'CONSOLIDATED_OFFICE';
  docInspectionStats?: DocInspectionStatItem[];
  consolidatedMeta?: ConsolidatedReportMetaItem;
  reportSignatures?: ReportSignatureItem[];
  onOpenDigitalSignature?: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  table1,
  table2,
  metadata,
  onDownloadWord,
  reportType = 'SINGLE',
  docInspectionStats = [],
  consolidatedMeta,
  reportSignatures = [],
  onOpenDigitalSignature
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const isConsolidated = reportType === 'CONSOLIDATED_OFFICE';

  // Lấy dữ liệu riêng cho từng team
  const vtTable1 = table1.filter(t => (t.team_code || 'VAN_THU') === 'VAN_THU');
  const cdsTable1 = table1.filter(t => t.team_code === 'CDS');
  const vtTable2 = table2.filter(t => (t.team_code || 'VAN_THU') === 'VAN_THU');
  const cdsTable2 = table2.filter(t => t.team_code === 'CDS');

  const p1 = processTable1(table1);
  const p2 = processTable2(table2);

  const p1_vt = processTable1(vtTable1);
  const p1_cds = processTable1(cdsTable1);
  const p2_vt = processTable2(vtTable2);
  const p2_cds = processTable2(cdsTable2);

  // Danh sách 6 phòng ban cố định cho Mục III Thể thức
  const defaultDeptStats = [
    { department_name: 'Văn phòng', total_checked: 1, error_count: 0 },
    { department_name: 'Phòng Kế hoạch Tài chính', total_checked: 12, error_count: 0 },
    { department_name: 'Phòng Quản lý Dự án', total_checked: 11, error_count: 4 },
    { department_name: 'Phòng Giám sát Khu liên hợp', total_checked: 5, error_count: 1 },
    { department_name: 'Phòng Giám sát Khối lượng', total_checked: 0, error_count: 0 },
    { department_name: 'Phòng Kiểm tra Môi trường', total_checked: 11, error_count: 2 }
  ];

  const activeStats = docInspectionStats && docInspectionStats.length > 0
    ? docInspectionStats
    : defaultDeptStats;

  const handlePrint = () => {
    if (!printRef.current) return;

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
            .border-none { border: none !important; }
            .gap-16 { gap: 4rem; }
            .justify-center { justify-content: center; }
            
            .header-table {
              width: 100% !important;
              border-collapse: collapse !important;
              border: none !important;
              margin-top: 0 !important;
              margin-bottom: 0.5rem !important;
            }
            .header-table td {
              border: none !important;
              padding: 0 !important;
              vertical-align: top !important;
              text-align: center !important;
            }
            
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
              display: table-row-group !important;
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

  const renderSignatureStamp = (signerName?: string) => {
    if (!signerName || !reportSignatures || reportSignatures.length === 0) return null;
    const sig = reportSignatures.find(s => 
      (s.account_name && signerName && s.account_name.toLowerCase().includes(signerName.toLowerCase())) ||
      (s.account_name && signerName && signerName.toLowerCase().includes(s.account_name.toLowerCase()))
    );
    if (!sig) return null;

    return (
      <div className="my-1 flex flex-col items-center justify-center">
        {sig.signature_url ? (
          <img src={sig.signature_url} alt="Chữ ký tay" className="h-14 object-contain drop-shadow-xs" />
        ) : (
          <div className="font-extrabold italic text-blue-900 text-sm">{sig.account_name}</div>
        )}
        <div className="mt-0.5 border border-emerald-600 bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded text-[8.5pt] font-sans font-bold flex flex-col items-center leading-tight">
          <span className="text-emerald-700 font-extrabold flex items-center gap-1">
            ✓ ĐÃ KÝ SỐ XÁC THỰC PIN
          </span>
          <span className="text-[7.5pt] text-slate-600 font-mono">
            {sig.signed_at ? new Date(sig.signed_at).toLocaleString('vi-VN') : ''}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Modal Header */}
        <div className="bg-[#005dac] text-white px-6 py-3.5 flex items-center justify-between">
          <h3 className="font-bold text-base flex items-center gap-2">
            <span>{isConsolidated ? 'Xem trước Báo cáo Tuần Tổng hợp Văn phòng (Nghị định 30/2020/NĐ-CP)' : 'Xem trước Báo cáo Hành chính (Mẫu chuẩn NĐ 30/2020/NĐ-CP)'}</span>
          </h3>
          <div className="flex items-center gap-2">
            {onOpenDigitalSignature && (
              <button
                onClick={onOpenDigitalSignature}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border border-amber-300"
              >
                <ShieldCheck className="w-4 h-4" /> Ký Số (PIN 6 Số)
              </button>
            )}
            <button
              onClick={onDownloadWord}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4" /> Tải file Word (.docx)
            </button>
            <button
              onClick={handlePrint}
              className="bg-white text-[#005dac] hover:bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
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

        {/* Status Banner for Digital Signatures */}
        {reportSignatures && reportSignatures.length > 0 && (
          <div className="bg-emerald-950 text-emerald-200 px-6 py-2 text-xs flex items-center justify-between border-b border-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Báo cáo đã có {reportSignatures.length} Chữ ký số xác thực PIN:</strong>{' '}
                {reportSignatures.map(s => `${s.account_name} (${s.position_level || 'Chữ ký'})`).join(', ')}
              </span>
            </div>
            <span className="text-[10px] bg-emerald-800/80 px-2 py-0.5 rounded font-mono font-bold">
              XÁC THỰC AN TOÀN SA-256
            </span>
          </div>
        )}

        {/* Modal Body - Paper Preview */}
        <div className="p-8 overflow-y-auto bg-slate-100 flex-1">
          <div
            ref={printRef}
            className="print-paper-content bg-white p-10 max-w-[210mm] mx-auto shadow-md border border-slate-200 text-slate-900 leading-normal print:p-0 print:shadow-none print:border-none"
            style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '13pt' }}
          >
            {/* THỂ THỨC HÀNH CHÍNH VĂN BẢN (NĐ 30/2020/NĐ-CP) */}
            <table className="w-full mb-2 header-table" style={{ width: '100%', border: 'none', borderCollapse: 'collapse', marginBottom: '0.5rem' }}>
              <tbody>
                <tr>
                  <td style={{ width: '45%', border: 'none', verticalAlign: 'top', textAlign: 'center', padding: 0 }}>
                    <div className="text-center text-[12pt] leading-tight">
                      <div className="uppercase font-normal">
                        <span className="whitespace-nowrap">BAN QUẢN LÝ CÁC KHU LIÊN HỢP</span>
                        <br />
                        <span className="whitespace-nowrap">XỬ LÝ CHẤT THẢI THÀNH PHỐ</span>
                      </div>
                      <div className="font-bold uppercase text-[12pt] mt-0.5">VĂN PHÒNG</div>
                      <div className="w-28 h-[1px] bg-black mx-auto mt-1" />
                    </div>
                  </td>
                  <td style={{ width: '55%', border: 'none', verticalAlign: 'top', textAlign: 'center', padding: 0 }}>
                    <div className="text-center text-[12pt] leading-tight">
                      <div className="font-bold uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                      <div className="font-bold text-[13pt] mt-0.5">Độc lập - Tự do - Hạnh phúc</div>
                      <div className="w-36 h-[1px] bg-black mx-auto mt-1" />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* NGÀY THÁNG */}
            <div className="text-right italic text-[13pt] mb-4">
              {formatNgayLap(metadata.ngay_lap)}
            </div>

            {/* TIÊU ĐỀ BÁO CÁO */}
            <div className="text-center mb-6">
              <div className="font-bold text-[14pt] uppercase">BÁO CÁO</div>
              <div className="font-bold text-[13pt] mt-1">
                Kết quả thực hiện nhiệm vụ Tuần {metadata.tuan} trọng tâm công tác Tuần {metadata.tuan_tiep}
              </div>
              <div className="font-bold text-[13pt] mt-1">
                Kính gửi: Chánh Văn Phòng.
              </div>
            </div>

            {/* LỜI MỞ ĐẦU */}
            <div className="text-justify indent-8 leading-relaxed text-[13pt] mb-4">
              Báo cáo tình hình thực hiện nhiệm vụ Tuần {metadata.tuan} và phương hướng thực hiện nhiệm vụ trọng tâm công tác Tuần {metadata.tuan_tiep} như sau:
            </div>

            {/* MỤC I: BẢNG KẾT QUẢ CÔNG TÁC TUẦN */}
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
                    <th className="border border-black px-2 py-1.5 w-32">Tiến độ thực hiện<sup>3</sup>.</th>
                  </tr>
                </thead>
                <tbody>
                  {isConsolidated ? (
                    <>
                      {/* I. NHÓM THƯỜNG XUYÊN */}
                      {(p1_vt.thuongXuyen.length > 0 || p1_cds.thuongXuyen.length > 0) && (
                        <>
                          <tr className="bg-slate-50">
                            <td className="border border-black px-2 py-1 text-center font-bold">I</td>
                            <td colSpan={4} className="border border-black px-2 py-1 font-bold italic">
                              Nhiệm vụ thường xuyên (<span className="font-bold px-1">{p1.txStats.done}</span> / {p1.txStats.total} Nhiệm vụ hoàn thành/tổng số nhiệm vụ được giao trong tuần)
                            </td>
                          </tr>
                          {/* 1. Văn thư */}
                          {p1_vt.thuongXuyen.length > 0 && (
                            <>
                              <tr>
                                <td className="border border-black px-2 py-1 font-bold">1</td>
                                <td colSpan={4} className="border border-black px-2 py-1 font-bold italic bg-slate-50/50">
                                  Bộ phận Văn thư – Lưu trữ
                                </td>
                              </tr>
                              {p1_vt.thuongXuyen.map(row => (
                                <tr key={row.id}>
                                  <td className="border border-black px-2 py-1 text-center">{row.stt}</td>
                                  <td className="border border-black px-2 py-1">{row.noi_dung}</td>
                                  <td className="border border-black px-2 py-1 text-center">{row.thoi_gian}</td>
                                  <td className="border border-black px-2 py-1">{row.trien_khai}</td>
                                  <td className="border border-black px-2 py-1 text-center">{row.tien_do}</td>
                                </tr>
                              ))}
                            </>
                          )}
                          {/* 2. CĐS */}
                          {p1_cds.thuongXuyen.length > 0 && (
                            <>
                              <tr>
                                <td className="border border-black px-2 py-1 font-bold">{p1_vt.thuongXuyen.length > 0 ? '2' : '1'}</td>
                                <td colSpan={4} className="border border-black px-2 py-1 font-bold italic bg-slate-50/50">
                                  Bộ phận Chuyển đổi số
                                </td>
                              </tr>
                              {p1_cds.thuongXuyen.map(row => (
                                <tr key={row.id}>
                                  <td className="border border-black px-2 py-1 text-center">{row.stt}</td>
                                  <td className="border border-black px-2 py-1">{row.noi_dung}</td>
                                  <td className="border border-black px-2 py-1 text-center">{row.thoi_gian}</td>
                                  <td className="border border-black px-2 py-1">{row.trien_khai}</td>
                                  <td className="border border-black px-2 py-1 text-center">{row.tien_do}</td>
                                </tr>
                              ))}
                            </>
                          )}
                        </>
                      )}

                      {/* II. NHÓM ĐỘT XUẤT */}
                      {(p1_vt.dotXuat.length > 0 || p1_cds.dotXuat.length > 0) && (
                        <>
                          <tr className="bg-slate-50">
                            <td className="border border-black px-2 py-1 text-center font-bold">II</td>
                            <td colSpan={4} className="border border-black px-2 py-1 font-bold italic">
                              Nhiệm vụ theo bút phê, chỉ đạo đột xuất (cuộc họp, giao ban, Phần mềm quản lý văn bản…) (<span className="font-bold px-1">{p1.dxStats.done}</span>/{p1.dxStats.total} Nhiệm vụ, công văn hoàn thành/tổng số nhiệm vụ, công văn được giao trong tuần)
                            </td>
                          </tr>
                          {/* 1. Văn thư */}
                          {p1_vt.dotXuat.length > 0 && (
                            <>
                              <tr>
                                <td className="border border-black px-2 py-1 font-bold">1</td>
                                <td colSpan={4} className="border border-black px-2 py-1 font-bold italic bg-slate-50/50">
                                  Bộ phận Văn thư – Lưu trữ
                                </td>
                              </tr>
                              {p1_vt.dotXuat.map(row => (
                                <tr key={row.id}>
                                  <td className="border border-black px-2 py-1 text-center">{row.stt}</td>
                                  <td className="border border-black px-2 py-1">{row.noi_dung}</td>
                                  <td className="border border-black px-2 py-1 text-center">{row.thoi_gian}</td>
                                  <td className="border border-black px-2 py-1">{row.trien_khai}</td>
                                  <td className="border border-black px-2 py-1 text-center">{row.tien_do}</td>
                                </tr>
                              ))}
                            </>
                          )}
                          {/* 2. CĐS */}
                          {p1_cds.dotXuat.length > 0 && (
                            <>
                              <tr>
                                <td className="border border-black px-2 py-1 font-bold">{p1_vt.dotXuat.length > 0 ? '2' : '1'}</td>
                                <td colSpan={4} className="border border-black px-2 py-1 font-bold italic bg-slate-50/50">
                                  Bộ phận Chuyển đổi số
                                </td>
                              </tr>
                              {p1_cds.dotXuat.map(row => (
                                <tr key={row.id}>
                                  <td className="border border-black px-2 py-1 text-center">{row.stt}</td>
                                  <td className="border border-black px-2 py-1">{row.noi_dung}</td>
                                  <td className="border border-black px-2 py-1 text-center">{row.thoi_gian}</td>
                                  <td className="border border-black px-2 py-1">{row.trien_khai}</td>
                                  <td className="border border-black px-2 py-1 text-center">{row.tien_do}</td>
                                </tr>
                              ))}
                            </>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {/* BÁO CÁO ĐƠN */}
                      {p1.thuongXuyen.length > 0 && (
                        <>
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
                        </>
                      )}

                      {p1.dotXuat.length > 0 && (
                        <>
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
                        </>
                      )}
                    </>
                  )}
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
                  {isConsolidated ? (
                    <>
                      {/* I. NHÓM THƯỜNG XUYÊN */}
                      {(p2_vt.thuongXuyen.length > 0 || p2_cds.thuongXuyen.length > 0) && (
                        <>
                          <tr className="bg-slate-50">
                            <td className="border border-black px-2 py-1 text-center font-bold">I</td>
                            <td colSpan={3} className="border border-black px-2 py-1 font-bold">
                              Nhiệm vụ thường xuyên
                            </td>
                          </tr>
                          {/* 1. Văn thư */}
                          {p2_vt.thuongXuyen.length > 0 && (
                            <>
                              <tr>
                                <td className="border border-black px-2 py-1 font-bold">1</td>
                                <td colSpan={3} className="border border-black px-2 py-1 font-bold italic bg-slate-50/50">
                                  Bộ phận Văn thư – Lưu trữ
                                </td>
                              </tr>
                              {p2_vt.thuongXuyen.map(row => (
                                <tr key={row.id}>
                                  <td className="border border-black px-2 py-1 text-center">{row.stt}</td>
                                  <td className="border border-black px-2 py-1">{row.noi_dung}</td>
                                  <td className="border border-black px-2 py-1 text-center">{row.thoi_gian_du_kien}</td>
                                  <td className="border border-black px-2 py-1">{row.san_pham_du_kien}</td>
                                </tr>
                              ))}
                            </>
                          )}
                          {/* 2. CĐS */}
                          {p2_cds.thuongXuyen.length > 0 && (
                            <>
                              <tr>
                                <td className="border border-black px-2 py-1 font-bold">{p2_vt.thuongXuyen.length > 0 ? '2' : '1'}</td>
                                <td colSpan={3} className="border border-black px-2 py-1 font-bold italic bg-slate-50/50">
                                  Bộ phận Chuyển đổi số
                                </td>
                              </tr>
                              {p2_cds.thuongXuyen.map(row => (
                                <tr key={row.id}>
                                  <td className="border border-black px-2 py-1 text-center">{row.stt}</td>
                                  <td className="border border-black px-2 py-1">{row.noi_dung}</td>
                                  <td className="border border-black px-2 py-1 text-center">{row.thoi_gian_du_kien}</td>
                                  <td className="border border-black px-2 py-1">{row.san_pham_du_kien}</td>
                                </tr>
                              ))}
                            </>
                          )}
                        </>
                      )}

                      {/* II. NHÓM ĐỘT XUẤT */}
                      {(p2_vt.dotXuat.length > 0 || p2_cds.dotXuat.length > 0) && (
                        <>
                          <tr className="bg-slate-50">
                            <td className="border border-black px-2 py-1 text-center font-bold">II</td>
                            <td colSpan={3} className="border border-black px-2 py-1 font-bold">
                              Nhiệm vụ theo bút phê, chỉ đạo đột xuất (cuộc họp, giao ban, Phần mềm quản lý văn bản…)
                            </td>
                          </tr>
                          {/* 1. Văn thư */}
                          {p2_vt.dotXuat.length > 0 && (
                            <>
                              <tr>
                                <td className="border border-black px-2 py-1 font-bold">1</td>
                                <td colSpan={3} className="border border-black px-2 py-1 font-bold italic bg-slate-50/50">
                                  Bộ phận Văn thư – Lưu trữ
                                </td>
                              </tr>
                              {p2_vt.dotXuat.map(row => (
                                <tr key={row.id}>
                                  <td className="border border-black px-2 py-1 text-center">{row.stt}</td>
                                  <td className="border border-black px-2 py-1">{row.noi_dung}</td>
                                  <td className="border border-black px-2 py-1 text-center">{row.thoi_gian_du_kien}</td>
                                  <td className="border border-black px-2 py-1">{row.san_pham_du_kien}</td>
                                </tr>
                              ))}
                            </>
                          )}
                          {/* 2. CĐS */}
                          {p2_cds.dotXuat.length > 0 && (
                            <>
                              <tr>
                                <td className="border border-black px-2 py-1 font-bold">{p2_vt.dotXuat.length > 0 ? '2' : '1'}</td>
                                <td colSpan={3} className="border border-black px-2 py-1 font-bold italic bg-slate-50/50">
                                  Bộ phận Chuyển đổi số
                                </td>
                              </tr>
                              {p2_cds.dotXuat.map(row => (
                                <tr key={row.id}>
                                  <td className="border border-black px-2 py-1 text-center">{row.stt}</td>
                                  <td className="border border-black px-2 py-1">{row.noi_dung}</td>
                                  <td className="border border-black px-2 py-1 text-center">{row.thoi_gian_du_kien}</td>
                                  <td className="border border-black px-2 py-1">{row.san_pham_du_kien}</td>
                                </tr>
                              ))}
                            </>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {/* BÁO CÁO ĐƠN */}
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
                    </>
                  )}
                </tbody>
              </table>

              {/* Chú thích Bảng II */}
              <div className="mt-2 text-[9.5pt] leading-tight space-y-0.5">
                <div className="w-36 h-[1px] bg-black mb-1.5" />
                <div><sup>4</sup> Nội dung dự kiến thực hiện bao gồm các nhiệm vụ con liên quan đến nhiệm vụ tổng thể, bao quát được giao.</div>
                <div>Sản phẩm dự kiến: Quyết định, Công văn, Phiếu trình, Tờ trình….</div>
              </div>
            </div>

            {/* NẾU LÀ BÁO CÁO TỔNG HỢP (NGHỊ ĐỊNH 30): THÊM MỤC III BẢNG KẾT QUẢ KIỂM TRA THỂ THỨC 6 PHÒNG */}
            {isConsolidated && (
              <div className="mb-6">
                <div className="font-bold text-[13pt] mb-2">
                  III. Kết quả kiểm tra thể thức và chính tả công văn phát hành
                </div>
                <table className="w-full border-collapse border border-black text-[11pt]">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-center">
                      <th className="border border-black px-2 py-1.5 w-12">STT</th>
                      <th className="border border-black px-2 py-1.5">Phòng</th>
                      <th className="border border-black px-2 py-1.5 w-36">Tổng số VB kiểm tra</th>
                      <th className="border border-black px-2 py-1.5 w-32">Số lỗi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeStats.map((item, idx) => (
                      <tr key={idx}>
                        <td className="border border-black px-2 py-1 text-center">{idx + 1}</td>
                        <td className="border border-black px-2 py-1 font-medium">{item.department_name}</td>
                        <td className="border border-black px-2 py-1 text-center font-bold">
                          {String(item.total_checked).padStart(2, '0')}
                        </td>
                        <td className="border border-black px-2 py-1 text-center font-bold text-slate-900">
                          {String(item.error_count).padStart(2, '0')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* MỤC KHÓ KHĂN VƯỚNG MẮC */}
            <div className="mb-6 space-y-2">
              <div className="font-bold text-[13pt] mb-1">
                {isConsolidated ? 'IV. Khó khăn, vướng mắc, đề xuất kiến nghị (nếu có):' : 'III. Khó khăn, vướng mắc, đề xuất kiến nghị (nếu có)'}
              </div>

              {/* Nội dung khó khăn, vướng mắc */}
              {metadata.kho_khan ? (
                <div className="pl-4 leading-relaxed text-justify text-[13pt] whitespace-pre-wrap">
                  {metadata.kho_khan}
                </div>
              ) : (
                isConsolidated ? (
                  <div className="pl-4 leading-relaxed text-justify text-[13pt] whitespace-pre-wrap">
                    <div>- Hiện nay, Bộ phận Văn thư – Lưu trữ có 02 chuyên viên đang tham gia lớp đào tạo, bồi dưỡng nghiệp vụ Văn thư – Lưu trữ theo lịch học vào thứ Hai, thứ Tư và thứ Ba, thứ Năm hằng tuần. Do đó, nhân sự thực hiện nhiệm vụ thường xuyên bị phân tán, khối lượng công việc tập trung vào những ngày còn lại, dẫn đến chưa bảo đảm tiến độ thực hiện một số nhiệm vụ được giao.</div>
                    <div className="mt-1">- Hồ sơ nghiệm thu Hợp đồng cung ứng dịch vụ vận chuyển, vận hành TTC CTRSH của các đơn vị vận chuyển từ đầu năm 2026 đến nay hiện đang được lưu trữ tập trung tại P.KHTC; chưa thực hiện giao nộp hồ sơ về Văn thư để lưu trữ.</div>
                  </div>
                ) : (
                  <div className="pl-4 leading-relaxed text-[13pt] italic text-slate-600">
                    Không.
                  </div>
                )
              )}

              {/* Lời kết trình lãnh đạo (dành cho Báo cáo tổng hợp) */}
              {isConsolidated && (
                <div className="text-justify indent-8 leading-relaxed text-[13pt] mt-3">
                  {consolidatedMeta?.ending_note || `Trên đây là báo cáo tình hình thực hiện nhiệm vụ Tuần ${metadata.tuan} và kế hoạch thực hiện nhiệm vụ trọng tâm công tác Tuần ${metadata.tuan_tiep} của Bộ phận Văn thư. Kính trình Lãnh đạo phòng xem xét./.`}
                </div>
              )}
            </div>

            {/* CHỮ KÝ HÀNH CHÍNH & NƠI NHẬN CHUẨN VĂN BẢN QUẢN LÝ NHÀ NƯỚC */}
            {isConsolidated ? (
              <div className="pt-2">
                <table className="w-full border-collapse border border-black text-[12pt] mb-4">
                  <tbody>
                    {/* HÀNG 1: TỔ TRƯỞNG & NGƯỜI LẬP */}
                    <tr>
                      <td className="border border-black p-4 text-center align-top w-1/2" style={{ minHeight: '140px' }}>
                        <div className="font-bold text-[12pt] mb-2">Ý kiến của Tổ trưởng</div>
                        {renderSignatureStamp(consolidatedMeta?.to_truong_name || 'Trần Thuận Hòa') || <div className="h-20 my-1" />}
                        <div className="font-bold text-[12pt] mt-2">{consolidatedMeta?.to_truong_name || 'Trần Thuận Hòa'}</div>
                      </td>
                      <td className="border border-black p-4 text-center align-top w-1/2" style={{ minHeight: '140px' }}>
                        <div className="font-bold text-[12pt] mb-2">Người lập báo cáo</div>
                        {renderSignatureStamp(consolidatedMeta?.nguoi_lap_name || metadata.nguoi_lap) || <div className="h-20 my-1" />}
                        <div className="font-bold text-[12pt] mt-2">{consolidatedMeta?.nguoi_lap_name || metadata.nguoi_lap || ''}</div>
                      </td>
                    </tr>

                    {/* HÀNG 2: PHÓ CHÁNH VĂN PHÒNG */}
                    <tr>
                      <td colSpan={2} className="border border-black p-4 text-center align-top" style={{ minHeight: '140px' }}>
                        <div className="font-bold text-[12pt] mb-2">Ý kiến của Phó Chánh Văn phòng</div>
                        {renderSignatureStamp(consolidatedMeta?.pho_chanh_van_phong_name || 'Nguyễn Đức Thắng') || <div className="h-20 my-1" />}
                        <div className="font-bold text-[12pt] mt-2">{consolidatedMeta?.pho_chanh_van_phong_name || 'Nguyễn Đức Thắng'}</div>
                      </td>
                    </tr>

                    {/* HÀNG 3: CHÁNH VĂN PHÒNG */}
                    <tr>
                      <td colSpan={2} className="border border-black p-4 text-center align-top" style={{ minHeight: '140px' }}>
                        <div className="font-bold text-[12pt] mb-2">Ý kiến của Chánh Văn phòng</div>
                        {renderSignatureStamp(consolidatedMeta?.chanh_van_phong_name || 'Hoàng Văn Dương') || <div className="h-20 my-1" />}
                        <div className="font-bold text-[12pt] mt-2">{consolidatedMeta?.chanh_van_phong_name || 'Hoàng Văn Dương'}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              /* CHỮ KÝ BÁO CÁO ĐƠN */
              <div className="flex justify-between items-start text-[11pt] pt-4">
                {/* Nơi nhận */}
                <div className="text-left leading-snug">
                  <div className="font-bold italic text-[12pt]">Nơi nhận:</div>
                  <div className="text-[11pt]">
                    <div>- Như trên;</div>
                    <div>- Bộ phận Tổng hợp;</div>
                    <div>- Lưu: VP.</div>
                  </div>
                </div>

                {/* Chức danh & Chữ ký */}
                <div className="text-center min-w-[200px]">
                  <div className="font-bold uppercase text-[12pt]">NGƯỜI BÁO CÁO</div>
                  {renderSignatureStamp(metadata.nguoi_lap) || <div className="h-20 my-1" />}
                  <div className="font-bold text-[13pt] mt-2">{metadata.nguoi_lap || ''}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};