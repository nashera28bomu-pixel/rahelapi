/**
 * @file controllers/home.controller.js
 * @description Handles the homepage content endpoint.
 */

import movieboxService from '../services/moviebox.service.js';
import response from '../utils/response.js';

/**
 * GET /api/v1/home
 * Returns featured, trending movies, and trending series for the homepage.
 */
export const getHome = async (req, res, next) => {
  try {
    const data = await movieboxService.getHomepage();
    return response.success(res, data, 'Homepage content fetched successfully');
  } catch (err) {
    next(err);
  }
};
