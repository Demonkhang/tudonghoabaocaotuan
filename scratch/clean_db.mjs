import { db } from '../server/src/db.js';

console.log('🧹 Đang tiến hành làm sạch dữ liệu trong CSDL...');

db.exec('PRAGMA foreign_keys = OFF;');
db.exec('DELETE FROM tasks;');
db.exec('DELETE FROM reports;');
db.exec('DELETE FROM doc_inspection_stats;');
db.exec('DELETE FROM consolidated_report_meta;');
db.exec('DELETE FROM report_shares;');
db.exec('DELETE FROM notifications;');
db.exec('PRAGMA foreign_keys = ON;');

console.log('✅ Đã xóa toàn bộ báo cáo và nhiệm vụ trong CSDL!');
console.log('📊 Số lượng báo cáo hiện tại:', db.prepare('SELECT COUNT(*) as c FROM reports').get().c);
console.log('📊 Số lượng nhiệm vụ hiện tại:', db.prepare('SELECT COUNT(*) as c FROM tasks').get().c);
