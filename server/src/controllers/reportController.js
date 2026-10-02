import { db } from '../db.js';
import { createDocxReport, createConsolidatedOfficeDocx } from '../services/docxService.js';

/**
 * 1. Đăng nhập tài khoản
 */
export async function login(req, res) {
  try {
    const { username, password } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập tên đăng nhập' });
    }

    const account = db.prepare(`
      SELECT a.id, a.username, a.full_name, a.role, a.position_level, a.department_id, a.password, d.name as department_name, d.code as department_code
      FROM accounts a
      JOIN departments d ON a.department_id = d.id
      WHERE a.username = ? AND a.is_active = 1
    `).get(username);

    if (!account) {
      return res.status(401).json({ success: false, error: 'Tài khoản không tồn tại hoặc đã bị khóa' });
    }

    // Đơn giản hóa xác thực cho bản Demo/Poc
    if (password && account.password && password !== account.password) {
      return res.status(401).json({ success: false, error: 'Mật khẩu không chính xác' });
    }

    return res.json({
      success: true,
      user: {
        id: account.id,
        username: account.username,
        full_name: account.full_name,
        role: account.role,
        position_level: account.position_level || 'CHUYEN_VIEN',
        department_id: account.department_id,
        department_name: account.department_name,
        department_code: account.department_code
      }
    });
  } catch (error) {
    console.error('Lỗi login:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 2. Lấy danh sách Phòng / Ban và Tài khoản
 */
export async function getDepartments(req, res) {
  try {
    const depts = db.prepare('SELECT * FROM departments ORDER BY code ASC').all();
    const accounts = db.prepare(`
      SELECT a.id, a.username, a.full_name, a.role, a.position_level, a.department_id, a.is_active, d.name as department_name, d.code as department_code
      FROM accounts a
      JOIN departments d ON a.department_id = d.id
      ORDER BY a.username ASC
    `).all();

    return res.json({ success: true, departments: depts, accounts });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 2b. Quản trị: Lấy danh sách tất cả tài khoản
 */
export async function getAccounts(req, res) {
  try {
    const accounts = db.prepare(`
      SELECT a.id, a.username, a.full_name, a.role, a.position_level, a.department_id, a.is_active, d.name as department_name, d.code as department_code
      FROM accounts a
      JOIN departments d ON a.department_id = d.id
      ORDER BY a.username ASC
    `).all();
    return res.json({ success: true, accounts });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 2c. Quản trị: Tạo tài khoản mới
 */
export async function createAccount(req, res) {
  try {
    const { username, password, full_name, department_id, role, position_level } = req.body;

    if (!username || !password || !full_name || !department_id) {
      return res.status(400).json({ success: false, error: 'Vui lòng điền đầy đủ thông tin tài khoản' });
    }

    const existing = db.prepare('SELECT id FROM accounts WHERE username = ?').get(username);
    if (existing) {
      return res.status(400).json({ success: false, error: `Tên đăng nhập "${username}" đã tồn tại!` });
    }

    const newId = `acc_${username}_${Date.now()}`;
    const posLevel = position_level || 'CHUYEN_VIEN';

    db.prepare(`
      INSERT INTO accounts (id, department_id, username, password, full_name, role, position_level)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(newId, department_id, username, password, full_name, role || 'STAFF', posLevel);

    return res.json({ success: true, message: 'Tạo tài khoản thành công!' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 2c2. Quản trị: Cập nhật thông tin tài khoản
 */
export async function updateAccount(req, res) {
  try {
    const { id } = req.params;
    const { username, password, full_name, department_id, role, position_level, is_active } = req.body;

    if (!id || !username || !full_name || !department_id) {
      return res.status(400).json({ success: false, error: 'Vui lòng điền đầy đủ thông tin tài khoản' });
    }

    const existing = db.prepare('SELECT id FROM accounts WHERE username = ? AND id != ?').get(username, id);
    if (existing) {
      return res.status(400).json({ success: false, error: `Tên đăng nhập "${username}" đã được sử dụng bởi tài khoản khác!` });
    }

    const posLevel = position_level || 'CHUYEN_VIEN';
    const activeState = is_active !== undefined ? Number(is_active) : 1;

    if (password && password.trim()) {
      db.prepare(`
        UPDATE accounts
        SET username = ?, password = ?, full_name = ?, department_id = ?, role = ?, position_level = ?, is_active = ?
        WHERE id = ?
      `).run(username, password.trim(), full_name, department_id, role || 'STAFF', posLevel, activeState, id);
    } else {
      db.prepare(`
        UPDATE accounts
        SET username = ?, full_name = ?, department_id = ?, role = ?, position_level = ?, is_active = ?
        WHERE id = ?
      `).run(username, full_name, department_id, role || 'STAFF', posLevel, activeState, id);
    }

    return res.json({ success: true, message: 'Cập nhật tài khoản thành công!' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 2c3. Quản trị: Khóa / Mở khóa tài khoản
 */
export async function toggleAccountStatus(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Thiếu ID tài khoản' });
    }

    const account = db.prepare('SELECT id, username, is_active FROM accounts WHERE id = ?').get(id);
    if (!account) {
      return res.status(404).json({ success: false, error: 'Tài khoản không tồn tại' });
    }

    if (account.username === 'admin') {
      return res.status(400).json({ success: false, error: 'Không thể khóa tài khoản Quản trị viên hệ thống (admin)!' });
    }

    const newStatus = account.is_active === 1 ? 0 : 1;
    db.prepare('UPDATE accounts SET is_active = ? WHERE id = ?').run(newStatus, id);

    return res.json({
      success: true,
      is_active: newStatus,
      message: newStatus === 1 ? 'Đã mở khóa tài khoản thành công!' : 'Đã khóa tài khoản thành công!'
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 2c4. Quản trị: Import hàng loạt tài khoản từ Excel
 */
export async function bulkImportAccounts(req, res) {
  try {
    const { accounts } = req.body;
    if (!Array.isArray(accounts) || accounts.length === 0) {
      return res.status(400).json({ success: false, error: 'Danh sách tài khoản import rỗng hoặc không hợp lệ' });
    }

    const depts = db.prepare('SELECT id, code, name FROM departments').all();
    const deptMapByCode = new Map();
    const deptMapByName = new Map();
    depts.forEach(d => {
      deptMapByCode.set(String(d.code).trim().toLowerCase(), d.id);
      deptMapByName.set(String(d.name).trim().toLowerCase(), d.id);
    });

    const existingAccounts = db.prepare('SELECT username FROM accounts').all();
    const existingUsernames = new Set(existingAccounts.map(a => String(a.username).trim().toLowerCase()));

    let importedCount = 0;
    let skippedCount = 0;
    const skippedDetails = [];

    const insertStmt = db.prepare(`
      INSERT INTO accounts (id, department_id, username, password, full_name, role, position_level, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const runImport = db.transaction((items) => {
      for (const item of items) {
        const uName = String(item.username || '').trim();
        const pwd = String(item.password || '').trim();
        const fullName = String(item.full_name || item.fullName || '').trim();
        const deptCode = String(item.department_code || item.deptCode || item.department_id || '').trim();
        const posLevel = String(item.position_level || item.posLevel || 'CHUYEN_VIEN').trim();
        const role = String(item.role || 'STAFF').trim();

        if (!uName || !pwd || !fullName) {
          skippedCount++;
          skippedDetails.push(`Bỏ qua tài khoản thiếu thông tin (Username/Mật khẩu/Họ tên): ${uName || 'N/A'}`);
          continue;
        }

        if (existingUsernames.has(uName.toLowerCase())) {
          skippedCount++;
          skippedDetails.push(`Tên đăng nhập "${uName}" đã tồn tại trên hệ thống.`);
          continue;
        }

        let deptId = deptMapByCode.get(deptCode.toLowerCase()) || deptMapByName.get(deptCode.toLowerCase());
        if (!deptId && depts.length > 0) {
          deptId = depts[0].id;
        }

        const newId = `acc_${uName}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        insertStmt.run(newId, deptId, uName, pwd, fullName, role, posLevel);
        existingUsernames.add(uName.toLowerCase());
        importedCount++;
      }
    });

    runImport(accounts);

    return res.json({
      success: true,
      importedCount,
      skippedCount,
      skippedDetails,
      message: `Đã import thành công ${importedCount} tài khoản.${skippedCount > 0 ? ` Bỏ qua ${skippedCount} tài khoản trùng hoặc thiếu dữ liệu.` : ''}`
    });
  } catch (error) {
    console.error('Lỗi bulkImportAccounts:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Cập nhật thông tin cá nhân (Profile Update)
 */
export async function updateUserProfile(req, res) {
  try {
    const { userId, full_name, password } = req.body;
    if (!userId || !full_name) {
      return res.status(400).json({ success: false, error: 'Vui lòng cung cấp ID người dùng và Họ tên' });
    }

    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(userId);
    if (!account) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy thông tin người dùng' });
    }

    if (password && password.trim()) {
      db.prepare('UPDATE accounts SET full_name = ?, password = ? WHERE id = ?').run(full_name.trim(), password.trim(), userId);
    } else {
      db.prepare('UPDATE accounts SET full_name = ? WHERE id = ?').run(full_name.trim(), userId);
    }

    const updated = db.prepare(`
      SELECT a.id, a.username, a.full_name, a.role, a.position_level, a.department_id, d.name as department_name, d.code as department_code
      FROM accounts a
      JOIN departments d ON a.department_id = d.id
      WHERE a.id = ?
    `).get(userId);

    return res.json({
      success: true,
      message: 'Cập nhật thông tin cá nhân thành công!',
      user: {
        id: updated.id,
        username: updated.username,
        full_name: updated.full_name,
        role: updated.role,
        position_level: updated.position_level || 'CHUYEN_VIEN',
        department_id: updated.department_id,
        department_name: updated.department_name,
        department_code: updated.department_code
      }
    });
  } catch (error) {
    console.error('Lỗi updateUserProfile:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 2d. Quản trị: Lấy và khởi tạo danh sách Vai Trò & Phân Cấp
 */
export async function getRoles(req, res) {
  try {
    const roles = db.prepare('SELECT * FROM custom_roles ORDER BY level_rank ASC').all();
    return res.json({ success: true, roles });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function createRole(req, res) {
  try {
    const { code, name, level_rank, description, scope_delegation } = req.body;
    if (!code || !name || !level_rank) {
      return res.status(400).json({ success: false, error: 'Thiếu mã, tên vai trò hoặc cấp bậc' });
    }

    const roleId = `role_${Date.now()}`;
    db.prepare(`
      INSERT INTO custom_roles (id, code, name, level_rank, description, scope_delegation)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(roleId, code, name, level_rank, description || '', scope_delegation || '');

    return res.json({ success: true, message: 'Tạo vai trò mới thành công' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 2d. Quản trị: Xóa / Khóa tài khoản
 */
export async function deleteAccount(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Thiếu ID tài khoản' });
    }

    db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
    return res.json({ success: true, message: 'Đã xóa tài khoản thành công' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 2e. Quản trị: Tạo Phòng / Ban mới
 */
export async function createDepartment(req, res) {
  try {
    const { name, code } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập Tên phòng và Mã phòng' });
    }

    const cleanCode = code.toUpperCase().trim();
    const existing = db.prepare('SELECT id FROM departments WHERE code = ?').get(cleanCode);
    if (existing) {
      return res.status(400).json({ success: false, error: `Mã phòng ban "${cleanCode}" đã tồn tại!` });
    }

    const newId = `dept_${cleanCode.toLowerCase()}_${Date.now()}`;
    db.prepare('INSERT INTO departments (id, name, code) VALUES (?, ?, ?)').run(newId, name, cleanCode);

    return res.json({ success: true, message: `Đã tạo Phòng/Ban "${name}" thành công!`, department: { id: newId, name, code: cleanCode } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 3. Lấy Lịch sử Báo cáo Tuần theo Tài khoản & Quyền được chia sẻ
 */
export async function getReportHistory(req, res) {
  try {
    const { department_id, account_id } = req.query;
    const targetDeptId = department_id || 'dept_vp';
    const currentUserId = account_id || '';

    const currentUser = currentUserId ? db.prepare('SELECT role FROM accounts WHERE id = ?').get(currentUserId) : null;
    const isAdmin = currentUser && currentUser.role === 'ADMIN';

    let reports = [];

    if (isAdmin) {
      reports = db.prepare(`
        SELECT r.*, a.full_name as nguoi_lap, d.name as don_vi, d.code as don_vi_code, 'ADMIN' as user_permission
        FROM reports r
        JOIN accounts a ON r.account_id = a.id
        JOIN departments d ON r.department_id = d.id
        ORDER BY r.updated_at DESC, r.year DESC, r.week_number DESC
      `).all();
    } else {
      reports = db.prepare(`
        SELECT r.*, a.full_name as nguoi_lap, d.name as don_vi, d.code as don_vi_code,
          CASE 
            WHEN r.account_id = ? THEN 'OWNER'
            WHEN r.report_type = 'CONSOLIDATED_OFFICE' THEN 'EDIT'
            ELSE COALESCE(rs.permission, 'VIEW')
          END as user_permission
        FROM reports r
        JOIN accounts a ON r.account_id = a.id
        JOIN departments d ON r.department_id = d.id
        LEFT JOIN report_shares rs ON r.id = rs.report_id AND rs.shared_with_account_id = ?
        WHERE r.department_id = ? OR r.account_id = ? OR rs.shared_with_account_id = ?
        ORDER BY r.updated_at DESC, r.year DESC, r.week_number DESC
      `).all(currentUserId, currentUserId, targetDeptId, currentUserId, currentUserId);
    }

    // Tính toán số lượng task và tỷ lệ hoàn thành cho mỗi báo cáo
    const reportsWithStats = reports.map(r => {
      const tasks = db.prepare('SELECT tien_do, table_type FROM tasks WHERE report_id = ?').all(r.id);
      const t1 = tasks.filter(t => t.table_type === 1);
      const t2 = tasks.filter(t => t.table_type === 2);
      const doneCount = t1.filter(t => t.tien_do === 'Hoàn thành').length;
      const totalT1 = t1.length;
      const percent = totalT1 > 0 ? Math.round((doneCount / totalT1) * 100) : 0;

      return {
        ...r,
        total_t1: totalT1,
        total_t2: t2.length,
        done_t1: doneCount,
        percent_done: `${percent}%`
      };
    });

    return res.json({ success: true, reports: reportsWithStats });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}



/**
 * 4. Lấy Chi tiết 1 Báo cáo Tuần (Có kiểm tra quyền truy cập)
 */
export async function getReportDetail(req, res) {
  try {
    const { department_id, week, year, report_id, account_id } = req.query;
    const currentUserId = account_id;

    if (!currentUserId) {
      return res.status(400).json({ success: false, error: 'Thiếu thông tin người dùng' });
    }

    const currentUser = db.prepare('SELECT role, department_id FROM accounts WHERE id = ?').get(currentUserId);
    const isAdmin = currentUser && currentUser.role === 'ADMIN';

    let report;
    if (report_id) {
      report = db.prepare(`
        SELECT r.*, a.full_name as nguoi_lap, d.name as don_vi
        FROM reports r
        JOIN accounts a ON r.account_id = a.id
        JOIN departments d ON r.department_id = d.id
        WHERE r.id = ?
      `).get(report_id);
    } else {
      const targetWeek = parseInt(week || '42', 10);
      const targetYear = parseInt(year || '2026', 10);

      // 1. Tìm báo cáo theo account_id hiện tại
      report = db.prepare(`
        SELECT r.*, a.full_name as nguoi_lap, d.name as don_vi
        FROM reports r
        JOIN accounts a ON r.account_id = a.id
        JOIN departments d ON r.department_id = d.id
        WHERE r.account_id = ? AND r.week_number = ? AND r.year = ?
      `).get(currentUserId, targetWeek, targetYear);

      // 2. Nếu là ADMIN và có department_id, ADMIN mới được xem báo cáo phòng ban đó
      if (!report && isAdmin && department_id) {
        report = db.prepare(`
          SELECT r.*, a.full_name as nguoi_lap, d.name as don_vi
          FROM reports r
          JOIN accounts a ON r.account_id = a.id
          JOIN departments d ON r.department_id = d.id
          WHERE r.department_id = ? AND r.week_number = ? AND r.year = ?
          ORDER BY r.updated_at DESC
        `).get(department_id, targetWeek, targetYear);
      }

      // 3. Dự phòng: Tìm theo báo cáo được chia sẻ cho account_id
      if (!report) {
        report = db.prepare(`
          SELECT r.*, a.full_name as nguoi_lap, d.name as don_vi
          FROM reports r
          JOIN accounts a ON r.account_id = a.id
          JOIN departments d ON r.department_id = d.id
          JOIN report_shares rs ON r.id = rs.report_id
          WHERE rs.shared_with_account_id = ? AND r.week_number = ? AND r.year = ?
        `).get(currentUserId, targetWeek, targetYear);
      }
    }

    if (!report) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy báo cáo tuần tương ứng' });
    }

    // Kiểm tra quyền của currentUserId với báo cáo này
    let userPermission = 'NO_ACCESS';

    if (report.account_id === currentUserId) {
      userPermission = 'OWNER';
    } else if (isAdmin) {
      userPermission = 'ADMIN';
    } else {
      const share = db.prepare('SELECT permission FROM report_shares WHERE report_id = ? AND shared_with_account_id = ?').get(report.id, currentUserId);
      if (share) {
        userPermission = share.permission; // 'VIEW' or 'EDIT'
      }
    }

    if (userPermission === 'NO_ACCESS') {
      return res.status(403).json({ success: false, error: 'Bạn không có quyền xem báo cáo tuần này của người khác (Chưa được chia sẻ).' });
    }

    const tasks = db.prepare('SELECT * FROM tasks WHERE report_id = ? ORDER BY table_type ASC, order_index ASC').all(report.id);

    const table1 = tasks.filter(t => t.table_type === 1).map(t => ({
      id: t.id,
      noi_dung: t.noi_dung,
      thoi_gian: t.thoi_gian,
      trien_khai: t.trien_khai,
      tien_do: t.tien_do,
      san_pham: t.san_pham || '',
      file_minh_chung: t.file_minh_chung || '',
      file_original_name: t.file_original_name || '',
      nhom: t.category,
      parent_task_id: t.parent_task_id,
      is_starred: Boolean(t.is_starred),
      is_recurring: Boolean(t.is_recurring),
      isEdited: false
    }));

    const table2 = tasks.filter(t => t.table_type === 2).map(t => ({
      id: t.id,
      noi_dung: t.noi_dung,
      thoi_gian_du_kien: t.thoi_gian,
      san_pham_du_kien: t.san_pham,
      nhom: t.category,
      parent_task_id: t.parent_task_id,
      is_starred: Boolean(t.is_starred),
      is_recurring: Boolean(t.is_recurring),
      isEdited: false
    }));

    return res.json({
      success: true,
      data: {
        metadata: {
          report_id: report.id,
          account_id: report.account_id,
          department_id: report.department_id,
          tuan: report.week_number,
          tuan_tiep: report.week_number + 1,
          nam: report.year,
          nguoi_lap: report.nguoi_lap,
          don_vi: report.don_vi,
          co_quan_cap_tren: "BAN QUẢN LÝ CÁC KHU LIÊN HỢP XỬ LÝ CHẤT THẢI THÀNH PHỐ",
          ngay_lap: report.created_at,
          kho_khan: report.kho_khan,
          status: report.status,
          user_permission: userPermission
        },
        table1,
        table2
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 5. Lưu / Cập nhật Báo cáo Tuần (Có kiểm tra quyền Chỉnh sửa)
 */
export async function saveReport(req, res) {
  try {
    const { metadata, table1, table2, account_id: reqAccountId } = req.body;
    if (!metadata || !metadata.tuan) {
      return res.status(400).json({ success: false, error: 'Dữ liệu không hợp lệ' });
    }

    const currentUserId = reqAccountId || metadata.account_id || 'acc_vp_hoa';
    const deptId = metadata.department_id || 'dept_vp';
    const week = parseInt(metadata.tuan, 10);
    const year = parseInt(metadata.nam || '2026', 10);

    // Xác định ID báo cáo theo tài khoản cá nhân: rpt_${currentUserId}_w${week}_${year}
    let targetReportId = metadata.report_id;
    if (!targetReportId || targetReportId.startsWith('rpt_dept_')) {
      targetReportId = `rpt_${currentUserId}_w${week}_${year}`;
    }

    // Lấy thông tin tài khoản người thực hiện lưu
    const editorAccount = db.prepare('SELECT full_name, role FROM accounts WHERE id = ?').get(currentUserId);
    const editorName = editorAccount ? editorAccount.full_name : currentUserId;

    // Kiểm tra xem báo cáo đã tồn tại chưa
    const existingReport = db.prepare("SELECT * FROM reports WHERE id = ? OR (account_id = ? AND COALESCE(report_type, 'SINGLE') = 'SINGLE' AND week_number = ? AND year = ?)").get(targetReportId, currentUserId, week, year);

    if (existingReport) {
      targetReportId = existingReport.id;
      // Kiểm tra quyền sửa
      let canEdit = false;

      if (existingReport.account_id === currentUserId || (editorAccount && editorAccount.role === 'ADMIN')) {
        canEdit = true;
      } else {
        const share = db.prepare('SELECT permission FROM report_shares WHERE report_id = ? AND shared_with_account_id = ?').get(targetReportId, currentUserId);
        if (share && share.permission === 'EDIT') {
          canEdit = true;
        }
      }

      if (!canEdit) {
        return res.status(403).json({ success: false, error: 'Bạn chỉ có quyền xem (VIEW) báo cáo này, không có quyền lưu chỉnh sửa!' });
      }

    // Check concurrency conflict
      const clientLastUpdated = req.body.client_last_updated_at;
      const forceSave = req.body.force_save;
      if (clientLastUpdated && existingReport.updated_at && !forceSave) {
        const existingTime = new Date(existingReport.updated_at).getTime();
        const clientTime = new Date(clientLastUpdated).getTime();
        if (existingTime - clientTime > 2000) { // 2s tolerance
          return res.json({
            success: false,
            conflict: true,
            message: `⚠️ Xung đột dữ liệu: Báo cáo này vừa được [${existingReport.last_edited_by || 'người dùng khác'}] cập nhật mới hơn vào lúc ${existingReport.updated_at}. Bạn có muốn ghi đè?`,
            last_edited_by: existingReport.last_edited_by,
            updated_at: existingReport.updated_at
          });
        }
      }
    }

    // Atomic transaction for database safety
    db.exec('BEGIN IMMEDIATE;');
    try {
      if (existingReport) {
        // Update existing report
        db.prepare(`
          UPDATE reports
          SET kho_khan = ?, status = ?, created_at = COALESCE(?, created_at), updated_at = CURRENT_TIMESTAMP, last_edited_by = ?
          WHERE id = ?
        `).run(metadata.kho_khan || 'Không', metadata.status || 'DRAFT', metadata.ngay_lap || null, editorName, targetReportId);

      } else {
        // Create new report owned by currentUserId
        db.prepare(`
          INSERT INTO reports (id, department_id, account_id, week_number, year, status, report_type, kho_khan, created_at, updated_at, last_edited_by)
          VALUES (?, ?, ?, ?, ?, ?, 'SINGLE', ?, COALESCE(?, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP, ?)
          ON CONFLICT(account_id, report_type, week_number, year) DO UPDATE SET
            kho_khan = excluded.kho_khan,
            status = excluded.status,
            updated_at = CURRENT_TIMESTAMP,
            last_edited_by = excluded.last_edited_by
        `).run(targetReportId, deptId, currentUserId, week, year, metadata.status || 'DRAFT', metadata.kho_khan || 'Không', metadata.ngay_lap || null, editorName);
      }

      // Replace tasks for targetReportId
      db.prepare('DELETE FROM tasks WHERE report_id = ?').run(targetReportId);

      const stmtTask = db.prepare(`
        INSERT INTO tasks (id, report_id, table_type, category, noi_dung, thoi_gian, trien_khai, tien_do, san_pham, parent_task_id, order_index, file_minh_chung, file_original_name, is_starred, is_recurring)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      (table1 || []).forEach((t, idx) => {
        let cat = t.nhom || 'Thường xuyên';
        if (cat.toLowerCase().includes('đột')) cat = 'Đột xuất';
        else cat = 'Thường xuyên';

        // Generate guaranteed unique task ID to prevent PRIMARY KEY collisions
        const uniqueTaskId = `t1_${targetReportId}_${idx}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

        stmtTask.run(
          uniqueTaskId,
          targetReportId,
          1,
          cat,
          t.noi_dung || '',
          t.thoi_gian || 'Chưa nhập',
          t.trien_khai || '',
          t.tien_do || 'Hoàn thành',
          t.san_pham || '',
          t.parent_task_id || null,
          idx + 1,
          t.file_minh_chung || '',
          t.file_original_name || '',
          t.is_starred ? 1 : 0,
          t.is_recurring ? 1 : 0
        );
      });

      (table2 || []).forEach((t, idx) => {
        let cat = t.nhom || 'Thường xuyên';
        if (cat.toLowerCase().includes('đột')) cat = 'Đột xuất';
        else cat = 'Thường xuyên';

        // Generate guaranteed unique task ID to prevent PRIMARY KEY collisions
        const uniqueTaskId = `t2_${targetReportId}_${idx}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

        stmtTask.run(
          uniqueTaskId,
          targetReportId,
          2,
          cat,
          t.noi_dung || '',
          t.thoi_gian_du_kien || 'Trong tuần',
          '',
          '',
          t.san_pham_du_kien || '',
          t.parent_task_id || null,
          idx + 1,
          '',
          '',
          t.is_starred ? 1 : 0,
          t.is_recurring ? 1 : 0
        );
      });

      db.exec('COMMIT;');
      return res.json({ success: true, message: 'Đã lưu báo cáo thành công', report_id: targetReportId });
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }
  } catch (error) {
    console.error('Lỗi saveReport:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 6. CORE ACTION: Tự động Kết chuyển Nhiệm vụ Chưa Hoàn thành & Kế hoạch sang Tuần Tiếp Theo
 */
export async function carryOverNextWeek(req, res) {
  try {
    const { department_id, current_week, current_year, account_id } = req.body;
    const currWeek = parseInt(current_week || '42', 10);
    const currYear = parseInt(current_year || '2026', 10);
    const accId = account_id;

    if (!accId) {
      return res.status(400).json({ success: false, error: 'Thiếu thông tin người dùng (account_id)' });
    }

    const currentUser = db.prepare('SELECT role FROM accounts WHERE id = ?').get(accId);
    const isAdmin = currentUser && currentUser.role === 'ADMIN';

    const targetWeek = currWeek + 1;
    const targetYear = currYear;

    // 1. Lấy báo cáo tuần hiện tại của account
    let currentReport = db.prepare(`
      SELECT * FROM reports WHERE account_id = ? AND week_number = ? AND year = ?
    `).get(accId, currWeek, currYear);

    const consolidatedMasterId = `rpt_consolidated_office_w${currWeek}_${currYear}`;
    const consolidatedReport = db.prepare('SELECT * FROM reports WHERE id = ?').get(consolidatedMasterId);

    if (!currentReport && consolidatedReport) {
      currentReport = consolidatedReport;
    } else if (!currentReport && isAdmin && department_id) {
      currentReport = db.prepare(`
        SELECT * FROM reports WHERE department_id = ? AND week_number = ? AND year = ?
      `).get(department_id, currWeek, currYear);
    }

    if (!currentReport && !consolidatedReport) {
      return res.status(404).json({ success: false, error: `Không tìm thấy báo cáo Tuần ${currWeek}/${currYear} để kết chuyển` });
    }

    const isConsolidated = (currentReport && currentReport.report_type === 'CONSOLIDATED_OFFICE') || Boolean(consolidatedReport);
    const activeReportId = isConsolidated ? consolidatedMasterId : currentReport.id;

    // 2. Lấy danh sách nhiệm vụ của tuần hiện tại (kèm team_code của từng tổ)
    let currentTasks = db.prepare(`
      SELECT t.*, COALESCE(t.team_code, 'VAN_THU') as team_code
      FROM tasks t
      WHERE t.report_id = ? OR t.report_id IN (SELECT id FROM reports WHERE parent_consolidated_id = ?)
      ORDER BY t.order_index ASC
    `).all(activeReportId, activeReportId);

    // Nếu người dùng gửi danh sách các ID được chọn (selected_task_ids)
    const { selected_task_ids } = req.body;
    if (Array.isArray(selected_task_ids) && selected_task_ids.length > 0) {
      const selectedSet = new Set(selected_task_ids);
      currentTasks = currentTasks.filter(t => selectedSet.has(t.id));
    }

    // 3. Phân loại 3 nhóm kế thừa:
    // Nhóm A: Nhiệm vụ Bảng I thuộc nhóm "Thường xuyên" (kế thừa lặp lại hàng tuần)
    const routineTable1 = currentTasks.filter(t => t.table_type === 1 && (t.category === 'Thường xuyên' || t.is_recurring === 1));
    const routineIds = new Set(routineTable1.map(t => t.id));

    // Nhóm B: Nhiệm vụ Bảng I chưa hoàn thành (Đang thực hiện / Chưa thực hiện / Hoàn thành trễ, không bị trùng với nhóm Thường xuyên)
    const unfinishedTable1 = currentTasks.filter(t => t.table_type === 1 && t.tien_do !== 'Hoàn thành' && !routineIds.has(t.id));

    // Nhóm C: Kế hoạch Bảng II đôn lên Bảng I tuần mới
    const plannedTable2 = currentTasks.filter(t => t.table_type === 2 && t.noi_dung && t.noi_dung.trim().length > 0);

    // 4. Khởi tạo Báo cáo target report cho account / consolidated master
    const targetReportId = isConsolidated
      ? `rpt_consolidated_office_w${targetWeek}_${targetYear}`
      : `rpt_${accId}_w${targetWeek}_${targetYear}`;

    const existingTargetReport = db.prepare('SELECT id FROM reports WHERE id = ?').get(targetReportId);

    if (existingTargetReport) {
      db.prepare('DELETE FROM tasks WHERE report_id = ?').run(targetReportId);
    } else {
      if (isConsolidated) {
        db.prepare(`
          INSERT INTO reports (id, department_id, account_id, week_number, year, status, report_type, team_code, kho_khan)
          VALUES (?, ?, ?, ?, ?, 'DRAFT', 'CONSOLIDATED_OFFICE', 'OFFICE_MASTER', 'Chưa có vướng mắc phát sinh')
        `).run(targetReportId, department_id || 'dept_vp', accId, targetWeek, targetYear);
      } else {
        db.prepare(`
          INSERT INTO reports (id, department_id, account_id, week_number, year, status, kho_khan)
          VALUES (?, ?, ?, ?, ?, 'DRAFT', 'Chưa có vướng mắc phát sinh')
        `).run(targetReportId, currentReport.department_id || department_id || 'dept_vp', accId, targetWeek, targetYear);
      }
    }

    const stmtInsertTask = db.prepare(`
      INSERT INTO tasks (id, report_id, table_type, category, noi_dung, thoi_gian, trien_khai, tien_do, san_pham, parent_task_id, order_index, is_recurring, team_code, is_starred)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let newOrderIndex = 1;
    const carriedOverTasks = [];
    const addedContents = new Set();

    // 1. Chèn Nhiệm vụ Thường xuyên Bảng I
    routineTable1.forEach(t => {
      const cleanContent = (t.noi_dung || '').trim().toLowerCase();
      const itemKey = `t1_${t.team_code || 'VAN_THU'}_${cleanContent}`;
      if (!cleanContent || addedContents.has(itemKey)) return;
      addedContents.add(itemKey);

      const newId = `co_tx_${t.id}_${Date.now()}`;
      const isStarred = t.is_starred !== undefined ? t.is_starred : 1;
      // Đem theo toàn bộ nội dung triển khai thực hiện và sản phẩm từ tuần cũ sang tuần mới
      const finalTrienKhai = t.trien_khai || '';
      const finalSanPham = t.san_pham || '';

      stmtInsertTask.run(
        newId,
        targetReportId,
        1, // Table 1
        'Thường xuyên',
        t.noi_dung,
        'Thường xuyên',
        finalTrienKhai, // Đem nội dung triển khai thực hiện sang tuần mới
        'Đang thực hiện',
        finalSanPham, // Đem sản phẩm sang tuần mới
        t.id,
        newOrderIndex++,
        1,
        t.team_code || 'VAN_THU',
        isStarred
      );
      carriedOverTasks.push({ id: newId, noi_dung: t.noi_dung, type: 'THUONG_XUYEN', source: 'Nhiệm vụ Thường xuyên Bảng I', team_code: t.team_code });
    });

    // 2. Chèn Nhiệm vụ Chưa Hoàn thành Bảng I (Đang thực hiện / Chưa xong)
    unfinishedTable1.forEach(t => {
      const cleanContent = (t.noi_dung || '').trim().toLowerCase();
      const itemKey = `t1_${t.team_code || 'VAN_THU'}_${cleanContent}`;
      if (!cleanContent || addedContents.has(itemKey)) return;
      addedContents.add(itemKey);

      const newId = `co_uf_${t.id}_${Date.now()}`;
      const isStarred = t.is_starred !== undefined ? t.is_starred : 0;
      const finalTrienKhai = t.trien_khai || '';
      const finalSanPham = t.san_pham || '';

      stmtInsertTask.run(
        newId,
        targetReportId,
        1, // Table 1
        t.category || 'Đột xuất',
        t.noi_dung,
        t.thoi_gian || 'Trong tuần',
        finalTrienKhai,
        'Đang thực hiện',
        finalSanPham,
        t.id,
        newOrderIndex++,
        t.is_recurring || 0,
        t.team_code || 'VAN_THU',
        isStarred
      );
      carriedOverTasks.push({ id: newId, noi_dung: t.noi_dung, type: 'UNFINISHED', source: 'Nhiệm vụ dở dang Bảng I', team_code: t.team_code });
    });

    // 3. Chèn Kế hoạch Bảng II tuần cũ sang BẢNG II tuần mới (Duy trì cho cả Tổ Văn thư và Tổ Chuyển đổi số)
    plannedTable2.forEach(t => {
      const cleanContent = (t.noi_dung || '').trim().toLowerCase();
      const itemKey = `t2_${t.team_code || 'VAN_THU'}_${cleanContent}`;
      if (!cleanContent || addedContents.has(itemKey)) return;
      addedContents.add(itemKey);

      const newId = `co_t2_${t.id}_${Date.now()}`;
      const isStarred = t.is_starred !== undefined ? t.is_starred : (t.category === 'Thường xuyên' || t.is_recurring ? 1 : 0);
      const finalTrienKhai = t.trien_khai || '';

      stmtInsertTask.run(
        newId,
        targetReportId,
        2, // Table 2 - Giữ đúng Bảng II Kế hoạch
        t.category || 'Thường xuyên',
        t.noi_dung,
        t.thoi_gian_du_kien || t.thoi_gian || 'Trong tuần',
        finalTrienKhai,
        'Đang thực hiện',
        t.san_pham_du_kien || t.san_pham || '', // Giữ sản phẩm dự kiến/mục tiêu
        t.id,
        newOrderIndex++,
        t.is_recurring || 0,
        t.team_code || 'VAN_THU',
        isStarred
      );
      carriedOverTasks.push({ id: newId, noi_dung: t.noi_dung, type: 'PLANNED_TABLE2', source: 'Kế hoạch Bảng II', team_code: t.team_code });
    });

    return res.json({
      success: true,
      message: `Đã tự động kế thừa thành công ${carriedOverTasks.length} nhiệm vụ sang Báo cáo Tuần ${targetWeek}/${targetYear}`,
      new_report_id: targetReportId,
      target_week: targetWeek,
      target_year: targetYear,
      carried_over_count: carriedOverTasks.length,
      carried_over_tasks: carriedOverTasks
    });
  } catch (error) {
    console.error('Lỗi carryOverNextWeek:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 7. Chia sẻ Báo cáo & Gửi thông báo
 */
export async function shareReport(req, res) {
  try {
    const { report_id, shared_with_account_id, permission, sender_account_id, shared_by_account_id } = req.body;
    const senderId = sender_account_id || shared_by_account_id || 'system';

    if (!report_id || !shared_with_account_id || !permission) {
      return res.status(400).json({ success: false, error: 'Thiếu thông tin chia sẻ báo cáo' });
    }

    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(report_id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy báo cáo' });
    }

    const sender = db.prepare('SELECT full_name FROM accounts WHERE id = ?').get(senderId);
    const recipient = db.prepare('SELECT full_name FROM accounts WHERE id = ?').get(shared_with_account_id);

    if (!recipient) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản nhận' });
    }

    // Upsert share record
    const shareId = `share_${report_id}_${shared_with_account_id}`;
    db.prepare(`
      INSERT INTO report_shares (id, report_id, shared_with_account_id, permission, shared_by_account_id)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(report_id, shared_with_account_id) DO UPDATE SET
        permission = excluded.permission,
        created_at = CURRENT_TIMESTAMP
    `).run(shareId, report_id, shared_with_account_id, permission, senderId);

    // Create Notification for recipient
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const permText = permission === 'EDIT' ? 'Chỉnh sửa' : 'Chỉ xem';
    const senderName = sender ? sender.full_name : 'Một thành viên';

    db.prepare(`
      INSERT INTO notifications (id, recipient_account_id, sender_account_id, type, title, message, report_id)
      VALUES (?, ?, ?, 'REPORT_SHARED', ?, ?, ?)
    `).run(
      notifId,
      shared_with_account_id,
      senderId,
      'Báo cáo tuần được chia sẻ',
      `${senderName} đã chia sẻ với bạn Báo cáo Tuần ${report.week_number}/${report.year} (Quyền: ${permText}).`,
      report_id
    );

    return res.json({
      success: true,
      message: `Đã chia sẻ báo cáo thành công với ${recipient.full_name}`
    });
  } catch (error) {
    console.error('Lỗi shareReport:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 8. Lấy danh sách tài khoản được chia sẻ báo cáo này
 */
export async function getReportShares(req, res) {
  try {
    const { report_id } = req.query;
    if (!report_id) {
      return res.status(400).json({ success: false, error: 'Thiếu ID báo cáo' });
    }

    const shares = db.prepare(`
      SELECT rs.id, rs.report_id, rs.permission, rs.created_at,
             a.id as shared_with_id, a.username, a.full_name, d.name as department_name
      FROM report_shares rs
      JOIN accounts a ON rs.shared_with_account_id = a.id
      LEFT JOIN departments d ON a.department_id = d.id
      WHERE rs.report_id = ?
      ORDER BY rs.created_at DESC
    `).all(report_id);

    return res.json({ success: true, shares });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
  * Upload File Minh Chứng
  */
export async function uploadEvidence(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Không tìm thấy file tải lên' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    return res.json({
      success: true,
      message: 'Upload file minh chứng thành công',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: fileUrl,
        size: req.file.size
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 9. Thu hồi quyền chia sẻ
 */
export async function revokeReportShare(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Thiếu ID chia sẻ' });
    }

    db.prepare('DELETE FROM report_shares WHERE id = ?').run(id);
    return res.json({ success: true, message: 'Đã thu hồi quyền chia sẻ thành công' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 10. Lấy thông báo của tài khoản
 */
export async function getNotifications(req, res) {
  try {
    const { account_id } = req.query;
    if (!account_id) {
      return res.status(400).json({ success: false, error: 'Thiếu ID tài khoản' });
    }

    const notifications = db.prepare(`
      SELECT n.*, a.full_name as sender_name
      FROM notifications n
      LEFT JOIN accounts a ON n.sender_account_id = a.id
      WHERE n.recipient_account_id = ?
      ORDER BY n.created_at DESC
      LIMIT 30
    `).all(account_id);

    const unreadCount = db.prepare(`
      SELECT COUNT(*) as count FROM notifications
      WHERE recipient_account_id = ? AND is_read = 0
    `).get(account_id).count;

    return res.json({ success: true, notifications, unread_count: unreadCount });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 11. Đánh dấu đã đọc thông báo
 */
export async function markNotificationRead(req, res) {
  try {
    const { notification_id, account_id, mark_all } = req.body;

    if (mark_all && account_id) {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE recipient_account_id = ?').run(account_id);
    } else if (notification_id) {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(notification_id);
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Sync Data (Deprecated / Compatibility Endpoint)
 */
export async function syncData(req, res) {
  return getReportDetail(req, res);
}

/**
 * Export Docx Endpoint
 */
export async function generateWord(req, res) {
  try {
    const reportData = req.body;
    const docxBuffer = createDocxReport(reportData);
    const filename = `BAO_CAO_TUAN_${reportData.metadata?.tuan || 42}_${reportData.metadata?.nam || 2026}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(docxBuffer);
  } catch (error) {
    console.error("Lỗi xuất file Word:", error);
    res.status(500).json({ success: false, error: "Lỗi xuất file Word: " + error.message });
  }
}

export async function generatePdf(req, res) {
  try {
    const reportData = req.body;
    res.json({
      success: true,
      message: "Dữ liệu báo cáo sẵn sàng cho in và xuất PDF",
      data: reportData
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Lấy tất cả nhiệm vụ chưa hoàn thành của Tài khoản / Phòng ban để nạp vào Kho Nhiệm Vụ Kanban
 */
export async function getCandidateTasks(req, res) {
  try {
    const { department_id, account_id } = req.query;
    const currentUserId = account_id;
    if (!currentUserId) {
      return res.json({ success: true, tasks: [] });
    }

    const currentUser = db.prepare('SELECT role FROM accounts WHERE id = ?').get(currentUserId);
    const isAdmin = currentUser && currentUser.role === 'ADMIN';

    let reportTasks = [];
    if (isAdmin && department_id) {
      reportTasks = db.prepare(`
        SELECT t.*, r.week_number, r.year
        FROM tasks t
        JOIN reports r ON t.report_id = r.id
        WHERE (r.account_id = ? OR r.department_id = ?)
          AND (t.tien_do IS NULL OR (
            t.tien_do NOT LIKE '%hoàn thành%'
            AND t.tien_do NOT LIKE '%hủy%'
            AND t.tien_do NOT LIKE '%kết thúc%'
            AND t.tien_do NOT LIKE '%dừng%'
          ))
          AND LENGTH(TRIM(t.noi_dung)) > 0
        ORDER BY r.year DESC, r.week_number DESC, t.order_index ASC
      `).all(currentUserId, department_id);
    } else {
      reportTasks = db.prepare(`
        SELECT t.*, r.week_number, r.year
        FROM tasks t
        JOIN reports r ON t.report_id = r.id
        WHERE r.account_id = ?
          AND (t.tien_do IS NULL OR (
            t.tien_do NOT LIKE '%hoàn thành%'
            AND t.tien_do NOT LIKE '%hủy%'
            AND t.tien_do NOT LIKE '%kết thúc%'
            AND t.tien_do NOT LIKE '%dừng%'
          ))
          AND LENGTH(TRIM(t.noi_dung)) > 0
        ORDER BY r.year DESC, r.week_number DESC, t.order_index ASC
      `).all(currentUserId);
    }

    // Fetch standalone tasks assigned to this user that are dispatched and not finished
    let standaloneTasks = [];
    try {
      standaloneTasks = db.prepare(`
        SELECT * FROM standalone_tasks
        WHERE is_dispatched = 1
          AND (status IS NULL OR (status != 'DA_HOAN_THANH' AND status != 'DA_HUY'))
          AND (current_assignee_id = ? OR assigned_assignees LIKE ?)
        ORDER BY created_at DESC
      `).all(currentUserId, `%${currentUserId}%`);
    } catch (e) {
      console.warn('Error fetching standalone tasks for candidates:', e);
      standaloneTasks = [];
    }

    // Map standalone tasks to candidate task items
    const mappedStandalone = standaloneTasks.map(st => {
      let assignerName = 'Lãnh đạo';
      if (st.current_assigner_id) {
        const assigner = db.prepare('SELECT full_name FROM accounts WHERE id = ?').get(st.current_assigner_id);
        if (assigner) assignerName = assigner.full_name;
      }
      return {
        id: `st_${st.id}`,
        noi_dung: `[${st.task_code}] ${st.title}`,
        nhom: st.priority === 'KHAN_CAP' || st.priority === 'KHAN' ? 'Đột xuất' : 'Thường xuyên',
        thoi_gian: st.due_date ? `Hạn: ${st.due_date}` : 'Trong tuần',
        trien_khai: st.description || `Phân công bởi ${assignerName}`,
        tien_do: st.status === 'DA_GIAO' ? 'Đang thực hiện' : (st.status || 'Đang thực hiện'),
        san_pham: st.completion_proof || '',
        file_minh_chung: st.proof_file_url || '',
        table_type: 1,
        category: 'Đột xuất',
        source: 'standalone_assigned',
        standalone_task_id: st.id,
        task_code: st.task_code
      };
    });

    return res.json({ success: true, tasks: [...mappedStandalone, ...reportTasks] });
  } catch (error) {
    console.error('Lỗi getCandidateTasks:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Lấy chi tiết Báo cáo tuần tổng hợp Văn phòng (Đa tổ: CĐS & Văn thư - Lưu trữ)
 */
export async function getConsolidatedReportDetail(req, res) {
  try {
    const { week, year, department_id, account_id } = req.query;
    const targetWeek = parseInt(week || '38', 10);
    const targetYear = parseInt(year || '2026', 10);
    const masterReportId = `rpt_consolidated_office_w${targetWeek}_${targetYear}`;

    // 1. Kiểm tra hoặc tạo Master Report
    const targetAccId = account_id || 'acc_vp_hoa';
    let masterReport = db.prepare("SELECT * FROM reports WHERE id = ? OR (account_id = ? AND report_type = 'CONSOLIDATED_OFFICE' AND week_number = ? AND year = ?)").get(masterReportId, targetAccId, targetWeek, targetYear);

    if (!masterReport) {
      db.prepare(`
        INSERT INTO reports (id, department_id, account_id, week_number, year, status, report_type, team_code, kho_khan)
        VALUES (?, ?, ?, ?, ?, 'DRAFT', 'CONSOLIDATED_OFFICE', 'OFFICE_MASTER', 'Không')
        ON CONFLICT(account_id, report_type, week_number, year) DO UPDATE SET
          updated_at = CURRENT_TIMESTAMP
      `).run(masterReportId, department_id || 'dept_vp', targetAccId, targetWeek, targetYear);
      masterReport = db.prepare("SELECT * FROM reports WHERE id = ? OR (account_id = ? AND report_type = 'CONSOLIDATED_OFFICE' AND week_number = ? AND year = ?)").get(masterReportId, targetAccId, targetWeek, targetYear);
    }

    // 2. Lấy Mục III (doc_inspection_stats)
    let docStats = db.prepare('SELECT * FROM doc_inspection_stats WHERE report_id = ? ORDER BY order_index ASC').all(masterReportId);
    if (!docStats || docStats.length === 0) {
      const defaultDepts = [
        { name: 'Văn phòng', total: 5, err: 0, pages: 8 },
        { name: 'Phòng Kế hoạch Tài chính', total: 20, err: 0, pages: 26 },
        { name: 'Phòng Quản lý Dự án', total: 9, err: 7, pages: 27 },
        { name: 'Phòng Giám sát Khu liên hợp', total: 2, err: 0, pages: 6 },
        { name: 'Phòng Giám sát Khối lượng', total: 2, err: 0, pages: 4 },
        { name: 'Phòng Kiểm tra Môi trường', total: 26, err: 7, pages: 39 }
      ];
      const stmt = db.prepare('INSERT INTO doc_inspection_stats (id, report_id, department_name, total_checked, error_count, total_pages, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)');
      defaultDepts.forEach((d, i) => {
        stmt.run(`ds_${masterReportId}_${i}`, masterReportId, d.name, d.total, d.err, d.pages || 0, i + 1);
      });
      docStats = db.prepare('SELECT * FROM doc_inspection_stats WHERE report_id = ? ORDER BY order_index ASC').all(masterReportId);
    }

    // 3. Lấy Mục IV & 4 Chữ ký (consolidated_report_meta)
    let userAcc;
    if (account_id) {
      userAcc = db.prepare('SELECT full_name FROM accounts WHERE id = ?').get(account_id);
    }
    const defaultNguoiLap = userAcc ? userAcc.full_name : '';

    let meta = db.prepare('SELECT * FROM consolidated_report_meta WHERE report_id = ?').get(masterReportId);
    if (!meta) {
      db.prepare(`
        INSERT INTO consolidated_report_meta (id, report_id, to_truong_name, nguoi_lap_name, pho_chanh_van_phong_name, chanh_van_phong_name, ending_note)
        VALUES (?, ?, 'Trần Thuận Hòa', ?, 'Nguyễn Đức Thắng', 'Hoàng Văn Dương', ?)
      `).run(
        `meta_${masterReportId}`,
        masterReportId,
        defaultNguoiLap,
        'Trên đây là báo cáo tình hình thực hiện nhiệm vụ Tuần ' + targetWeek + ' và kế hoạch thực hiện nhiệm vụ trọng tâm công tác Tuần ' + (targetWeek + 1) + ' của Bộ phận Văn thư – Lưu trữ và Chuyển đổi số. Kính trình Lãnh đạo phòng xem xét./.'
      );
      meta = db.prepare('SELECT * FROM consolidated_report_meta WHERE report_id = ?').get(masterReportId);
    } else if (!meta.nguoi_lap_name || meta.nguoi_lap_name.includes('Nguyễn Thị Mai')) {
      if (defaultNguoiLap) {
        meta.nguoi_lap_name = defaultNguoiLap;
        db.prepare('UPDATE consolidated_report_meta SET nguoi_lap_name = ? WHERE id = ?').run(defaultNguoiLap, meta.id);
      }
    }

    // 4. Lấy toàn bộ Tasks (gồm cả task của master và sub-teams)
    const tasks = db.prepare(`
      SELECT t.*, COALESCE(t.team_code, 'VAN_THU') as team_code
      FROM tasks t
      WHERE t.report_id = ? OR t.report_id IN (SELECT id FROM reports WHERE parent_consolidated_id = ?)
      ORDER BY t.table_type ASC, t.order_index ASC
    `).all(masterReportId, masterReportId);

    const table1 = tasks.filter(t => t.table_type === 1).map(t => ({
      id: t.id,
      noi_dung: t.noi_dung,
      thoi_gian: t.thoi_gian,
      trien_khai: t.trien_khai,
      tien_do: t.tien_do,
      san_pham: t.san_pham || '',
      nhom: t.category,
      team_code: t.team_code || 'VAN_THU',
      file_minh_chung: t.file_minh_chung || '',
      is_starred: Boolean(t.is_starred),
      is_recurring: Boolean(t.is_recurring)
    }));

    const table2 = tasks.filter(t => t.table_type === 2).map(t => ({
      id: t.id,
      noi_dung: t.noi_dung,
      thoi_gian_du_kien: t.thoi_gian,
      san_pham_du_kien: t.san_pham,
      thoi_gian: t.thoi_gian,
      san_pham: t.san_pham,
      nhom: t.category,
      team_code: t.team_code || 'VAN_THU',
      is_starred: Boolean(t.is_starred),
      is_recurring: Boolean(t.is_recurring)
    }));

    return res.json({
      success: true,
      data: {
        metadata: {
          report_id: masterReport.id,
          tuan: masterReport.week_number,
          tuan_tiep: masterReport.week_number + 1,
          nam: masterReport.year,
          report_type: 'CONSOLIDATED_OFFICE',
          kho_khan: masterReport.kho_khan,
          ngay_lap: masterReport.created_at
        },
        table1,
        table2,
        doc_inspection_stats: docStats,
        consolidated_meta: meta
      }
    });
  } catch (error) {
    console.error('Lỗi getConsolidatedReportDetail:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Lưu / Cập nhật Báo cáo tuần tổng hợp Văn phòng
 */
export async function saveConsolidatedReport(req, res) {
  try {
    const { metadata, table1, table2, doc_inspection_stats, consolidated_meta } = req.body;
    if (!metadata || !metadata.tuan) {
      return res.status(400).json({ success: false, error: 'Dữ liệu không hợp lệ' });
    }

    const week = parseInt(metadata.tuan, 10);
    const year = parseInt(metadata.nam || '2026', 10);
    const masterReportId = metadata.report_id || `rpt_consolidated_office_w${week}_${year}`;

    db.exec('BEGIN IMMEDIATE;');
    try {
      // 1. Upsert master report
      const deptId = metadata.department_id || 'dept_vp';
      const accId = metadata.account_id || 'acc_vp_hoa';
      const existing = db.prepare("SELECT id FROM reports WHERE id = ? OR (account_id = ? AND report_type = 'CONSOLIDATED_OFFICE' AND week_number = ? AND year = ?)").get(masterReportId, accId, week, year);
      const targetReportId = existing ? existing.id : masterReportId;

      if (existing) {
        db.prepare('UPDATE reports SET kho_khan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(metadata.kho_khan || 'Không', targetReportId);
      } else {
        db.prepare(`
          INSERT INTO reports (id, department_id, account_id, week_number, year, status, report_type, team_code, kho_khan)
          VALUES (?, ?, ?, ?, ?, 'DRAFT', 'CONSOLIDATED_OFFICE', 'OFFICE_MASTER', ?)
          ON CONFLICT(account_id, report_type, week_number, year) DO UPDATE SET
            kho_khan = excluded.kho_khan,
            updated_at = CURRENT_TIMESTAMP
        `).run(targetReportId, deptId, accId, week, year, metadata.kho_khan || 'Không');
      }

      // 2. Upsert consolidated meta
      if (consolidated_meta) {
        db.prepare('DELETE FROM consolidated_report_meta WHERE report_id = ?').run(masterReportId);
        db.prepare(`
          INSERT INTO consolidated_report_meta (id, report_id, to_truong_name, nguoi_lap_name, pho_chanh_van_phong_name, chanh_van_phong_name, ending_note)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          `meta_${masterReportId}`,
          masterReportId,
          consolidated_meta.to_truong_name || 'Trần Thuận Hòa',
          consolidated_meta.nguoi_lap_name || metadata?.nguoi_lap || '',
          consolidated_meta.pho_chanh_van_phong_name || 'Nguyễn Đức Thắng',
          consolidated_meta.chanh_van_phong_name || 'Hoàng Văn Dương',
          consolidated_meta.ending_note || ''
        );
      }

      // 3. Upsert doc_inspection_stats
      if (Array.isArray(doc_inspection_stats)) {
        db.prepare('DELETE FROM doc_inspection_stats WHERE report_id = ?').run(masterReportId);
        const stmtDs = db.prepare('INSERT INTO doc_inspection_stats (id, report_id, department_name, total_checked, error_count, total_pages, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)');
        doc_inspection_stats.forEach((ds, idx) => {
          stmtDs.run(
            `ds_${masterReportId}_${idx}_${Date.now()}`,
            masterReportId,
            ds.department_name || '',
            parseInt(ds.total_checked || '0', 10),
            parseInt(ds.error_count || '0', 10),
            parseInt(ds.total_pages || '0', 10),
            idx + 1
          );
        });
      }

      // 4. Upsert tasks (Clear existing tasks for this consolidated report and any linked sub-reports)
      db.prepare('DELETE FROM tasks WHERE report_id = ? OR report_id IN (SELECT id FROM reports WHERE parent_consolidated_id = ?)').run(masterReportId, masterReportId);
      const stmtTask = db.prepare(`
        INSERT INTO tasks (id, report_id, table_type, category, noi_dung, thoi_gian, trien_khai, tien_do, san_pham, order_index, team_code, file_minh_chung, is_starred, is_recurring)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      (table1 || []).forEach((t, idx) => {
        const taskId = (t.id && !t.id.startsWith('t1_init')) ? t.id : `t1_${masterReportId}_${idx}`;
        stmtTask.run(
          taskId,
          masterReportId,
          1,
          t.nhom || 'Thường xuyên',
          t.noi_dung || '',
          t.thoi_gian || 'Thường xuyên',
          t.trien_khai || '',
          t.tien_do || 'Hoàn thành – đúng hạn',
          t.san_pham || '',
          idx + 1,
          t.team_code || 'VAN_THU',
          t.file_minh_chung || '',
          t.is_starred ? 1 : 0,
          t.is_recurring ? 1 : 0
        );
      });

      (table2 || []).forEach((t, idx) => {
        const taskId = (t.id && !t.id.startsWith('t2_init')) ? t.id : `t2_${masterReportId}_${idx}`;
        stmtTask.run(
          taskId,
          masterReportId,
          2,
          t.nhom || 'Thường xuyên',
          t.noi_dung || '',
          t.thoi_gian_du_kien || t.thoi_gian || 'Thường xuyên',
          '',
          '',
          t.san_pham_du_kien || t.san_pham || '',
          idx + 1,
          t.team_code || 'VAN_THU',
          '',
          t.is_starred ? 1 : 0,
          t.is_recurring ? 1 : 0
        );
      });

      db.exec('COMMIT;');
      return res.json({ success: true, message: 'Đã lưu Báo cáo tuần tổng hợp Văn phòng thành công!' });
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }
  } catch (error) {
    console.error('Lỗi saveConsolidatedReport:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Xuất file Word Báo cáo tuần tổng hợp Văn phòng (Nghị định 30)
 */
export async function generateConsolidatedWord(req, res) {
  try {
    const payload = req.body;
    const docBuffer = createConsolidatedOfficeDocx(payload);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=BAO_CAO_TONG_HOP_TUAN_${payload.metadata?.tuan || 38}.docx`);
    return res.send(docBuffer);
  } catch (error) {
    console.error('Lỗi generateConsolidatedWord:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Xóa sạch toàn bộ nhiệm vụ (Báo cáo tuần & Kho nhiệm vụ chung) trong CSDL
 */
export async function clearAllTasks(req, res) {
  try {
    db.exec('PRAGMA foreign_keys = OFF;');
    db.prepare('DELETE FROM task_extensions').run();
    db.prepare('DELETE FROM task_assignment_history').run();
    db.prepare('DELETE FROM standalone_tasks').run();
    db.prepare('DELETE FROM tasks').run();
    db.exec('PRAGMA foreign_keys = ON;');

    return res.json({
      success: true,
      message: 'Đã xóa toàn bộ nhiệm vụ trong cơ sở dữ liệu thành công!'
    });
  } catch (error) {
    console.error('Lỗi clearAllTasks:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Cập nhật Chữ ký cá nhân & Mã PIN 6 số
 */
export async function updateSignatureAndPin(req, res) {
  try {
    const { account_id, pin_code, signature_url } = req.body;
    if (!account_id) {
      return res.status(400).json({ success: false, error: 'Thiếu account_id' });
    }
    if (pin_code && !/^\d{6}$/.test(pin_code)) {
      return res.status(400).json({ success: false, error: 'Mã PIN phải gồm đúng 6 chữ số (0-9)!' });
    }

    const currentAcc = db.prepare('SELECT id, signature_url, pin_code_hash FROM accounts WHERE id = ?').get(account_id);
    if (!currentAcc) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản' });
    }

    const newSigUrl = signature_url || currentAcc.signature_url || '';
    const newPinHash = pin_code || currentAcc.pin_code_hash || '';

    db.prepare(`
      UPDATE accounts
      SET signature_url = ?, pin_code_hash = ?, signature_updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newSigUrl, newPinHash, account_id);

    return res.json({
      success: true,
      message: 'Cập nhật Chữ ký cá nhân & Mã PIN 6 số thành công!',
      signature_url: newSigUrl,
      has_pin: !!newPinHash
    });
  } catch (error) {
    console.error('Lỗi updateSignatureAndPin:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Trình nộp Báo cáo tuần cho chuỗi người duyệt & gán theo vị trí
 */
export async function submitReportForApproval(req, res) {
  try {
    const { report_id, account_id, approver_ids, approver_slots } = req.body;
    if (!report_id) {
      return res.status(400).json({ success: false, error: 'Thiếu report_id' });
    }

    const approversArr = Array.isArray(approver_ids) ? approver_ids : [];
    const firstApprover = approversArr.length > 0 ? approversArr[0] : '';
    const approversJson = JSON.stringify(approversArr);

    // 1. Cập nhật bảng reports
    db.prepare(`
      UPDATE reports
      SET approval_status = 'PENDING_APPROVAL',
          approvers_chain = ?,
          current_approver_id = ?
      WHERE id = ?
    `).run(approversJson, firstApprover, report_id);

    // 2. Nếu có gán theo vị trí (Tổ trưởng, Phó chánh VP, Chánh VP), cập nhật vào consolidated_report_meta
    if (approver_slots) {
      const { to_truong_id, pho_chanh_van_phong_id, chanh_van_phong_id } = approver_slots;

      const toTruongAcc = to_truong_id ? db.prepare('SELECT full_name FROM accounts WHERE id = ?').get(to_truong_id) : null;
      const phoChanhAcc = pho_chanh_van_phong_id ? db.prepare('SELECT full_name FROM accounts WHERE id = ?').get(pho_chanh_van_phong_id) : null;
      const chanhAcc = chanh_van_phong_id ? db.prepare('SELECT full_name FROM accounts WHERE id = ?').get(chanh_van_phong_id) : null;

      const meta = db.prepare('SELECT id FROM consolidated_report_meta WHERE report_id = ?').get(report_id);
      if (meta) {
        db.prepare(`
          UPDATE consolidated_report_meta
          SET to_truong_name = COALESCE(?, to_truong_name),
              pho_chanh_van_phong_name = COALESCE(?, pho_chanh_van_phong_name),
              chanh_van_phong_name = COALESCE(?, chanh_van_phong_name)
          WHERE report_id = ?
        `).run(
          toTruongAcc ? toTruongAcc.full_name : null,
          phoChanhAcc ? phoChanhAcc.full_name : null,
          chanhAcc ? chanhAcc.full_name : null,
          report_id
        );
      }
    }

    // 3. Gửi thông báo cho TẤT CẢ những người duyệt được gán
    const senderAcc = db.prepare('SELECT full_name FROM accounts WHERE id = ?').get(account_id);
    const senderName = senderAcc ? senderAcc.full_name : 'Nhân viên';

    const uniqueApproverIds = Array.from(new Set(approversArr));
    uniqueApproverIds.forEach((targetAccId) => {
      if (!targetAccId) return;
      db.prepare(`
        INSERT INTO notifications (id, recipient_account_id, sender_account_id, type, title, message, report_id)
        VALUES (?, ?, ?, 'REPORT_SUBMITTED', 'Báo cáo tuần chờ bạn duyệt', ?, ?)
      `).run(
        'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        targetAccId,
        account_id || 'system',
        `${senderName} đã gửi trình duyệt Báo cáo tuần. Vui lòng kiểm tra và thực hiện Ký số xác thực.`,
        report_id
      );
    });

    return res.json({
      success: true,
      message: 'Đã gửi trình nộp báo cáo tuần và thông báo cho người duyệt thành công!'
    });
  } catch (error) {
    console.error('Lỗi submitReportForApproval:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Lấy danh sách các báo cáo tuần đang chờ tài khoản hiện tại phê duyệt
 */
export async function getPendingReports(req, res) {
  try {
    const { account_id } = req.query;
    if (!account_id) {
      return res.status(400).json({ success: false, error: 'Thiếu account_id' });
    }

    const reports = db.prepare(`
      SELECT r.*, a.full_name as author_name, d.name as department_name
      FROM reports r
      LEFT JOIN accounts a ON r.account_id = a.id
      LEFT JOIN departments d ON r.department_id = d.id
      WHERE r.approval_status IN ('PENDING_APPROVAL', 'PARTIALLY_SIGNED')
        AND (r.approvers_chain LIKE ? OR r.current_approver_id = ?)
      ORDER BY r.updated_at DESC
    `).all(`%"${account_id}"%`, account_id);

    return res.json({ success: true, reports });
  } catch (error) {
    console.error('Lỗi getPendingReports:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Ký số Báo cáo bằng Mã PIN 6 số
 */
export async function signReportWithPin(req, res) {
  try {
    const { report_id, account_id, pin_code, note } = req.body;
    if (!report_id || !account_id || !pin_code) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập đầy đủ report_id, account_id và Mã PIN 6 số!' });
    }

    // 1. Kiểm tra tài khoản
    const account = db.prepare(`
      SELECT a.id, a.full_name, a.position_level, a.signature_url, a.pin_code_hash, d.name as department_name
      FROM accounts a
      LEFT JOIN departments d ON a.department_id = d.id
      WHERE a.id = ?
    `).get(account_id);

    if (!account) {
      return res.status(404).json({ success: false, error: 'Tài khoản người ký không tồn tại' });
    }

    if (!account.pin_code_hash) {
      return res.status(400).json({ success: false, error: 'Bạn chưa thiết lập Mã PIN 6 số. Vui lòng vào Cài đặt tài khoản để thiết lập PIN!' });
    }

    if (account.pin_code_hash !== pin_code) {
      return res.status(401).json({ success: false, error: 'Mã PIN 6 số không chính xác. Vui lòng thử lại!' });
    }

    if (!account.signature_url) {
      return res.status(400).json({ success: false, error: 'Bạn chưa tải lên ảnh chữ ký tay tách nền. Vui lòng cập nhật hình ảnh chữ ký!' });
    }

    // 2. Lấy thông tin báo cáo
    const report = db.prepare('SELECT id, approvers_chain, approval_status FROM reports WHERE id = ?').get(report_id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy Báo cáo tuần' });
    }

    let approversChain = [];
    try {
      approversChain = JSON.parse(report.approvers_chain || '[]');
    } catch (e) {}

    const stepOrder = approversChain.indexOf(account_id) + 1 || 1;
    const posLabel = account.position_level === 'GIAM_DOC' ? 'Giám đốc'
      : account.position_level === 'PHO_GIAM_DOC' ? 'Phó Giám đốc'
      : account.position_level === 'TRUONG_PHONG' ? 'Trưởng phòng'
      : account.position_level === 'PHO_PHONG' ? 'Phó phòng'
      : account.position_level === 'TO_TRUONG' ? 'Tổ trưởng' : 'Chuyên viên';

    // 3. Ghi vết Ký số vào report_signatures
    const sigId = `sig_${report_id}_${account_id}`;
    db.prepare(`
      INSERT OR REPLACE INTO report_signatures (
        id, report_id, signer_account_id, signer_name, signer_position, signer_department, signature_url, step_order, signed_at, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
    `).run(
      sigId,
      report_id,
      account_id,
      account.full_name,
      posLabel,
      account.department_name || 'Ban Quản lý',
      account.signature_url,
      stepOrder,
      note || 'Đã ký số phê duyệt'
    );

    // 4. Kiểm tra tiến độ chuỗi người duyệt
    const signedRows = db.prepare('SELECT signer_account_id FROM report_signatures WHERE report_id = ?').all(report_id);
    const signedAccountIds = new Set(signedRows.map(r => r.signer_account_id));

    let newStatus = 'PARTIALLY_SIGNED';
    let nextApprover = '';

    if (approversChain.length > 0) {
      const remaining = approversChain.filter(id => !signedAccountIds.has(id));
      if (remaining.length === 0) {
        newStatus = 'APPROVED';
        nextApprover = '';
      } else {
        newStatus = 'PARTIALLY_SIGNED';
        nextApprover = remaining[0];
      }
    } else {
      newStatus = 'APPROVED';
    }

    db.prepare(`
      UPDATE reports
      SET approval_status = ?, current_approver_id = ?
      WHERE id = ?
    `).run(newStatus, nextApprover, report_id);

    return res.json({
      success: true,
      message: '🎉 Ký số và Phê duyệt Báo cáo tuần thành công!',
      approval_status: newStatus,
      signature: {
        id: sigId,
        signer_name: account.full_name,
        signer_position: posLabel,
        signature_url: account.signature_url,
        signed_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Lỗi signReportWithPin:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Lấy danh sách chữ ký số của một báo cáo
 */
export async function getReportSignatures(req, res) {
  try {
    const { report_id } = req.query;
    if (!report_id) {
      return res.status(400).json({ success: false, error: 'Thiếu report_id' });
    }

    const signatures = db.prepare(`
      SELECT s.*, a.full_name, a.position_level
      FROM report_signatures s
      LEFT JOIN accounts a ON s.signer_account_id = a.id
      WHERE s.report_id = ?
      ORDER BY s.step_order ASC, s.signed_at ASC
    `).all(report_id);

    return res.json({ success: true, signatures });
  } catch (error) {
    console.error('Lỗi getReportSignatures:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Chốt báo cáo tuần sau khi thu thập đủ chữ ký số
 */
export async function finalizeReport(req, res) {
  try {
    const { report_id, account_id } = req.body;
    if (!report_id) {
      return res.status(400).json({ success: false, error: 'Thiếu report_id' });
    }

    db.prepare(`
      UPDATE reports
      SET approval_status = 'APPROVED', status = 'APPROVED', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(report_id);

    // Gửi thông báo đến người tạo & người duyệt
    const report = db.prepare('SELECT account_id, approvers_chain FROM reports WHERE id = ?').get(report_id);
    if (report) {
      const allRecipients = new Set([report.account_id]);
      try {
        const chain = JSON.parse(report.approvers_chain || '[]');
        chain.forEach((id) => allRecipients.add(id));
      } catch (e) {}

      allRecipients.forEach(targetId => {
        if (!targetId) return;
        db.prepare(`
          INSERT INTO notifications (id, recipient_account_id, sender_account_id, type, title, message, report_id)
          VALUES (?, ?, ?, 'REPORT_FINALIZED', '🎉 Báo cáo tuần đã CHỐT CHÍNH THỨC', ?, ?)
        `).run(
          'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          targetId,
          account_id || 'system',
          'Báo cáo tuần đã thu thập đầy đủ chữ ký số xác thực và được Chốt chính thức. Bạn có thể xem trước, in PDF và tải file Word hoàn chỉnh.',
          report_id
        );
      });
    }

    return res.json({
      success: true,
      message: '🎉 Đã CHỐT Báo cáo tuần thành công! Đơn hiện tại đã khóa chính thức và có thể xuất PDF / Word.'
    });
  } catch (error) {
    console.error('Lỗi finalizeReport:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}


