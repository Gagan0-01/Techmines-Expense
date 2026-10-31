import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { seedDefaults } from './utils/seed.js';

import authRoutes from './routes/authRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import recurringRoutes from './routes/recurringRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import { requireAuth } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    appName: 'TechMines Office Ledger API',
    currency: 'INR',
    timestamp: new Date().toISOString(),
  });
});

// Public Authentication Routes
app.use('/api/auth', authRoutes);

// Protected Ledger Routes (requireAuth)
app.use('/api/transactions', requireAuth, transactionRoutes);
app.use('/api/categories', requireAuth, categoryRoutes);
app.use('/api/recurring', requireAuth, recurringRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);
app.use('/api/reports', requireAuth, reportRoutes);

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found on endpoint: ${req.originalUrl}`,
  });
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('[API Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
});

// Start Server Function
export const startServer = async () => {
  await connectDB();
  await seedDefaults();

  const server = app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 TechMines Office Ledger Backend API`);
    console.log(`📡 Running on port: http://localhost:${PORT}`);
    console.log(`💰 Currency: Indian Rupee (₹ - INR)`);
    console.log(`🔐 Authentication: Enabled with Data Isolation`);
    console.log(`=========================================`);
  });

  return server;
};

// Auto-run if executed directly
if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Fatal initialization error:', err);
    process.exit(1);
  });
}

export default app;
