/**
 * @file controllers/health.controller.js
 * @description Health check and status monitoring endpoints.
 * Used by Render and monitoring services to verify the API is alive.
 */

import os from 'os';
import movieboxService from '../services/moviebox.service.js';
import cacheService from '../services/cache.service.js';
import response from '../utils/response.js';
import env from '../config/env.js';

/**
 * GET /api/v1/health
 * Quick health check — should respond in < 100ms.
 * Does NOT call MovieBox (to avoid slow health checks).
 */
export const health = (req, res) => {
  const uptime = process.uptime();

  return response.success(res, {
    status: 'ok',
    uptime_seconds: Math.floor(uptime),
    uptime_human: formatUptime(uptime),
    memory: {
      used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
    node_version: process.version,
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  }, 'Server is healthy');
};

/**
 * GET /api/v1/status
 * Deep status check — includes MovieBox provider ping and cache stats.
 * May be slower (calls Python bridge).
 */
export const status = async (req, res, next) => {
  try {
    const providerHealth = await movieboxService.checkHealth();
    const cacheStats = cacheService.stats();

    return response.success(res, {
      api: {
        name: env.api.name,
        version: env.api.version,
        status: 'operational',
      },
      provider: {
        name: 'moviebox-api',
        status: providerHealth.ok ? 'connected' : 'unreachable',
        latency_ms: providerHealth.latency_ms,
      },
      cache: {
        keys: cacheStats.keys,
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hit_rate: cacheStats.hits + cacheStats.misses > 0
          ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(1) + '%'
          : 'N/A',
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        node_version: process.version,
        uptime_seconds: Math.floor(process.uptime()),
      },
      timestamp: new Date().toISOString(),
    }, 'Status check complete');
  } catch (err) {
    next(err);
  }
};

/**
 * Format seconds into a human-readable uptime string.
 * @param {number} seconds
 * @returns {string}
 */
const formatUptime = (seconds) => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
};
