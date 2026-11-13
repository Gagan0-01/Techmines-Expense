import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

// Test isolation: set test JWT secret for test suite execution
//  'test_suite_jwt_secret_for_automated_testing_2026';
import {
  toPaise,
  fromPaise,
  isCurrencySupported,
  MAX_OPENING_BALANCE,
  getValidatedMaxOpeningBalance,
} from '../src/config/financial.js';
import { User } from '../src/models/User.js';
import { Settings } from '../src/models/Settings.js';
import { BalanceAuditLog } from '../src/models/BalanceAuditLog.js';
import { PendingBalanceChange } from '../src/models/PendingBalanceChange.js';
import {
  updateOpeningBalance,
  approvePendingBalanceChange,
  rejectPendingBalanceChange,
  getSettings,
} from '../src/controllers/settingsController.js';
import {
  register,
  login,
  updateUserRole,
  getMe,
  listUsers,
} from '../src/controllers/authController.js';
import { requireAuth, requireRole } from '../src/middleware/auth.js';
import { signToken, verifyToken, getJwtSecret, validateJwtConfig } from '../src/config/jwt.js';
import {
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getTransactions,
  createTransaction,
} from '../src/controllers/transactionController.js';
import { Transaction } from '../src/models/Transaction.js';
import jwt from 'jsonwebtoken';

// Helper to create mock Express response
const createMockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
};

describe('1. Financial Configuration & Precision Tests', () => {
  test('Financial precision: integer paise avoids floating-point drift', () => {
    const val = 12345.67;
    const paise = toPaise(val);
    assert.equal(paise, 1234567);
    assert.equal(fromPaise(paise), 12345.67);
  });

  test('Financial validation: rejects negative, non-numeric, or infinite values', () => {
    assert.throws(() => toPaise(-100), /cannot be negative/i);
    assert.throws(() => toPaise('abc'), /finite number/i);
    assert.throws(() => toPaise(Infinity), /finite number/i);
    assert.throws(() => toPaise(NaN), /finite number/i);
  });

  test('Currency validation: enforces ISO-4217 allowlist', () => {
    assert.equal(isCurrencySupported('INR'), true);
    assert.equal(isCurrencySupported('USD'), true);
    assert.equal(isCurrencySupported('EUR'), true);
    assert.equal(isCurrencySupported('FAKECOIN'), false);
    assert.equal(isCurrencySupported(''), false);
    assert.equal(isCurrencySupported(null), false);
  });

  test('Startup validation: MAX_OPENING_BALANCE must be a positive finite number', () => {
    assert.ok(MAX_OPENING_BALANCE > 0);
    assert.equal(typeof MAX_OPENING_BALANCE, 'number');
  });
});

describe('2. User Role Security & Privilege Escalation Protection', () => {
  test('SEC-REG-1: Registration strictly enforces role="member" and isOwner=false', async () => {
    const originalCreate = User.create;
    const originalSettingsCreate = Settings.create;
    const originalFindOne = User.findOne;

    let createdUserArgs = null;
    User.findOne = async () => null; // No existing user
    User.create = async (args) => {
      createdUserArgs = args;
      return {
        _id: new mongoose.Types.ObjectId(),
        name: args.name,
        email: args.email,
        role: args.role,
        isOwner: args.isOwner,
      };
    };
    Settings.create = async () => ({});

    try {
      const req = {
        body: {
          name: 'Attacker',
          email: 'attacker@techmines.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          role: 'admin', // Attack payload
          isOwner: true, // Attack payload
        },
      };
      const res = createMockRes();

      await register(req, res);

      assert.equal(res.statusCode, 201);
      assert.equal(createdUserArgs.role, 'member', 'Role in DB must be member');
      assert.equal(createdUserArgs.isOwner, false, 'isOwner in DB must be false');
      assert.equal(res.body.user.role, 'member');
      assert.equal(res.body.user.isOwner, false);
    } finally {
      User.create = originalCreate;
      Settings.create = originalSettingsCreate;
      User.findOne = originalFindOne;
    }
  });

  test('SEC-RBAC-1: requireRole middleware rejects unauthorized roles with 403', () => {
    const middleware = requireRole('admin', 'finance_admin');

    const reqMember = { user: { role: 'member', isOwner: false } };
    const res = createMockRes();
    let nextCalled = false;

    middleware(reqMember, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
    assert.match(res.body.message, /forbidden/i);

    // Authorized admin passes
    const reqAdmin = { user: { role: 'admin', isOwner: false } };
    let adminNextCalled = false;
    middleware(reqAdmin, res, () => {
      adminNextCalled = true;
    });
    assert.equal(adminNextCalled, true);
  });

  test('SEC-OWNER-1: Designated owner is protected from role alterations', async () => {
    const originalFindById = User.findById;
    const ownerId = new mongoose.Types.ObjectId();

    User.findById = async () => ({
      _id: ownerId,
      name: 'Verified Owner',
      email: 'owner@techmines.com',
      role: 'admin',
      isOwner: true,
      save: async () => { },
    });

    try {
      const req = {
        params: { id: ownerId.toString() },
        body: { role: 'member' },
        userId: new mongoose.Types.ObjectId(),
      };
      const res = createMockRes();

      await updateUserRole(req, res);

      assert.equal(res.statusCode, 403);
      assert.match(res.body.message, /owner/i);
    } finally {
      User.findById = originalFindById;
    }
  });

  test('SEC-OWNER-2: Sole administrator cannot demote themselves', async () => {
    const originalFindById = User.findById;
    const originalCount = User.countDocuments;
    const adminId = new mongoose.Types.ObjectId();

    User.findById = async () => ({
      _id: adminId,
      name: 'Admin User',
      email: 'admin@techmines.com',
      role: 'admin',
      isOwner: false,
      save: async () => { },
    });
    User.countDocuments = async () => 1; // Only 1 admin exists

    try {
      const req = {
        params: { id: adminId.toString() },
        body: { role: 'member' },
        userId: adminId,
      };
      const res = createMockRes();

      await updateUserRole(req, res);

      assert.equal(res.statusCode, 400);
      assert.match(res.body.message, /at least one active administrator/i);
    } finally {
      User.findById = originalFindById;
      User.countDocuments = originalCount;
    }
  });
});

describe('3. Opening Balance Validation & Two-Person Approval Tests', () => {
  test('SEC-VAL-1: Negative opening balance is rejected with 400', async () => {
    const req = {
      body: { openingBalance: -500, openingBalanceNotes: 'Negative balance attempt' },
      userId: new mongoose.Types.ObjectId(),
      user: { role: 'admin' },
    };
    const res = createMockRes();

    await updateOpeningBalance(req, res);

    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /cannot be negative/i);
  });

  test('SEC-VAL-2: Non-numeric and malformed opening balance is rejected with 400', async () => {
    const req = {
      body: { openingBalance: 'malicious_payload', openingBalanceNotes: 'String attempt' },
      userId: new mongoose.Types.ObjectId(),
      user: { role: 'admin' },
    };
    const res = createMockRes();

    await updateOpeningBalance(req, res);

    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /valid finite number/i);
  });

  test('SEC-VAL-3: Balance exceeding MAX_OPENING_BALANCE is rejected with 400', async () => {
    const req = {
      body: {
        openingBalance: MAX_OPENING_BALANCE + 1000,
        openingBalanceNotes: 'Excessive balance attempt',
      },
      userId: new mongoose.Types.ObjectId(),
      user: { role: 'admin' },
    };
    const res = createMockRes();

    await updateOpeningBalance(req, res);

    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /exceeds maximum/i);
  });

  test('SEC-VAL-4: Unsupported currency is rejected with 400', async () => {
    const req = {
      body: {
        openingBalance: 5000,
        currency: 'INVALIDCOIN',
        openingBalanceNotes: 'Currency test',
      },
      userId: new mongoose.Types.ObjectId(),
      user: { role: 'admin' },
    };
    const res = createMockRes();

    await updateOpeningBalance(req, res);

    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /unsupported currency/i);
  });

  test('SEC-VAL-5: Missing notes/reason is rejected with 400', async () => {
    const req = {
      body: {
        openingBalance: 5000,
        openingBalanceNotes: '   ',
      },
      userId: new mongoose.Types.ObjectId(),
      user: { role: 'admin' },
    };
    const res = createMockRes();

    await updateOpeningBalance(req, res);

    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /reason or memo notes are required/i);
  });

  test('SEC-APP-1: Requester CANNOT approve their own opening balance change (403)', async () => {
    const requesterId = new mongoose.Types.ObjectId();
    const requestId = new mongoose.Types.ObjectId();

    const originalFindById = PendingBalanceChange.findById;
    PendingBalanceChange.findById = async () => ({
      _id: requestId,
      userId: requesterId,
      requestedBy: requesterId, // SAME as requester
      previousBalance: 0,
      proposedBalance: 50000,
      status: 'pending',
    });

    try {
      const req = {
        params: { id: requestId.toString() },
        body: { reviewNotes: 'Self approval attempt' },
        userId: requesterId, // The requester
      };
      const res = createMockRes();

      await approvePendingBalanceChange(req, res);

      assert.equal(res.statusCode, 403);
      assert.match(res.body.message, /two-person integrity violation/i);
    } finally {
      PendingBalanceChange.findById = originalFindById;
    }
  });

  test('SEC-APP-2: Stale pending request is rejected with 409 Conflict', async () => {
    const requesterId = new mongoose.Types.ObjectId();
    const approverId = new mongoose.Types.ObjectId();
    const requestId = new mongoose.Types.ObjectId();

    const originalFindById = PendingBalanceChange.findById;
    const originalSettingsFindOne = Settings.findOne;

    PendingBalanceChange.findById = async () => ({
      _id: requestId,
      userId: requesterId,
      requestedBy: requesterId,
      previousBalance: 5000,
      previousBalancePaise: 500000, // Expected baseline was 5000
      proposedBalance: 15000,
      status: 'pending',
      currency: 'INR',
    });

    // Current settings baseline has shifted to 8000
    Settings.findOne = async () => ({
      userId: requesterId,
      openingBalance: 8000,
    });

    try {
      const req = {
        params: { id: requestId.toString() },
        body: { reviewNotes: 'Approve request' },
        userId: approverId, // Different admin
      };
      const res = createMockRes();

      await approvePendingBalanceChange(req, res);

      assert.equal(res.statusCode, 409);
      assert.match(res.body.message, /stale request/i);
    } finally {
      PendingBalanceChange.findById = originalFindById;
      Settings.findOne = originalSettingsFindOne;
    }
  });

  test('SEC-APP-3: Already processed or concurrent approval attempt rejected with 409', async () => {
    const requesterId = new mongoose.Types.ObjectId();
    const approverId = new mongoose.Types.ObjectId();
    const requestId = new mongoose.Types.ObjectId();

    const originalFindById = PendingBalanceChange.findById;

    // Status is already 'approved'
    PendingBalanceChange.findById = async () => ({
      _id: requestId,
      userId: requesterId,
      requestedBy: requesterId,
      status: 'approved',
    });

    try {
      const req = {
        params: { id: requestId.toString() },
        body: {},
        userId: approverId,
      };
      const res = createMockRes();

      await approvePendingBalanceChange(req, res);

      assert.equal(res.statusCode, 409);
      assert.match(res.body.message, /cannot be approved|already/i);
    } finally {
      PendingBalanceChange.findById = originalFindById;
    }
  });
});

describe('4. Financial Audit Log Immutability Protection', () => {
  test('SEC-AUDIT-1: BalanceAuditLog blocks update and delete mutations', () => {
    // Test schema-level write-once pre hooks
    const schema = BalanceAuditLog.schema;
    assert.ok(schema);

    // Verify hooks are registered on update and delete operations
    const updateHooks = schema.s?.hooks?._pres?.get('updateOne') || [];
    const deleteHooks = schema.s?.hooks?._pres?.get('deleteOne') || [];

    assert.ok(updateHooks.length > 0, 'updateOne must have pre hook');
    assert.ok(deleteHooks.length > 0, 'deleteOne must have pre hook');
  });
});

describe('5. Authentication, JWT & User Security Tests', () => {
  test('SEC-AUTH-1: Registration with normal user data creates member role, isOwner false, and returns token without password', async () => {
    const originalCreate = User.create;
    const originalSettingsCreate = Settings.create;
    const originalFindOne = User.findOne;

    let createdUserArgs = null;
    User.findOne = async () => null;
    User.create = async (args) => {
      createdUserArgs = args;
      return {
        _id: new mongoose.Types.ObjectId(),
        name: args.name,
        email: args.email,
        role: args.role,
        isOwner: args.isOwner,
      };
    };
    Settings.create = async () => ({});

    try {
      const req = {
        body: {
          name: 'Normal User',
          email: 'normal@techmines.com',
          password: 'SecurePassword123!',
          confirmPassword: 'SecurePassword123!',
        },
      };
      const res = createMockRes();

      await register(req, res);

      assert.equal(res.statusCode, 201);
      assert.ok(res.body.token, 'Must return JWT token');
      assert.equal(res.body.user.role, 'member');
      assert.equal(res.body.user.isOwner, false);
      assert.equal(res.body.user.password, undefined, 'Password must not be in response');
      assert.equal(res.body.password, undefined);
    } finally {
      User.create = originalCreate;
      Settings.create = originalSettingsCreate;
      User.findOne = originalFindOne;
    }
  });

  test('SEC-AUTH-2: Login with correct credentials returns token and user payload', async () => {
    const originalFindOne = User.findOne;
    const userId = new mongoose.Types.ObjectId();

    User.findOne = async () => ({
      _id: userId,
      name: 'Legit User',
      email: 'legit@techmines.com',
      role: 'member',
      isOwner: false,
      comparePassword: async (pwd) => pwd === 'CorrectPassword123!',
    });

    try {
      const req = {
        body: {
          email: 'legit@techmines.com',
          password: 'CorrectPassword123!',
        },
      };
      const res = createMockRes();

      await login(req, res);

      assert.equal(res.statusCode, 200);
      assert.ok(res.body.token);
      assert.equal(res.body.user.email, 'legit@techmines.com');
      assert.equal(res.body.user.password, undefined);
    } finally {
      User.findOne = originalFindOne;
    }
  });

  test('SEC-AUTH-3: Login with incorrect credentials returns HTTP 401', async () => {
    const originalFindOne = User.findOne;

    User.findOne = async () => ({
      _id: new mongoose.Types.ObjectId(),
      email: 'legit@techmines.com',
      comparePassword: async () => false, // Incorrect password
    });

    try {
      const req = {
        body: {
          email: 'legit@techmines.com',
          password: 'WrongPassword!',
        },
      };
      const res = createMockRes();

      await login(req, res);

      assert.equal(res.statusCode, 401);
      assert.match(res.body.message, /invalid email address or password/i);
    } finally {
      User.findOne = originalFindOne;
    }
  });

  test('SEC-AUTH-4: Missing authentication token returns HTTP 401', async () => {
    const req = { headers: {} };
    const res = createMockRes();
    let nextCalled = false;

    await requireAuth(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.match(res.body.message, /authentication required/i);
  });

  test('SEC-AUTH-5: Invalid JWT returns HTTP 401', async () => {
    const req = {
      headers: {
        authorization: 'Bearer an_invalid_tampered_token_string',
      },
    };
    const res = createMockRes();
    let nextCalled = false;

    await requireAuth(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.match(res.body.message, /invalid or expired/i);
  });

  test('SEC-AUTH-6: Expired JWT returns HTTP 401', async () => {
    const secret = getJwtSecret();
    const expiredToken = jwt.sign(
      { userId: new mongoose.Types.ObjectId().toString() },
      secret,
      { expiresIn: '-1s' }
    );

    const req = {
      headers: {
        authorization: `Bearer ${expiredToken}`,
      },
    };
    const res = createMockRes();
    let nextCalled = false;

    await requireAuth(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.match(res.body.message, /invalid or expired/i);
  });

  test('SEC-AUTH-7: JWT supplied through query parameters is strictly rejected with HTTP 401', async () => {
    const secret = getJwtSecret();
    const validToken = jwt.sign(
      { userId: new mongoose.Types.ObjectId().toString() },
      secret,
      { expiresIn: '1h' }
    );

    // Token passed in query parameter rather than Authorization header
    const req = {
      headers: {},
      query: { token: validToken },
    };
    const res = createMockRes();
    let nextCalled = false;

    await requireAuth(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false, 'Query token must NOT authenticate');
    assert.equal(res.statusCode, 401);
  });

  test('SEC-AUTH-8: Malformed user ID in JWT payload is rejected with HTTP 401', async () => {
    const secret = getJwtSecret();
    // Non-ObjectId string in payload
    const malformedToken = jwt.sign({ userId: 'not_an_object_id' }, secret, { expiresIn: '1h' });

    const req = {
      headers: {
        authorization: `Bearer ${malformedToken}`,
      },
    };
    const res = createMockRes();
    let nextCalled = false;

    await requireAuth(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.match(res.body.message, /invalid user identifier/i);
  });

  test('SEC-AUTH-9: Password hashes never appear in user API responses or toJSON serialization', async () => {
    const originalFind = User.find;
    const originalFindById = User.findById;

    const mockUserDoc = new User({
      name: 'Test Safe',
      email: 'safe@techmines.com',
      password: 'HashedPasswordMock$2a$10$abcdefghijklmnopqrstuv',
      role: 'member',
      isOwner: false,
    });

    // Test Schema-level toJSON
    const jsonOutput = mockUserDoc.toJSON();
    assert.equal(jsonOutput.password, undefined, 'password must be excluded in toJSON');

    // Test listUsers
    User.find = () => ({
      sort: () => [mockUserDoc.toJSON()],
    });

    try {
      const req = { user: { role: 'admin' } };
      const res = createMockRes();
      await listUsers(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.users[0].password, undefined);
    } finally {
      User.find = originalFind;
    }
  });

  test('SEC-AUTH-10: Missing or short JWT_SECRET fails fast with fatal configuration error', () => {
    const originalSecret = process.env.JWT_SECRET;
    try {
      delete process.env.JWT_SECRET;
      assert.throws(() => validateJwtConfig(), /FATAL CONFIGURATION ERROR/i);

      process.env.JWT_SECRET = 'short';
      assert.throws(() => validateJwtConfig(), /at least 16 characters/i);
    } finally {
      process.env.JWT_SECRET = originalSecret;
    }
  });
});

describe('6. Financial Data Isolation & Ownership Tests', () => {
  test('SEC-ISO-1: Cross-user transaction access is blocked (User A cannot view User B transaction by ID)', async () => {
    const userAId = new mongoose.Types.ObjectId();
    const userBId = new mongoose.Types.ObjectId();
    const transactionId = new mongoose.Types.ObjectId();

    const originalFindOne = Transaction.findOne;

    // findOne checks both _id and userId: req.userId
    Transaction.findOne = async (query) => {
      if (query._id.toString() === transactionId.toString() && query.userId.toString() === userBId.toString()) {
        return { _id: transactionId, userId: userBId, title: "User B's Private Expense", amount: 5000 };
      }
      return null; // When User A queries, it returns null
    };

    try {
      const req = {
        params: { id: transactionId.toString() },
        userId: userAId, // User A making the request
      };
      const res = createMockRes();

      await getTransactionById(req, res);

      assert.equal(res.statusCode, 404, 'Must return 404 Not Found when attempting to access another user record');
      assert.equal(res.body.success, false);
    } finally {
      Transaction.findOne = originalFindOne;
    }
  });

  test('SEC-ISO-2: Cross-user transaction update attempt is blocked with 404 Not Found', async () => {
    const userAId = new mongoose.Types.ObjectId();
    const userBId = new mongoose.Types.ObjectId();
    const transactionId = new mongoose.Types.ObjectId();

    const originalFindOne = Transaction.findOne;

    // Database lookup scoped by { _id, userId: req.userId }
    Transaction.findOne = async (query) => {
      // Returns null because query.userId is User A, but record belongs to User B
      return null;
    };

    try {
      const req = {
        params: { id: transactionId.toString() },
        body: { amount: 99999 },
        userId: userAId,
      };
      const res = createMockRes();

      await updateTransaction(req, res);

      assert.equal(res.statusCode, 404);
      assert.equal(res.body.success, false);
    } finally {
      Transaction.findOne = originalFindOne;
    }
  });

  test('SEC-ISO-3: Cross-user transaction delete attempt is blocked with 404 Not Found', async () => {
    const userAId = new mongoose.Types.ObjectId();
    const transactionId = new mongoose.Types.ObjectId();

    const originalFindOneAndDelete = Transaction.findOneAndDelete;

    Transaction.findOneAndDelete = async (query) => {
      // Return null because userId does not match owner
      return null;
    };

    try {
      const req = {
        params: { id: transactionId.toString() },
        userId: userAId,
      };
      const res = createMockRes();

      await deleteTransaction(req, res);

      assert.equal(res.statusCode, 404);
      assert.equal(res.body.success, false);
    } finally {
      Transaction.findOneAndDelete = originalFindOneAndDelete;
    }
  });

  test('SEC-ISO-4: Transaction creation strictly derives ownership from authenticated req.userId, ignoring body', async () => {
    const authenticatedUserId = new mongoose.Types.ObjectId();
    const attackerSpoofedUserId = new mongoose.Types.ObjectId();

    const originalSave = Transaction.prototype.save;
    let savedDoc = null;

    Transaction.prototype.save = async function () {
      savedDoc = this;
      return this;
    };

    try {
      const req = {
        body: {
          title: 'Office Stationery',
          amount: 250,
          type: 'expense',
          category: 'Office Supplies',
          paymentMethod: 'Cash',
          userId: attackerSpoofedUserId, // Spoofed ID in request body
        },
        userId: authenticatedUserId, // Authentic authenticated user ID
      };
      const res = createMockRes();

      await createTransaction(req, res);

      assert.equal(res.statusCode, 201);
      assert.equal(
        savedDoc.userId.toString(),
        authenticatedUserId.toString(),
        'userId on created transaction MUST match req.userId, not body'
      );
    } finally {
      Transaction.prototype.save = originalSave;
    }
  });
});
