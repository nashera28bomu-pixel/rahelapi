/**
 * @file controllers/movies.controller.js
 * @description Handles movie-specific endpoints (trending, popular, latest).
 */

import movieboxService from '../services/moviebox.service.js';
import response from '../utils/response.js';

/**
 * GET /api/v1/movies/trending
 */
export const getTrending = async (req, res, next) => {
  try {
    const data = await movieboxService.getTrendingMovies(req.query.page);
    return response.success(res, data, 'Trending movies fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/movies/popular
 */
export const getPopular = async (req, res, next) => {
  try {
    const data = await movieboxService.getPopularMovies(req.query.page);
    return response.success(res, data, 'Popular movies fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/movies/latest
 */
export const getLatest = async (req, res, next) => {
  try {
    const data = await movieboxService.getLatestMovies(req.query.page);
    return response.success(res, data, 'Latest movies fetched');
  } catch (err) {
    next(err);
  }
};
