/**
 * @file routes/content.routes.js
 * @description Unified content routes for details, streams, downloads, subtitles.
 */

import { Router } from 'express';
import {
  getDetails,
  getStreams,
  getDownloads,
  getSubtitles,
} from '../controllers/content.controller.js';

const router = Router();

/**
 * GET /api/v1/content/:id
 * Query: page_url (required), content_type (movie|series)
 */
router.get('/:id', getDetails);

/**
 * GET /api/v1/content/:id/streams
 * Query: page_url, content_type, season, episode
 */
router.get('/:id/streams', getStreams);

/**
 * GET /api/v1/content/:id/downloads
 * Query: page_url, content_type, season, episode
 */
router.get('/:id/downloads', getDownloads);

/**
 * GET /api/v1/content/:id/subtitles
 * Query: page_url, content_type, season, episode
 */
router.get('/:id/subtitles', getSubtitles);

export default router;
