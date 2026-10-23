import { DatabaseSync } from 'node:sqlite';
import { neon } from '@neondatabase/serverless';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const currentDir = typeof __dirname !== 'undefined'
  ? __dirname
  : (import.meta && import.meta.url ? path.dirname(fileURLToPath(import.meta.url)) : process.cwd());

const dbPath = process.env.DATABASE_PATH || path.join(currentDir, '../data/weekly_report.db');

const ddlList = [
  `CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    department_id TEXT NOT NULL REFERENCES departments(id),
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'STAFF',
    position_level VARCHAR(30) DEFAULT 'CHUYEN_VIEN',
    parent_leader_id TEXT,
    signature_url TEXT DEFAULT '',
    pin_code_hash TEXT DEFAULT '',
    signature_updated_at TIMESTAMP WITH TIME ZONE,
    is_active SMALLINT DEFAULT 1
  )`,

  `CREATE TABLE IF NOT EXISTS custom_roles (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    level_rank INTEGER NOT NULL,
    description TEXT DEFAULT '',
    scope_delegation TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    department_id TEXT NOT NULL REFERENCES departments(id),
    account_id TEXT NOT NULL REFERENCES accounts(id),
    week_number INTEGER NOT NULL,
    year INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'DRAFT',
    kho_khan TEXT DEFAULT 'Không',
    report_type VARCHAR(30) DEFAULT 'SINGLE',
    team_code VARCHAR(30) DEFAULT 'NONE',
    parent_consolidated_id TEXT,
    last_edited_by TEXT DEFAULT '',
    approval_status VARCHAR(30) DEFAULT 'DRAFT',
    approvers_chain TEXT DEFAULT '[]',
    current_approver_id TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, report_type, week_number, year)
  )`,

  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    table_type SMALLINT NOT NULL,
    category VARCHAR(50) NOT NULL,
    noi_dung TEXT NOT NULL,
    thoi_gian TEXT DEFAULT '',
    trien_khai TEXT DEFAULT '',
    tien_do TEXT DEFAULT 'Hoàn thành',
    san_pham TEXT DEFAULT '',
    parent_task_id TEXT,
    order_index INTEGER DEFAULT 0,
    file_minh_chung TEXT DEFAULT '',
    file_original_name TEXT DEFAULT '',
    team_code VARCHAR(30) DEFAULT 'VAN_THU',
    is_starred SMALLINT DEFAULT 0,
    is_recurring SMALLINT DEFAULT 0,
    is_pinned SMALLINT DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS standalone_tasks (
    id TEXT PRIMARY KEY,
    task_code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_by TEXT NOT NULL REFERENCES accounts(id),
    current_assignee_id TEXT REFERENCES accounts(id),
    current_assigner_id TEXT REFERENCES accounts(id),
    target_position_level TEXT,
    priority VARCHAR(20) DEFAULT 'THUONG',
    status VARCHAR(30) DEFAULT 'KHO_VIEC',
    due_date TEXT,
    assigned_week INTEGER,
    assigned_year INTEGER,
    completion_proof TEXT DEFAULT '',
    proof_file_url TEXT DEFAULT '',
    assigned_assignees TEXT DEFAULT '[]',
    is_dispatched SMALLINT DEFAULT 0,
    is_pool_hidden SMALLINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS task_assignment_history (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES standalone_tasks(id) ON DELETE CASCADE,
    assigner_id TEXT NOT NULL REFERENCES accounts(id),
    assignee_id TEXT NOT NULL REFERENCES accounts(id),
    from_position_level TEXT,
    to_position_level TEXT NOT NULL,
    instruction_note TEXT DEFAULT '',
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS task_extensions (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES standalone_tasks(id) ON DELETE CASCADE,
    requester_id TEXT NOT NULL REFERENCES accounts(id),
    approver_id TEXT NOT NULL REFERENCES accounts(id),
    old_due_date TEXT NOT NULL,
    requested_due_date TEXT NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS report_shares (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    shared_with_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    permission VARCHAR(10) DEFAULT 'VIEW',
    shared_by_account_id TEXT NOT NULL REFERENCES accounts(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(report_id, shared_with_account_id)
  )`,

  `CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    recipient_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    sender_account_id TEXT NOT NULL REFERENCES accounts(id),
    type VARCHAR(50) DEFAULT 'REPORT_SHARED',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    report_id TEXT,
    is_read SMALLINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS report_signatures (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    signer_account_id TEXT NOT NULL REFERENCES accounts(id),
    signer_name TEXT NOT NULL,
    signer_position TEXT NOT NULL,
    signer_department TEXT NOT NULL,
    signature_url TEXT NOT NULL,
    step_order INTEGER DEFAULT 1,
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    note TEXT DEFAULT '',
    UNIQUE(report_id, signer_account_id)
  )`,

  `CREATE TABLE IF NOT EXISTS doc_inspection_stats (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    department_name TEXT NOT NULL,
    total_checked INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    total_pages INTEGER DEFAULT 0,
    order_index INTEGER DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS consolidated_report_meta (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
    to_truong_name TEXT DEFAULT 'Trần Thuận Hòa',
    to_truong_opinion TEXT DEFAULT '',
    nguoi_lap_name TEXT DEFAULT '',
    pho_chanh_van_phong_name TEXT DEFAULT 'Nguyễn Đức Thắng',
    pho_chanh_van_phong_opinion TEXT DEFAULT '',
    chanh_van_phong_name TEXT DEFAULT 'Hoàng Văn Dương',
    chanh_van_phong_opinion TEXT DEFAULT '',
    ending_note TEXT DEFAULT 'Trên đây là báo cáo tình hình thực hiện nhiệm vụ Tuần và kế hoạch thực hiện nhiệm vụ trọng tâm công tác Tuần tiếp theo. Kính trình Lãnh đạo phòng xem xét./.'
  )`
];

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ Lỗi: Chưa thiết lập biến môi trường DATABASE_URL trong file .env!');
    process.exit(1);
  }

  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Không tìm thấy file SQLite tại: ${dbPath}`);
    process.exit(1);
  }

  console.log('🚀 Bắt đầu quá trình di chuyển dữ liệu từ SQLite sang Neon PostgreSQL...');
  console.log(`📁 File SQLite nguồn: ${dbPath}`);
  console.log(`🌐 Neon Database: ${databaseUrl.split('@')[1] || 'Connected'}\n`);

  const sqlite = new DatabaseSync(dbPath);
  const sql = neon(databaseUrl);

  try {
    // 1. Tạo Schema từng bảng
    console.log('⏳ Bước 1: Khởi tạo các bảng trên Neon PostgreSQL...');
    for (const ddl of ddlList) {
      await sql.query(ddl);
    }
    console.log('✅ Khởi tạo đầy đủ bảng trên Neon PostgreSQL thành công!\n');

    // 2. Chuyển đổi dữ liệu từng bảng
    console.log('⏳ Bước 2: Bắt đầu sao chép dữ liệu từ SQLite sang Neon...');

    // Departments
    const depts = sqlite.prepare('SELECT * FROM departments').all();
    console.log(`👉 Đang chuyển ${depts.length} phòng ban...`);
    for (const d of depts) {
      await sql.query(
        `INSERT INTO departments (id, name, code) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code`,
        [d.id, d.name, d.code]
      );
    }

    // Custom Roles
    try {
      const roles = sqlite.prepare('SELECT * FROM custom_roles').all();
      console.log(`👉 Đang chuyển ${roles.length} vai trò...`);
      for (const r of roles) {
        await sql.query(
          `INSERT INTO custom_roles (id, code, name, level_rank, description, scope_delegation) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.code, r.name, r.level_rank, r.description || '', r.scope_delegation || '']
        );
      }
    } catch (e) {}

    // Accounts
    const accounts = sqlite.prepare('SELECT * FROM accounts').all();
    console.log(`👉 Đang chuyển ${accounts.length} tài khoản...`);
    for (const a of accounts) {
      await sql.query(
        `INSERT INTO accounts (id, department_id, username, password, full_name, role, position_level, parent_leader_id, signature_url, pin_code_hash, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, position_level = EXCLUDED.position_level, signature_url = EXCLUDED.signature_url, pin_code_hash = EXCLUDED.pin_code_hash`,
        [a.id, a.department_id, a.username, a.password, a.full_name, a.role, a.position_level, a.parent_leader_id || null, a.signature_url || '', a.pin_code_hash || '', a.is_active ?? 1]
      );
    }

    // Reports
    const reports = sqlite.prepare('SELECT * FROM reports').all();
    console.log(`👉 Đang chuyển ${reports.length} báo cáo tuần...`);
    for (const rep of reports) {
      await sql.query(
        `INSERT INTO reports (id, department_id, account_id, week_number, year, status, kho_khan, report_type, team_code, parent_consolidated_id, last_edited_by, approval_status, approvers_chain, current_approver_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (id) DO NOTHING`,
        [rep.id, rep.department_id, rep.account_id, rep.week_number, rep.year, rep.status || 'DRAFT', rep.kho_khan || 'Không', rep.report_type || 'SINGLE', rep.team_code || 'NONE', rep.parent_consolidated_id || null, rep.last_edited_by || '', rep.approval_status || 'DRAFT', rep.approvers_chain || '[]', rep.current_approver_id || '']
      );
    }

    // Tasks
    const tasks = sqlite.prepare('SELECT * FROM tasks').all();
    console.log(`👉 Đang chuyển ${tasks.length} nhiệm vụ báo cáo...`);
    for (const t of tasks) {
      await sql.query(
        `INSERT INTO tasks (id, report_id, table_type, category, noi_dung, thoi_gian, trien_khai, tien_do, san_pham, parent_task_id, order_index, file_minh_chung, file_original_name, is_starred, is_recurring)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (id) DO NOTHING`,
        [t.id, t.report_id, t.table_type, t.category, t.noi_dung, t.thoi_gian || '', t.trien_khai || '', t.tien_do || 'Hoàn thành', t.san_pham || '', t.parent_task_id || null, t.order_index || 0, t.file_minh_chung || '', t.file_original_name || '', t.is_starred || 0, t.is_recurring || 0]
      );
    }

    // Standalone Tasks
    try {
      const standalones = sqlite.prepare('SELECT * FROM standalone_tasks').all();
      console.log(`👉 Đang chuyển ${standalones.length} nhiệm vụ Kho việc chung...`);
      for (const st of standalones) {
        await sql.query(
          `INSERT INTO standalone_tasks (id, task_code, title, description, created_by, current_assignee_id, current_assigner_id, target_position_level, priority, status, due_date, assigned_week, assigned_year, completion_proof, proof_file_url, assigned_assignees, is_dispatched)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
           ON CONFLICT (id) DO NOTHING`,
          [st.id, st.task_code, st.title, st.description || '', st.created_by, st.current_assignee_id || null, st.current_assigner_id || null, st.target_position_level || null, st.priority || 'THUONG', st.status || 'KHO_VIEC', st.due_date || null, st.assigned_week || null, st.assigned_year || null, st.completion_proof || '', st.proof_file_url || '', st.assigned_assignees || '[]', st.is_dispatched || 0]
        );
      }
    } catch (e) {}

    console.log('\n🎉 Chúc mừng! Toàn bộ cơ sở dữ liệu đã được di chuyển thành công sang Neon PostgreSQL!');
  } catch (error) {
    console.error('❌ Lỗi trong quá trình di chuyển dữ liệu:', error);
  }
}

migrate();
