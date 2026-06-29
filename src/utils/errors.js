/**
 * @file utils/errors.js
 * @description Custom error classes for consistent error handling throughout the app.
 * These are thrown by services and caught by the central error handler middleware.
 */

/**
 * Base API error with HTTP status code support.
 * All service-level errors should use this or its subclasses.
 */
export class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Human-readable error message
   * @param {object} [details] - Optional additional error details
   */
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/** 400 Bad Request */
export class ValidationError extends ApiError {
  constructor(message, details = null) {
    super(400, message, details);
    this.name = 'ValidationError';
  }
}

/** 404 Not Found */
export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

/** 429 Too Many Requests */
export class RateLimitError extends ApiError {
  constructor(message = 'Too many requests. Please try again later.') {
    super(429, message);
    this.name = 'RateLimitError';
  }
}

/** 502 Bad Gateway (upstream provider error) */
export class ProviderError extends ApiError {
  constructor(message = 'Content provider is temporarily unavailable') {
    super(502, message);
    this.name = 'ProviderError';
  }
}

/** 504 Gateway Timeout */
export class TimeoutError extends ApiError {
  constructor(message = 'Request to content provider timed out') {
    super(504, message);
    this.name = 'TimeoutError';
  }
}
