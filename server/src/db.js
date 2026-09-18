import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const currentDir = typeof __dirname !== 'undefined'
  ? __dirname
  : (import.meta && import.meta.url ? path.dirname(fileURLToPath(import.meta.url)) : process.cwd());

const dbPath = process.env.DATABASE_PATH || path.join(currentDir, '../data/weekly_report.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new DatabaseSync(dbPath);

// Enable Foreign Keys
db.exec('PRAGMA foreign_keys = ON;');

/**
 * Initialize Tables Schema & Initial Seeds
 */
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      department_id TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT CHECK(role IN ('ADMIN', 'LEADER', 'STAFF')) DEFAULT 'STAFF',
      position_level TEXT CHECK(position_level IN ('GIAM_DOC', 'PHO_GIAM_DOC', 'TRUONG_PHONG', 'PHO_PHONG', 'TO_TRUONG', 'CHUYEN_VIEN')) DEFAULT 'CHUYEN_VIEN',
      parent_leader_id TEXT,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (department_id) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      department_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      week_number INTEGER NOT NULL,
      year INTEGER NOT NULL,
      status TEXT CHECK(status IN ('DRAFT', 'SUBMITTED', 'APPROVED')) DEFAULT 'DRAFT',
      kho_khan TEXT DEFAULT 'Không',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id),
      FOREIGN KEY (account_id) REFERENCES accounts(id),
      UNIQUE(account_id, week_number, year)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      table_type INTEGER CHECK(table_type IN (1, 2)) NOT NULL,
      category TEXT CHECK(category IN ('Thường xuyên', 'Đột xuất')) NOT NULL,
      noi_dung TEXT NOT NULL,
      thoi_gian TEXT DEFAULT '',
      trien_khai TEXT DEFAULT '',
      tien_do TEXT DEFAULT 'Hoàn thành',
      san_pham TEXT DEFAULT '',
      parent_task_id TEXT,
      order_index INTEGER DEFAULT 0,
      file_minh_chung TEXT DEFAULT '',
      file_original_name TEXT DEFAULT '',
      FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS report_shares (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      owner_account_id TEXT NOT NULL,
      shared_with_account_id TEXT NOT NULL,
      permission TEXT CHECK(permission IN ('VIEW', 'EDIT')) DEFAULT 'VIEW',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
      FOREIGN KEY (owner_account_id) REFERENCES accounts(id),
      FOREIGN KEY (shared_with_account_id) REFERENCES accounts(id),
      UNIQUE(report_id, shared_with_account_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      recipient_account_id TEXT NOT NULL,
      sender_account_id TEXT NOT NULL,
      type TEXT DEFAULT 'REPORT_SHARED',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      report_id TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (recipient_account_id) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_account_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS standalone_tasks (
      id TEXT PRIMARY KEY,
      task_code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_by TEXT NOT NULL,
      current_assignee_id TEXT,
      current_assigner_id TEXT,
      target_position_level TEXT,
      priority TEXT CHECK(priority IN ('THUONG', 'KHAN', 'KHAN_CAP')) DEFAULT 'THUONG',
      status TEXT CHECK(status IN (
        'KHO_VIEC', 'DA_GIAO', 'DANG_THUC_HIEN', 'DE_XUAT_GIA_HAN', 'CHO_DUYET_HOAN_THANH', 'HOAN_THANH', 'HUY_BO'
      )) DEFAULT 'KHO_VIEC',
      due_date TEXT,
      assigned_week INTEGER,
      assigned_year INTEGER,
      completion_proof TEXT DEFAULT '',
      proof_file_url TEXT DEFAULT '',
      assigned_assignees TEXT DEFAULT '[]',
      is_dispatched INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES accounts(id),
      FOREIGN KEY (current_assignee_id) REFERENCES accounts(id),
      FOREIGN KEY (current_assigner_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS task_assignment_history (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      assigner_id TEXT NOT NULL,
      assignee_id TEXT NOT NULL,
      from_position_level TEXT,
      to_position_level TEXT NOT NULL,
      instruction_note TEXT DEFAULT '',
      assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES standalone_tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (assigner_id) REFERENCES accounts(id),
      FOREIGN KEY (assignee_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS task_extensions (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      requester_id TEXT NOT NULL,
      approver_id TEXT NOT NULL,
      old_due_date TEXT NOT NULL,
      requested_due_date TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES standalone_tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (requester_id) REFERENCES accounts(id),
      FOREIGN KEY (approver_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS custom_roles (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      level_rank INTEGER NOT NULL,
      description TEXT DEFAULT '',
      scope_delegation TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  migrateAccountsTable();
  migrateReportsTable();
  migrateTasksTable();
  migrateStandaloneTasksTable();
  seedDefaultData();
}

function migrateAccountsTable() {
  try {
    const tableInfo = db.prepare("PRAGMA table_info(accounts)").all();
    const hasPositionLevel = tableInfo.some(col => col.name === 'position_level');
    if (!hasPositionLevel) {
      console.log('🔄 Đang thêm cột position_level & parent_leader_id vào bảng accounts...');
      db.exec("ALTER TABLE accounts ADD COLUMN position_level TEXT CHECK(position_level IN ('GIAM_DOC', 'PHO_GIAM_DOC', 'TRUONG_PHONG', 'PHO_PHONG', 'TO_TRUONG', 'CHUYEN_VIEN')) DEFAULT 'CHUYEN_VIEN';");
      db.exec("ALTER TABLE accounts ADD COLUMN parent_leader_id TEXT;");
      console.log('✅ Đã cập nhật bảng accounts thành công!');
    }
  } catch (err) {
    console.error('Lỗi khi migrate accounts table:', err);
  }
}

function migrateTasksTable() {
  try {
    const tableInfo = db.prepare("PRAGMA table_info(tasks)").all();
    const hasFileMinhChung = tableInfo.some(col => col.name === 'file_minh_chung');
    if (!hasFileMinhChung) {
      console.log('🔄 Đang thêm cột file_minh_chung & file_original_name vào bảng tasks...');
      db.exec("ALTER TABLE tasks ADD COLUMN file_minh_chung TEXT DEFAULT '';");
      db.exec("ALTER TABLE tasks ADD COLUMN file_original_name TEXT DEFAULT '';");
      console.log('✅ Đã cập nhật bảng tasks thành công!');
    }
  } catch (err) {
    console.error('Lỗi khi migrate tasks table:', err);
  }
}

function migrateStandaloneTasksTable() {
  try {
    const tableInfo = db.prepare("PRAGMA table_info(standalone_tasks)").all();
    const hasAssignedAssignees = tableInfo.some(col => col.name === 'assigned_assignees');
    if (!hasAssignedAssignees) {
      console.log('🔄 Đang thêm cột assigned_assignees & is_dispatched vào bảng standalone_tasks...');
      db.exec("ALTER TABLE standalone_tasks ADD COLUMN assigned_assignees TEXT DEFAULT '[]';");
      db.exec("ALTER TABLE standalone_tasks ADD COLUMN is_dispatched INTEGER DEFAULT 0;");
      console.log('✅ Đã cập nhật bảng standalone_tasks thành công!');
    }
    const hasPoolHidden = tableInfo.some(col => col.name === 'is_pool_hidden');
    if (!hasPoolHidden) {
      db.exec("ALTER TABLE standalone_tasks ADD COLUMN is_pool_hidden INTEGER DEFAULT 0;");
    }
  } catch (err) {
    console.error('Lỗi khi migrate standalone_tasks table:', err);
  }
}

/**
 * Migration: Chuyển đổi ràng buộc duy nhất từ (department_id, week_number, year) sang (account_id, week_number, year)
 * Đảm bảo mỗi tài khoản cá nhân có thể tạo báo cáo riêng độc lập trong cùng một phòng ban.
 */
function migrateReportsTable() {
  try {
    const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='reports'").get();
    if (tableInfo && tableInfo.sql && tableInfo.sql.includes('department_id, week_number, year')) {
      console.log('🔄 Đang nâng cấp CSDL: Chuyển sang UNIQUE(account_id, week_number, year)...');

      db.exec('PRAGMA foreign_keys = OFF;');

      db.exec(`
        CREATE TABLE IF NOT EXISTS reports_new (
          id TEXT PRIMARY KEY,
          department_id TEXT NOT NULL,
          account_id TEXT NOT NULL,
          week_number INTEGER NOT NULL,
          year INTEGER NOT NULL,
          status TEXT CHECK(status IN ('DRAFT', 'SUBMITTED', 'APPROVED')) DEFAULT 'DRAFT',
          kho_khan TEXT DEFAULT 'Không',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (department_id) REFERENCES departments(id),
          FOREIGN KEY (account_id) REFERENCES accounts(id),
          UNIQUE(account_id, week_number, year)
        );
      `);

      db.exec('INSERT OR IGNORE INTO reports_new SELECT * FROM reports;');
      db.exec('DROP TABLE reports;');
      db.exec('ALTER TABLE reports_new RENAME TO reports;');

      db.exec('PRAGMA foreign_keys = ON;');
      console.log('✅ Nâng cấp CSDL reports thành công!');
    }

    // Add last_edited_by column if missing
    const cols = db.prepare("PRAGMA table_info(reports)").all();
    if (!cols.some(c => c.name === 'last_edited_by')) {
      db.exec("ALTER TABLE reports ADD COLUMN last_edited_by TEXT DEFAULT '';");
    }
  } catch (err) {
    console.error('Lỗi khi migrate reports table:', err);
    try { db.exec('PRAGMA foreign_keys = ON;'); } catch (e) {}
  }
}

/**
 * Seed initial sample departments & accounts ONLY. No hardcoded sample reports/tasks!
 */
function seedDefaultData() {
  const deptCount = db.prepare('SELECT COUNT(*) as count FROM departments').get().count;
  if (deptCount === 0) {
    console.log('Seeding initial departments & accounts...');

    // 1. Departments
    db.prepare('INSERT INTO departments (id, name, code) VALUES (?, ?, ?)').run('dept_vp', 'Văn phòng Ban Quản lý', 'VP');
    db.prepare('INSERT INTO departments (id, name, code) VALUES (?, ?, ?)').run('dept_pkh', 'Phòng Kế hoạch - Tài chính', 'PKH');
    db.prepare('INSERT INTO departments (id, name, code) VALUES (?, ?, ?)').run('dept_pql', 'Phòng Quản lý Đô thị & Môi trường', 'PQL');
  }

  // Ensure accounts have hierarchy positions & custom roles
  seedSampleHierarchyData();
}

function seedSampleHierarchyData() {
  try {
    // 1. Seed Custom Roles (6 Levels)
    const roleCount = db.prepare('SELECT COUNT(*) as c FROM custom_roles').get().c;
    if (roleCount === 0) {
      const defaultRoles = [
        { id: 'role_1', code: 'GIAM_DOC', name: 'Giám đốc', level_rank: 1, description: 'Lãnh đạo cao nhất Ban Quản lý', scope: 'Giao việc cho Phó Giám đốc, Trưởng phòng & tất cả các cấp' },
        { id: 'role_2', code: 'PHO_GIAM_DOC', name: 'Phó Giám đốc', level_rank: 2, description: 'Lãnh đạo phụ trách khối/lĩnh vực', scope: 'Giao việc cho Trưởng phòng, Phó phòng & các cấp dưới' },
        { id: 'role_3', code: 'TRUONG_PHONG', name: 'Trưởng phòng', level_rank: 3, description: 'Quản lý điều hành Phòng ban', scope: 'Giao việc cho Phó phòng, Tổ trưởng & Chuyên viên' },
        { id: 'role_4', code: 'PHO_PHONG', name: 'Phó phòng', level_rank: 4, description: 'Phụ trách chuyên môn kỹ thuật', scope: 'Giao việc cho Tổ trưởng & Chuyên viên trong phòng' },
        { id: 'role_5', code: 'TO_TRUONG', name: 'Tổ trưởng', level_rank: 5, description: 'Đánh giá & Quản lý nhóm chuyên môn', scope: 'Giao việc trực tiếp cho Chuyên viên' },
        { id: 'role_6', code: 'CHUYEN_VIEN', name: 'Chuyên viên', level_rank: 6, description: 'Thực hiện trực tiếp nhiệm vụ & báo cáo', scope: 'Nhận việc từ các cấp trên & Báo cáo kết quả/Gia hạn' }
      ];

      for (const r of defaultRoles) {
        db.prepare('INSERT INTO custom_roles (id, code, name, level_rank, description, scope_delegation) VALUES (?, ?, ?, ?, ?, ?)')
          .run(r.id, r.code, r.name, r.level_rank, r.description, r.scope);
      }
    }

    // 2. Seed / Update 6 Hierarchy Accounts
    const hierarchyUsers = [
      { id: 'acc_gd_minh', username: 'giamdoc', full_name: '[1] Giám đốc - Nguyễn Văn Minh', role: 'ADMIN', position_level: 'GIAM_DOC' },
      { id: 'acc_pgd_nam', username: 'phogiamdoc', full_name: '[2] Phó Giám đốc - Trần Văn Nam', role: 'LEADER', position_level: 'PHO_GIAM_DOC' },
      { id: 'acc_tp_hoa', username: 'vanphong', full_name: '[3] Trưởng phòng - Trần Thuận Hóa', role: 'LEADER', position_level: 'TRUONG_PHONG' },
      { id: 'acc_tp_hoa2', username: 'truongphong', full_name: '[3] Trưởng phòng - Nguyễn Thị Lan', role: 'LEADER', position_level: 'TRUONG_PHONG' },
      { id: 'acc_pp_mai', username: 'phophong', full_name: '[4] Phó phòng - Lê Thị Mai', role: 'LEADER', position_level: 'PHO_PHONG' },
      { id: 'acc_tt_binh', username: 'totruong', full_name: '[5] Tổ trưởng - Phạm Văn Bình', role: 'STAFF', position_level: 'TO_TRUONG' },
      { id: 'acc_cv_khang', username: 'khang', full_name: '[6] Chuyên viên - Đoàn Anh Khang', role: 'STAFF', position_level: 'CHUYEN_VIEN' },
      { id: 'acc_cv_tuan', username: 'chuyenvien', full_name: '[6] Chuyên viên - Võ Văn Tuấn', role: 'STAFF', position_level: 'CHUYEN_VIEN' }
    ];

    for (const u of hierarchyUsers) {
      const existing = db.prepare("SELECT id FROM accounts WHERE username = ?").get(u.username);
      if (!existing) {
        db.prepare('INSERT INTO accounts (id, department_id, username, password, full_name, role, position_level) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(u.id, 'dept_vp', u.username, '123456', u.full_name, u.role, u.position_level);
      } else {
        db.prepare("UPDATE accounts SET full_name = ?, position_level = ? WHERE username = ?")
          .run(u.full_name, u.position_level, u.username);
      }
    }
  } catch (err) {
    console.error('Lỗi khi seed hierarchy users:', err);
  }
}

initDatabase();

export { db };
