import React, { useState, useEffect } from 'react';
import { Users, Building2, UserPlus, Trash2, ShieldCheck, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { fetchAdminAccounts, createAdminAccount, deleteAdminAccount, createAdminDepartment } from '../services/api';

export interface AdminAccount {
  id: string;
  username: string;
  full_name: string;
  role: 'ADMIN' | 'LEADER' | 'STAFF';
  department_id: string;
  department_name: string;
  department_code: string;
  is_active: number;
}

export interface DepartmentItem {
  id: string;
  name: string;
  code: string;
}

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: DepartmentItem[];
  onRefreshData: () => void;
}

export function AdminPanelModal({ isOpen, onClose, departments, onRefreshData }: AdminPanelModalProps) {
  const [activeTab, setActiveTab] = useState<'accounts' | 'departments'>('accounts');
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State - Account
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('123456');
  const [newFullName, setNewFullName] = useState('');
  const [newDeptId, setNewDeptId] = useState('');
  const [newRole, setNewRole] = useState<'ADMIN' | 'LEADER' | 'STAFF'>('STAFF');

  // Form State - Department
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
      if (departments.length > 0 && !newDeptId) {
        setNewDeptId(departments[0].id);
      }
    }
  }, [isOpen, departments]);

  const loadAccounts = async () => {
    setIsLoading(true);
    const res = await fetchAdminAccounts();
    setIsLoading(false);
    if (res && res.success) {
      setAccounts(res.accounts || []);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Create new Account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newFullName.trim() || !newDeptId) {
      showMessage('error', 'Vui lòng nhập đầy đủ tên đăng nhập, họ tên và chọn phòng ban!');
      return;
    }

    setIsLoading(true);
    const res = await createAdminAccount({
      username: newUsername.trim(),
      password: newPassword,
      full_name: newFullName.trim(),
      department_id: newDeptId,
      role: newRole
    });
    setIsLoading(false);

    if (res && res.success) {
      showMessage('success', res.message || 'Tạo tài khoản thành công!');
      setNewUsername('');
      setNewFullName('');
      setNewPassword('123456');
      loadAccounts();
      onRefreshData();
    } else {
      showMessage('error', res.error || 'Không thể tạo tài khoản');
    }
  };

  // Delete Account
  const handleDeleteAccount = async (acc: AdminAccount) => {
    if (acc.username === 'admin') {
      alert('Không thể xóa tài khoản Quản trị viên hệ thống (admin)!');
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${acc.full_name}" (${acc.username})?`)) {
      return;
    }

    setIsLoading(true);
    const res = await deleteAdminAccount(acc.id);
    setIsLoading(false);

    if (res && res.success) {
      showMessage('success', 'Đã xóa tài khoản thành công');
      loadAccounts();
      onRefreshData();
    } else {
      showMessage('error', res.error || 'Lỗi khi xóa tài khoản');
    }
  };

  // Create new Department
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim() || !newDeptCode.trim()) {
      showMessage('error', 'Vui lòng điền Tên phòng ban và Mã đơn vị!');
      return;
    }

    setIsLoading(true);
    const res = await createAdminDepartment({
      name: newDeptName.trim(),
      code: newDeptCode.trim()
    });
    setIsLoading(false);

    if (res && res.success) {
      showMessage('success', res.message || 'Tạo phòng ban thành công!');
      setNewDeptName('');
      setNewDeptCode('');
      onRefreshData();
    } else {
      showMessage('error', res.error || 'Không thể tạo phòng ban');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/20">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold">Trang Quản Trị Hệ Thống</h3>
              <p className="text-xs text-blue-200">Tạo tài khoản đăng nhập &amp; Quản lý đơn vị phòng ban</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white cursor-pointer font-bold text-lg px-2"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`pb-3 border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'accounts'
                ? 'border-[#005dac] text-[#005dac]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Quản lý Tài khoản ({accounts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`pb-3 border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'departments'
                ? 'border-[#005dac] text-[#005dac]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Quản lý Phòng Ban ({departments.length})</span>
          </button>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'accounts' ? (
            <div className="space-y-6">
              {/* Form Tạo Tài khoản mới */}
              <form onSubmit={handleCreateAccount} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-[#005dac]" />
                  Tạo tài khoản mới
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tên đăng nhập (Username)</label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="vd: nguyenvana"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#005dac]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mật khẩu</label>
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mật khẩu"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#005dac]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Họ và tên cán bộ</label>
                    <input
                      type="text"
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      placeholder="vd: Nguyễn Văn A"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#005dac]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Thuộc Phòng / Ban</label>
                    <select
                      value={newDeptId}
                      onChange={(e) => setNewDeptId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#005dac]"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          [{d.code}] {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Phân quyền Vai trò</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as any)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#005dac]"
                    >
                      <option value="STAFF">Chuyên viên (STAFF)</option>
                      <option value="LEADER">Lãnh đạo Phòng (LEADER)</option>
                      <option value="ADMIN">Quản trị viên (ADMIN)</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2 bg-[#005dac] hover:bg-[#004786] text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Lưu &amp; Tạo Tài Khoản
                    </button>
                  </div>
                </div>
              </form>

              {/* Danh sách Tài khoản hiện có */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  Danh sách tài khoản hệ thống ({accounts.length})
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Cán bộ</th>
                        <th className="p-2.5">Tên đăng nhập</th>
                        <th className="p-2.5">Phòng / Ban</th>
                        <th className="p-2.5">Vai trò</th>
                        <th className="p-2.5 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {accounts.map((acc) => (
                        <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 font-bold text-slate-900">{acc.full_name}</td>
                          <td className="p-2.5 font-mono text-slate-600">{acc.username}</td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 bg-blue-50 text-[#005dac] font-bold rounded text-[10px]">
                              [{acc.department_code}] {acc.department_name}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                acc.role === 'ADMIN'
                                  ? 'bg-amber-100 text-amber-900'
                                  : acc.role === 'LEADER'
                                  ? 'bg-indigo-100 text-indigo-900'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {acc.role}
                            </span>
                          </td>
                          <td className="p-2.5 text-right">
                            {acc.username !== 'admin' && (
                              <button
                                onClick={() => handleDeleteAccount(acc)}
                                className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                                title="Xóa tài khoản"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* TAB QUẢN LÝ PHÒNG BAN */
            <div className="space-y-6">
              {/* Form Tạo Phòng Ban mới */}
              <form onSubmit={handleCreateDepartment} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#005dac]" />
                  Tạo phòng / ban mới
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mã đơn vị (Code)</label>
                    <input
                      type="text"
                      value={newDeptCode}
                      onChange={(e) => setNewDeptCode(e.target.value)}
                      placeholder="vd: PQL"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#005dac] font-mono uppercase"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tên Phòng / Ban đầy đủ</label>
                    <input
                      type="text"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      placeholder="vd: Phòng Quản lý Đô thị"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#005dac]"
                      required
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2 bg-[#005dac] hover:bg-[#004786] text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Tạo Phòng Ban
                    </button>
                  </div>
                </div>
              </form>

              {/* Danh sách Phòng Ban hiện có */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  Danh sách đơn vị phòng ban ({departments.length})
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Mã đơn vị</th>
                        <th className="p-2.5">Tên phòng ban</th>
                        <th className="p-2.5 text-right">Mã định danh ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {departments.map((dept) => (
                        <tr key={dept.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 font-bold font-mono text-[#005dac]">{dept.code}</td>
                          <td className="p-2.5 font-medium text-slate-900">{dept.name}</td>
                          <td className="p-2.5 text-right font-mono text-slate-500 text-[11px]">{dept.id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
