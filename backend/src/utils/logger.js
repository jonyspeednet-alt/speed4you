const fs = require('fs');
const path = require('path');

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const CURRENT_LEVEL = process.env.LOG_LEVEL ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] : LOG_LEVELS.INFO;

function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const requestId = meta.requestId ? ` [${meta.requestId}]` : '';
  const metaString = Object.keys(meta).length > (meta.requestId ? 1 : 0) 
    ? ` ${JSON.stringify(meta)}` 
    : '';
  
  return `${timestamp} ${level.toUpperCase()}${requestId}: ${message}${metaString}`;
}

const logger = {
  error: (message, meta) => {
    if (LOG_LEVELS.ERROR <= CURRENT_LEVEL) {
      console.error(formatMessage('error', message, meta));
    }
  },
  warn: (message, meta) => {
    if (LOG_LEVELS.WARN <= CURRENT_LEVEL) {
      console.warn(formatMessage('warn', message, meta));
    }
  },
  info: (message, meta) => {
    if (LOG_LEVELS.INFO <= CURRENT_LEVEL) {
      console.info(formatMessage('info', message, meta));
    }
  },
  debug: (message, meta) => {
    if (LOG_LEVELS.DEBUG <= CURRENT_LEVEL) {
      console.debug(formatMessage('debug', message, meta));
    }
  },
};

module.exports = logger;
