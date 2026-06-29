/**
 * @file controllers/series.controller.js
 * @description Handles TV series-specific endpoints.
 */

import movieboxService from '../services/moviebox.service.js';
import response from '../utils/response.js';

/**
 * GET /api/v1/series/trending
 */
export const getTrending = async (req, res, next) => {
  try {
    const data = await movieboxService.getTrendingSeries(req.query.page);
    return response.success(res, data, 'Trending series fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/series/popular
 */
export const getPopular = async (req, res, next) => {
  try {
    const data = await movieboxService.getPopularSeries(req.query.page);
    return response.success(res, data, 'Popular series fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/series/latest
 */
export const getLatest = async (req, res, next) => {
  try {
    const data = await movieboxService.getLatestSeries(req.query.page);
    return response.success(res, data, 'Latest series fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/series/:id/episodes/:episode
 * Query params: season, page_url
 *
 * Returns download links for a specific episode.
 * :id is used as an identifier / slug for the series.
 * The actual lookup uses page_url query param from MovieBox.
 */
export const getEpisode = async (req, res, next) => {
  try {
    const { episode } = req.params;
    const { page_url, season = 1 } = req.query;

    const data = await movieboxService.getSeriesEpisodeDownloads(page_url, season, episode);
    return response.success(res, data, `Episode S${season}E${episode} links fetched`);
  } catch (err) {
    next(err);
  }
};
