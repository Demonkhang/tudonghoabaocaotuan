import { db } from '../db.js';
import { createDocxReport } from '../services/docxService.js';

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
    const currentUserId = account_id;

    if (!currentUserId) {
      return res.json({ success: true, reports: [] });
    }

    const currentUser = db.prepare('SELECT role FROM accounts WHERE id = ?').get(currentUserId);
    const isAdmin = currentUser && currentUser.role === 'ADMIN';

    let reports = [];

    if (isAdmin) {
      reports = db.prepare(`
        SELECT r.*, a.full_name as nguoi_lap, d.name as don_vi, d.code as don_vi_code, 'ADMIN' as user_permission
        FROM reports r
        JOIN accounts a ON r.account_id = a.id
        JOIN departments d ON r.department_id = d.id
        ORDER BY r.year DESC, r.week_number DESC
      `).all();
    } else {
      reports = db.prepare(`
        SELECT r.*, a.full_name as nguoi_lap, d.name as don_vi, d.code as don_vi_code,
          CASE 
            WHEN r.account_id = ? THEN 'OWNER'
            ELSE rs.permission
          END as user_permission
        FROM reports r
        JOIN accounts a ON r.account_id = a.id
        JOIN departments d ON r.department_id = d.id
        LEFT JOIN report_shares rs ON r.id = rs.report_id AND rs.shared_with_account_id = ?
        WHERE r.account_id = ? OR rs.shared_with_account_id = ?
        ORDER BY r.year DESC, r.week_number DESC
      `).all(currentUserId, currentUserId, currentUserId, currentUserId);
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
      isEdited: false
    }));

    const table2 = tasks.filter(t => t.table_type === 2).map(t => ({
      id: t.id,
      noi_dung: t.noi_dung,
      thoi_gian_du_kien: t.thoi_gian,
      san_pham_du_kien: t.san_pham,
      nhom: t.category,
      parent_task_id: t.parent_task_id,
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
    const existingReport = db.prepare('SELECT * FROM reports WHERE id = ?').get(targetReportId);

    if (existingReport) {
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
          INSERT INTO reports (id, department_id, account_id, week_number, year, status, kho_khan, created_at, updated_at, last_edited_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP, ?)
        `).run(targetReportId, deptId, currentUserId, week, year, metadata.status || 'DRAFT', metadata.kho_khan || 'Không', metadata.ngay_lap || null, editorName);
      }

      // Replace tasks for targetReportId
      db.prepare('DELETE FROM tasks WHERE report_id = ?').run(targetReportId);

      const stmtTask = db.prepare(`
        INSERT INTO tasks (id, report_id, table_type, category, noi_dung, thoi_gian, trien_khai, tien_do, san_pham, parent_task_id, order_index, file_minh_chung, file_original_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          t.file_original_name || ''
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
          ''
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

    if (!currentReport && isAdmin && department_id) {
      // Fallback search by department cho ADMIN
      currentReport = db.prepare(`
        SELECT * FROM reports WHERE department_id = ? AND week_number = ? AND year = ?
      `).get(department_id, currWeek, currYear);
    }

    if (!currentReport) {
      return res.status(404).json({ success: false, error: `Không tìm thấy báo cáo Tuần ${currWeek}/${currYear} để kết chuyển` });
    }

    // 2. Lấy danh sách nhiệm vụ của tuần hiện tại
    const currentTasks = db.prepare('SELECT * FROM tasks WHERE report_id = ? ORDER BY order_index ASC').all(currentReport.id);

    // 3. Lọc nhiệm vụ dở dang từ Bảng I (tien_do != 'Hoàn thành')
    const unfinishedTable1 = currentTasks.filter(t => t.table_type === 1 && t.tien_do !== 'Hoàn thành');

    // 4. Lấy các mục kế hoạch từ Bảng II (sẽ trở thành nhiệm vụ Bảng I tuần mới)
    const plannedTable2 = currentTasks.filter(t => t.table_type === 2);

    // 5. Báo cáo target report cho account
    const targetReportId = `rpt_${accId}_w${targetWeek}_${targetYear}`;
    const existingTargetReport = db.prepare('SELECT id FROM reports WHERE id = ?').get(targetReportId);

    if (existingTargetReport) {
      db.prepare('DELETE FROM tasks WHERE report_id = ?').run(targetReportId);
    } else {
      db.prepare(`
        INSERT INTO reports (id, department_id, account_id, week_number, year, status, kho_khan)
        VALUES (?, ?, ?, ?, ?, 'DRAFT', 'Chưa có vướng mắc phát sinh')
      `).run(targetReportId, currentReport.department_id, accId, targetWeek, targetYear);
    }

    const stmtInsertTask = db.prepare(`
      INSERT INTO tasks (id, report_id, table_type, category, noi_dung, thoi_gian, trien_khai, tien_do, san_pham, parent_task_id, order_index)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let newOrderIndex = 1;
    const carriedOverTasks = [];

    // Chèn nhiệm vụ chưa hoàn thành từ Bảng I tuần cũ vào Bảng I tuần mới
    unfinishedTable1.forEach(t => {
      const newId = `co_t1_${t.id}_${Date.now()}`;
      stmtInsertTask.run(
        newId,
        targetReportId,
        1,
        t.category,
        t.noi_dung,
        t.thoi_gian || 'Trong tuần',
        t.trien_khai || 'Báo cáo tiếp tục thực hiện',
        'Đang thực hiện',
        '',
        t.id,
        newOrderIndex++
      );
      carriedOverTasks.push({ id: newId, noi_dung: t.noi_dung, source: 'Nhiệm vụ dở dang Bảng I' });
    });

    // Chèn Kế hoạch Bảng II tuần cũ vào Bảng I tuần mới
    plannedTable2.forEach(t => {
      const newId = `co_t2to1_${t.id}_${Date.now()}`;
      stmtInsertTask.run(
        newId,
        targetReportId,
        1,
        t.category,
        t.noi_dung,
        t.thoi_gian || 'Trong tuần',
        'Triển khai theo kế hoạch tuần trước',
        'Đang thực hiện',
        '',
        t.id,
        newOrderIndex++
      );
      carriedOverTasks.push({ id: newId, noi_dung: t.noi_dung, source: 'Kế hoạch Bảng II' });
    });

    // Tạo sẵn 1 nhiệm vụ mẫu Bảng II cho tuần mới
    stmtInsertTask.run(
      `init_t2_${targetReportId}`,
      targetReportId,
      2,
      'Thường xuyên',
      'Xây dựng kế hoạch công tác tuần tiếp theo',
      'Trong tuần',
      '',
      '',
      'Dự thảo Kế hoạch',
      null,
      1
    );

    return res.json({
      success: true,
      message: `Đã tự động kết chuyển thành công ${carriedOverTasks.length} nhiệm vụ sang Báo cáo Tuần ${targetWeek}/${targetYear}`,
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
    const { report_id, shared_with_account_id, permission, sender_account_id } = req.body;

    if (!report_id || !shared_with_account_id || !permission || !sender_account_id) {
      return res.status(400).json({ success: false, error: 'Thiếu thông tin chia sẻ báo cáo' });
    }

    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(report_id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy báo cáo' });
    }

    const sender = db.prepare('SELECT full_name FROM accounts WHERE id = ?').get(sender_account_id);
    const recipient = db.prepare('SELECT full_name FROM accounts WHERE id = ?').get(shared_with_account_id);

    if (!recipient) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản nhận' });
    }

    // Upsert share record
    const shareId = `share_${report_id}_${shared_with_account_id}`;
    db.prepare(`
      INSERT INTO report_shares (id, report_id, owner_account_id, shared_with_account_id, permission)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(report_id, shared_with_account_id) DO UPDATE SET
        permission = excluded.permission,
        created_at = CURRENT_TIMESTAMP
    `).run(shareId, report_id, report.account_id, shared_with_account_id, permission);

    // Create Notification for recipient
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const permText = permission === 'EDIT' ? 'Chỉnh sửa (Full Access)' : 'Chỉ xem (Read Only)';
    const senderName = sender ? sender.full_name : 'Người dùng';

    db.prepare(`
      INSERT INTO notifications (id, recipient_account_id, sender_account_id, type, title, message, report_id)
      VALUES (?, ?, ?, 'REPORT_SHARED', ?, ?, ?)
    `).run(
      notifId,
      shared_with_account_id,
      sender_account_id,
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
      JOIN departments d ON a.department_id = d.id
      WHERE rs.report_id = ?
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

    let tasks = [];
    if (isAdmin && department_id) {
      tasks = db.prepare(`
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
      tasks = db.prepare(`
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

    return res.json({ success: true, tasks });
  } catch (error) {
    console.error('Lỗi getCandidateTasks:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

