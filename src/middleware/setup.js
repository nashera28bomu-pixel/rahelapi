/**
 * @file middleware/setup.js
 * @description Registers all application-level middleware in the correct order.
 * Keeps app.js clean by encapsulating middleware registration.
 */

import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import express from 'express';
import env from '../config/env.js';

/**
 * Build CORS options from configuration.
 * @returns {object} cors options
 */
const buildCorsOptions = () => {
  const origins = env.allowedOrigins;

  if (origins === '*') {
    return { origin: '*', methods: ['GET', 'OPTIONS'] };
  }

  const allowedList = origins.split(',').map((o) => o.trim());
  return {
    origin: (origin, callback) => {
      if (!origin || allowedList.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' is not allowed`));
      }
    },
    methods: ['GET', 'OPTIONS'],
  };
};

/**
 * Build rate limiter middleware.
 * @returns {import('express').RequestHandler}
 */
const buildRateLimiter = () =>
  rateLimit({
    windowMs: env.rateLimit.windowMinutes * 60 * 1000,
    max: env.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: `Too many requests. Limit is ${env.rateLimit.max} per ${env.rateLimit.windowMinutes} minutes.`,
    },
    skip: (req) => req.path === '/api/v1/health', // Never rate-limit health checks
  });

/**
 * Register all middleware on the Express app.
 * @param {import('express').Application} app
 */
const setupMiddleware = (app) => {
  // Security headers
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false, // Allow video embeds
      contentSecurityPolicy: false,     // Let the frontend manage CSP
    })
  );

  // GZIP compression
  app.use(compression());

  // CORS
  app.use(cors(buildCorsOptions()));

  // Parse JSON bodies
  app.use(express.json({ limit: '10kb' })); // Reject huge payloads
  app.use(express.urlencoded({ extended: false }));

  // HTTP request logging
  const morganFormat = env.isProd ? 'combined' : 'dev';
  app.use(morgan(morganFormat));

  // Rate limiting
  app.use(buildRateLimiter());

  // Trust proxy (required for rate limiting behind Render/load balancers)
  app.set('trust proxy', 1);
};

export default setupMiddleware;
