/**
 * @file services/cache.service.js
 * @description In-memory cache service wrapping node-cache.
 * Provides a clean interface for get/set/delete/clear operations with TTL support.
 *
 * What gets cached:
 *   ✅ Search results, trending, popular, homepage, content details
 *   ❌ Downloads, subtitles (always fresh — links expire)
 */

import NodeCache from 'node-cache';
import env from '../config/env.js';

/** Singleton cache instance configured from env */
const cache = new NodeCache({
  stdTTL: env.cache.ttl,
  checkperiod: Math.floor(env.cache.ttl / 2),
  maxKeys: env.cache.maxKeys,
  useClones: false, // Performance: skip deep cloning
});

/**
 * Retrieve a value from cache.
 * @param {string} key
 * @returns {any|undefined} The cached value or undefined if not found
 */
const get = (key) => cache.get(key);

/**
 * Store a value in cache with optional custom TTL.
 * @param {string} key
 * @param {any} value
 * @param {number} [ttl] - Override default TTL in seconds
 * @returns {boolean}
 */
const set = (key, value, ttl = env.cache.ttl) => cache.set(key, value, ttl);

/**
 * Delete a key from cache.
 * @param {string} key
 * @returns {number} Number of deleted entries
 */
const del = (key) => cache.del(key);

/**
 * Check if a key exists in cache.
 * @param {string} key
 * @returns {boolean}
 */
const exists = (key) => cache.has(key);

/**
 * Clear the entire cache.
 */
const clear = () => cache.flushAll();

/**
 * Get cache statistics (keys, hits, misses, etc.)
 * @returns {object}
 */
const stats = () => ({
  ...cache.getStats(),
  keys: cache.keys().length,
});

/**
 * Wrap an async function with cache-aside logic.
 * If the key exists in cache, return it. Otherwise call fn(), cache, and return.
 *
 * @param {string} key - Cache key
 * @param {Function} fn - Async function to call on cache miss
 * @param {number} [ttl] - Optional TTL override
 * @returns {Promise<any>}
 */
const remember = async (key, fn, ttl = env.cache.ttl) => {
  const cached = get(key);
  if (cached !== undefined) return cached;

  const fresh = await fn();
  if (fresh !== undefined && fresh !== null) set(key, fresh, ttl);
  return fresh;
};

/**
 * Build a normalized cache key from parts.
 * @param {...string} parts
 * @returns {string}
 */
const buildKey = (...parts) =>
  parts
    .map((p) => String(p).toLowerCase().replace(/[^a-z0-9_:-]/g, '_'))
    .join(':');

export default { get, set, del, exists, clear, stats, remember, buildKey };
