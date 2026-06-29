/**
 * @file routes/index.js
 * @description Central route registry.
 * Mounts all route modules under the /api/v1 prefix.
 * Adding a new resource only requires registering it here.
 */

import { Router } from 'express';
import homeRoutes from './home.routes.js';
import searchRoutes from './search.routes.js';
import moviesRoutes from './movies.routes.js';
import seriesRoutes from './series.routes.js';
import contentRoutes from './content.routes.js';
import healthRoutes from './health.routes.js';

const router = Router();

// ─── API v1 Routes ────────────────────────────────────────────────────────────
router.use('/home', homeRoutes);
router.use('/search', searchRoutes);
router.use('/movies', moviesRoutes);
router.use('/series', seriesRoutes);
router.use('/content', contentRoutes);
router.use('/', healthRoutes); // /health and /status

export default router;
