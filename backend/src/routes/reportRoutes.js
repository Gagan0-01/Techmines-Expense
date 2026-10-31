import express from 'express';
import {
  getDailyReport,
  getMonthlyComparison,
  getExportData,
  getDateRangeBreakdown,
} from '../controllers/reportController.js';

const router = express.Router();

router.get('/daily', getDailyReport);
router.get('/daily-breakdown', getDateRangeBreakdown);
router.get('/monthly-comparison', getMonthlyComparison);
router.get('/export', getExportData);

export default router;
