import React, { useState, useEffect } from 'react';
import { UserCheck, Lock, Building2, ShieldCheck, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';

export interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  role: 'ADMIN' | 'LEADER' | 'STAFF';
  department_id: string;
  department_name: string;
  department_code: string;
}

interface QuickAccount {
  username: string;
  name: string;
  dept: string;
  role: string;
}

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
  currentUser: UserProfile | null;
}

export function LoginModal({ isOpen, onClose, onLoginSuccess, currentUser }: LoginModalProps) {
  const [username, setUsername] = useState('vanphong');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [quickAccounts, setQuickAccounts] = useState<QuickAccount[]>([
    { username: 'vanphong', name: 'Trần Thuận Hóa', dept: 'Văn phòng Ban Quản lý (VP)', role: 'Lãnh đạo Phòng' },
    { username: 'kehoach', name: 'Nguyễn Văn A', dept: 'Phòng Kế hoạch - Tài chính (PKH)', role: 'Chuyên viên' },
    { username: 'admin', name: 'Quản trị viên Hệ thống', dept: 'Văn phòng Ban Quản lý (VP)', role: 'Super Admin' }
  ]);

  useEffect(() => {
    if (isOpen) {
      // Fetch fresh list of accounts from backend API if available
      fetch('/api/departments')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.success && data.accounts) {
            const mapped: QuickAccount[] = data.accounts.map((a: any) => ({
              username: a.username,
              name: a.full_name,
              dept: `${a.department_name} (${a.department_code || ''})`,
              role: a.role
            }));
            setQuickAccounts(mapped);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = async (e?: React.FormEvent, customUser?: string) => {
    if (e) e.preventDefault();
    const loginUser = customUser || username;
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUser, password })
      });

      const contentType = res.headers.get('content-type');
      let data: any;

      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const rawText = await res.text();
        throw new Error(`Máy chủ chưa sẵn sàng hoặc phản hồi lỗi HTTP ${res.status}: ${rawText.slice(0, 80)}`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Đăng nhập không thành công');
      }

      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ đăng nhập');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-[#005dac] to-[#003d75] p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-blue-200 hover:text-white cursor-pointer font-bold text-lg"
          >
            ✕
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-xl border border-white/20">
              <ShieldCheck className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Xác thực Tài khoản Phòng Ban</h3>
              <p className="text-xs text-blue-100 mt-0.5">Phân quyền lịch sử &amp; nhiệm vụ riêng theo đơn vị</p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {currentUser && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500">Đang đăng nhập: </span>
                <strong className="text-[#005dac]">{currentUser.full_name}</strong>
                <span className="block text-slate-500 font-medium mt-0.5">{currentUser.department_name}</span>
              </div>
              <span className="px-2.5 py-1 bg-blue-600 text-white rounded-md text-[10px] font-bold">
                {currentUser.role}
              </span>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tên đăng nhập</label>
              <div className="relative">
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên tài khoản (vd: vanphong)"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#005dac] outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mật khẩu</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mật khẩu"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#005dac] outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-[#005dac] hover:bg-[#004786] text-white font-bold rounded-xl shadow-md text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Đang xác thực...' : 'Đăng nhập Hệ thống'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Chọn nhanh tài khoản thử nghiệm dành cho BA */}
          <div className="pt-3 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Chọn nhanh tài khoản phòng ban hiện có:
            </span>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {quickAccounts.map((acc) => (
                <button
                  key={acc.username}
                  onClick={() => {
                    setUsername(acc.username);
                    setPassword('123456');
                    handleLogin(undefined, acc.username);
                  }}
                  className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/60 transition-all text-xs flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <div className="font-bold text-slate-800 group-hover:text-[#005dac]">{acc.name}</div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      {acc.dept}
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-slate-100 group-hover:bg-blue-100 text-slate-600 group-hover:text-[#005dac] rounded font-semibold shrink-0">
                    {acc.username}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
