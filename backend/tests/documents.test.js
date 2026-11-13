import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { Document } from '../src/models/Document.js';
import {
  getDocumentById,
  updateDocument,
  deleteDocument,
  getDocuments,
} from '../src/controllers/documentController.js';

// Set test secret
process.env.JWT_SECRET = 'test_suite_jwt_secret_for_automated_testing_2026';

const createMockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    setHeader(key, val) {
      this.headers[key] = val;
    },
    send(content) {
      this.body = content;
      return this;
    },
  };
  return res;
};

describe('Document Scanner API & Tenant Isolation Tests', () => {
  test('DOC-SEC-1: Cross-user document retrieval returns HTTP 404', async () => {
    const userAId = new mongoose.Types.ObjectId();
    const userBId = new mongoose.Types.ObjectId();
    const docId = new mongoose.Types.ObjectId();

    const originalFindOne = Document.findOne;

    Document.findOne = async (query) => {
      // Document belongs to userB; if queried with userA, return null
      if (query._id.toString() === docId.toString() && query.userId.toString() === userBId.toString()) {
        return { _id: docId, userId: userBId, title: "User B's Tax Invoice" };
      }
      return null;
    };

    try {
      const req = {
        params: { id: docId.toString() },
        userId: userAId, // User A attempting unauthorized access
      };
      const res = createMockRes();

      await getDocumentById(req, res);

      assert.equal(res.statusCode, 404);
      assert.match(res.body.message, /not found/i);
    } finally {
      Document.findOne = originalFindOne;
    }
  });

  test('DOC-SEC-2: Cross-user document update returns HTTP 404', async () => {
    const userAId = new mongoose.Types.ObjectId();
    const docId = new mongoose.Types.ObjectId();

    const originalFindOne = Document.findOne;
    Document.findOne = async () => null;

    try {
      const req = {
        params: { id: docId.toString() },
        body: { title: 'Tampered Title' },
        userId: userAId,
      };
      const res = createMockRes();

      await updateDocument(req, res);

      assert.equal(res.statusCode, 404);
    } finally {
      Document.findOne = originalFindOne;
    }
  });

  test('DOC-SEC-3: Cross-user document deletion returns HTTP 404', async () => {
    const userAId = new mongoose.Types.ObjectId();
    const docId = new mongoose.Types.ObjectId();

    const originalFindOne = Document.findOne;
    Document.findOne = async () => null;

    try {
      const req = {
        params: { id: docId.toString() },
        userId: userAId,
      };
      const res = createMockRes();

      await deleteDocument(req, res);

      assert.equal(res.statusCode, 404);
    } finally {
      Document.findOne = originalFindOne;
    }
  });

  test('DOC-SEC-4: Document listing strictly scopes by req.userId', async () => {
    const userAId = new mongoose.Types.ObjectId();

    let capturedFilter = null;
    const originalFind = Document.find;
    const originalCount = Document.countDocuments;

    Document.countDocuments = async (filter) => {
      capturedFilter = filter;
      return 1;
    };
    Document.find = (filter) => ({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: async () => [{ _id: new mongoose.Types.ObjectId(), title: 'Doc A', userId: userAId }],
          }),
        }),
      }),
    });

    try {
      const req = {
        query: { search: 'receipt' },
        userId: userAId,
      };
      const res = createMockRes();

      await getDocuments(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(capturedFilter.userId.toString(), userAId.toString());
      assert.ok(capturedFilter.$or.length > 0);
    } finally {
      Document.find = originalFind;
      Document.countDocuments = originalCount;
    }
  });

  test('DOC-SEC-5: Invalid MongoDB ID returns HTTP 404 without database exception', async () => {
    const req = {
      params: { id: 'invalid_mongo_id_format' },
      userId: new mongoose.Types.ObjectId(),
    };
    const res = createMockRes();

    await getDocumentById(req, res);
    assert.equal(res.statusCode, 404);
  });
});

