import React, { useState, useEffect } from 'react';
import { User, ShieldCheck, CheckCircle2, AlertCircle, KeyRound, Building2, Award } from 'lucide-react';
import { updateUserProfileApi } from '../services/api';
import { POSITION_LABELS } from './AdminPanelModal';

export interface UserAccountInfo {
  id: string;
  username: string;
  full_name: string;
  role: 'ADMIN' | 'LEADER' | 'STAFF';
  position_level?: string;
  department_id: string;
  department_name?: string;
  department_code?: string;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccountInfo | null;
  onUpdateSuccess: (updatedUser: UserAccountInfo) => void;
  onOpenSignatureSetup?: () => void;
}

export function UserProfileModal({ isOpen, onClose, currentUser, onUpdateSuccess, onOpenSignatureSetup }: UserProfileModalProps) {
  const [fullName, setFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen && currentUser) {
      setFullName(currentUser.full_name || '');
      setNewPassword('');
      setConfirmPassword('');
      setMessage(null);
    }
  }, [isOpen, currentUser]);

  if (!isOpen || !currentUser) return null;

  const posBadge = POSITION_LABELS[currentUser.position_level || 'CHUYEN_VIEN'] || {
    label: currentUser.position_level || 'Chuyên viên',
    badge: 'bg-slate-100 text-slate-700 border-slate-300'
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập Họ và tên cán bộ' });
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp!' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const payload: { full_name: string; password?: string } = {
      full_name: fullName.trim()
    };

    if (newPassword.trim()) {
      payload.password = newPassword.trim();
    }

    const res = await updateUserProfileApi(currentUser.id, payload);
    setIsLoading(false);

    if (res && res.success && res.user) {
      setMessage({ type: 'success', text: res.message || 'Cập nhật thông tin cá nhân thành công!' });
      onUpdateSuccess(res.user);
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setMessage({ type: 'error', text: res.error || 'Không thể cập nhật thông tin cá nhân' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        
        {/* HEADER */}
        <div className="bg-[#003d75] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <User className="w-6 h-6 text-sky-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Thông Tin Cá Nhân</h3>
              <p className="text-xs text-blue-100">Cập nhật thông tin cán bộ &amp; Đổi mật khẩu tài khoản</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>

        {/* ALERT MESSAGE */}
        {message && (
          <div
            className={`px-6 py-2.5 text-xs font-medium flex items-center gap-2 ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200' : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* FORM CONTENT */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* USER SYSTEM SUMMARY CARDS */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Tên đăng nhập:</span>
              <span className="font-mono font-bold text-slate-800 bg-slate-200/70 px-2 py-0.5 rounded text-[11px]">
                {currentUser.username}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" /> Đơn vị công tác:
              </span>
              <span className="font-semibold text-slate-700">
                [{currentUser.department_code}] {currentUser.department_name}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-slate-400" /> Cấp bậc thẩm quyền:
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${posBadge.badge}`}>
                {posBadge.label}
              </span>
            </div>
          </div>

          {/* EDIT FULL NAME */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Họ và tên cán bộ <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nhập họ và tên đầy đủ..."
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#005dac] font-medium"
              required
            />
          </div>

          {/* EDIT PASSWORD */}
          <div className="border-t border-slate-200 pt-3 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <KeyRound className="w-4 h-4 text-[#005dac]" />
              <span>Thay đổi Mật khẩu (Không bắt buộc)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mật khẩu mới</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Để trống nếu không đổi..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#005dac]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#005dac]"
                />
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            {onOpenSignatureSetup ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSignatureSetup();
                }}
                className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>🖋️ Chữ Ký & PIN 6 Số</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-[#005dac] hover:bg-[#004786] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                {isLoading ? 'Đang cập nhật...' : 'Lưu Thay Đổi'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
