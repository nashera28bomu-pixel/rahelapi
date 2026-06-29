/**
 * @file routes/health.routes.js
 * @description Health check and API status routes.
 */

import { Router } from 'express';
import { health, status } from '../controllers/health.controller.js';

const router = Router();

/** GET /api/v1/health — fast ping, no external calls */
router.get('/health', health);

/** GET /api/v1/status — deep check including provider ping */
router.get('/status', status);

export default router;
