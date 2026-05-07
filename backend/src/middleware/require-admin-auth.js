const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/auth');

function extractBearerToken(headerValue) {
  const header = String(headerValue || '').trim();
  if (!header.toLowerCase().startsWith('bearer ')) {
    return '';
  }
  return header.slice(7).trim();
}

function requireAdminAuth(req, res, next) {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const role = String(decoded?.role || '').toLowerCase();
    if (!['admin', 'super_admin'].includes(role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = requireAdminAuth;

