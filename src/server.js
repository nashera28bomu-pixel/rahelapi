/**
 * @file server.js
 * @description HTTP server entry point.
 * Creates the Express app and starts listening on the configured port.
 * Handles graceful shutdown on SIGTERM (required for Render.com).
 */

import createApp from './app.js';
import env from './config/env.js';
import logger from './utils/logger.js';

const app = createApp();

// ─── Start Server ─────────────────────────────────────────────────────────────
const server = app.listen(env.PORT, () => {
  logger.info('─────────────────────────────────────────────');
  logger.info(`  🎬 ${env.api.name}`);
  logger.info(`  Environment : ${env.NODE_ENV}`);
  logger.info(`  Port        : ${env.PORT}`);
  logger.info(`  Base URL    : http://localhost:${env.PORT}`);
  logger.info(`  API         : http://localhost:${env.PORT}/api/${env.api.version}`);
  logger.info(`  Health      : http://localhost:${env.PORT}/api/${env.api.version}/health`);
  logger.info('─────────────────────────────────────────────');
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
// Render sends SIGTERM before stopping the container. We close gracefully.
const shutdown = (signal) => {
  logger.info(`[Server] ${signal} received. Shutting down gracefully...`);
  server.close(() => {
    logger.info('[Server] HTTP server closed. Bye.');
    process.exit(0);
  });

  // Force exit after 10 seconds if something hangs
  setTimeout(() => {
    logger.error('[Server] Forced shutdown after timeout.');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ─── Unhandled Errors ─────────────────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error('[Server] Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('[Server] Uncaught Exception:', err);
  process.exit(1);
});

export default server;
