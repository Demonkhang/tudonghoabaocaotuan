import React, { useState, useEffect } from 'react';
import { X, Send, UserCheck, Shield, ChevronRight, Plus, Trash2, ArrowRight, Sparkles, RefreshCw, UserCheck2, Award, Briefcase } from 'lucide-react';
import { AdminAccount } from './AdminPanelModal';
import { fetchAdminAccounts, submitReportForApprovalApi } from '../services/api';

interface ApprovalChainModalProps {
  reportId: string;
  currentAccountId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ApprovalChainModal: React.FC<ApprovalChainModalProps> = ({
  reportId,
  currentAccountId,
  onClose,
  onSuccess
}) => {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  
  // Các vị trí phê duyệt tương ứng với tờ trình báo cáo
  const [toTruongId, setToTruongId] = useState<string>('');
  const [phoChanhVpId, setPhoChanhVpId] = useState<string>('');
  const [chanhVpId, setChanhVpId] = useState<string>('');
  const [extraApproverIds, setExtraApproverIds] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const res = await fetchAdminAccounts();
        if (res && res.accounts) {
          // Lọc loại bỏ người gửi
          const filtered = res.accounts.filter(a => a.id !== currentAccountId && a.is_active !== 0);
          setAccounts(filtered);

          // Tự động gợi ý khớp tài khoản theo chức vụ
          const defaultToTruong = filtered.find(a => a.position_level === 'TO_TRUONG' || a.position_level === 'PHO_PHONG' || a.position_level === 'TRUONG_PHONG');
          const defaultPhoChanh = filtered.find(a => a.position_level === 'PHO_GIAM_DOC' || a.position_level === 'PHO_PHONG');
          const defaultChanhVp = filtered.find(a => a.position_level === 'GIAM_DOC' || a.position_level === 'TRUONG_PHONG');

          if (defaultToTruong) setToTruongId(defaultToTruong.id);
          if (defaultPhoChanh && defaultPhoChanh.id !== defaultToTruong?.id) setPhoChanhVpId(defaultPhoChanh.id);
          if (defaultChanhVp && defaultChanhVp.id !== defaultPhoChanh?.id && defaultChanhVp.id !== defaultToTruong?.id) setChanhVpId(defaultChanhVp.id);
        }
      } catch (err) {
        console.error('Lỗi nạp danh sách người duyệt:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadAccounts();
  }, [currentAccountId]);

  // Gom tất cả ID người duyệt thành danh sách thứ tự chuỗi ký
  const getOrderedApproverIds = (): string[] => {
    const chain: string[] = [];
    if (toTruongId) chain.push(toTruongId);
    if (phoChanhVpId && !chain.includes(phoChanhVpId)) chain.push(phoChanhVpId);
    if (chanhVpId && !chain.includes(chanhVpId)) chain.push(chanhVpId);
    
    extraApproverIds.forEach(id => {
      if (id && !chain.includes(id)) {
        chain.push(id);
      }
    });
    return chain;
  };

  const handleAddExtraApprover = (accId: string) => {
    if (!accId || getOrderedApproverIds().includes(accId)) return;
    setExtraApproverIds(prev => [...prev, accId]);
  };

  const handleRemoveExtraApprover = (idToRemove: string) => {
    setExtraApproverIds(prev => prev.filter(id => id !== idToRemove));
  };

  const handleSubmit = async () => {
    setErrorMsg(null);
    const finalApproverIds = getOrderedApproverIds();
    
    if (finalApproverIds.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất 1 Người duyệt cho từng vị trí báo cáo tuần!');
      return;
    }

    setIsSubmitting(true);
    try {
      const slots = {
        to_truong_id: toTruongId,
        pho_chanh_van_phong_id: phoChanhVpId,
        chanh_van_phong_id: chanhVpId
      };

      const res = await submitReportForApprovalApi(reportId, currentAccountId, finalApproverIds, slots);
      if (res && res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(res.error || 'Lỗi khi gửi trình duyệt báo cáo');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const finalApproverIds = getOrderedApproverIds();

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-[200] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5 border-b border-slate-800 pb-4">
          <div className="w-11 h-11 bg-indigo-950/80 text-indigo-400 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-700/50 shadow-md">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              Trình Duyệt & Chọn Luồng Người Duyệt Báo Cáo
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Thiết lập chuỗi Lãnh đạo/Tổ trưởng sẽ nhận báo cáo và Ký số xác thực
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-400" />
            <p className="text-xs font-bold">Đang nạp danh sách tài khoản lãnh đạo...</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1 custom-scrollbar">
            
            {/* THIẾT LẬP NGƯỜI DUYỆT THEO VỊ TRÍ KHUNG TỜ TRÌNH */}
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-black text-indigo-300 uppercase tracking-wider">
                <Briefcase className="w-4 h-4 text-indigo-400" />
                <span>Phân công người duyệt theo vị trí Ký Báo Cáo:</span>
              </div>

              {/* Vị trí 1: Tổ trưởng */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>1. Ý kiến của Tổ trưởng:</span>
                  <span className="text-[10px] text-indigo-400 font-medium">Khung Ký Trực Tiếp</span>
                </label>
                <select
                  value={toTruongId}
                  onChange={(e) => setToTruongId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Chưa chọn Tổ trưởng duyệt --</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.full_name} ({acc.position_level} - {acc.department_name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Vị trí 2: Phó Chánh Văn phòng */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>2. Ý kiến của Phó Chánh Văn phòng:</span>
                  <span className="text-[10px] text-indigo-400 font-medium">Khung Ký Giữa</span>
                </label>
                <select
                  value={phoChanhVpId}
                  onChange={(e) => setPhoChanhVpId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Chọn Phó Chánh Văn phòng --</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.full_name} ({acc.position_level} - {acc.department_name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Vị trí 3: Chánh Văn phòng */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>3. Ý kiến của Chánh Văn phòng / Lãnh đạo Ban:</span>
                  <span className="text-[10px] text-indigo-400 font-medium">Khung Ký Cuối</span>
                </label>
                <select
                  value={chanhVpId}
                  onChange={(e) => setChanhVpId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Chọn Chánh Văn phòng / Giám đốc --</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.full_name} ({acc.position_level} - {acc.department_name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Thêm người duyệt bổ sung */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Thêm Người duyệt khác vào chuỗi:
              </label>
              <select
                onChange={(e) => {
                  handleAddExtraApprover(e.target.value);
                  e.target.value = '';
                }}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">-- Thêm cán bộ/lãnh đạo duyệt khác --</option>
                {accounts.map(acc => {
                  const isSelected = finalApproverIds.includes(acc.id);
                  return (
                    <option key={acc.id} value={acc.id} disabled={isSelected}>
                      {acc.full_name} ({acc.position_level} - {acc.department_name}) {isSelected ? '(Đã chọn)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Trình tự luồng ký duyệt hiển thị danh sách */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">
                Trình tự luồng ký duyệt ({finalApproverIds.length} người sẽ nhận thông báo):
              </label>

              {finalApproverIds.length === 0 ? (
                <div className="p-4 border border-dashed border-slate-800 rounded-2xl text-center text-xs text-slate-500">
                  Chưa chọn người duyệt nào. Vui lòng chọn người duyệt cho các vị trí phía trên.
                </div>
              ) : (
                <div className="space-y-2">
                  {finalApproverIds.map((id, index) => {
                    const acc = accounts.find(a => a.id === id);
                    const posLabel = acc?.position_level === 'GIAM_DOC' ? 'Giám đốc'
                      : acc?.position_level === 'PHO_GIAM_DOC' ? 'Phó Giám đốc'
                      : acc?.position_level === 'TRUONG_PHONG' ? 'Trưởng phòng'
                      : acc?.position_level === 'PHO_PHONG' ? 'Phó phòng'
                      : acc?.position_level === 'TO_TRUONG' ? 'Tổ trưởng' : 'Chuyên viên';

                    const isExtra = extraApproverIds.includes(id);

                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between p-3 bg-slate-800/80 border border-indigo-900/60 rounded-2xl text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-[11px] flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <div>
                            <div className="font-extrabold text-white">
                              {acc?.full_name || id}
                            </div>
                            <div className="text-[10px] text-indigo-300 font-medium">
                              {posLabel} - {acc?.department_name || 'Văn phòng'}
                            </div>
                          </div>
                        </div>

                        {isExtra && (
                          <button
                            type="button"
                            onClick={() => handleRemoveExtraApprover(id)}
                            className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer transition-colors"
                            title="Xóa khỏi luồng duyệt"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-950/70 border border-rose-900 rounded-xl text-rose-300 text-xs font-bold">
                ⚠️ {errorMsg}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 mt-6 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer transition-all"
          >
            Hủy bỏ
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || finalApproverIds.length === 0}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/30 disabled:opacity-50 active:scale-98 transition-all"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>Gửi Trình Duyệt Báo Cáo</span>
          </button>
        </div>

      </div>
    </div>
  );
};
