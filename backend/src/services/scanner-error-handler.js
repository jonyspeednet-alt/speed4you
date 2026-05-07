/**
 * Phase 1: Critical Fix - Enhanced Error Handling & Retry Mechanism
 * 
 * Provides robust error handling, retry logic, and recovery mechanisms
 * for scanner operations.
 */

class RetryError extends Error {
  constructor(message, originalError, attempt) {
    super(message);
    this.name = 'RetryError';
    this.originalError = originalError;
    this.attempt = attempt;
  }
}

class ScannerError extends Error {
  constructor(message, code, context = {}) {
    super(message);
    this.name = 'ScannerError';
    this.code = code;
    this.context = context;
  }
}

/**
 * Retry configuration
 */
const DEFAULT_RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EPIPE',
    'EAI_AGAIN',
  ],
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

/**
 * Calculate exponential backoff delay
 */
function calculateBackoff(attempt, config) {
  const delay = Math.min(
    config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
    config.maxDelay
  );
  // Add jitter to avoid thundering herd
  return delay + Math.random() * 0.3 * delay;
}

/**
 * Check if error is retryable
 */
function isRetryableError(error, config) {
  if (!error) return false;

  // Check system error codes
  if (error.code && config.retryableErrors.includes(error.code)) {
    return true;
  }

  // Check HTTP status codes
  if (error.status && config.retryableStatusCodes.includes(error.status)) {
    return true;
  }

  // Check error messages
  const retryableMessages = [
    'timeout',
    'network',
    'connection',
    'temporary failure',
    'rate limit',
    'too many requests',
  ];
  
  const message = error.message?.toLowerCase() || '';
  return retryableMessages.some(msg => message.includes(msg));
}

/**
 * Retry function with exponential backoff
 */
async function retryAsync(fn, config = {}) {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError;
  
  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;
      
      // If this is not retryable or it's the last attempt, throw immediately
      if (
        !isRetryableError(error, finalConfig) ||
        attempt === finalConfig.maxAttempts
      ) {
        throw error;
      }

      const delay = calculateBackoff(attempt, finalConfig);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Safe execution with error boundary
 */
async function safeExecute(fn, options = {}) {
  const {
    fallback = null,
    errorContext = {},
    onError = null,
    swallowErrors = false,
  } = options;

  try {
    return await fn();
  } catch (error) {
    const scannerError = new ScannerError(
      error.message || 'Operation failed',
      'EXECUTION_ERROR',
      errorContext
    );
    
    if (onError) {
      onError(scannerError, error);
    }

    if (!swallowErrors) {
      throw scannerError;
    }

    return fallback;
  }
}

/**
 * Circuit breaker pattern implementation
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'closed'; // closed, open, half-open
  }

  async execute(fn) {
    // If circuit is open, check if we should attempt recovery
    if (this.state === 'open') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure >= this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new ScannerError(
          'Circuit breaker is OPEN',
          'CIRCUIT_BREAKER_OPEN'
        );
      }
    }

    try {
      const result = await fn();
      
      // If in half-open and successful, close circuit
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failureCount = 0;
      }
      
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      // If threshold reached, open circuit
      if (this.failureCount >= this.failureThreshold) {
        this.state = 'open';
      }

      throw error;
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  reset() {
    this.state = 'closed';
    this.failureCount = 0;
    this.lastFailureTime = null;
  }
}

/**
 * Error collector for batch operations
 */
class ErrorCollector {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.maxErrors = 100;
  }

  addError(error, context = {}) {
    this.errors.push({
      timestamp: new Date().toISOString(),
      error: error.message || String(error),
      code: error.code,
      context,
      stack: error.stack,
    });

    // Prevent memory leaks
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }
  }

  addWarning(message, context = {}) {
    this.warnings.push({
      timestamp: new Date().toISOString(),
      message,
      context,
    });
  }

  hasErrors() {
    return this.errors.length > 0;
  }

  hasWarnings() {
    return this.warnings.length > 0;
  }

  getSummary() {
    return {
      errorCount: this.errors.length,
      warningCount: this.warnings.length,
      errors: this.errors.slice(0, 10), // Return last 10 errors
      warnings: this.warnings.slice(-5), // Return last 5 warnings
    };
  }

  clear() {
    this.errors = [];
    this.warnings = [];
  }
}

/**
 * Transaction wrapper for database operations
 */
async function withTransaction(dbClient, fn) {
  try {
    await dbClient.query('BEGIN');
    const result = await fn();
    await dbClient.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await dbClient.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Failed to rollback transaction:', rollbackError);
    }
    throw error;
  }
}

/**
 * Batch operation with partial failure handling
 */
async function batchWithPartialFailure(items, processor, options = {}) {
  const {
    concurrency = 5,
    stopOnError = false,
    maxRetries = 2,
  } = options;

  const results = {
    successful: [],
    failed: [],
    skipped: [],
  };

  const errorCollector = new ErrorCollector();

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    
    const promises = batch.map(async (item, index) => {
      const globalIndex = i + index;
      
      try {
        const result = await retryAsync(
          () => processor(item, globalIndex),
          { maxAttempts: maxRetries }
        );
        results.successful.push({ index: globalIndex, item, result });
      } catch (error) {
        errorCollector.addError(error, { item, index: globalIndex });
        results.failed.push({ 
          index: globalIndex, 
          item, 
          error: error.message 
        });

        if (stopOnError) {
          throw error;
        }
      }
    });

    if (stopOnError) {
      await Promise.all(promises);
    } else {
      await Promise.allSettled(promises);
    }
  }

  results.errorSummary = errorCollector.getSummary();
  return results;
}

/**
 * Health check for external services
 */
async function checkServiceHealth(serviceUrl, options = {}) {
  const { timeout = 5000, expectedStatus = 200 } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(serviceUrl, {
      signal: controller.signal,
      method: 'HEAD',
    });
    
    clearTimeout(timeoutId);
    
    return {
      healthy: response.status === expectedStatus,
      status: response.status,
      latency: Date.now(), // Placeholder - implement actual timing
    };
  } catch (error) {
    clearTimeout(timeoutId);
    return {
      healthy: false,
      error: error.message,
    };
  }
}

/**
 * Graceful shutdown handler
 */
class GracefulShutdown {
  constructor() {
    this.shutdownHooks = [];
    this.isShuttingDown = false;
  }

  registerHook(hook) {
    this.shutdownHooks.push(hook);
  }

  async shutdown(signal = 'SIGTERM') {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    console.log(`Received ${signal}, starting graceful shutdown...`);

    // Execute all shutdown hooks in parallel
    const shutdownPromises = this.shutdownHooks.map(async (hook, index) => {
      try {
        await hook();
      } catch (error) {
        console.error(`Shutdown hook ${index} failed:`, error);
      }
    });

    await Promise.allSettled(shutdownPromises);
    console.log('Graceful shutdown complete');
  }
}

module.exports = {
  RetryError,
  ScannerError,
  retryAsync,
  safeExecute,
  CircuitBreaker,
  ErrorCollector,
  withTransaction,
  batchWithPartialFailure,
  checkServiceHealth,
  GracefulShutdown,
  DEFAULT_RETRY_CONFIG,
};
