/**
 * @file routes/series.routes.js
 * @description TV series routes.
 */

import { Router } from 'express';
import {
  getTrending,
  getPopular,
  getLatest,
  getEpisode,
} from '../controllers/series.controller.js';

const router = Router();

/** GET /api/v1/series/trending */
router.get('/trending', getTrending);

/** GET /api/v1/series/popular */
router.get('/popular', getPopular);

/** GET /api/v1/series/latest */
router.get('/latest', getLatest);

/**
 * GET /api/v1/series/:id/episodes/:episode
 * Query: page_url (required), season
 */
router.get('/:id/episodes/:episode', getEpisode);

export default router;
