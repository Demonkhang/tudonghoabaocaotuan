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
    `;

    const params = [];
    if (account_id) {
      query += ` WHERE (t.current_assignee_id = ? OR t.assigned_assignees LIKE '%' || ? || '%' OR t.created_by = ? OR t.current_assigner_id = ?)`;
      params.push(account_id, account_id, account_id, account_id);
    }

    query += ` ORDER BY t.created_at DESC`;

    const tasks = await db.prepare(query).all(...params);
    
    // Attach history & extensions
    const result = await Promise.all(tasks.map(async task => {
      const history = await db.prepare(`
        SELECT h.*, 
               u_from.full_name as assigner_name, 
               u_to.full_name as assignee_name
        FROM task_assignment_history h
        LEFT JOIN accounts u_from ON h.assigner_id = u_from.id
        LEFT JOIN accounts u_to ON h.assignee_id = u_to.id
        WHERE h.task_id = ?
        ORDER BY h.assigned_at ASC
      `).all(task.id);

      const extensions = await db.prepare(`
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
    }));

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
      accounts = await db.prepare(`
        SELECT id, username, full_name, role, position_level, department_id 
        FROM accounts 
        WHERE position_level = ? AND is_active = 1
      `).all(position_level);
    } else {
      accounts = await db.prepare(`
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
    const count = await db.prepare('SELECT COUNT(*) as c FROM standalone_tasks').get().c + 1;
    const taskCode = `NV-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;

    const stmt = db.prepare(`
      INSERT INTO standalone_tasks (
        id, task_code, title, description, created_by, priority, status, due_date
      ) VALUES (?, ?, ?, ?, ?, ?, 'KHO_VIEC', ?)
    `);

    await stmt.run(taskId, taskCode, title, description || '', created_by, priority || 'THUONG', due_date || null);

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
    const task = await db.prepare('SELECT * FROM standalone_tasks WHERE id = ?').get(task_id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy nhiệm vụ' });
    }

    // Update Task
    await db.prepare(`
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
    await db.prepare(`
      INSERT INTO task_assignment_history (
        id, task_id, assigner_id, assignee_id, from_position_level, to_position_level, instruction_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(historyId, task_id, assigner_id, assignee_id, task.target_position_level || 'KHO_VIEC', target_position_level, instruction_note || '');

    // Send Notification to Assignee
    const notifId = 'notif_' + Date.now();
    const assignerUser = await db.prepare('SELECT full_name FROM accounts WHERE id = ?').get(assigner_id);
    const assignerName = assignerUser ? assignerUser.full_name : 'Cấp trên';
    await db.prepare(`
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

    const task = await db.prepare('SELECT * FROM standalone_tasks WHERE id = ?').get(task_id);
    if (!task) return res.status(404).json({ success: false, error: 'Nhiệm vụ không tồn tại' });

    const extId = 'ext_' + Date.now();
    const approverId = task.current_assigner_id || task.created_by;

    await db.prepare(`
      INSERT INTO task_extensions (id, task_id, requester_id, approver_id, old_due_date, requested_due_date, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(extId, task_id, requester_id, approverId, task.due_date || 'Chưa đặt', requested_due_date, reason);

    // Update Task status
    await db.prepare(`
      UPDATE standalone_tasks 
      SET status = 'DE_XUAT_GIA_HAN', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(task_id);

    // Send Notification to Approver
    const requester = await db.prepare('SELECT full_name FROM accounts WHERE id = ?').get(requester_id);
    await db.prepare(`
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
    const ext = await db.prepare('SELECT * FROM task_extensions WHERE id = ?').get(extension_id);
    if (!ext) return res.status(404).json({ success: false, error: 'Đề xuất không tồn tại' });

    if (action === 'APPROVE') {
      await db.prepare("UPDATE task_extensions SET status = 'APPROVED' WHERE id = ?").run(extension_id);
      await db.prepare(`
        UPDATE standalone_tasks 
        SET due_date = ?, status = 'DANG_THUC_HIEN', updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(ext.requested_due_date, ext.task_id);

      await db.prepare(`
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
      await db.prepare("UPDATE task_extensions SET status = 'REJECTED' WHERE id = ?").run(extension_id);
      await db.prepare(`
        UPDATE standalone_tasks 
        SET status = 'DANG_THUC_HIEN', updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(ext.task_id);

      await db.prepare(`
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
 * Báo cáo Hoàn Thành Nhiệm Vụ & Tự động đồng bộ sang tất cả tài khoản liên quan
 */
export async function completeTask(req, res) {
  try {
    const { task_id, account_id, completion_proof, proof_file_url } = req.body;
    if (!task_id) {
      return res.status(400).json({ success: false, error: 'Thiếu mã nhiệm vụ' });
    }

    const task = await db.prepare('SELECT * FROM standalone_tasks WHERE id = ?').get(task_id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy nhiệm vụ' });
    }

    // Update standalone task status to DA_HOAN_THANH
    await db.prepare(`
      UPDATE standalone_tasks 
      SET status = 'DA_HOAN_THANH',
          completion_proof = ?,
          proof_file_url = COALESCE(NULLIF(?, ''), proof_file_url),
          completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(completion_proof || '', proof_file_url || '', task_id);

    // Synchronize linked tasks in weekly reports (tasks table)
    try {
      await db.prepare(`
        UPDATE tasks 
        SET tien_do = 'Hoàn thành',
            san_pham = COALESCE(NULLIF(?, ''), san_pham),
            file_minh_chung = COALESCE(NULLIF(?, ''), file_minh_chung)
        WHERE parent_task_id = ? OR id = ? OR (noi_dung = ? AND report_id IN (SELECT id FROM reports WHERE account_id = ?))
      `).run(completion_proof || '', proof_file_url || '', task_id, task_id, task.title, task.current_assignee_id);
    } catch (e) {
      console.warn('Sync tasks error:', e);
    }

    // Send notifications to assigner & assigned assignees
    const completer = await db.prepare('SELECT full_name FROM accounts WHERE id = ?').get(account_id);
    const completerName = completer ? completer.full_name : 'Cán bộ';

    let assignees = [];
    try {
      assignees = JSON.parse(task.assigned_assignees || '[]');
    } catch (e) {
      assignees = [];
    }

    const recipientIds = new Set();
    const assignerId = task.current_assigner_id || task.created_by;
    if (assignerId && assignerId !== account_id) {
      recipientIds.add(assignerId);
    }
    assignees.forEach(a => {
      if (a.account_id && a.account_id !== account_id) {
        recipientIds.add(a.account_id);
      }
    });

    for (const recipientId of recipientIds) {
      const notifId = 'notif_cmp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
      await db.prepare(`
        INSERT INTO notifications (id, recipient_account_id, sender_account_id, type, title, message)
        VALUES (?, ?, ?, 'TASK_COMPLETED', ?, ?)
      `).run(
        notifId,
        recipientId,
        account_id || 'acc_admin',
        `✅ Nhiệm vụ [${task.task_code}] đã được hoàn thành`,
        `${completerName} đã nộp báo cáo hoàn thành nhiệm vụ: "${task.title}".`
      );
    }

    res.json({ success: true, message: 'Đã hoàn thành nhiệm vụ và đồng bộ tự động tới tất cả các tài khoản liên quan!' });
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
    let tasks = await db.prepare(`
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

    await db.prepare('DELETE FROM standalone_tasks WHERE id = ?').run(id);
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

    // Find all tasks that have staged assignees with is_dispatched = 0 for this assigner (or admin)
    const tasks = await db.prepare(`
      SELECT * FROM standalone_tasks 
      WHERE assigned_assignees IS NOT NULL AND assigned_assignees != '[]'
    `).all();

    const eligibleTasks = tasks.filter(t => {
      try {
        const assignees = JSON.parse(t.assigned_assignees || '[]');
        return assignees.some(a => 
          (a.assigner_id === assigner_id || assigner_id === 'acc_admin') && (!a.is_dispatched || a.is_dispatched === 0)
        );
      } catch (e) {
        return false;
      }
    });

    if (eligibleTasks.length === 0) {
      return res.status(400).json({ success: false, error: 'Chưa có nhiệm vụ nào được chọn giao người nhận mới để ban hành.' });
    }

    const assignerUser = await db.prepare('SELECT full_name FROM accounts WHERE id = ?').get(assigner_id);
    const assignerName = assignerUser ? assignerUser.full_name : 'Lãnh đạo';

    let publishedCount = 0;

    for (const t of eligibleTasks) {
      let assignees = [];
      try {
        assignees = JSON.parse(t.assigned_assignees || '[]');
      } catch (e) {
        assignees = [];
      }

      if (assignees.length === 0) continue;

      let newlyDispatchedAssignees = [];
      for (const item of assignees) {
        if ((item.assigner_id === assigner_id || assigner_id === 'acc_admin') && (!item.is_dispatched || item.is_dispatched === 0)) {
          item.is_dispatched = 1;
          newlyDispatchedAssignees.push(item);
        }
      }

      if (newlyDispatchedAssignees.length === 0) continue;

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

      const primaryAssignee = newlyDispatchedAssignees[0] || assignees[0];
      const targetLevels = Array.from(new Set(assignees.map(a => a.position_level))).join(',');

      // Update Task to DA_GIAO & is_dispatched = 1
      await db.prepare(`
        UPDATE standalone_tasks 
        SET current_assignee_id = ?,
            current_assigner_id = ?,
            target_position_level = ?,
            assigned_assignees = ?,
            status = 'DA_GIAO',
            is_dispatched = 1,
            assigned_week = COALESCE(?, assigned_week),
            assigned_year = COALESCE(?, assigned_year),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(primaryAssignee.account_id, assigner_id, targetLevels, JSON.stringify(assignees), assignedWeek, assignedYear, t.id);

      // Record History & Notifications for newly dispatched assignees
      for (const item of newlyDispatchedAssignees) {
        const historyId = 'hist_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
        await db.prepare(`
          INSERT INTO task_assignment_history (
            id, task_id, assigner_id, assignee_id, from_position_level, to_position_level, instruction_note
          ) VALUES (?, ?, ?, ?, 'KHO_VIEC', ?, ?)
        `).run(historyId, t.id, assigner_id, item.account_id, item.position_level, item.instruction_note || '');

        const notifId = 'notif_pub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
        await db.prepare(`
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
    const { task_id, assignee_id, position_level, instruction_note, assigner_id, assigned_date } = req.body;
    if (!task_id || !assignee_id || !position_level) {
      return res.status(400).json({ success: false, error: 'Thiếu thông tin tạm ứng người nhận' });
    }

    const task = await db.prepare('SELECT * FROM standalone_tasks WHERE id = ?').get(task_id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy nhiệm vụ' });
    }

    let assignees = [];
    try {
      assignees = JSON.parse(task.assigned_assignees || '[]');
    } catch (e) {
      assignees = [];
    }

    const assigneeAccount = await db.prepare('SELECT id, full_name, position_level FROM accounts WHERE id = ?').get(assignee_id);
    if (!assigneeAccount) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản người nhận' });
    }

    let assignerName = 'Cấp trên';
    if (assigner_id) {
      const assignerAcc = await db.prepare('SELECT full_name FROM accounts WHERE id = ?').get(assigner_id);
      if (assignerAcc) {
        assignerName = assignerAcc.full_name;
      }
    }

    const todayDate = assigned_date || new Date().toISOString().split('T')[0];

    const exists = assignees.some(a => a.account_id === assignee_id);
    if (!exists) {
      assignees.push({
        account_id: assignee_id,
        full_name: assigneeAccount.full_name,
        position_level: position_level || assigneeAccount.position_level,
        instruction_note: instruction_note || '',
        assigner_id: assigner_id || null,
        assigner_name: assignerName,
        assigned_date: todayDate,
        is_primary: assignees.length === 0,
        is_dispatched: 0
      });
    }

    const targetLevels = Array.from(new Set(assignees.map(a => a.position_level))).join(',');

    await db.prepare(`
      UPDATE standalone_tasks 
      SET assigned_assignees = ?, 
          target_position_level = ?, 
          current_assigner_id = COALESCE(?, current_assigner_id),
          is_dispatched = 0,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(JSON.stringify(assignees), targetLevels, assigner_id || null, task_id);

    res.json({ success: true, message: 'Đã tạm chọn người nhận', assignees });
  } catch (error) {
    console.error('Lỗi stageAssignee:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Giao hàng loạt danh sách nhiệm vụ (Bulk Stage Assignee)
 */
export async function bulkStageAssignee(req, res) {
  try {
    const { task_ids, assignee_id, position_level, instruction_note, assigner_id, assigned_date, due_date } = req.body;

    if (!Array.isArray(task_ids) || task_ids.length === 0 || !assignee_id || !position_level) {
      return res.status(400).json({ success: false, error: 'Thông tin giao việc hàng loạt không đầy đủ' });
    }

    const assigneeAccount = await db.prepare('SELECT id, full_name, position_level FROM accounts WHERE id = ?').get(assignee_id);
    if (!assigneeAccount) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản người nhận' });
    }

    let assignerName = 'Cấp trên';
    if (assigner_id) {
      const assignerAcc = await db.prepare('SELECT full_name FROM accounts WHERE id = ?').get(assigner_id);
      if (assignerAcc) {
        assignerName = assignerAcc.full_name;
      }
    }

    const todayDate = assigned_date || new Date().toISOString().split('T')[0];
    let updatedCount = 0;

    db.exec('BEGIN TRANSACTION;');

    try {
      for (const taskId of task_ids) {
        const task = await db.prepare('SELECT * FROM standalone_tasks WHERE id = ?').get(taskId);
        if (!task) continue;

        let assignees = [];
        try {
          assignees = JSON.parse(task.assigned_assignees || '[]');
        } catch (e) {
          assignees = [];
        }

        const exists = assignees.some(a => a.account_id === assignee_id);
        if (!exists) {
          assignees.push({
            account_id: assignee_id,
            full_name: assigneeAccount.full_name,
            position_level: position_level || assigneeAccount.position_level,
            instruction_note: instruction_note || '',
            assigner_id: assigner_id || null,
            assigner_name: assignerName,
            assigned_date: todayDate,
            is_primary: assignees.length === 0,
            is_dispatched: 0
          });
        }

        const targetLevels = Array.from(new Set(assignees.map(a => a.position_level))).join(',');

        await db.prepare(`
          UPDATE standalone_tasks 
          SET assigned_assignees = ?, 
              target_position_level = ?, 
              current_assigner_id = COALESCE(?, current_assigner_id),
              due_date = COALESCE(?, due_date),
              is_dispatched = 0,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(JSON.stringify(assignees), targetLevels, assigner_id || null, due_date || null, taskId);

        updatedCount++;
      }

      db.exec('COMMIT;');
      res.json({ success: true, count: updatedCount, message: `Đã giao thành công ${updatedCount} nhiệm vụ cho ${assigneeAccount.full_name}` });
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  } catch (error) {
    console.error('Lỗi bulkStageAssignee:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Xóa hàng loạt nhiệm vụ khỏi Kho Chung (Bulk Delete Tasks)
 */
export async function bulkDeleteTasks(req, res) {
  try {
    const { task_ids } = req.body;
    if (!Array.isArray(task_ids) || task_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Thiếu mảng ID nhiệm vụ cần xóa' });
    }

    db.exec('BEGIN TRANSACTION;');

    try {
      const placeholders = task_ids.map(() => '?').join(',');
      await db.prepare(`DELETE FROM standalone_tasks WHERE id IN (${placeholders})`).run(...task_ids);
      db.exec('COMMIT;');
      res.json({ success: true, count: task_ids.length, message: `Đã xóa thành công ${task_ids.length} nhiệm vụ khỏi Kho Chung` });
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  } catch (error) {
    console.error('Lỗi bulkDeleteTasks:', error);
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

    const task = await db.prepare('SELECT * FROM standalone_tasks WHERE id = ?').get(task_id);
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
      await db.prepare(`
        UPDATE standalone_tasks 
        SET assigned_assignees = ?, 
            target_position_level = ?,
            current_assignee_id = ?,
            status = ?,
            is_dispatched = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(JSON.stringify(assignees), targetLevels, assignees[0].account_id, status, isDispatched, task_id);
    } else {
      // 0 assignees left -> Return to global task pool & clear current assignee/assigner!
      await db.prepare(`
        UPDATE standalone_tasks 
        SET assigned_assignees = '[]', 
            target_position_level = '',
            current_assignee_id = NULL,
            current_assigner_id = NULL,
            status = 'KHO_VIEC',
            is_dispatched = 0,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(task_id);
    }

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

    await db.prepare(`UPDATE standalone_tasks SET is_pool_hidden = 1 WHERE id = ?`).run(id);
    res.json({ success: true, message: 'Đã dọn dẹp ẩn nhiệm vụ khỏi kho chung' });
  } catch (error) {
    console.error('Lỗi dismissPoolTask:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Import hàng loạt nhiệm vụ từ Excel Sổ Văn Bản Đến vào Kho Chung
 */
export async function batchImportTasks(req, res) {
  try {
    const { tasks, created_by } = req.body;
    if (!Array.isArray(tasks) || tasks.length === 0 || !created_by) {
      return res.status(400).json({ success: false, error: 'Thiếu danh sách nhiệm vụ hoặc người tạo' });
    }

    // Kiểm tra quyền: Chỉ vai trò Văn thư mới có quyền Import dữ liệu
    const creator = await db.prepare('SELECT id, role, position_level, username FROM accounts WHERE id = ?').get(created_by);
    const isVanThu = creator && (creator.position_level === 'VAN_THU' || creator.role === 'VAN_THU' || creator.username === 'vanthu');
    if (!isVanThu) {
      return res.status(403).json({ success: false, error: 'Chỉ tài khoản có vai trò Văn thư mới có quyền import dữ liệu từ Excel' });
    }

    let importedCount = 0;
    const currentYear = new Date().getFullYear();

    const insertStmt = db.prepare(`
      INSERT INTO standalone_tasks (
        id, task_code, title, description, created_by, priority, status, due_date
      ) VALUES (?, ?, ?, ?, ?, ?, 'KHO_VIEC', ?)
    `);

    db.exec('BEGIN TRANSACTION;');

    try {
      for (const t of tasks) {
        if (!t.title || !t.title.trim()) continue;

        const count = await db.prepare('SELECT COUNT(*) as c FROM standalone_tasks').get().c + 1;
        const taskId = 'task_st_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) + '_' + importedCount;
        
        let taskCode = t.task_code;
        if (!taskCode) {
          taskCode = `NV-${currentYear}-${String(count).padStart(3, '0')}`;
        }

        await insertStmt.run(
          taskId,
          taskCode,
          t.title.trim(),
          t.description || '',
          created_by,
          t.priority || 'THUONG',
          t.due_date || null
        );
        importedCount++;
      }

      db.exec('COMMIT;');
      res.json({ success: true, count: importedCount, message: `Đã import thành công ${importedCount} nhiệm vụ vào Kho Chung!` });
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  } catch (error) {
    console.error('Lỗi batchImportTasks standalone:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}




