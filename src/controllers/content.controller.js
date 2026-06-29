/**
 * @file controllers/content.controller.js
 * @description Unified content controller.
 * v2 uses title-based lookup. Pass ?title=Avatar&content_type=movie
 */

import movieboxService from '../services/moviebox.service.js';
import response from '../utils/response.js';
import { ValidationError } from '../utils/errors.js';

const requireTitle = (req) => {
  const title = req.query.title || req.params.id;
  if (!title) throw new ValidationError('title query parameter is required');
  return decodeURIComponent(title);
};

/** GET /api/v1/content/:id  — :id can be the title slug */
export const getDetails = async (req, res, next) => {
  try {
    const title = requireTitle(req);
    const { content_type = 'movie', year } = req.query;
    const data = content_type === 'series'
      ? await movieboxService.getSeriesDetails(title, year)
      : await movieboxService.getMovieDetails(title, year);
    return response.success(res, data, 'Content details fetched');
  } catch (err) { next(err); }
};

/** GET /api/v1/content/:id/streams */
export const getStreams = async (req, res, next) => {
  try {
    const title = requireTitle(req);
    const { content_type = 'movie', season = 1, episode = 1, year } = req.query;
    const data = content_type === 'series'
      ? await movieboxService.getSeriesEpisodeDownloads(title, season, episode, year)
      : await movieboxService.getMovieDownloads(title, year);
    return response.success(res, data, 'Stream links fetched');
  } catch (err) { next(err); }
};

/** GET /api/v1/content/:id/downloads */
export const getDownloads = async (req, res, next) => {
  try {
    const title = requireTitle(req);
    const { content_type = 'movie', season = 1, episode = 1, year } = req.query;
    const data = content_type === 'series'
      ? await movieboxService.getSeriesEpisodeDownloads(title, season, episode, year)
      : await movieboxService.getMovieDownloads(title, year);
    return response.success(res, data, 'Download links fetched');
  } catch (err) { next(err); }
};

/** GET /api/v1/content/:id/subtitles */
export const getSubtitles = async (req, res, next) => {
  try {
    const title = requireTitle(req);
    const { content_type = 'movie', season = 1, episode = 1, year } = req.query;
    const data = content_type === 'series'
      ? await movieboxService.getSeriesEpisodeDownloads(title, season, episode, year)
      : await movieboxService.getMovieDownloads(title, year);
    return response.success(res, { subtitles: data.subtitles || [] }, 'Subtitles fetched');
  } catch (err) { next(err); }
};
