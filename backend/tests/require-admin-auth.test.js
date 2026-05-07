const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const requireAdminAuth = require('../src/middleware/require-admin-auth');

function createRes() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.payload = value;
      return this;
    },
  };
}

test('requireAdminAuth returns 401 when token is missing', async () => {
  process.env.JWT_SECRET = 'test-jwt-secret-for-admin-auth-1234567890';
  const req = { headers: {} };
  const res = createRes();

  let nextCalled = false;
  requireAdminAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.payload, { error: 'Authentication required' });
});

test('requireAdminAuth returns 403 for non-admin role', async () => {
  process.env.JWT_SECRET = 'test-jwt-secret-for-admin-auth-1234567890';
  const token = jwt.sign(
    { id: 1, username: 'user', role: 'viewer' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = createRes();

  let nextCalled = false;
  requireAdminAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.payload, { error: 'Admin access required' });
});

test('requireAdminAuth calls next for admin role', async () => {
  process.env.JWT_SECRET = 'test-jwt-secret-for-admin-auth-1234567890';
  const token = jwt.sign(
    { id: 1, username: 'admin', role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = createRes();

  let nextCalled = false;
  requireAdminAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.user.username, 'admin');
  assert.equal(req.user.role, 'admin');
  assert.equal(res.statusCode, 200);
});
