import React from 'react';

export function PreviewModal({ isOpen, onClose, onDownloadWord }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-xl max-w-xl w-full">
        <h3 className="font-bold text-lg mb-4">Xem trước Báo cáo Tuần</h3>
        <p className="text-sm text-slate-600 mb-6">Mẫu báo cáo tuần tuân thủ thể thức hành chính Nghị định 30/2020/NĐ-CP.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg">Đóng</button>
          <button onClick={onDownloadWord} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Tải file Word</button>
        </div>
      </div>
    </div>
  );
}
