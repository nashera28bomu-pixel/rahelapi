/**
 * @file config/env.js
 * @description Validates and exports all environment variables.
 * Fails fast on startup if required variables are missing.
 */

import 'dotenv/config';

/**
 * Reads an env variable and returns it, or throws if required and missing.
 * @param {string} key - The env variable name
 * @param {string|undefined} defaultValue - Optional default value
 * @returns {string} The resolved value
 */
const get = (key, defaultValue = undefined) => {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`[Config] Missing required environment variable: ${key}`);
  }
  return value;
};

const getInt = (key, defaultValue) => parseInt(get(key, String(defaultValue)), 10);

/**
 * Validated, typed configuration object for the entire application.
 * All values come from environment variables only — nothing is hardcoded.
 */
const env = {
  /** Node environment */
  NODE_ENV: get('NODE_ENV', 'development'),

  /** HTTP server port */
  PORT: getInt('PORT', 5000),

  /** Whether we're in production mode */
  isProd: get('NODE_ENV', 'development') === 'production',

  /** Python bridge configuration */
  python: {
    bridgePath: get('PYTHON_BRIDGE_PATH', 'src/python/bridge.py'),
    cmd: get('PYTHON_CMD', 'python3'),
    timeout: getInt('PYTHON_TIMEOUT', 30000),
  },

  /** Cache configuration */
  cache: {
    ttl: getInt('CACHE_TTL', 300),
    maxKeys: getInt('CACHE_MAX_KEYS', 500),
  },

  /** Rate limiting */
  rateLimit: {
    max: getInt('RATE_LIMIT_MAX', 100),
    windowMinutes: getInt('RATE_LIMIT_WINDOW', 15),
  },

  /** CORS allowed origins */
  allowedOrigins: get('ALLOWED_ORIGINS', '*'),

  /** API metadata */
  api: {
    version: get('API_VERSION', 'v1'),
    name: get('API_NAME', 'Cymor Movie API'),
  },
};

export default env;
