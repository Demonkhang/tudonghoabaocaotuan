import { db } from '../db.js';

/**
 * Lấy danh sách nhiệm vụ từ Kho Nhiệm Vụ Chung Độc Lập
 */
export async function getTasks(req, res) {
  try {
    const { account_id } = req.query;

    let query = `
      SELECT t.*, 
             u_creator.full_name as creator_name,
             u_assignee.full_name as assignee_name,
             u_assignee.position_level as assignee_position,
             u_assigner.full_name as assigner_name
      FROM standalone_tasks t
      LEFT JOIN accounts u_creator ON t.created_by = u_creator.id
      LEFT JOIN accounts u_assignee ON t.current_assignee_id = u_assignee.id
      LEFT JOIN accounts u_assigner ON t.current_assigner_id = u_assigner.id
      ORDER BY t.created_at DESC
    `;

    const tasks = db.prepare(query).all();
    
    // Attach history & extensions
    const result = tasks.map(task => {
      const history = db.prepare(`
        SELECT h.*, 
               u_from.full_name as assigner_name, 
               u_to.full_name as assignee_name
        FROM task_assignment_history h
        LEFT JOIN accounts u_from ON h.assigner_id = u_from.id
        LEFT JOIN accounts u_to ON h.assignee_id = u_to.id
        WHERE h.task_id = ?
        ORDER BY h.assigned_at ASC
      `).all(task.id);

      const extensions = db.prepare(`
        SELECT e.*, u.full_name as requester_name
        FROM task_extensions e
        LEFT JOIN accounts u ON e.requester_id = u.id
        WHERE e.task_id = ?
        ORDER BY e.created_at DESC
      `).all(task.id);

      return {
        ...task,
        history,
        extensions
      };
    });

    res.json({ success: true, tasks: result });
  } catch (error) {
    console.error('Lỗi getTasks standalone:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Lấy danh sách nhân sự theo Cấp bậc (Position Level)
 */
export async function getAccountsByPosition(req, res) {
  try {
    const { position_level } = req.query;
    let accounts;
    if (position_level) {
      accounts = db.prepare(`
        SELECT id, username, full_name, role, position_level, department_id 
        FROM accounts 
        WHERE position_level = ? AND is_active = 1
      `).all(position_level);
    } else {
      accounts = db.prepare(`
        SELECT id, username, full_name, role, position_level, department_id 
        FROM accounts 
        WHERE is_active = 1
      `).all();
    }
    res.json({ success: true, accounts });
  } catch (error) {
    console.error('Lỗi getAccountsByPosition:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Tạo mới 1 Nhiệm vụ vào Kho Chung
 */
export async function createTask(req, res) {
  try {
    const { title, description, created_by, priority, due_date } = req.body;
    if (!title || !created_by) {
      return res.status(400).json({ success: false, error: 'Thiếu tên nhiệm vụ hoặc người tạo' });
    }

    const taskId = 'task_st_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const count = db.prepare('SELECT COUNT(*) as c FROM standalone_tasks').get().c + 1;
    const taskCode = `NV-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;

    const stmt = db.prepare(`
      INSERT INTO standalone_tasks (
        id, task_code, title, description, created_by, priority, status, due_date
      ) VALUES (?, ?, ?, ?, ?, ?, 'KHO_VIEC', ?)
    `);

    stmt.run(taskId, taskCode, title, description || '', created_by, priority || 'THUONG', due_date || null);

    res.json({ success: true, task_id: taskId, task_code: taskCode });
  } catch (error) {
    console.error('Lỗi createTask standalone:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Giao việc Phân Cấp (Khi kéo thả card vào Cột Cấp Bậc)
 */
export async function assignTask(req, res) {
  try {
    const { task_id, assigner_id, assignee_id, target_position_level, instruction_note, due_date } = req.body;

    if (!task_id || !assignee_id || !target_position_level) {
      return res.status(400).json({ success: false, error: 'Thông tin giao việc không đầy đủ' });
    }

    // Calculate Week & Year if due_date provided
    let assignedWeek = null;
    let assignedYear = null;
    if (due_date) {
      const d = new Date(due_date);
      if (!isNaN(d.getTime())) {
        assignedYear = d.getFullYear();
        // Compute ISO Week
        const target = new Date(d.valueOf());
        const dayNr = (d.getDay() + 6) % 7;
        target.setDate(target.getDate() - dayNr + 3);
        const firstThursday = target.valueOf();
        target.setMonth(0, 1);
        if (target.getDay() !== 4) {
          target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
        }
        assignedWeek = 1 + Math.round((firstThursday - target.valueOf()) / 604800000);
      }
    }

    // Get old position/assignee if any
    const task = db.prepare('SELECT * FROM standalone_tasks WHERE id = ?').get(task_id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy nhiệm vụ' });
    }

    // Update Task
    db.prepare(`
      UPDATE standalone_tasks 
      SET current_assignee_id = ?,
          current_assigner_id = ?,
          target_position_level = ?,
          status = 'DA_GIAO',
          due_date = COALESCE(?, due_date),
          assigned_week = COALESCE(?, assigned_week),
          assigned_year = COALESCE(?, assigned_year),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(assignee_id, assigner_id, target_position_level, due_date || null, assignedWeek, assignedYear, task_id);

    // Record History
    const historyId = 'hist_' + Date.now();
    db.prepare(`
      INSERT INTO task_assignment_history (
        id, task_id, assigner_id, assignee_id, from_position_level, to_position_level, instruction_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(historyId, task_id, assigner_id, assignee_id, task.target_position_level || 'KHO_VIEC', target_position_level, instruction_note || '');

    // Send Notification to Assignee
    const notifId = 'notif_' + Date.now();
    const assignerUser = db.prepare('SELECT full_name FROM accounts WHERE id = ?').get(assigner_id);
    const assignerName = assignerUser ? assignerUser.full_name : 'Cấp trên';
    db.prepare(`
      INSERT INTO notifications (id, recipient_account_id, sender_account_id, type, title, message)
      VALUES (?, ?, ?, 'TASK_ASSIGNED', ?, ?)
    `).run(
      notifId,
      assignee_id,
      assigner_id,
      `Bạn nhận được Nhiệm vụ phân cấp mới [${task.task_code}]`,
      `${assignerName} đã giao cho bạn nhiệm vụ: "${task.title}". Hạn xử lý: ${due_date || 'Chưa định'}.`
    );

    res.json({ success: true, message: 'Giao việc thành công' });
  } catch (error) {
    console.error('Lỗi assignTask standalone:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Đề xuất Gia Hạn (Khi kéo thả vào Drop Zone 1: Gia hạn)
 */
export async function requestExtension(req, res) {
  try {
    const { task_id, requester_id, requested_due_date, reason } = req.body;
    if (!task_id || !requester_id || !requested_due_date || !reason) {
      return res.status(400).json({ success: false, error: 'Thiếu thông tin đề xuất gia hạn' });
    }

    const task = db.prepare('SELECT * FROM standalone_tasks WHERE id = ?').get(task_id);
    if (!task) return res.status(404).json({ success: false, error: 'Nhiệm vụ không tồn tại' });

    const extId = 'ext_' + Date.now();
    const approverId = task.current_assigner_id || task.created_by;

    db.prepare(`
      INSERT INTO task_extensions (id, task_id, requester_id, approver_id, old_due_date, requested_due_date, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(extId, task_id, requester_id, approverId, task.due_date || 'Chưa đặt', requested_due_date, reason);

    // Update Task status
    db.prepare(`
      UPDATE standalone_tasks 
      SET status = 'DE_XUAT_GIA_HAN', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(task_id);

    // Send Notification to Approver
    const requester = db.prepare('SELECT full_name FROM accounts WHERE id = ?').get(requester_id);
    db.prepare(`
      INSERT INTO notifications (id, recipient_account_id, sender_account_id, type, title, message)
      VALUES (?, ?, ?, 'EXTENSION_REQUESTED', ?, ?)
    `).run(
      'notif_' + Date.now(),
      approverId,
      requester_id,
      `Đề xuất gia hạn nhiệm vụ [${task.task_code}]`,
      `${requester ? requester.full_name : 'Cấp dưới'} xin gia hạn nhiệm vụ "${task.title}" đến ngày ${requested_due_date}. Lý do: ${reason}`
    );

    res.json({ success: true, message: 'Đã gửi đề xuất gia hạn thành công' });
  } catch (error) {
    console.error('Lỗi requestExtension standalone:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Duyệt Đề xuất Gia Hạn
 */
export async function approveExtension(req, res) {
  try {
    const { extension_id, approver_id, action } = req.body; // action: 'APPROVE' or 'REJECT'
    const ext = db.prepare('SELECT * FROM task_extensions WHERE id = ?').get(extension_id);
    if (!ext) return res.status(404).json({ success: false, error: 'Đề xuất không tồn tại' });

    if (action === 'APPROVE') {
      db.prepare("UPDATE task_extensions SET status = 'APPROVED' WHERE id = ?").run(extension_id);
      db.prepare(`
        UPDATE standalone_tasks 
        SET due_date = ?, status = 'DANG_THUC_HIEN', updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(ext.requested_due_date, ext.task_id);

      db.prepare(`
        INSERT INTO notifications (id, recipient_account_id, sender_account_id, type, title, message)
        VALUES (?, ?, ?, 'EXTENSION_APPROVED', ?, ?)
      `).run(
        'notif_' + Date.now(),
        ext.requester_id,
        approver_id,
        `Gia hạn nhiệm vụ đã được phê duyệt`,
        `Đề xuất gia hạn nhiệm vụ của bạn đã được chấp thuận. Hạn mới: ${ext.requested_due_date}.`
      );
    } else {
      db.prepare("UPDATE task_extensions SET status = 'REJECTED' WHERE id = ?").run(extension_id);
      db.prepare(`
        UPDATE standalone_tasks 
        SET status = 'DANG_THUC_HIEN', updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(ext.task_id);

      db.prepare(`
        INSERT INTO notifications (id, recipient_account_id, sender_account_id, type, title, message)
        VALUES (?, ?, ?, 'EXTENSION_REJECTED', ?, ?)
      `).run(
        'notif_' + Date.now(),
        ext.requester_id,
        approver_id,
        `Gia hạn nhiệm vụ bị từ chối`,
        `Đề xuất gia hạn nhiệm vụ của bạn đã bị từ chối. Hạn cũ vẫn giữ nguyên: ${ext.old_due_date}.`
      );
    }

    res.json({ success: true, message: action === 'APPROVE' ? 'Đã duyệt gia hạn' : 'Đã từ chối gia hạn' });
  } catch (error) {
    console.error('Lỗi approveExtension:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Báo cáo Hoàn Thành Nhiệm Vụ (Khi kéo thả vào Drop Zone 2: Hoàn thành)
 */
export async function completeTask(req, res) {
  try {
    const { task_id, account_id, completion_proof, proof_file_url } = req.body;
    if (!task_id || !account_id) {
      return res.status(400).json({ success: false, error: 'Thiếu thông tin task_id hoặc account_id' });
    }

    const task = db.prepare('SELECT * FROM standalone_tasks WHERE id = ?').get(task_id);
    if (!task) return res.status(404).json({ success: false, error: 'Nhiệm vụ không tồn tại' });

    db.prepare(`
      UPDATE standalone_tasks 
      SET status = 'HOAN_THANH',
          completion_proof = ?,
          proof_file_url = COALESCE(?, proof_file_url),
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(completion_proof || '', proof_file_url || '', task_id);

    // Notify Assigner
    const assignerId = task.current_assigner_id || task.created_by;
    const worker = db.prepare('SELECT full_name FROM accounts WHERE id = ?').get(account_id);
    db.prepare(`
      INSERT INTO notifications (id, recipient_account_id, sender_account_id, type, title, message)
      VALUES (?, ?, ?, 'TASK_COMPLETED', ?, ?)
    `).run(
      'notif_' + Date.now(),
      assignerId,
      account_id,
      `Nhiệm vụ [${task.task_code}] đã được hoàn thành`,
      `${worker ? worker.full_name : 'Cấp dưới'} đã báo cáo hoàn thành nhiệm vụ "${task.title}".`
    );

    res.json({ success: true, message: 'Nhiệm vụ đã báo cáo hoàn thành' });
  } catch (error) {
    console.error('Lỗi completeTask standalone:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Đồng bộ danh sách Nhiệm vụ Phân cấp dành riêng cho Báo cáo Tuần của Chuyên viên
 */
export async function getSyncedDirectiveTasks(req, res) {
  try {
    const { account_id, week, year } = req.query;
    if (!account_id) {
      return res.status(400).json({ success: false, error: 'Thiếu account_id' });
    }

    // Retrieve active tasks assigned to this account
    let tasks = db.prepare(`
      SELECT t.*, 
             u_assigner.full_name as assigner_name,
             u_assigner.position_level as assigner_position
      FROM standalone_tasks t
      LEFT JOIN accounts u_assigner ON t.current_assigner_id = u_assigner.id
      WHERE (t.current_assignee_id = ? OR t.assigned_assignees LIKE '%' || ? || '%') 
        AND t.status IN ('DA_GIAO', 'DANG_THUC_HIEN', 'DE_XUAT_GIA_HAN', 'CHO_DUYET_HOAN_THANH', 'HOAN_THANH')
      ORDER BY t.due_date ASC
    `).all(account_id, account_id);

    // Filter by week & year if passed
    if (week && year) {
      const w = parseInt(week, 10);
      const y = parseInt(year, 10);
      tasks = tasks.filter(t => {
        if (!t.assigned_week || !t.assigned_year) return true; // Show unassigned week tasks as candidate
        return t.assigned_week === w && t.assigned_year === y;
      });
    }

    res.json({ success: true, directive_tasks: tasks });
  } catch (error) {
    console.error('Lỗi getSyncedDirectiveTasks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Xóa hoặc Thu hồi Nhiệm Vụ (Khi kéo thả vào Drop Zone 3: Xóa)
 */
export async function deleteTask(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: 'Thiếu ID nhiệm vụ' });

    db.prepare('DELETE FROM standalone_tasks WHERE id = ?').run(id);
    res.json({ success: true, message: 'Đã xóa / thu hồi nhiệm vụ thành công' });
  } catch (error) {
    console.error('Lỗi deleteTask standalone:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Ban Hành Kế Hoạch Giao Việc (Khi Cấp trên bấm nút Ban Hành Kế Hoạch)
 */
/**
 * Ban Hành Kế Hoạch Giao Việc (Nút Phát Hành Kế Hoạch Giao Việc là trigger DUY NHẤT để giao việc)
 */
export async function publishPlan(req, res) {
  try {
    const { assigner_id } = req.body;
    if (!assigner_id) {
      return res.status(400).json({ success: false, error: 'Thiếu ID người ban hành' });
    }

    // Find all tasks that have staged assignees but are NOT dispatched yet (is_dispatched = 0)
    const tasks = db.prepare(`
      SELECT * FROM standalone_tasks 
      WHERE is_dispatched = 0 AND assigned_assignees IS NOT NULL AND assigned_assignees != '[]'
    `).all();

    if (tasks.length === 0) {
      return res.status(400).json({ success: false, error: 'Chưa có nhiệm vụ nào được chọn giao người nhận để ban hành.' });
    }

    const assignerUser = db.prepare('SELECT full_name FROM accounts WHERE id = ?').get(assigner_id);
    const assignerName = assignerUser ? assignerUser.full_name : 'Lãnh đạo';

    let publishedCount = 0;

    for (const t of tasks) {
      let assignees = [];
      try {
        assignees = JSON.parse(t.assigned_assignees || '[]');
      } catch (e) {
        assignees = [];
      }

      if (assignees.length === 0) continue;

      // Calculate Week & Year if due_date present
      let assignedWeek = t.assigned_week || null;
      let assignedYear = t.assigned_year || null;
      if (t.due_date) {
        const d = new Date(t.due_date);
        if (!isNaN(d.getTime())) {
          assignedYear = d.getFullYear();
          const target = new Date(d.valueOf());
          const dayNr = (d.getDay() + 6) % 7;
          target.setDate(target.getDate() - dayNr + 3);
          const firstThursday = target.valueOf();
          target.setMonth(0, 1);
          if (target.getDay() !== 4) {
            target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
          }
          assignedWeek = 1 + Math.round((firstThursday - target.valueOf()) / 604800000);
        }
      }

      const primaryAssignee = assignees[0];
      const targetLevels = Array.from(new Set(assignees.map(a => a.position_level))).join(',');

      // Update Task to DA_GIAO & is_dispatched = 1
      db.prepare(`
        UPDATE standalone_tasks 
        SET current_assignee_id = ?,
            current_assigner_id = ?,
            target_position_level = ?,
            status = 'DA_GIAO',
            is_dispatched = 1,
            assigned_week = COALESCE(?, assigned_week),
            assigned_year = COALESCE(?, assigned_year),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(primaryAssignee.account_id, assigner_id, targetLevels, assignedWeek, assignedYear, t.id);

      // Record History & Notifications to all assignees
      for (const item of assignees) {
        const historyId = 'hist_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
        db.prepare(`
          INSERT INTO task_assignment_history (
            id, task_id, assigner_id, assignee_id, from_position_level, to_position_level, instruction_note
          ) VALUES (?, ?, ?, ?, 'KHO_VIEC', ?, ?)
        `).run(historyId, t.id, assigner_id, item.account_id, item.position_level, item.instruction_note || '');

        const notifId = 'notif_pub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
        db.prepare(`
          INSERT INTO notifications (id, recipient_account_id, sender_account_id, type, title, message)
          VALUES (?, ?, ?, 'TASK_ASSIGNED', ?, ?)
        `).run(
          notifId,
          item.account_id,
          assigner_id,
          `🚀 Kế hoạch giao việc [${t.task_code}] chính thức được ban hành`,
          `${assignerName} đã chính thức giao cho bạn nhiệm vụ: "${t.title}". Hạn xử lý: ${t.due_date || 'Chưa định'}.`
        );
      }

      publishedCount++;
    }

    res.json({ 
      success: true, 
      message: `Đã phát hành thành công kế hoạch giao ${publishedCount} nhiệm vụ!`,
      publishedCount 
    });
  } catch (error) {
    console.error('Lỗi publishPlan standalone:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Thêm 1 người nhận vào danh sách tạm ứng (Staging) cho nhiệm vụ chưa chốt
 */
export async function stageAssignee(req, res) {
  try {
    const { task_id, assignee_id, position_level, instruction_note } = req.body;
    if (!task_id || !assignee_id || !position_level) {
      return res.status(400).json({ success: false, error: 'Thiếu thông tin tạm ứng người nhận' });
    }

    const task = db.prepare('SELECT * FROM standalone_tasks WHERE id = ?').get(task_id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy nhiệm vụ' });
    }

    let assignees = [];
    try {
      assignees = JSON.parse(task.assigned_assignees || '[]');
    } catch (e) {
      assignees = [];
    }

    const assigneeAccount = db.prepare('SELECT id, full_name, position_level FROM accounts WHERE id = ?').get(assignee_id);
    if (!assigneeAccount) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản người nhận' });
    }

    const exists = assignees.some(a => a.account_id === assignee_id);
    if (!exists) {
      assignees.push({
        account_id: assignee_id,
        full_name: assigneeAccount.full_name,
        position_level: position_level || assigneeAccount.position_level,
        instruction_note: instruction_note || '',
        is_primary: assignees.length === 0
      });
    }

    const targetLevels = Array.from(new Set(assignees.map(a => a.position_level))).join(',');

    db.prepare(`
      UPDATE standalone_tasks 
      SET assigned_assignees = ?, target_position_level = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(JSON.stringify(assignees), targetLevels, task_id);

    res.json({ success: true, message: 'Đã tạm chọn người nhận', assignees });
  } catch (error) {
    console.error('Lỗi stageAssignee:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Xóa 1 người nhận khỏi danh sách tạm ứng (Unstaging)
 * Nếu không còn người nhận nào (danh sách = 0), nhiệm vụ tự động quay về Kho Chung
 */
export async function unstageAssignee(req, res) {
  try {
    const { task_id, assignee_id } = req.body;
    if (!task_id || !assignee_id) {
      return res.status(400).json({ success: false, error: 'Thiếu task_id hoặc assignee_id' });
    }

    const task = db.prepare('SELECT * FROM standalone_tasks WHERE id = ?').get(task_id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy nhiệm vụ' });
    }

    let assignees = [];
    try {
      assignees = JSON.parse(task.assigned_assignees || '[]');
    } catch (e) {
      assignees = [];
    }

    assignees = assignees.filter(a => a.account_id !== assignee_id);

    let targetLevels = '';
    let status = task.status;
    let isDispatched = task.is_dispatched;

    if (assignees.length > 0) {
      assignees[0].is_primary = true;
      targetLevels = Array.from(new Set(assignees.map(a => a.position_level))).join(',');
    } else {
      // 0 assignees left -> Return to global task pool!
      targetLevels = '';
      status = 'KHO_VIEC';
      isDispatched = 0;
    }

    db.prepare(`
      UPDATE standalone_tasks 
      SET assigned_assignees = ?, 
          target_position_level = ?,
          status = ?,
          is_dispatched = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(JSON.stringify(assignees), targetLevels, status, isDispatched, task_id);

    res.json({ success: true, message: 'Đã rút người nhận khỏi nhiệm vụ', assignees });
  } catch (error) {
    console.error('Lỗi unstageAssignee:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Dọn dẹp / Ẩn nhiệm vụ đã được giao hoàn tất khỏi Kho Nhiệm Vụ Chung
 */
export async function dismissPoolTask(req, res) {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, error: 'Thiếu ID nhiệm vụ' });

    db.prepare(`UPDATE standalone_tasks SET is_pool_hidden = 1 WHERE id = ?`).run(id);
    res.json({ success: true, message: 'Đã dọn dẹp ẩn nhiệm vụ khỏi kho chung' });
  } catch (error) {
    console.error('Lỗi dismissPoolTask:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
