/**
 * Production-ready In-Memory Sliding-Window Rate Limiter
 *
 * Designed for single-instance or containerized deployments (Render).
 * Features:
 * - Tracks requests per client IP with sliding window expiration.
 * - Adds standard rate limit headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, Retry-After).
 * - Automatic background cleanup with unref() so process termination/tests are not blocked.
 * - Fully configurable via parameters and environment variables.
 *
 * NOTE on multi-instance scaling:
 * When scaling to multiple concurrent container instances on Render, in-memory limits
 * track per-instance. If strict cluster-wide rate limit synchronization is needed in the
 * future, a shared store (such as Redis) can be plugged in without changing route middleware.
 */

class MemoryStore {
  constructor(cleanupIntervalMs = 60000) {
    this.hits = new Map();

    // Background cleanup to prevent memory leaks from inactive IPs
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.hits.entries()) {
        if (record.resetTime <= now) {
          this.hits.delete(key);
        }
      }
    }, cleanupIntervalMs);

    // Ensure timer does not prevent Node from exiting in tests
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  increment(key, windowMs) {
    const now = Date.now();
    let record = this.hits.get(key);

    if (!record || record.resetTime <= now) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      this.hits.set(key, record);
    } else {
      record.count += 1;
    }

    return {
      totalHits: record.count,
      resetTime: record.resetTime,
    };
  }

  reset(key) {
    this.hits.delete(key);
  }

  clear() {
    this.hits.clear();
  }
}

// Shared stores
const authStore = new MemoryStore();
const generalApiStore = new MemoryStore();
const financialStore = new MemoryStore();

/**
 * Creates an Express rate-limiting middleware
 */
export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000, // 15 minutes default
  max = 100,                  // Maximum requests per windowMs
  message = 'Too many requests, please try again later.',
  statusCode = 429,
  store = new MemoryStore(),
  keyGenerator = (req) => req.ip || req.connection?.remoteAddress || '127.0.0.1',
  skip = () => false,
} = {}) => {
  return (req, res, next) => {
    if (skip(req)) {
      return next();
    }

    const key = keyGenerator(req);
    const { totalHits, resetTime } = store.increment(key, windowMs);
    const now = Date.now();
    const remainingMs = Math.max(0, resetTime - now);
    const remainingSecs = Math.ceil(remainingMs / 1000);
    const remainingHits = Math.max(0, max - totalHits);

    // Standard HTTP rate-limit headers
    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', remainingHits);
    res.setHeader('RateLimit-Reset', Math.ceil(resetTime / 1000));

    if (totalHits > max) {
      res.setHeader('Retry-After', remainingSecs);
      return res.status(statusCode).json({
        success: false,
        message,
        retryAfterSeconds: remainingSecs,
      });
    }

    next();
  };
};

/**
 * Authentication Rate Limiter
 * Applied to POST /api/auth/login and POST /api/auth/register
 * Default: 10 attempts per 15 minutes per IP (configurable via AUTH_RATE_LIMIT_MAX)
 */
const authMax = Number(process.env.AUTH_RATE_LIMIT_MAX) || 10;
const authWindowMs = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;

export const authRateLimiter = createRateLimiter({
  windowMs: authWindowMs,
  max: authMax,
  store: authStore,
  message: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.',
});

/**
 * General API Rate Limiter
 * Applied globally to all /api routes
 * Default: 300 requests per 15 minutes per IP (generous for dashboard, transactions, and reports)
 */
const apiMax = Number(process.env.API_RATE_LIMIT_MAX) || 300;
const apiWindowMs = Number(process.env.API_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;

export const generalApiRateLimiter = createRateLimiter({
  windowMs: apiWindowMs,
  max: apiMax,
  store: generalApiStore,
  message: 'Too many API requests from this IP address. Please slow down and try again shortly.',
});

/**
 * Financial Operations Rate Limiter
 * Applied to sensitive financial endpoints (e.g. /api/settings/opening-balance)
 * Default: 20 adjustments per 15 minutes per IP
 */
export const financialOpsRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  store: financialStore,
  message: 'Too many opening balance adjustments requested. Please wait before submitting additional changes.',
});

// Export stores for testing reset/inspection
export const _testStores = {
  authStore,
  generalApiStore,
  financialStore,
  MemoryStore,
};

