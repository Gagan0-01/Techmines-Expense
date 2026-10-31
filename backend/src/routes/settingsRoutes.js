import express from 'express';
import { getSettings, updateOpeningBalance } from '../controllers/settingsController.js';

const router = express.Router();

router.get('/', getSettings);
router.put('/opening-balance', updateOpeningBalance);

export default router;
