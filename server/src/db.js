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
  `);

  seedDefaultData();
  migrateReportsTable();
  migrateTasksTable();
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

    // 2. Accounts
    db.prepare('INSERT INTO accounts (id, department_id, username, password, full_name, role) VALUES (?, ?, ?, ?, ?, ?)').run('acc_admin', 'dept_vp', 'admin', '123456', 'Quản trị viên Hệ thống', 'ADMIN');
    db.prepare('INSERT INTO accounts (id, department_id, username, password, full_name, role) VALUES (?, ?, ?, ?, ?, ?)').run('acc_vp_hoa', 'dept_vp', 'vanphong', '123456', 'Trần Thuận Hóa', 'LEADER');
    db.prepare('INSERT INTO accounts (id, department_id, username, password, full_name, role) VALUES (?, ?, ?, ?, ?, ?)').run('acc_vp_khang', 'dept_vp', 'khang', '123456', 'Đoàn Anh Khang', 'STAFF');
    db.prepare('INSERT INTO accounts (id, department_id, username, password, full_name, role) VALUES (?, ?, ?, ?, ?, ?)').run('acc_pkh_a', 'dept_pkh', 'kehoach', '123456', 'Nguyễn Văn A', 'STAFF');

    console.log('Seeding departments & accounts completed successfully!');
  } else {
    // Ensure Khang account exists if missing in existing DB
    const khangAcc = db.prepare("SELECT id FROM accounts WHERE username = 'khang'").get();
    if (!khangAcc) {
      db.prepare('INSERT INTO accounts (id, department_id, username, password, full_name, role) VALUES (?, ?, ?, ?, ?, ?)').run('acc_vp_khang', 'dept_vp', 'khang', '123456', 'Đoàn Anh Khang', 'STAFF');
    }
  }

  // Clear old sample hardcoded report from week 42 if present
  try {
    db.prepare("DELETE FROM reports WHERE id = 'rpt_dept_vp_w42_2026'").run();
  } catch (e) {}
}

initDatabase();

export { db };
