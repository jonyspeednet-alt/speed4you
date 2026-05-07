const logger = require('../utils/logger');

const PROD_REQUIRED_VARS = [
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
  'CORS_ALLOWED_ORIGINS',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD_HASH',
];

const RECOMMENDED_NON_PROD_VARS = [
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
];

const WEAK_JWT_SECRETS = new Set([
  'fallback-secret-change-me',
  'dev-only-jwt-secret-change-before-production',
  'changeme',
  'secret',
  'password',
]);

function hasValue(value) {
  return String(value || '').trim().length > 0;
}

function checkEnv() {
  const nodeEnv = String(process.env.NODE_ENV || 'development').toLowerCase();
  const isProduction = nodeEnv === 'production';

  if (isProduction) {
    const missing = PROD_REQUIRED_VARS.filter((key) => !hasValue(process.env[key]));
    if (missing.length > 0) {
      logger.error('CRITICAL: Missing required environment variables for production.', { missing });
      console.error('\nMissing required environment variables:', missing.join(', '));
      console.error('Please check your production environment configuration.\n');
      process.exit(1);
    }
  } else {
    const missingRecommended = RECOMMENDED_NON_PROD_VARS.filter((key) => !hasValue(process.env[key]));
    if (missingRecommended.length > 0) {
      logger.warn('Some recommended environment variables are missing in non-production.', { missing: missingRecommended });
    }
  }

  const jwtSecret = String(process.env.JWT_SECRET || '').trim();
  if (isProduction) {
    if (jwtSecret.length < 32) {
      logger.error('CRITICAL: JWT_SECRET must be at least 32 characters in production.');
      process.exit(1);
    }
    if (WEAK_JWT_SECRETS.has(jwtSecret.toLowerCase())) {
      logger.error('CRITICAL: JWT_SECRET is using a known weak/default value in production.');
      process.exit(1);
    }
  } else if (jwtSecret && jwtSecret.length < 16) {
    logger.warn('JWT_SECRET is very short. Use at least 32 characters for production-grade security.');
  }

  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 1);
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) {
    logger.error('CRITICAL: TRUST_PROXY_HOPS must be a non-negative integer.');
    process.exit(1);
  }

  logger.info(`Environment check passed [mode: ${nodeEnv}]`);
}

module.exports = checkEnv;

