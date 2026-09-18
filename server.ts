import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';

// Import controllers & db
import * as reportController from './server/src/controllers/reportController.js';

// Ensure uploads directory exists for Docker volume persistence
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniquePrefix = Date.now() + '_' + Math.round(Math.random() * 1e9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${uniquePrefix}_${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Static uploads serving for proof of completion files
  app.use('/uploads', express.static(uploadsDir));

  // File Upload Endpoint
  app.post('/api/upload-evidence', upload.single('file'), reportController.uploadEvidence);

  // API Endpoints - Auth & Departments
  app.post('/api/auth/login', reportController.login);
  app.get('/api/departments', reportController.getDepartments);

  // API Endpoints - Admin Management
  app.get('/api/admin/accounts', reportController.getAccounts);
  app.post('/api/admin/accounts', reportController.createAccount);
  app.delete('/api/admin/accounts/:id', reportController.deleteAccount);
  app.post('/api/admin/departments', reportController.createDepartment);

  // API Endpoints - Reports & History & Carry-Over Core
  app.get('/api/reports/history', reportController.getReportHistory);
  app.get('/api/reports/detail', reportController.getReportDetail);
  app.get('/api/reports/candidate-tasks', reportController.getCandidateTasks);
  app.post('/api/reports/save', reportController.saveReport);
  app.post('/api/reports/carry-over', reportController.carryOverNextWeek);

  // API Endpoints - Report Sharing & Permissions
  app.post('/api/reports/share', reportController.shareReport);
  app.get('/api/reports/shares', reportController.getReportShares);
  app.delete('/api/reports/shares/:id', reportController.revokeReportShare);

  // API Endpoints - Notifications System
  app.get('/api/notifications', reportController.getNotifications);
  app.post('/api/notifications/mark-read', reportController.markNotificationRead);

  // Sync & Export Endpoints
  app.get('/api/sync', reportController.syncData);
  app.post('/api/sync', reportController.syncData);
  app.post('/api/generate-word', reportController.generateWord);
  app.post('/api/generate-pdf', reportController.generatePdf);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Fullstack Weekly Report System' });
  });

  // Vite Middleware in Development mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
