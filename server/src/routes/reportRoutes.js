const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// GET /api/sync
router.get('/sync', reportController.syncData);
router.post('/sync', reportController.syncData);

// POST /api/generate-word
router.post('/generate-word', reportController.generateWord);

// POST /api/generate-pdf
router.post('/generate-pdf', reportController.generatePdf);

module.exports = router;
