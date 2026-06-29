/**
 * @file utils/validate.js
 * @description Lightweight input validation helpers.
 * Throws ValidationError on invalid input so controllers stay clean.
 */

import { ValidationError } from './errors.js';

/**
 * Ensure a value is a non-empty string.
 * @param {any} value
 * @param {string} fieldName
 * @returns {string} Trimmed string
 */
export const requireString = (value, fieldName) => {
  if (!value || typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`'${fieldName}' is required and must be a non-empty string`);
  }
  return value.trim();
};

/**
 * Parse and validate a positive integer query param.
 * @param {any} value
 * @param {string} fieldName
 * @param {number} [defaultValue]
 * @param {number} [max]
 * @returns {number}
 */
export const parseIntParam = (value, fieldName, defaultValue = 1, max = 999) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 1) {
    throw new ValidationError(`'${fieldName}' must be a positive integer`);
  }
  if (parsed > max) {
    throw new ValidationError(`'${fieldName}' cannot exceed ${max}`);
  }
  return parsed;
};

/**
 * Validate content type param — must be 'movie', 'series', or 'all'.
 * @param {string} type
 * @returns {string}
 */
export const validateContentType = (type = 'all') => {
  const valid = ['movie', 'series', 'all'];
  const lower = String(type).toLowerCase();
  if (!valid.includes(lower)) {
    throw new ValidationError(`'type' must be one of: ${valid.join(', ')}`);
  }
  return lower;
};

/**
 * Sanitize a string by removing potentially dangerous characters.
 * @param {string} str
 * @returns {string}
 */
export const sanitize = (str) =>
  String(str)
    .replace(/[<>"'`]/g, '')
    .trim()
    .slice(0, 500); // Max 500 chars

export default { requireString, parseIntParam, validateContentType, sanitize };
