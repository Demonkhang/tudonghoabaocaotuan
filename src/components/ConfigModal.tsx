import React, { useState } from 'react';
import { X, Copy, Check, Code2, Sparkles } from 'lucide-react';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const gasCode = `/**
 * GOOGLE APPS SCRIPT - TỰ ĐỘNG HÓA BÁO CÁO TUẦN
 * Dán mã này vào Google Sheet (Tiện ích mở rộng > Apps Script)
 */
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet1 = ss.getSheetByName("Bảng I - Kết quả") || ss.getSheets()[0];
  const data1 = sheet1.getDataRange().getValues();
  
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    timestamp: new Date().toISOString(),
    metadata: { tuan: 42, nam: 2024, nguoi_lap: "Nguyễn Văn A" },
    table1: parseTable1(data1)
  })).setMimeType(ContentService.MimeType.JSON);
}

function parseTable1(rows) {
  const tasks = [];
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][1]) continue;
    tasks.push({
      id: "t1_" + i,
      noi_dung: rows[i][1],
      thoi_gian: rows[i][2] || "Chưa nhập",
      trien_khai: rows[i][3] || "",
      tien_do: rows[i][4] || "Đang thực hiện",
      nhom: rows[i][5] || "Thường xuyên"
    });
  }
  return tasks;
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(gasCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-[#005dac] text-white px-6 py-3.5 flex items-center justify-between">
          <h3 className="font-bold text-base flex items-center gap-2">
            <Code2 className="w-5 h-5 text-amber-300" />
            <span>Mã Google Apps Script Tích Hợp Google Sheet</span>
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Mã kịch bản Google Apps Script mẫu giúp kết nối Google Sheet của bạn trực tiếp với Hệ thống Báo cáo Tự động. Mã nguồn này cũng được lưu tại file <strong className="text-slate-800">google_script.gs</strong> trong dự án.
          </p>

          <div className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-xs overflow-x-auto relative max-h-64 border border-slate-800">
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 bg-slate-800 hover:bg-slate-700 text-white px-2.5 py-1 rounded text-[11px] flex items-center gap-1 border border-slate-700 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Đã sao chép' : 'Sao chép mã'}
            </button>
            <pre>{gasCode}</pre>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1 text-amber-800">
              <Sparkles className="w-4 h-4" /> Hướng dẫn nhanh:
            </div>
            <ol className="list-decimal list-inside space-y-0.5 text-[11px]">
              <li>Mở file Google Sheet chứa báo cáo công tác tuần của bạn.</li>
              <li>Vào menu <strong>Tiện ích mở rộng</strong> &gt; <strong>Apps Script</strong>.</li>
              <li>Dán mã kịch bản trên vào editor và nhấp <strong>Triển khai làm Ứng dụng web</strong>.</li>
              <li>Nhấn nút <strong>"Đồng bộ Google Sheet"</strong> trên thanh công cụ để tải dữ liệu.</li>
            </ol>
          </div>
        </div>

        <div className="bg-slate-100 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#005dac] text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#004786] transition-all cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
