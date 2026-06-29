/**
 * @file routes/search.routes.js
 * @description Search routes.
 */

import { Router } from 'express';
import { search } from '../controllers/search.controller.js';

const router = Router();

/**
 * GET /api/v1/search
 * Query: q (required), type (movie|series|all), page, per_page
 */
router.get('/', search);

export default router;
