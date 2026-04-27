class AppError extends Error {
  /**
   * Create an application error.
   * @param {string} message - Human readable error message
   * @param {number} status - HTTP status code
   * @param {string} code - Application specific error code (e.g. 'NOT_FOUND', 'UNAUTHORIZED')
   * @param {any} details - Additional error details
   */
  constructor(message, status = 500, code = 'INTERNAL_SERVER_ERROR', details = undefined) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
    
    // Captures the stack trace, excluding the constructor call from it.
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = { AppError };
