import React, { useState, useEffect } from 'react';
import { Share2, Users, Eye, Edit3, Trash2, Shield, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { shareReportApi, fetchReportShares, revokeReportShareApi } from '../services/api';

interface ShareReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string;
  reportTitle: string;
  currentUser: { id: string; username: string; full_name: string };
}

interface AccountItem {
  id: string;
  username: string;
  full_name: string;
  department_name: string;
}

interface ShareItem {
  id: string;
  report_id: string;
  permission: 'VIEW' | 'EDIT';
  created_at: string;
  shared_with_id: string;
  username: string;
  full_name: string;
  department_name: string;
}

export const ShareReportModal: React.FC<ShareReportModalProps> = ({
  isOpen,
  onClose,
  reportId,
  reportTitle,
  currentUser
}) => {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [permission, setPermission] = useState<'VIEW' | 'EDIT'>('VIEW');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen && reportId) {
      loadAccountsAndShares();
    }
  }, [isOpen, reportId]);

  const loadAccountsAndShares = async () => {
    setLoading(true);
    try {
      // Fetch accounts list
      const deptsRes = await fetch('/api/departments').then(r => r.json());
      if (deptsRes.success && deptsRes.accounts) {
        // Filter out current user
        const otherAccs = deptsRes.accounts.filter((a: AccountItem) => a.id !== currentUser.id);
        setAccounts(otherAccs);
        if (otherAccs.length > 0 && !selectedAccountId) {
          setSelectedAccountId(otherAccs[0].id);
        }
      }

      // Fetch shares for this report
      const sharesRes = await fetchReportShares(reportId);
      if (sharesRes.success) {
        setShares(sharesRes.shares || []);
      }
    } catch (err: any) {
      console.error('Lỗi nạp danh sách chia sẻ:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!selectedAccountId) {
      setMessage({ type: 'error', text: 'Vui lòng chọn tài khoản muốn chia sẻ' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await shareReportApi(reportId, selectedAccountId, permission, currentUser.id);
      if (res.success) {
        setMessage({ type: 'success', text: res.message || 'Đã chia sẻ thành công!' });
        loadAccountsAndShares();
      } else {
        setMessage({ type: 'error', text: res.error || 'Chia sẻ thất bại' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (shareId: string, accName: string) => {
    if (!confirm(`Bạn có chắc muốn thu hồi quyền chia sẻ báo cáo với ${accName}?`)) return;

    setLoading(true);
    try {
      const res = await revokeReportShareApi(shareId);
      if (res.success) {
        setMessage({ type: 'success', text: `Đã thu hồi quyền của ${accName}` });
        loadAccountsAndShares();
      } else {
        setMessage({ type: 'error', text: res.error || 'Thu hồi thất bại' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Chia sẻ Báo cáo Tuần</h3>
              <p className="text-xs text-blue-100">{reportTitle || reportId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {message && (
            <div
              className={`p-3.5 rounded-xl text-sm flex items-center gap-2.5 ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Form chia sẻ mới */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-4">
            <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Cấp quyền mới cho thành viên
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Chọn người nhận:
                </label>
                <select
                  value={selectedAccountId}
                  onChange={e => setSelectedAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.full_name} ({acc.username}) - {acc.department_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Quyền truy cập:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPermission('VIEW')}
                    className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition ${
                      permission === 'VIEW'
                        ? 'border-blue-500 bg-blue-50/60 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Eye className="w-4 h-4 mt-0.5 text-blue-600 shrink-0" />
                    <div>
                      <div className="font-medium text-xs">Chỉ xem (View Only)</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Xem & xuất Word/PDF</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPermission('EDIT')}
                    className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition ${
                      permission === 'EDIT'
                        ? 'border-indigo-500 bg-indigo-50/60 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Edit3 className="w-4 h-4 mt-0.5 text-indigo-600 shrink-0" />
                    <div>
                      <div className="font-medium text-xs">Chỉnh sửa (Edit)</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Được sửa task & lưu CSDL</div>
                    </div>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleShare}
                disabled={loading || accounts.length === 0}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Xác nhận chia sẻ
              </button>
            </div>
          </div>

          {/* Danh sách các tài khoản đang được chia sẻ */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              Danh sách thành viên đang có quyền ({shares.length})
            </h4>

            {shares.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
                Chưa có ai được chia sẻ báo cáo này (Báo cáo riêng tư)
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl max-h-48 overflow-y-auto">
                {shares.map(share => (
                  <div key={share.id} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-bold text-xs flex items-center justify-center">
                        {share.full_name ? share.full_name.charAt(0) : 'U'}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {share.full_name} ({share.username})
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {share.department_name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          share.permission === 'EDIT'
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                        }`}
                      >
                        {share.permission === 'EDIT' ? <Edit3 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {share.permission === 'EDIT' ? 'Chỉnh sửa' : 'Chỉ xem'}
                      </span>

                      <button
                        onClick={() => handleRevoke(share.id, share.full_name)}
                        title="Thu hồi quyền"
                        className="p-1 hover:bg-rose-100 text-rose-500 rounded transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-medium text-xs rounded-lg transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
