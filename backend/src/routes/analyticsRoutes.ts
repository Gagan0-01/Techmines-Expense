import { Router } from 'express';
import {
  getCashFlowForecast,
  getFxExposure,
  getBudgetVariance,
} from '../controllers/analyticsController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/cash-flow-forecast', getCashFlowForecast);
router.get('/fx-exposure', getFxExposure);
router.get('/budget-variance', getBudgetVariance);

export default router;
