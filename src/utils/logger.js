/**
 * @file utils/logger.js
 * @description Lightweight structured logger.
 * In development, logs everything. In production, only logs warnings and errors.
 */

import env from '../config/env.js';

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL = env.isProd ? LEVELS.warn : LEVELS.debug;

const timestamp = () => new Date().toISOString();

const log = (level, ...args) => {
  if (LEVELS[level] < MIN_LEVEL) return;
  const prefix = `[${timestamp()}] [${level.toUpperCase()}]`;
  if (level === 'error') {
    console.error(prefix, ...args);
  } else if (level === 'warn') {
    console.warn(prefix, ...args);
  } else {
    console.log(prefix, ...args);
  }
};

const logger = {
  debug: (...args) => log('debug', ...args),
  info: (...args) => log('info', ...args),
  warn: (...args) => log('warn', ...args),
  error: (...args) => log('error', ...args),
};

export default logger;
