const logger = require('../utils/logger');

const REQUIRED_VARS = [
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
];

const REQUIRED_PROD_VARS = [
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD_HASH',
];

const OPTIONAL_VARS = [
  'PORT',
  'NODE_ENV',
  'CORS_ALLOWED_ORIGINS',
  'TV_PORTAL_BASE_URL',
  'TMDB_API_KEY',
];

function checkEnv() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

  if (isProduction) {
    REQUIRED_PROD_VARS.forEach((key) => {
      if (!process.env[key]) {
        missing.push(key);
      }
    });
  }

  if (missing.length > 0) {
    logger.error('CRITICAL: Missing required environment variables:', { missing });
    console.error('\nMissing required environment variables:', missing.join(', '));
    console.error('Please check your .env file.\n');
    process.exit(1);
  }

  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv === 'production' && process.env.JWT_SECRET === 'fallback-secret-change-me') {
    logger.warn('SECURITY WARNING: Using default JWT_SECRET in production!');
  }

  logger.info(`Environment check passed [mode: ${nodeEnv}]`);
}

module.exports = checkEnv;
