/**
 * @file routes/home.routes.js
 * @description Homepage content routes.
 */

import { Router } from 'express';
import { getHome } from '../controllers/home.controller.js';

const router = Router();

/** GET /api/v1/home */
router.get('/', getHome);

export default router;
