/**
 * @file controllers/search.controller.js
 * @description Handles content search endpoints.
 */

import movieboxService from '../services/moviebox.service.js';
import response from '../utils/response.js';

/**
 * GET /api/v1/search
 * Query params: q (required), type (movie|series|all), page, per_page
 *
 * @example GET /api/v1/search?q=avatar&type=movie&page=1
 */
export const search = async (req, res, next) => {
  try {
    const { q, type = 'all', page = 1, per_page = 20 } = req.query;

    const data = await movieboxService.search({
      query: q,
      type,
      page,
      perPage: per_page,
    });

    return response.success(res, data, `Found results for "${q}"`);
  } catch (err) {
    next(err);
  }
};
