import React, { useState, useEffect } from 'react';
import { Users, Building2, UserPlus, Trash2, ShieldCheck, Plus, CheckCircle2, AlertCircle, Sliders, ChevronRight, Award, User } from 'lucide-react';
import { fetchAdminAccounts, createAdminAccount, deleteAdminAccount, createAdminDepartment, fetchAdminRoles, createAdminRole } from '../services/api';

export interface AdminAccount {
  id: string;
  username: string;
  full_name: string;
  role: 'ADMIN' | 'LEADER' | 'STAFF';
  position_level?: 'GIAM_DOC' | 'PHO_GIAM_DOC' | 'TRUONG_PHONG' | 'PHO_PHONG' | 'TO_TRUONG' | 'CHUYEN_VIEN' | string;
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

export interface CustomRoleItem {
  id: string;
  code: string;
  name: string;
  level_rank: number;
  description: string;
  scope_delegation: string;
}

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: DepartmentItem[];
  onRefreshData: () => void;
}

export const POSITION_LABELS: Record<string, { label: string; badge: string }> = {
  GIAM_DOC: { label: '[1] Giám Đốc', badge: 'bg-purple-100 text-purple-900 border-purple-300' },
  PHO_GIAM_DOC: { label: '[2] Phó Giám Đốc', badge: 'bg-blue-100 text-blue-900 border-blue-300' },
  TRUONG_PHONG: { label: '[3] Trưởng Phòng', badge: 'bg-cyan-100 text-cyan-900 border-cyan-300' },
  PHO_PHONG: { label: '[4] Phó Phòng', badge: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  TO_TRUONG: { label: '[5] Tổ Trưởng', badge: 'bg-amber-100 text-amber-900 border-amber-300' },
  CHUYEN_VIEN: { label: '[6] Chuyên Viên', badge: 'bg-rose-100 text-rose-900 border-rose-300' },
};

export function AdminPanelModal({ isOpen, onClose, departments, onRefreshData }: AdminPanelModalProps) {
  const [activeTab, setActiveTab] = useState<'accounts' | 'departments' | 'roles'>('accounts');
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [roles, setRoles] = useState<CustomRoleItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State - Account
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('123456');
  const [newFullName, setNewFullName] = useState('');
  const [newDeptId, setNewDeptId] = useState('');
  const [newRole, setNewRole] = useState<'ADMIN' | 'LEADER' | 'STAFF'>('STAFF');
  const [newPositionLevel, setNewPositionLevel] = useState<string>('CHUYEN_VIEN');

  // Form State - Department
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');

  // Form State - Custom Role
  const [newRoleCode, setNewRoleCode] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleLevel, setNewRoleLevel] = useState<number>(6);
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleScope, setNewRoleScope] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
      loadRoles();
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

  const loadRoles = async () => {
    const res = await fetchAdminRoles();
    if (res && res.success) {
      setRoles(res.roles || []);
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
      role: newRole,
      position_level: newPositionLevel
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

  // Create new Role
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleCode.trim() || !newRoleName.trim()) {
      showMessage('error', 'Vui lòng điền đầy đủ Mã vai trò và Tên vai trò!');
      return;
    }

    setIsLoading(true);
    const res = await createAdminRole({
      code: newRoleCode.trim().toUpperCase(),
      name: newRoleName.trim(),
      level_rank: Number(newRoleLevel),
      description: newRoleDesc,
      scope_delegation: newRoleScope
    });
    setIsLoading(false);

    if (res && res.success) {
      showMessage('success', res.message || 'Tạo vai trò mới thành công!');
      setNewRoleCode('');
      setNewRoleName('');
      setNewRoleDesc('');
      setNewRoleScope('');
      loadRoles();
    } else {
      showMessage('error', res.error || 'Lỗi khi tạo vai trò');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[200] p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/20">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold">Trang Quản Trị Hệ Thống</h3>
              <p className="text-xs text-blue-200">Tạo tài khoản cán bộ, Quản lý phòng ban &amp; Cấu hình thứ cấp giao việc</p>
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

          <button
            onClick={() => setActiveTab('roles')}
            className={`pb-3 border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'roles'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4 text-purple-600" />
            <span>Quản lý Vai Trò &amp; Phân Cấp ({roles.length > 0 ? roles.length : 6})</span>
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tên đăng nhập (Username)</label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="vd: giamdoc / chuyenvien"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#005dac]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mật khẩu khởi tạo</label>
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
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cấp Bậc Chức Danh Phân Cấp</label>
                    <select
                      value={newPositionLevel}
                      onChange={(e) => setNewPositionLevel(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#005dac] font-medium text-slate-800"
                    >
                      <option value="GIAM_DOC">[1] Giám Đốc (CEO)</option>
                      <option value="PHO_GIAM_DOC">[2] Phó Giám Đốc (Vice Director)</option>
                      <option value="TRUONG_PHONG">[3] Trưởng Phòng (Dept Head)</option>
                      <option value="PHO_PHONG">[4] Phó Phòng (Deputy Head)</option>
                      <option value="TO_TRUONG">[5] Tổ Trưởng (Team Lead)</option>
                      <option value="CHUYEN_VIEN">[6] Chuyên Viên (Specialist)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Phân quyền Vai trò Hệ thống</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as any)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#005dac]"
                    >
                      <option value="STAFF">Nhân sự (STAFF)</option>
                      <option value="LEADER">Lãnh đạo (LEADER)</option>
                      <option value="ADMIN">Quản trị viên (ADMIN)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2 bg-[#005dac] hover:bg-[#004786] text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Lưu &amp; Tạo Tài Khoản
                  </button>
                </div>
              </form>

              {/* Danh sách Tài khoản hiện có */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center justify-between">
                  <span>Danh sách tài khoản hệ thống ({accounts.length})</span>
                  <span className="text-[11px] text-slate-500 font-normal">Hiển thị cấp bậc &amp; phạm vi giao việc</span>
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Cán bộ</th>
                        <th className="p-2.5">Tên đăng nhập</th>
                        <th className="p-2.5">Phòng / Ban</th>
                        <th className="p-2.5">Cấp Bậc Phân Cấp</th>
                        <th className="p-2.5">Vai trò ST</th>
                        <th className="p-2.5 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {accounts.map((acc) => {
                        const posInfo = POSITION_LABELS[acc.position_level || 'CHUYEN_VIEN'] || { label: acc.position_level || 'Chuyên viên', badge: 'bg-slate-100 text-slate-700 border-slate-300' };
                        return (
                          <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-2.5 font-bold text-slate-900">{acc.full_name}</td>
                            <td className="p-2.5 font-mono text-slate-600 font-medium">{acc.username}</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 bg-blue-50 text-[#005dac] font-bold rounded text-[10px]">
                                [{acc.department_code}] {acc.department_name}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${posInfo.badge}`}>
                                {posInfo.label}
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeTab === 'departments' ? (
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
          ) : (
            /* TAB QUẢN LÝ VAI TRÒ & PHÂN CẤP (TAB MỚI) */
            <div className="space-y-6">
              {/* Sơ đồ phân cấp 6 Level */}
              <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-xl">
                <h4 className="text-sm font-bold text-purple-300 mb-2 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-purple-400" />
                  Sơ Đồ Thứ Cấp Giao Việc Từ Trên Xuống (Hierarchy Flow)
                </h4>
                <p className="text-xs text-slate-300 mb-4">
                  Phân cấp quản lý chỉ đạo điều hành 6 cấp bậc chuẩn trong tổ chức. Khi kéo thả nhiệm vụ ở Bảng Kanban, hệ thống tự động lọc danh sách nhân sự đúng theo cấp được chọn.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { rank: 1, code: 'GIAM_DOC', name: 'Giám đốc (Director)', desc: 'Giao việc cho Phó GD & tất cả các cấp', color: 'border-purple-500/60 bg-purple-900/30 text-purple-200' },
                    { rank: 2, code: 'PHO_GIAM_DOC', name: 'Phó Giám đốc (Vice Director)', desc: 'Giao việc cho Trưởng/Phó phòng', color: 'border-blue-500/60 bg-blue-900/30 text-blue-200' },
                    { rank: 3, code: 'TRUONG_PHONG', name: 'Trưởng phòng (Dept Head)', desc: 'Giao việc cho Phó phòng & Tổ trưởng', color: 'border-cyan-500/60 bg-cyan-900/30 text-cyan-200' },
                    { rank: 4, code: 'PHO_PHONG', name: 'Phó phòng (Deputy Head)', desc: 'Giao việc cho Tổ trưởng & Chuyên viên', color: 'border-emerald-500/60 bg-emerald-900/30 text-emerald-200' },
                    { rank: 5, code: 'TO_TRUONG', name: 'Tổ trưởng (Team Lead)', desc: 'Giao việc trực tiếp cho Chuyên viên', color: 'border-amber-500/60 bg-amber-900/30 text-amber-200' },
                    { rank: 6, code: 'CHUYEN_VIEN', name: 'Chuyên viên (Specialist)', desc: 'Thực hiện nhiệm vụ & Báo cáo hoàn thành', color: 'border-rose-500/60 bg-rose-900/30 text-rose-200' }
                  ].map((level) => {
                    const count = accounts.filter(a => (a.position_level || 'CHUYEN_VIEN') === level.code).length;
                    return (
                      <div key={level.code} className={`p-3.5 rounded-xl border ${level.color} shadow-lg flex flex-col justify-between`}>
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-black px-2 py-0.5 rounded-md bg-white/10 font-mono">
                              Cấp [{level.rank}]
                            </span>
                            <span className="text-[11px] font-bold text-slate-300">
                              {count} Cán bộ
                            </span>
                          </div>
                          <h5 className="font-bold text-sm text-slate-100">{level.name}</h5>
                          <p className="text-[11px] text-slate-300/80 mt-1">{level.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Khởi Tạo / Cấu Hình Vai Trò Mới */}
              <form onSubmit={handleCreateRole} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-purple-600" />
                  Tạo vai trò / Cấp bậc giao việc mới
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mã Vai Trò (Code)</label>
                    <input
                      type="text"
                      value={newRoleCode}
                      onChange={(e) => setNewRoleCode(e.target.value)}
                      placeholder="vd: TRUONG_BAN"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 font-mono uppercase"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tên Chức Danh / Vai Trò</label>
                    <input
                      type="text"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      placeholder="vd: Trưởng Ban Dự Án"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cấp Thứ Thứ Tự (Rank 1 - 6)</label>
                    <select
                      value={newRoleLevel}
                      onChange={(e) => setNewRoleLevel(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                    >
                      <option value={1}>Cấp 1 - Lãnh đạo cấp cao nhất</option>
                      <option value={2}>Cấp 2 - Lãnh đạo phụ trách</option>
                      <option value={3}>Cấp 3 - Quản lý Trưởng phòng</option>
                      <option value={4}>Cấp 4 - Phụ trách Phó phòng</option>
                      <option value={5}>Cấp 5 - Quản lý Tổ trưởng</option>
                      <option value={6}>Cấp 6 - Nhân sự Chuyên viên</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Phạm Vi Giao Việc &amp; Thẩm Quyền</label>
                    <input
                      type="text"
                      value={newRoleScope}
                      onChange={(e) => setNewRoleScope(e.target.value)}
                      placeholder="vd: Giao việc cho các Trưởng ban & Chuyên viên khối dự án"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Tạo Vai Trò Mới
                    </button>
                  </div>
                </div>
              </form>

              {/* Danh sách Vai trò trong hệ thống */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  Danh Sách Vai Trò &amp; Định Nghĩa Thứ Cấp ({roles.length})
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Thứ Bậc</th>
                        <th className="p-2.5">Mã Định Danh</th>
                        <th className="p-2.5">Tên Vai Trò / Chức Danh</th>
                        <th className="p-2.5">Phạm Vi Giao Việc</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {roles.map((r) => (
                        <tr key={r.id} className="hover:bg-purple-50/50 transition-colors">
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-900 font-extrabold rounded text-[10px]">
                              Cấp [{r.level_rank}]
                            </span>
                          </td>
                          <td className="p-2.5 font-bold font-mono text-purple-700">{r.code}</td>
                          <td className="p-2.5 font-bold text-slate-900">{r.name}</td>
                          <td className="p-2.5 text-slate-600">{r.scope_delegation || r.description || 'Chưa định nghĩa'}</td>
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
