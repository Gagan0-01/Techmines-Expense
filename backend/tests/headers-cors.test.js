import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import helmet from 'helmet';
import { corsOptions, ALLOWED_ORIGINS } from '../src/config/cors.js';

// Helper to create mock Express req & res
const createMockReqRes = ({ origin, method = 'GET', headers = {} } = {}) => {
  const reqHeaders = { ...headers };
  if (origin) {
    reqHeaders.origin = origin;
  }

  const req = {
    method,
    headers: reqHeaders,
    url: '/api/health',
    ip: '127.0.0.1',
    get(name) {
      return this.headers[name.toLowerCase()];
    },
  };

  const res = {
    statusCode: 200,
    headersSent: false,
    _headers: {},
    _onEnd: null,
    setHeader(name, val) {
      this._headers[name.toLowerCase()] = val;
    },
    getHeader(name) {
      return this._headers[name.toLowerCase()];
    },
    removeHeader(name) {
      delete this._headers[name.toLowerCase()];
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    end() {
      this.headersSent = true;
      if (this._onEnd) this._onEnd();
    },
    json(data) {
      this.body = data;
      this.headersSent = true;
      if (this._onEnd) this._onEnd();
    },
  };

  return { req, res };
};

// Configured Helmet middleware identical to server.js
const helmetMiddleware = helmet({
  frameguard: {
    action: 'deny',
  },
  noSniff: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  dnsPrefetchControl: {
    allow: false,
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      frameAncestors: ["'none'"],
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
    },
  },
  hidePoweredBy: true,
});

const corsMiddleware = cors(corsOptions);

describe('1. HTTP Security Headers & Clickjacking Protection', () => {
  test('HDR-1: X-Frame-Options is set to DENY (Clickjacking Protection)', async () => {
    const { req, res } = createMockReqRes();
    let nextCalled = false;

    await new Promise((resolve) => {
      helmetMiddleware(req, res, () => {
        nextCalled = true;
        resolve();
      });
    });

    assert.equal(nextCalled, true);
    assert.equal(res.getHeader('x-frame-options'), 'DENY');
  });

  test('HDR-2: Content-Security-Policy contains frame-ancestors none', async () => {
    const { req, res } = createMockReqRes();

    await new Promise((resolve) => {
      helmetMiddleware(req, res, resolve);
    });

    const csp = res.getHeader('content-security-policy');
    assert.ok(csp, 'CSP must be present');
    assert.match(csp, /frame-ancestors 'none'/i, 'CSP must enforce frame-ancestors none');
  });

  test('HDR-3: X-Content-Type-Options is nosniff (MIME-Sniffing Protection)', async () => {
    const { req, res } = createMockReqRes();

    await new Promise((resolve) => {
      helmetMiddleware(req, res, resolve);
    });

    assert.equal(res.getHeader('x-content-type-options'), 'nosniff');
  });

  test('HDR-4: Referrer-Policy is strict-origin-when-cross-origin', async () => {
    const { req, res } = createMockReqRes();

    await new Promise((resolve) => {
      helmetMiddleware(req, res, resolve);
    });

    assert.equal(res.getHeader('referrer-policy'), 'strict-origin-when-cross-origin');
  });

  test('HDR-5: Strict-Transport-Security (HSTS) is present with max-age', async () => {
    const { req, res } = createMockReqRes();

    await new Promise((resolve) => {
      helmetMiddleware(req, res, resolve);
    });

    const hsts = res.getHeader('strict-transport-security');
    assert.ok(hsts, 'HSTS header must be present');
    assert.match(hsts, /max-age=31536000/i);
    assert.match(hsts, /includeSubDomains/i);
  });

  test('HDR-6: X-DNS-Prefetch-Control is off', async () => {
    const { req, res } = createMockReqRes();

    await new Promise((resolve) => {
      helmetMiddleware(req, res, resolve);
    });

    assert.equal(res.getHeader('x-dns-prefetch-control'), 'off');
  });
});

describe('2. CORS Hardening & Origin Verification', () => {
  test('CORS-1: Allowed frontend origin receives Access-Control-Allow-Origin & Credentials', async () => {
    const allowedOrigin = 'https://techmines-expense.vercel.app';
    const { req, res } = createMockReqRes({ origin: allowedOrigin });

    await new Promise((resolve) => {
      corsMiddleware(req, res, resolve);
    });

    assert.equal(res.getHeader('access-control-allow-origin'), allowedOrigin);
    assert.equal(res.getHeader('access-control-allow-credentials'), 'true');
  });

  test('CORS-2: Unauthorized origin does NOT receive Access-Control-Allow-Origin header', async () => {
    const unauthorizedOrigin = 'https://evil-phishing-attacker.com';
    const { req, res } = createMockReqRes({ origin: unauthorizedOrigin });

    await new Promise((resolve) => {
      corsMiddleware(req, res, resolve);
    });

    const header = res.getHeader('access-control-allow-origin');
    assert.equal(header, undefined, 'Access-Control-Allow-Origin must be omitted for unauthorized origins');
  });

  test('CORS-3: OPTIONS preflight requests return HTTP 204 with methods and headers', async () => {
    const allowedOrigin = 'https://techmines-expense.vercel.app';
    const { req, res } = createMockReqRes({
      origin: allowedOrigin,
      method: 'OPTIONS',
      headers: {
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'Content-Type, Authorization',
      },
    });

    await new Promise((resolve) => {
      res._onEnd = resolve;
      corsMiddleware(req, res, resolve);
    });

    assert.equal(res.statusCode, 204);
    assert.equal(res.getHeader('access-control-allow-origin'), allowedOrigin);
    assert.equal(res.getHeader('access-control-allow-credentials'), 'true');

    const methods = res.getHeader('access-control-allow-methods');
    assert.ok(methods);
    assert.match(methods, /POST/i);
    assert.match(methods, /PUT/i);
    assert.match(methods, /DELETE/i);

    const headers = res.getHeader('access-control-allow-headers');
    assert.ok(headers);
    assert.match(headers, /Authorization/i);
    assert.match(headers, /Content-Type/i);
  });

  test('CORS-4: Non-browser requests without Origin (e.g. server-to-server) pass through cleanly', async () => {
    const { req, res } = createMockReqRes({ origin: null });
    let nextCalled = false;

    await new Promise((resolve) => {
      corsMiddleware(req, res, () => {
        nextCalled = true;
        resolve();
      });
    });

    assert.equal(nextCalled, true);
  });

  test('CORS-5: Allowlist contains production and local development origins', () => {
    assert.ok(ALLOWED_ORIGINS.includes('https://techmines-expense.vercel.app'));
    assert.ok(ALLOWED_ORIGINS.includes('http://localhost:3000'));
    assert.ok(ALLOWED_ORIGINS.includes('http://localhost:5173'));
  });
});

describe('3. Vercel Frontend Configuration Verification', () => {
  test('VERCEL-1: vercel.json includes complete security headers and preserves rewrites', () => {
    const vercelConfigPath = path.resolve(process.cwd(), '../frontend/vercel.json');
    assert.ok(fs.existsSync(vercelConfigPath), 'frontend/vercel.json must exist');

    const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));

    // Verify headers block
    assert.ok(config.headers, 'Headers block must be defined');
    const rootHeaders = config.headers.find((h) => h.source === '/(.*)');
    assert.ok(rootHeaders, 'Must define headers for /(.*)');

    const headerMap = {};
    for (const item of rootHeaders.headers) {
      headerMap[item.key.toLowerCase()] = item.value;
    }

    assert.equal(headerMap['x-frame-options'], 'DENY');
    assert.equal(headerMap['x-content-type-options'], 'nosniff');
    assert.equal(headerMap['referrer-policy'], 'strict-origin-when-cross-origin');
    assert.match(headerMap['content-security-policy'], /frame-ancestors 'none'/i);
    assert.match(headerMap['content-security-policy'], /fonts\.googleapis\.com/i);
    assert.match(headerMap['strict-transport-security'], /max-age=/i);

    // Verify rewrites block is completely intact
    assert.ok(config.rewrites, 'Rewrites block must be preserved');
    const apiRewrite = config.rewrites.find((r) => r.source === '/api/:path*');
    assert.ok(apiRewrite, 'API rewrite rule must be present');
    assert.equal(apiRewrite.destination, 'https://techmines-expense.onrender.com/api/:path*');
  });
});
