/**
 * @file services/moviebox.service.js
 * @description Core MovieBox service layer.
 *
 * This is the heart of the application. All business logic lives here.
 * Controllers call this service. The service calls the Python client.
 * Responses are normalized and cached before being returned.
 *
 * Provider pattern: if MovieBox is ever replaced, implement the same
 * method signatures in a new service file and swap the import in controllers.
 *
 * Cache strategy:
 *   ✅ Cached: search, homepage, content details
 *   ❌ Not cached: downloads, subtitles (URLs expire quickly)
 */

import pythonClient from './python.client.js';
import cacheService from './cache.service.js';
import normalizer from '../utils/normalizer.js';
import logger from '../utils/logger.js';
import { ValidationError, ProviderError } from '../utils/errors.js';
import { requireString, parseIntParam, validateContentType, sanitize } from '../utils/validate.js';

// ─── Helper: call Python and handle errors cleanly ───────────────────────────

/**
 * Call the Python bridge with error wrapping.
 * @param {string} action
 * @param {object} params
 * @returns {Promise<any>}
 */
const callBridge = async (action, params) => {
  try {
    return await pythonClient.callPython(action, params);
  } catch (err) {
    logger.error(`[MovieBoxService] Bridge error for action=${action}:`, err.message);
    throw err; // Re-throw — python.client already wraps in ApiError
  }
};

// ─── Search ──────────────────────────────────────────────────────────────────

/**
 * Search for content (movies, series, or both).
 * @param {object} options
 * @param {string} options.query - Search term
 * @param {'movie'|'series'|'all'} [options.type] - Content type filter
 * @param {number} [options.page]
 * @param {number} [options.perPage]
 * @returns {Promise<object>} Normalized search results
 */
const search = async ({ query, type = 'all', page = 1, perPage = 20 } = {}) => {
  const q = sanitize(requireString(query, 'query'));
  const t = validateContentType(type);
  const p = parseIntParam(page, 'page', 1, 100);
  const pp = parseIntParam(perPage, 'perPage', 20, 50);

  const cacheKey = cacheService.buildKey('search', q, t, p, pp);

  return cacheService.remember(cacheKey, async () => {
    logger.info(`[MovieBoxService] Searching: query="${q}" type=${t} page=${p}`);
    const raw = await callBridge('search', { query: q, type: t, page: p, per_page: pp });

    return {
      items: normalizer.normalizeSearchResults(raw.items || []),
      pagination: {
        page: p,
        per_page: pp,
        has_more: raw.pager?.hasMore ?? false,
        total: raw.pager?.total ?? null,
      },
      query: q,
      content_type: t,
    };
  });
};

// ─── Homepage ─────────────────────────────────────────────────────────────────

/**
 * Get homepage content (trending movies and series).
 * @returns {Promise<object>} Homepage content object
 */
const getHomepage = async () => {
  const cacheKey = cacheService.buildKey('homepage');

  return cacheService.remember(cacheKey, async () => {
    logger.info('[MovieBoxService] Fetching homepage content');
    const raw = await callBridge('homepage', {});

    return {
      featured: normalizer.normalizeSearchResults(raw.featured || []),
      trending_movies: normalizer.normalizeSearchResults(raw.trending_movies || []),
      trending_series: normalizer.normalizeSearchResults(raw.trending_series || []),
    };
  });
};

// ─── Content Details ──────────────────────────────────────────────────────────

/**
 * Get details for a movie by page_url.
 * @param {string} pageUrl - The MovieBox page URL (e.g. /detail/avatar-WLDIi21IUBa?id=...)
 * @returns {Promise<object>} Normalized movie details
 */
const getMovieDetails = async (pageUrl) => {
  const url = requireString(pageUrl, 'page_url');
  const cacheKey = cacheService.buildKey('movie_details', url);

  return cacheService.remember(cacheKey, async () => {
    logger.info(`[MovieBoxService] Fetching movie details: ${url}`);
    const raw = await callBridge('movie_details', { page_url: url });
    return normalizer.normalizeContentDetails(raw, 'movie');
  });
};

/**
 * Get details for a TV series by page_url.
 * @param {string} pageUrl
 * @returns {Promise<object>} Normalized series details
 */
const getSeriesDetails = async (pageUrl) => {
  const url = requireString(pageUrl, 'page_url');
  const cacheKey = cacheService.buildKey('series_details', url);

  return cacheService.remember(cacheKey, async () => {
    logger.info(`[MovieBoxService] Fetching series details: ${url}`);
    const raw = await callBridge('series_details', { page_url: url });
    return normalizer.normalizeContentDetails(raw, 'series');
  });
};

// ─── Downloads ───────────────────────────────────────────────────────────────

/**
 * Get download links for a movie.
 * NOT cached — download URLs expire.
 * @param {string} pageUrl
 * @returns {Promise<object>} Downloads and subtitles
 */
const getMovieDownloads = async (pageUrl) => {
  const url = requireString(pageUrl, 'page_url');
  logger.info(`[MovieBoxService] Fetching movie downloads: ${url}`);

  const raw = await callBridge('movie_downloads', { page_url: url });

  return {
    downloads: normalizer.normalizeDownloads(raw.downloads || []),
    subtitles: normalizer.normalizeSubtitles(raw.captions || []),
  };
};

/**
 * Get download links for a specific episode of a TV series.
 * NOT cached — download URLs expire.
 * @param {string} pageUrl
 * @param {number} season
 * @param {number} episode
 * @returns {Promise<object>} Downloads and subtitles
 */
const getSeriesEpisodeDownloads = async (pageUrl, season, episode) => {
  const url = requireString(pageUrl, 'page_url');
  const s = parseIntParam(season, 'season', 1, 99);
  const e = parseIntParam(episode, 'episode', 1, 9999);

  logger.info(`[MovieBoxService] Fetching series downloads: ${url} S${s}E${e}`);

  const raw = await callBridge('series_downloads', {
    page_url: url,
    season: s,
    episode: e,
  });

  return {
    downloads: normalizer.normalizeDownloads(raw.downloads || []),
    subtitles: normalizer.normalizeSubtitles(raw.captions || []),
    season: s,
    episode: e,
  };
};

// ─── Trending / Popular / Latest (via search with empty query) ───────────────

/**
 * Generic discovery method — fetches content by searching with an empty-ish term.
 * MovieBox v1 doesn't expose a dedicated trending/popular endpoint;
 * this is the closest equivalent using the search mechanism.
 *
 * @param {'movie'|'series'} type
 * @param {string} category - Used in cache key (trending|popular|latest)
 * @param {number} page
 * @returns {Promise<object>}
 */
const getDiscoveryContent = async (type, category, page = 1) => {
  const t = validateContentType(type);
  const p = parseIntParam(page, 'page', 1, 100);
  const cacheKey = cacheService.buildKey('discovery', t, category, p);

  return cacheService.remember(cacheKey, async () => {
    logger.info(`[MovieBoxService] Discovery: type=${t} category=${category} page=${p}`);

    // Use different popular search terms per category to simulate discovery
    const DISCOVERY_QUERIES = {
      trending: 'the',
      popular: 'love',
      latest: '2024',
    };
    const q = DISCOVERY_QUERIES[category] || 'the';

    const raw = await callBridge('search', { query: q, type: t, page: p, per_page: 20 });

    return {
      items: normalizer.normalizeSearchResults(raw.items || []),
      category,
      content_type: t,
      pagination: {
        page: p,
        has_more: raw.pager?.hasMore ?? false,
      },
    };
  });
};

// Named exports for each discovery variant
const getTrendingMovies = (page) => getDiscoveryContent('movie', 'trending', page);
const getTrendingSeries = (page) => getDiscoveryContent('series', 'trending', page);
const getPopularMovies = (page) => getDiscoveryContent('movie', 'popular', page);
const getPopularSeries = (page) => getDiscoveryContent('series', 'popular', page);
const getLatestMovies = (page) => getDiscoveryContent('movie', 'latest', page);
const getLatestSeries = (page) => getDiscoveryContent('series', 'latest', page);

// ─── Provider Health Check ────────────────────────────────────────────────────

/**
 * Verify the Python bridge + MovieBox are reachable.
 * @returns {Promise<{ok: boolean, latency_ms: number}>}
 */
const checkHealth = async () => {
  const start = Date.now();
  try {
    await callBridge('search', { query: 'test', type: 'movie', page: 1, per_page: 1 });
    return { ok: true, latency_ms: Date.now() - start };
  } catch {
    return { ok: false, latency_ms: Date.now() - start };
  }
};

export default {
  search,
  getHomepage,
  getMovieDetails,
  getSeriesDetails,
  getMovieDownloads,
  getSeriesEpisodeDownloads,
  getTrendingMovies,
  getTrendingSeries,
  getPopularMovies,
  getPopularSeries,
  getLatestMovies,
  getLatestSeries,
  checkHealth,
};
