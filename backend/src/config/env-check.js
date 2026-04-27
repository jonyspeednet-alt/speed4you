const logger = require('../utils/logger');

const REQUIRED_VARS = [
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
];

const OPTIONAL_VARS = [
  'PORT',
  'NODE_ENV',
  'CORS_ALLOWED_ORIGINS',
];

function checkEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

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
