import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

// Import controllers
import * as reportController from './controllers/reportController.js';
import * as standaloneTaskController from './controllers/standaloneTaskController.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads serving for proof of completion files (fallback for local files)
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (e) {}
}
app.use('/uploads', express.static(uploadsDir));

// Multer memory storage for serverless / Cloudinary streaming
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// File Upload Endpoint
app.post('/api/upload-evidence', upload.single('file'), reportController.uploadEvidence);

// API Endpoints - Auth & Departments
app.post('/api/auth/login', reportController.login);
app.get('/api/departments', reportController.getDepartments);

// API Endpoints - User Profile
app.put('/api/user/profile', reportController.updateUserProfile);

// API Endpoints - Admin Management
app.get('/api/admin/accounts', reportController.getAccounts);
app.post('/api/admin/accounts', reportController.createAccount);
app.post('/api/admin/accounts/bulk-import', reportController.bulkImportAccounts);
app.put('/api/admin/accounts/:id', reportController.updateAccount);
app.post('/api/admin/accounts/:id/toggle-status', reportController.toggleAccountStatus);
app.delete('/api/admin/accounts/:id', reportController.deleteAccount);
app.post('/api/admin/departments', reportController.createDepartment);
app.get('/api/admin/roles', reportController.getRoles);
app.post('/api/admin/roles', reportController.createRole);
app.delete('/api/admin/tasks/clear-all', reportController.clearAllTasks);

// API Endpoints - Standalone Task Pool (Kho Nhiệm Vụ Chung Phân Cấp)
app.get('/api/standalone-tasks', standaloneTaskController.getTasks);
app.get('/api/standalone-tasks/accounts-by-position', standaloneTaskController.getAccountsByPosition);
app.post('/api/standalone-tasks', standaloneTaskController.createTask);
app.post('/api/standalone-tasks/assign', standaloneTaskController.assignTask);
app.post('/api/standalone-tasks/stage-assignee', standaloneTaskController.stageAssignee);
app.post('/api/standalone-tasks/unstage-assignee', standaloneTaskController.unstageAssignee);
app.post('/api/standalone-tasks/request-extension', standaloneTaskController.requestExtension);
app.post('/api/standalone-tasks/approve-extension', standaloneTaskController.approveExtension);
app.post('/api/standalone-tasks/dismiss-pool', standaloneTaskController.dismissPoolTask);
app.delete('/api/standalone-tasks/:id', standaloneTaskController.deleteTask);
app.post('/api/standalone-tasks/publish-plan', standaloneTaskController.publishPlan);
app.get('/api/standalone-tasks/synced-directive', standaloneTaskController.getSyncedDirectiveTasks);
app.post('/api/standalone-tasks/batch-import', standaloneTaskController.batchImportTasks);
app.post('/api/standalone-tasks/bulk-stage-assignee', standaloneTaskController.bulkStageAssignee);
app.post('/api/standalone-tasks/bulk-delete', standaloneTaskController.bulkDeleteTasks);
app.post('/api/standalone-tasks/complete', standaloneTaskController.completeTask);

// API Endpoints - Reports & History & Carry-Over Core
app.get('/api/reports/history', reportController.getReportHistory);
app.get('/api/reports/detail', reportController.getReportDetail);
app.get('/api/reports/candidate-tasks', reportController.getCandidateTasks);
app.post('/api/reports/save', reportController.saveReport);
app.post('/api/reports/carry-over', reportController.carryOverNextWeek);

// API Endpoints - Consolidated Office Reports (Nghị định 30)
app.get('/api/reports/consolidated/detail', reportController.getConsolidatedReportDetail);
app.post('/api/reports/consolidated/save', reportController.saveConsolidatedReport);
app.post('/api/generate-word-consolidated', reportController.generateConsolidatedWord);

// API Endpoints - Report Sharing & Permissions
app.post('/api/reports/share', reportController.shareReport);
app.get('/api/reports/shares', reportController.getReportShares);
app.delete('/api/reports/shares/:id', reportController.revokeReportShare);

// API Endpoints - Notifications System
app.get('/api/notifications', reportController.getNotifications);
app.post('/api/notifications/mark-read', reportController.markNotificationRead);

// API Endpoints - Digital Signature & Approval Workflow
app.post('/api/user/signature-pin', reportController.updateSignatureAndPin);
app.post('/api/reports/submit-approval', reportController.submitReportForApproval);
app.get('/api/reports/pending-approval', reportController.getPendingReports);
app.post('/api/reports/sign', reportController.signReportWithPin);
app.get('/api/reports/signatures', reportController.getReportSignatures);
app.post('/api/reports/finalize', reportController.finalizeReport);

// Sync & Export Endpoints
app.get('/api/sync', reportController.syncData);
app.post('/api/sync', reportController.syncData);
app.post('/api/generate-word', reportController.generateWord);
app.post('/api/generate-pdf', reportController.generatePdf);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Fullstack Weekly Report System',
    timestamp: new Date().toISOString()
  });
});

export default app;
