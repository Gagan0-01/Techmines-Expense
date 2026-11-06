import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { seedDefaults } from './utils/seed.js';
import { getValidatedMaxOpeningBalance } from './config/financial.js';
import { validateJwtConfig } from './config/jwt.js';
import { corsOptions } from './config/cors.js';
import { requestTimeout } from './middleware/timeout.js';
import { generalApiRateLimiter } from './middleware/rateLimiter.js';

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

// Render / Vercel single-proxy trust configuration
// Ensures req.ip reliably extracts client IP from trusted reverse proxy
app.set('trust proxy', 1);

// Application-level request timeout (30 seconds default, prevents socket hanging)
app.use(requestTimeout(30000));

// HTTP Security Headers via Helmet (Phase 4 Clickjacking & Header Hardening)
app.use(
  helmet({
    frameguard: {
      action: 'deny', // X-Frame-Options: DENY (Clickjacking Protection)
    },
    noSniff: true, // X-Content-Type-Options: nosniff
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin', // Referrer-Policy
    },
    dnsPrefetchControl: {
      allow: false,
    },
    hsts:
      process.env.NODE_ENV === 'production'
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        frameAncestors: ["'none'"], // Clickjacking protection in CSP
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: [
          "'self'",
          'https://techmines-expense.vercel.app',
          'https://techmines-expense.onrender.com',
        ],
        fontSrc: ["'self'", 'https:', 'data:'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    hidePoweredBy: true,
  })
);

// Explicit Origin CORS Hardening (Phase 5)
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Request Body Protection: Bounded parsing to prevent memory exhaustion and DoS
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Safe Body Parsing Error Interceptor (catches malformed JSON and oversized payloads)
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Malformed JSON payload in request body.',
    });
  }
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      success: false,
      message: 'Payload Too Large: Request body exceeds permitted limit of 100kb.',
    });
  }
  next(err);
});

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health Check (Excluded from rate limiting)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    appName: 'TechMines Office Ledger API',
    currency: 'INR',
    timestamp: new Date().toISOString(),
  });
});

// General API Rate Limiting applied to all /api endpoints
app.use('/api', generalApiRateLimiter);

// Public Authentication Routes (with specialized strict authRateLimiter)
app.use('/api/auth', authRoutes);

// Protected Ledger Routes (requireAuth)
app.use('/api/transactions', requireAuth, transactionRoutes);
app.use('/api/categories', requireAuth, categoryRoutes);
app.use('/api/recurring', requireAuth, recurringRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);
app.use('/api/reports', requireAuth, reportRoutes);

// Specific REST guidance for /api/expenses (Scanners probe /api/expenses; actual endpoint is /api/transactions?type=expense)
app.all('/api/expenses', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found. To retrieve or filter expense records, use: GET /api/transactions?type=expense',
  });
});

// 404 Handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found on endpoint: ${req.originalUrl}`,
  });
});

// Secure Central Error Handler: never leaks stack traces or credentials in production
app.use((err, req, res, next) => {
  console.error('[API Error]:', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  if (res.headersSent) {
    return next(err);
  }

  const statusCode = typeof err.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : (err.message || 'An unexpected error occurred'),
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
});

// Start Server Function
export const startServer = async () => {
  // Validate security and financial configurations fail-fast on startup
  validateJwtConfig();
  getValidatedMaxOpeningBalance();

  await connectDB();
  await seedDefaults();

  const server = app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 TechMines Office Ledger Backend API`);
    console.log(`📡 Running on port: http://localhost:${PORT}`);
    console.log(`💰 Currency: Indian Rupee (₹ - INR)`);
    console.log(`🔐 Authentication: Enabled with Data Isolation`);
    console.log(`🛡️ Rate Limiting & DoS Protection: Active`);
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
