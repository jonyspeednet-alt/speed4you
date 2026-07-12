function getNodeEnv() {
  return String(process.env.NODE_ENV || 'development').toLowerCase();
}

function getJwtSecret() {
  const secret = String(process.env.JWT_SECRET || '').trim();

  if (!secret) {
    if (getNodeEnv() === 'production') {
      throw new Error('JWT_SECRET must be configured in production. Set it in your .env file.');
    }
    // In development, generate a random secret for this session
    const crypto = require('crypto');
    const sessionSecret = crypto.randomBytes(64).toString('hex');
    console.warn(
      '[auth] WARNING: JWT_SECRET is not set. Generated a random secret for this session. ' +
      'Set JWT_SECRET in your .env file for persistent sessions.'
    );
    return sessionSecret;
  }

  if (secret.length < 32) {
    console.warn('[auth] WARNING: JWT_SECRET is shorter than 32 characters. Use a longer secret.');
  }

  return secret;
}

module.exports = {
  getJwtSecret,
};
