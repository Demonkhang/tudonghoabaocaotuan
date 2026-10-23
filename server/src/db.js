import { neon } from '@neondatabase/serverless';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const currentDir = typeof __dirname !== 'undefined'
  ? __dirname
  : (import.meta && import.meta.url ? path.dirname(fileURLToPath(import.meta.url)) : process.cwd());

// Helper converting '?' to '$1, $2, ...' for PostgreSQL (Neon)
function convertSql(sqlStr) {
  let paramIndex = 1;
  let inString = false;
  let res = '';
  for (let i = 0; i < sqlStr.length; i++) {
    const char = sqlStr[i];
    if (char === "'") {
      inString = !inString;
      res += char;
    } else if (char === '?' && !inString) {
      res += `$${paramIndex++}`;
    } else {
      res += char;
    }
  }
  return res;
}

/**
 * XÁC ĐỊNH MÔI TRƯỜNG & LOẠI CƠ SỞ DỮ LIỆU:
 * 1. Vercel (Serverless): Luôn dùng Neon PostgreSQL qua DATABASE_URL.
 * 2. Cấu hình rõ ràng DB_TYPE='neon' hoặc có DEV_DATABASE_URL: Dùng Neon PostgreSQL.
 * 3. Mặc định (Local Dev & Docker): Dùng SQLite độc lập.
 *    - Docker: Dùng file mount './server/data/weekly_report.db' (port 3000).
 *    - Local Dev (npm run dev): Dùng file riêng 'weekly_report_dev.db' (port 3001) - KHÔNG đụng Docker.
 */
const isVercel = !!process.env.VERCEL;
const isProd = process.env.NODE_ENV === 'production';
const dbType = process.env.DB_TYPE ? process.env.DB_TYPE.toLowerCase().trim() : '';

let activeMode = 'sqlite';
let activeNeonUrl = '';

if (isVercel) {
  activeMode = 'neon';
  activeNeonUrl = process.env.DATABASE_URL || '';
} else if (dbType === 'neon') {
  activeMode = 'neon';
  activeNeonUrl = process.env.DEV_DATABASE_URL || process.env.DATABASE_URL || '';
} else if (dbType === 'sqlite') {
  activeMode = 'sqlite';
} else if (!isProd && process.env.DEV_DATABASE_URL) {
  activeMode = 'neon';
  activeNeonUrl = process.env.DEV_DATABASE_URL;
} else if (isProd && process.env.DATABASE_URL && !process.env.DATABASE_PATH) {
  activeMode = 'neon';
  activeNeonUrl = process.env.DATABASE_URL;
} else {
  activeMode = 'sqlite';
}

let neonClient = null;
let sqliteDb = null;

if (activeMode === 'neon') {
  if (!activeNeonUrl) {
    throw new Error('DATABASE_URL hoặc DEV_DATABASE_URL chưa được cấu hình cho Neon PostgreSQL');
  }
  neonClient = neon(activeNeonUrl);
  console.log(`📡 [DB] Kết nối Neon PostgreSQL (${isVercel ? 'Vercel Serverless' : 'Cloud'}). Dữ liệu độc lập.`);
} else {
  // Chế độ SQLite độc lập
  let targetDbPath = '';
  if (process.env.DATABASE_PATH) {
    targetDbPath = path.isAbsolute(process.env.DATABASE_PATH)
      ? process.env.DATABASE_PATH
      : path.resolve(process.cwd(), process.env.DATABASE_PATH);
  } else if (!isProd) {
    // Local Dev: Đảm bảo CÁCH LY HOÀN TOÀN với Docker
    targetDbPath = path.resolve(currentDir, '../data/weekly_report_dev.db');

    // Tự động sao chép từ DB gốc nếu chưa có file dev DB
    const masterDbPath = path.resolve(currentDir, '../data/weekly_report.db');
    if (!fs.existsSync(targetDbPath) && fs.existsSync(masterDbPath)) {
      try {
        fs.copyFileSync(masterDbPath, targetDbPath);
        console.log(`📋 [DB Dev] Đã khởi tạo 'weekly_report_dev.db' từ file gốc để cách ly hoàn toàn với Docker.`);
      } catch (err) {
        console.warn('Không thể tự động sao chép DB gốc sang dev:', err);
      }
    }
  } else {
    targetDbPath = path.resolve(currentDir, '../data/weekly_report.db');
  }

  const parentDir = path.dirname(targetDbPath);
  if (!fs.existsSync(parentDir)) {
    try { fs.mkdirSync(parentDir, { recursive: true }); } catch (e) {}
  }

  sqliteDb = new DatabaseSync(targetDbPath);
  sqliteDb.exec('PRAGMA foreign_keys = ON;');
  try {
    const tableInfo = sqliteDb.prepare("PRAGMA table_info(tasks);").all();
    const hasIsPinned = tableInfo.some((col) => col.name === 'is_pinned');
    if (!hasIsPinned) {
      sqliteDb.exec("ALTER TABLE tasks ADD COLUMN is_pinned SMALLINT DEFAULT 0;");
      console.log("✅ [DB SQLite] Đã tự động thêm cột 'is_pinned' vào bảng tasks");
    }
  } catch (err) {
    console.warn("⚠️ [DB SQLite] Kiểm tra cột is_pinned:", err.message);
  }
  console.log(`🗄️ [DB] Sử dụng SQLite cục bộ: ${path.basename(targetDbPath)} (Độc lập, không ảnh hưởng Vercel hay Docker)`);
}

// Neon auto migration if needed
if (activeMode === 'neon' && neonClient) {
  neonClient`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_pinned SMALLINT DEFAULT 0;`
    .then(() => console.log("✅ [DB Neon] Đã đảm bảo cột 'is_pinned' sẵn sàng"))
    .catch(err => console.warn("⚠️ [DB Neon] Kiểm tra cột is_pinned:", err.message));
}

export const db = {
  prepare(query) {
    if (activeMode === 'neon') {
      const converted = convertSql(query);
      return {
        async all(...params) {
          const flattened = params.flat();
          return await neonClient.query(converted, flattened);
        },
        async get(...params) {
          const flattened = params.flat();
          const rows = await neonClient.query(converted, flattened);
          return rows && rows.length > 0 ? rows[0] : null;
        },
        async run(...params) {
          const flattened = params.flat();
          const res = await neonClient.query(converted, flattened);
          return { changes: Array.isArray(res) ? res.length : 1 };
        }
      };
    } else {
      const stmt = sqliteDb.prepare(query);
      return {
        async all(...params) {
          const flattened = params.flat();
          return stmt.all(...flattened);
        },
        async get(...params) {
          const flattened = params.flat();
          const res = stmt.get(...flattened);
          return res !== undefined ? res : null;
        },
        async run(...params) {
          const flattened = params.flat();
          const info = stmt.run(...flattened);
          return {
            changes: info && typeof info.changes === 'number' ? info.changes : (info && typeof info.changes === 'bigint' ? Number(info.changes) : 1),
            lastInsertRowid: info?.lastInsertRowid
          };
        }
      };
    }
  },
  async exec(query) {
    if (activeMode === 'neon') {
      return await neonClient.query(query);
    } else {
      return sqliteDb.exec(query);
    }
  }
};

