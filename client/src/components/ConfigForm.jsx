import React from 'react';

export function ConfigForm({ metadata, setMetadata }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 mb-4">
      <h4 className="font-bold text-sm mb-2">Cấu hình Báo cáo</h4>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <label className="block text-slate-500 mb-1">Người lập</label>
          <input
            type="text"
            value={metadata.nguoi_lap}
            onChange={e => setMetadata({ ...metadata, nguoi_lap: e.target.value })}
            className="w-full border p-1.5 rounded"
          />
        </div>
        <div>
          <label className="block text-slate-500 mb-1">Đơn vị</label>
          <input
            type="text"
            value={metadata.don_vi}
            onChange={e => setMetadata({ ...metadata, don_vi: e.target.value })}
            className="w-full border p-1.5 rounded"
          />
        </div>
      </div>
    </div>
  );
}
