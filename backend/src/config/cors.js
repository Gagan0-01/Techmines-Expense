import dotenv from 'dotenv';
dotenv.config();

/**
 * Explicit Origin Allowlist
 * Only verified application origins are permitted to access the API.
 */
export const ALLOWED_ORIGINS = Object.freeze([
  'https://techmines-expense.vercel.app',
  ...(process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',').map((o) => o.trim()) : []),
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL.trim()] : []),
  // Local development origins
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
]);

export const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. server-to-server, curl, Postman, health checks)
    if (!origin) {
      return callback(null, true);
    }

    // Normalize origin (remove trailing slash)
    const cleanOrigin = origin.replace(/\/+$/, '');

    if (ALLOWED_ORIGINS.includes(cleanOrigin)) {
      return callback(null, cleanOrigin);
    }

    // Disallow unauthorized origins (omits Access-Control-Allow-Origin header)
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  maxAge: 86400, // Cache preflight response for 24 hours
  optionsSuccessStatus: 204, // Clean 204 No Content for preflight OPTIONS
};

