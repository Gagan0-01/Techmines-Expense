import express from 'express';
import {
  register,
  login,
  getMe,
  logout,
  updateUserRole,
  listUsers,
} from '../controllers/authController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.get('/me', requireAuth, getMe);
router.post('/logout', requireAuth, logout);

// Administrative role management
router.get('/users', requireAuth, requireRole('admin'), listUsers);
router.put('/users/:id/role', requireAuth, requireRole('admin'), updateUserRole);

export default router;
