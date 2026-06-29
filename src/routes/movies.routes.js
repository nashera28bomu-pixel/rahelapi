/**
 * @file routes/movies.routes.js
 * @description Movie discovery routes.
 */

import { Router } from 'express';
import {
  getTrending,
  getPopular,
  getLatest,
} from '../controllers/movies.controller.js';

const router = Router();

/** GET /api/v1/movies/trending */
router.get('/trending', getTrending);

/** GET /api/v1/movies/popular */
router.get('/popular', getPopular);

/** GET /api/v1/movies/latest */
router.get('/latest', getLatest);

export default router;
