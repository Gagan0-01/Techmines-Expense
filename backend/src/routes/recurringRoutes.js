import express from 'express';
import {
  getRecurringSchedules,
  createRecurringSchedule,
  updateRecurringSchedule,
  markOccurrenceCompleted,
  deleteRecurringSchedule,
} from '../controllers/recurringController.js';

const router = express.Router();

router.get('/', getRecurringSchedules);
router.post('/', createRecurringSchedule);
router.put('/:id', updateRecurringSchedule);
router.post('/:id/complete', markOccurrenceCompleted);
router.delete('/:id', deleteRecurringSchedule);

export default router;
