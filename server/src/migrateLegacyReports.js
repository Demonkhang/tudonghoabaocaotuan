import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(currentDir, '../data/weekly_report.db');
const db = new DatabaseSync(dbPath);

console.log('=== Starting DB Migration for Consolidated Reports ===');

const legacyReports = db.prepare("SELECT * FROM reports WHERE id LIKE 'rpt_consolidated_office_w%'").all();
console.log(`Legacy reports found: ${legacyReports.length}`);

db.exec('PRAGMA foreign_keys = OFF;');
db.exec('BEGIN IMMEDIATE;');
try {
  for (const r of legacyReports) {
    const newId = `rpt_consolidated_office_${r.account_id}_w${r.week_number}_${r.year}`;
    console.log(`Migrating ${r.id} -> ${newId} (Owner account: ${r.account_id})`);
    
    // Check if newId already exists
    const existing = db.prepare('SELECT id FROM reports WHERE id = ?').get(newId);
    if (existing) {
      console.log(`Target ID ${newId} already exists, merging tasks...`);
      db.prepare('UPDATE tasks SET report_id = ? WHERE report_id = ?').run(newId, r.id);
      db.prepare('DELETE FROM reports WHERE id = ?').run(r.id);
    } else {
      db.prepare('UPDATE reports SET id = ? WHERE id = ?').run(newId, r.id);
      db.prepare('UPDATE tasks SET report_id = ? WHERE report_id = ?').run(newId, r.id);
      db.prepare('UPDATE doc_inspection_stats SET report_id = ? WHERE report_id = ?').run(newId, r.id);
      db.prepare('UPDATE consolidated_report_meta SET report_id = ? WHERE report_id = ?').run(newId, r.id);
      db.prepare('UPDATE report_shares SET report_id = ? WHERE report_id = ?').run(newId, r.id);
    }
  }
  db.exec('COMMIT;');
  console.log('=== Migration Completed Successfully! ===');
} catch (e) {
  db.exec('ROLLBACK;');
  console.error('Migration failed:', e);
} finally {
  db.exec('PRAGMA foreign_keys = ON;');
}
