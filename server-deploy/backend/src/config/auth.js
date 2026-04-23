function getNodeEnv() {
  return String(process.env.NODE_ENV || 'development').toLowerCase();
}

function getJwtSecret() {
  const ***REMOVED*** = String(process.env.JWT_SECRET || '').trim();
  const isProduction = getNodeEnv() === 'production';

  if (!***REMOVED*** && isProduction) {
    throw new Error('JWT_SECRET must be configured in production.');
  }

  return ***REMOVED*** || '***REMOVED***';
}

module.exports = {
  getJwtSecret,
};
