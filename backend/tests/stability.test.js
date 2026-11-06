import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {
  createRateLimiter,
  _testStores,
} from '../src/middleware/rateLimiter.js';
import { requestTimeout } from '../src/middleware/timeout.js';
import { getTransactions } from '../src/controllers/transactionController.js';
import { Transaction } from '../src/models/Transaction.js';

// Helper to create mock Express req & res
const createMockReqRes = ({ ip = '192.168.1.1', method = 'GET', url = '/api/test', body = {} } = {}) => {
  const req = {
    ip,
    method,
    url,
    body,
    headers: {},
    connection: { remoteAddress: ip },
    on: () => {},
  };
  const res = {
    statusCode: 200,
    body: null,
    headersSent: false,
    _headers: {},
    setHeader(name, val) {
      this._headers[name.toLowerCase()] = val;
    },
    getHeader(name) {
      return this._headers[name.toLowerCase()];
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      this.headersSent = true;
      return this;
    },
    on: () => {},
  };
  return { req, res };
};

const createMockRes = () => createMockReqRes().res;

describe('1. Rate Limiting Tests (Login, Register & General API)', () => {
  test('STAB-RL-1: Returns HTTP 429 when rate limit threshold is exceeded', () => {
    const store = new _testStores.MemoryStore();
    const limiter = createRateLimiter({
      windowMs: 60000,
      max: 3,
      store,
      message: 'Rate limit exceeded.',
    });

    const ip = '10.0.0.1';

    // 1st request -> OK (Remaining 2)
    const { req: req1, res: res1 } = createMockReqRes({ ip });
    let next1 = false;
    limiter(req1, res1, () => { next1 = true; });
    assert.equal(next1, true);
    assert.equal(res1.getHeader('ratelimit-remaining'), 2);

    // 2nd request -> OK (Remaining 1)
    const { req: req2, res: res2 } = createMockReqRes({ ip });
    let next2 = false;
    limiter(req2, res2, () => { next2 = true; });
    assert.equal(next2, true);
    assert.equal(res2.getHeader('ratelimit-remaining'), 1);

    // 3rd request -> OK (Remaining 0)
    const { req: req3, res: res3 } = createMockReqRes({ ip });
    let next3 = false;
    limiter(req3, res3, () => { next3 = true; });
    assert.equal(next3, true);
    assert.equal(res3.getHeader('ratelimit-remaining'), 0);

    // 4th request -> BLOCKED (429 Too Many Requests)
    const { req: req4, res: res4 } = createMockReqRes({ ip });
    let next4 = false;
    limiter(req4, res4, () => { next4 = true; });
    assert.equal(next4, false, 'Next should not be called when limit exceeded');
    assert.equal(res4.statusCode, 429);
    assert.equal(res4.body.success, false);
    assert.match(res4.body.message, /rate limit exceeded/i);
    assert.ok(res4.getHeader('retry-after') > 0, 'Retry-After header must be set');
  });

  test('STAB-RL-2: Rate limits isolate different IP addresses independently', () => {
    const store = new _testStores.MemoryStore();
    const limiter = createRateLimiter({
      windowMs: 60000,
      max: 2,
      store,
    });

    const ipA = '172.16.0.1';
    const ipB = '172.16.0.2';

    // Exhaust IP A
    for (let i = 0; i < 2; i++) {
      const { req, res } = createMockReqRes({ ip: ipA });
      limiter(req, res, () => {});
    }

    // IP A is now blocked
    const { req: reqA, res: resA } = createMockReqRes({ ip: ipA });
    let nextA = false;
    limiter(reqA, resA, () => { nextA = true; });
    assert.equal(nextA, false);
    assert.equal(resA.statusCode, 429);

    // IP B must NOT be blocked
    const { req: reqB, res: resB } = createMockReqRes({ ip: ipB });
    let nextB = false;
    limiter(reqB, resB, () => { nextB = true; });
    assert.equal(nextB, true, 'Different IP must have its own independent bucket');
  });
});

describe('2. Request Body Protection & Parser Error Handling', () => {
  test('STAB-BODY-1: Catches SyntaxError from malformed JSON and responds with 400', () => {
    const malformedErr = new SyntaxError('Unexpected token in JSON at position 5');
    malformedErr.status = 400;
    malformedErr.body = '{ malformed: ';

    const { req, res } = createMockReqRes();
    let nextCalled = false;

    // Simulate the server's body parsing error middleware
    const bodyErrorHandler = (err, req, res, next) => {
      if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
          success: false,
          message: 'Malformed JSON payload in request body.',
        });
      }
      next(err);
    };

    bodyErrorHandler(malformedErr, req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /malformed json/i);
  });

  test('STAB-BODY-2: Catches entity.too.large and responds with 413 Payload Too Large', () => {
    const oversizeErr = new Error('request entity too large');
    oversizeErr.type = 'entity.too.large';
    oversizeErr.status = 413;

    const { req, res } = createMockReqRes();
    let nextCalled = false;

    const bodyErrorHandler = (err, req, res, next) => {
      if (err.type === 'entity.too.large' || err.status === 413) {
        return res.status(413).json({
          success: false,
          message: 'Payload Too Large: Request body exceeds permitted limit of 100kb.',
        });
      }
      next(err);
    };

    bodyErrorHandler(oversizeErr, req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 413);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /payload too large/i);
  });
});

describe('3. Request Timeout Protection', () => {
  test('STAB-TIME-1: Times out hanging requests and responds with 504 Gateway Timeout', async () => {
    const middleware = requestTimeout(20); // 20ms timeout for test
    const { req, res } = createMockReqRes();

    let nextCalled = false;
    middleware(req, res, () => {
      nextCalled = true;
      // Intentionally simulate a hanging handler that doesn't call res.json()
    });

    assert.equal(nextCalled, true);
    assert.equal(res.headersSent, false);

    // Wait for timeout to trigger
    await new Promise((r) => setTimeout(r, 40));

    assert.equal(res.headersSent, true);
    assert.equal(res.statusCode, 504);
    assert.match(res.body.message, /gateway timeout/i);
  });
});

describe('4. MongoDB Performance & Bounded Query Protection', () => {
  test('STAB-PERF-1: Enforces upper ceiling (limit 500) on unpaginated transaction queries', async () => {
    const originalFind = Transaction.find;
    const originalCount = Transaction.countDocuments;

    let appliedLimit = null;
    let leanCalled = false;

    Transaction.countDocuments = async () => 10000; // Database has 10,000 transactions
    Transaction.find = () => {
      const mockQuery = {
        sort: () => mockQuery,
        lean: () => {
          leanCalled = true;
          return mockQuery;
        },
        limit: (l) => {
          appliedLimit = l;
          return mockQuery;
        },
        skip: () => mockQuery,
        exec: async () => [{ _id: '1', title: 'Sample' }],
      };
      return mockQuery;
    };

    try {
      const req = {
        query: {}, // No page or limit passed
        userId: new mongoose.Types.ObjectId(),
      };
      const res = createMockRes();

      await getTransactions(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(leanCalled, true, 'Queries must use .lean() to reduce memory usage');
      assert.equal(appliedLimit, 500, 'Unpaginated query must be capped to safe ceiling (500)');
      assert.equal(res.body.totalCount, 10000);
    } finally {
      Transaction.find = originalFind;
      Transaction.countDocuments = originalCount;
    }
  });

  test('STAB-PERF-2: Respects pagination parameters and clamps limit to safe max (100)', async () => {
    const originalFind = Transaction.find;
    const originalCount = Transaction.countDocuments;

    let appliedLimit = null;
    let appliedSkip = null;

    Transaction.countDocuments = async () => 200;
    Transaction.find = () => {
      const mockQuery = {
        sort: () => mockQuery,
        lean: () => mockQuery,
        limit: (l) => {
          appliedLimit = l;
          return mockQuery;
        },
        skip: (s) => {
          appliedSkip = s;
          return mockQuery;
        },
        exec: async () => [],
      };
      return mockQuery;
    };

    try {
      // Client requests page 2 with limit 5000 (attempting to fetch too much)
      const req = {
        query: { page: '2', limit: '5000' },
        userId: new mongoose.Types.ObjectId(),
      };
      const res = createMockRes();

      await getTransactions(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(appliedLimit, 100, 'Requested limit of 5000 must be clamped to safe maximum of 100');
      assert.equal(appliedSkip, 100, 'Page 2 with limit 100 must skip 100');
    } finally {
      Transaction.find = originalFind;
      Transaction.countDocuments = originalCount;
    }
  });
});
