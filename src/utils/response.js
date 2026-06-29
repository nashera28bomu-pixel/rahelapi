/**
 * @file utils/response.js
 * @description Standardized HTTP response helpers.
 * Every API response follows one consistent envelope structure.
 *
 * Success: { success: true, message: "...", data: {...} }
 * Failure: { success: false, message: "...", error: {...} }
 */

/**
 * Send a successful JSON response.
 * @param {import('express').Response} res
 * @param {any} data - The response payload
 * @param {string} [message]
 * @param {number} [statusCode]
 */
export const success = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Send an error JSON response.
 * @param {import('express').Response} res
 * @param {string} message
 * @param {number} [statusCode]
 * @param {object|null} [error]
 */
export const error = (res, message, statusCode = 500, err = null) => {
  const body = {
    success: false,
    message,
  };

  // Never expose stack traces in production
  if (err && !process.env.NODE_ENV?.includes('prod')) {
    body.error = {
      type: err.name || 'Error',
      details: err.details || null,
    };
  }

  return res.status(statusCode).json(body);
};

/**
 * Send a 404 Not Found response.
 * @param {import('express').Response} res
 * @param {string} [message]
 */
export const notFound = (res, message = 'Resource not found') => {
  return error(res, message, 404);
};

export default { success, error, notFound };
