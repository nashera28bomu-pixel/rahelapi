/**
 * @file controllers/content.controller.js
 * @description Unified content controller.
 *
 * A single set of endpoints handles both movies and series.
 * The frontend passes `content_type` (movie|series) as a query param.
 * All content-specific routing is handled here.
 *
 * The `id` param in routes is a slug/identifier.
 * The actual MovieBox lookup uses `page_url` from the query string
 * (obtained from search results).
 */

import movieboxService from '../services/moviebox.service.js';
import response from '../utils/response.js';
import { ValidationError } from '../utils/errors.js';

/**
 * GET /api/v1/content/:id
 * Query params: page_url (required), content_type (movie|series)
 *
 * Returns normalized content details.
 */
export const getDetails = async (req, res, next) => {
  try {
    const { page_url, content_type = 'movie' } = req.query;

    if (!page_url) {
      throw new ValidationError('page_url query parameter is required');
    }

    let data;
    if (content_type === 'series') {
      data = await movieboxService.getSeriesDetails(page_url);
    } else {
      data = await movieboxService.getMovieDetails(page_url);
    }

    return response.success(res, data, 'Content details fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/content/:id/streams
 * Alias for downloads — returns video stream/download links.
 * Query params: page_url (required), content_type (movie|series), season, episode
 */
export const getStreams = async (req, res, next) => {
  try {
    const { page_url, content_type = 'movie', season = 1, episode = 1 } = req.query;

    if (!page_url) {
      throw new ValidationError('page_url query parameter is required');
    }

    let data;
    if (content_type === 'series') {
      data = await movieboxService.getSeriesEpisodeDownloads(page_url, season, episode);
    } else {
      data = await movieboxService.getMovieDownloads(page_url);
    }

    return response.success(res, data, 'Stream links fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/content/:id/downloads
 * Returns download file links (video + subtitles).
 * Same as streams — both are direct file links from MovieBox.
 * Query params: page_url (required), content_type, season, episode
 */
export const getDownloads = async (req, res, next) => {
  try {
    const { page_url, content_type = 'movie', season = 1, episode = 1 } = req.query;

    if (!page_url) {
      throw new ValidationError('page_url query parameter is required');
    }

    let data;
    if (content_type === 'series') {
      data = await movieboxService.getSeriesEpisodeDownloads(page_url, season, episode);
    } else {
      data = await movieboxService.getMovieDownloads(page_url);
    }

    return response.success(res, data, 'Download links fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/content/:id/subtitles
 * Returns subtitle/caption links only.
 * Query params: page_url (required), content_type, season, episode
 */
export const getSubtitles = async (req, res, next) => {
  try {
    const { page_url, content_type = 'movie', season = 1, episode = 1 } = req.query;

    if (!page_url) {
      throw new ValidationError('page_url query parameter is required');
    }

    let data;
    if (content_type === 'series') {
      data = await movieboxService.getSeriesEpisodeDownloads(page_url, season, episode);
    } else {
      data = await movieboxService.getMovieDownloads(page_url);
    }

    // Return only subtitle portion
    return response.success(
      res,
      { subtitles: data.subtitles || [] },
      'Subtitles fetched'
    );
  } catch (err) {
    next(err);
  }
};
