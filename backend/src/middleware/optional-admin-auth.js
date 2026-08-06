const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/auth');

/**
 * Extracts and verifies an admin JWT token from the request.
 * Does NOT block the request if no/invalid token — just sets `req.isAdmin`.
 * Used by public routes to allow admins to view/play draft content.
 */
function optionalAdminAuth(req, res, next) {
  req.isAdmin = false;
  const header = String(req.headers.authorization || '').trim();
  if (!header.toLowerCase().startsWith('bearer ')) {
    return next();
  }
  const token = header.slice(7).trim();
  if (!token) {
    return next();
  }
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const role = String(decoded?.role || '').toLowerCase();
    if (['admin', 'super_admin'].includes(role)) {
      req.isAdmin = true;
    }
  } catch {
    // Invalid/expired token — treat as non-admin
  }
  return next();
}

module.exports = optionalAdminAuth;