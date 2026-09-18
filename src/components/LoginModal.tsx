import React, { useState, useEffect } from 'react';
import { UserCheck, Lock, ShieldCheck, ArrowRight, AlertCircle, LogOut, RefreshCw, CheckCircle2, User, KeyRound, Sparkles, Building2, Shield } from 'lucide-react';

export interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  role: 'ADMIN' | 'LEADER' | 'STAFF';
  department_id: string;
  department_name: string;
  department_code: string;
}

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
  currentUser: UserProfile | null;
  onLogout?: () => void;
}

export function LoginModal({ isOpen, onClose, onLoginSuccess, currentUser, onLogout }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);

  // Reset switching state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsSwitchingAccount(false);
      setError(null);
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
      setIsSwitchingAccount(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ đăng nhập');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden flex flex-col transition-all">
        
        {/* HEADER MODAL */}
        <div className="bg-gradient-to-r from-[#004b8c] via-[#005dac] to-[#006bbd] p-6 text-white relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-blue-100 hover:text-white hover:bg-white/10 p-1.5 rounded-xl cursor-pointer font-bold text-base transition-all"
          >
            ✕
          </button>

          <div className="flex items-center gap-3.5 relative z-10">
            <div className="p-3 bg-white/15 backdrop-blur-md rounded-2xl border border-white/25 shadow-sm">
              <ShieldCheck className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-wide text-white drop-shadow-xs">
                {currentUser && !isSwitchingAccount ? 'THÔNG TIN TÀI KHOẢN' : 'ĐĂNG NHẬP HỆ THỐNG'}
              </h3>
              <p className="text-xs text-blue-100/90 font-medium mt-0.5">
                {currentUser && !isSwitchingAccount
                  ? 'Phiên làm việc đang hoạt động'
                  : 'Xác thực tài khoản phòng ban & phân quyền'}
              </p>
            </div>
          </div>
        </div>

        {/* BODY CONTAINER */}
        <div className="p-6 space-y-5">

          {/* CASE 1: USER IS ALREADY LOGGED IN & NOT SWITCHING -> SHOW USER PROFILE CARD ONLY (NO LOGIN INPUTS) */}
          {currentUser && !isSwitchingAccount ? (
            <div className="space-y-5 animate-fadeIn">
              
              {/* User Identity Card */}
              <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 dark:from-slate-800/80 dark:to-slate-800/40 p-5 rounded-2xl border border-blue-100 dark:border-slate-700/80 shadow-sm relative space-y-4">
                
                {/* Active Status Badge */}
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Đang đăng nhập
                  </span>

                  <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold border ${
                    currentUser.role === 'ADMIN'
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                      : currentUser.role === 'LEADER'
                      ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                      : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
                  }`}>
                    {currentUser.role === 'ADMIN' ? '👑 ADMIN QUẢN TRỊ' : currentUser.role === 'LEADER' ? '⭐ LEADER TỔ TRƯỞNG' : '👤 STAFF CHUYÊN VIÊN'}
                  </span>
                </div>

                {/* Avatar & Main Info */}
                <div className="flex items-center gap-4 pt-1">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#004b8c] to-[#006bbd] text-white flex items-center justify-center font-black text-xl shadow-md border-2 border-white dark:border-slate-700 shrink-0">
                    {currentUser.full_name ? currentUser.full_name.charAt(currentUser.full_name.lastIndexOf(' ') + 1) || 'U' : 'U'}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white truncate leading-tight">
                      {currentUser.full_name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      @{currentUser.username}
                    </p>
                  </div>
                </div>

                {/* Department Info Box */}
                <div className="pt-3 border-t border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Building2 className="w-3.5 h-3.5" /> Phòng/Ban:
                    </span>
                    <strong className="text-slate-800 dark:text-slate-100 font-bold">
                      {currentUser.department_name} ({currentUser.department_code})
                    </strong>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Shield className="w-3.5 h-3.5" /> Mã tài khoản:
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {currentUser.id}
                    </span>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS WHEN LOGGED IN */}
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsSwitchingAccount(true)}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#005dac] dark:text-blue-300 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-98"
                >
                  <RefreshCw className="w-4 h-4 text-blue-500" />
                  <span>Đổi sang tài khoản khác</span>
                </button>

                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      onLogout();
                      onClose();
                    }}
                    className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-rose-200 dark:border-rose-900/50 transition-all cursor-pointer active:scale-98"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Đăng xuất tài khoản này</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-[#004b8c] to-[#005dac] hover:from-[#003d75] hover:to-[#004786] text-white font-bold rounded-xl shadow-md text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                >
                  <span>Tiếp tục làm việc</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            
            /* CASE 2: NOT LOGGED IN OR SWITCHING ACCOUNT -> SHOW MODERN LOGIN FORM INPUTS */
            <div className="space-y-4 animate-fadeIn">
              
              {/* If switching account, show back button */}
              {currentUser && (
                <div className="flex items-center justify-between bg-blue-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-blue-200 dark:border-slate-700 text-xs">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">
                    Đang đăng nhập: <strong>{currentUser.full_name}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSwitchingAccount(false)}
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                  >
                    Quay lại
                  </button>
                </div>
              )}

              {/* Error Banner */}
              {error && (
                <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#005dac]" />
                    Tên đăng nhập (*)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Nhập tên tài khoản (vd: vanphong, khang...)"
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#005dac] focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-900 dark:text-white font-medium transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-[#005dac]" />
                    Mật khẩu (*)
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mật khẩu"
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#005dac] focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-900 dark:text-white font-medium transition-all"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-gradient-to-r from-[#004b8c] via-[#005dac] to-[#006bbd] hover:from-[#003d75] hover:to-[#004786] text-white font-extrabold rounded-xl shadow-lg text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-98"
                >
                  {isLoading ? 'Đang xác thực...' : 'Đăng nhập Hệ thống'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
