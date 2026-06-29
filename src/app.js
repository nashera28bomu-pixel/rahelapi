/**
 * @file app.js
 * @description Express application factory.
 * Creates and configures the Express app without starting the server.
 * Separating app creation from server startup enables easier testing.
 */

import express from 'express';
import setupMiddleware from './middleware/setup.js';
import apiRoutes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import env from './config/env.js';

/**
 * Create and configure the Express application.
 * @returns {import('express').Application}
 */
const createApp = () => {
  const app = express();

  // ── Middleware ────────────────────────────────────────────────────────────
  setupMiddleware(app);

  // ── Welcome route (root) ──────────────────────────────────────────────────
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: `Welcome to ${env.api.name}`,
      version: env.api.version,
      docs: `https://github.com/CymorTech/cymor-movie-api`,
      endpoints: `/api/${env.api.version}`,
      health: `/api/${env.api.version}/health`,
    });
  });

  // ── API Routes ────────────────────────────────────────────────────────────
  app.use(`/api/${env.api.version}`, apiRoutes);

  // ── 404 Handler ───────────────────────────────────────────────────────────
  app.use(notFoundHandler);

  // ── Global Error Handler ─────────────────────────────────────────────────
  app.use(errorHandler);

  return app;
};

export default createApp;
