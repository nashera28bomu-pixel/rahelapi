/**
 * @file middleware/errorHandler.js
 * @description Centralized error handling middleware.
 * All errors thrown anywhere in the app are caught here.
 * Returns consistent JSON error responses — never raw stack traces to clients.
 */

import { ApiError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * 404 handler — called when no route matches the request.
 * @type {import('express').RequestHandler}
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    error: {
      type: 'NotFoundError',
      details: null,
    },
  });
};

/**
 * Global error handler middleware.
 * Must have 4 parameters (err, req, res, next) for Express to recognize it.
 * @type {import('express').ErrorRequestHandler}
 */
export const errorHandler = (err, req, res, next) => {
  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Log the error (always log server errors, conditionally log client errors)
  if (statusCode >= 500) {
    logger.error(`[ErrorHandler] ${statusCode} ${req.method} ${req.originalUrl} — ${err.message}`);
    if (err.stack && process.env.NODE_ENV !== 'production') {
      logger.error(err.stack);
    }
  } else {
    logger.warn(`[ErrorHandler] ${statusCode} ${req.method} ${req.originalUrl} — ${err.message}`);
  }

  // Build clean error response
  const response = {
    success: false,
    message: getPublicMessage(err, statusCode),
  };

  // Only include error details in non-production
  if (process.env.NODE_ENV !== 'production') {
    response.error = {
      type: err.name || 'Error',
      details: err.details || null,
    };
  }

  return res.status(statusCode).json(response);
};

/**
 * Get a safe, public-facing error message.
 * Hides internal details for 5xx errors in production.
 * @param {Error} err
 * @param {number} statusCode
 * @returns {string}
 */
const getPublicMessage = (err, statusCode) => {
  const isProd = process.env.NODE_ENV === 'production';

  if (statusCode >= 500 && isProd) {
    return 'An internal server error occurred. Please try again later.';
  }

  return err.message || 'An unexpected error occurred';
};
