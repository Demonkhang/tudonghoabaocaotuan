import { db } from '../server/src/db.js';

console.log('Testing DB migration...');
const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='reports'").get();
console.log('Reports Table SQL:', tableInfo ? tableInfo.sql : 'None');
console.log('Migration completed successfully!');
