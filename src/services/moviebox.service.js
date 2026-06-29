/**
 * @file services/moviebox.service.js
 * @description Core MovieBox v2 service layer.
 * Uses moviebox_api.v2 which works by title-based lookup (not page_url).
 */

import pythonClient from './python.client.js';
import cacheService from './cache.service.js';
import normalizer from '../utils/normalizer.js';
import logger from '../utils/logger.js';
import { requireString, parseIntParam, validateContentType, sanitize } from '../utils/validate.js';

const callBridge = async (action, params) => {
  try {
    return await pythonClient.callPython(action, params);
  } catch (err) {
    logger.error(`[MovieBoxService] Bridge error for action=${action}:`, err.message);
    throw err;
  }
};

// ── Search ────────────────────────────────────────────────────────────────────

const search = async ({ query, type = 'all', page = 1, perPage = 20 } = {}) => {
  const q = sanitize(requireString(query, 'query'));
  const t = validateContentType(type);
  const cacheKey = cacheService.buildKey('search', q, t, page);

  return cacheService.remember(cacheKey, async () => {
    logger.info(`[MovieBoxService] search: "${q}" type=${t}`);
    const raw = await callBridge('search', { query: q, type: t });
    const items = raw.items || [];
    return {
      items: normalizer.normalizeSearchResults(items),
      query: q,
      content_type: t,
      total: items.length,
    };
  });
};

// ── Homepage ──────────────────────────────────────────────────────────────────

const getHomepage = async () => {
  return cacheService.remember(cacheService.buildKey('homepage'), async () => {
    logger.info('[MovieBoxService] Fetching homepage');
    const raw = await callBridge('homepage', {});
    return {
      featured: normalizer.normalizeSearchResults(raw.featured || []),
      trending_movies: normalizer.normalizeSearchResults(raw.trending_movies || []),
      trending_series: normalizer.normalizeSearchResults(raw.trending_series || []),
    };
  });
};

// ── Content Details ───────────────────────────────────────────────────────────

const getMovieDetails = async (title, year) => {
  const t = requireString(title, 'title');
  const cacheKey = cacheService.buildKey('movie_details', t, year || '');
  return cacheService.remember(cacheKey, async () => {
    logger.info(`[MovieBoxService] movie details: ${t}`);
    const raw = await callBridge('movie_details', { title: t, year });
    return normalizer.normalizeContentDetails(raw, 'movie');
  });
};

const getSeriesDetails = async (title, year) => {
  const t = requireString(title, 'title');
  const cacheKey = cacheService.buildKey('series_details', t, year || '');
  return cacheService.remember(cacheKey, async () => {
    logger.info(`[MovieBoxService] series details: ${t}`);
    const raw = await callBridge('series_details', { title: t, year });
    return normalizer.normalizeContentDetails(raw, 'series');
  });
};

// ── Streams / Downloads ───────────────────────────────────────────────────────

const getMovieDownloads = async (title, year) => {
  const t = requireString(title, 'title');
  logger.info(`[MovieBoxService] movie streams: ${t}`);
  const raw = await callBridge('movie_streams', { title: t, year });
  return {
    downloads: normalizer.normalizeDownloads(raw.downloads || []),
    subtitles: normalizer.normalizeSubtitles(raw.captions || []),
  };
};

const getSeriesEpisodeDownloads = async (title, season, episode, year) => {
  const t = requireString(title, 'title');
  const s = parseIntParam(season, 'season', 1, 99);
  const e = parseIntParam(episode, 'episode', 1, 9999);
  logger.info(`[MovieBoxService] series streams: ${t} S${s}E${e}`);
  const raw = await callBridge('series_streams', { title: t, season: s, episode: e, year });
  return {
    downloads: normalizer.normalizeDownloads(raw.downloads || []),
    subtitles: normalizer.normalizeSubtitles(raw.captions || []),
    season: s,
    episode: e,
  };
};

// ── Discovery ─────────────────────────────────────────────────────────────────

const DISCOVERY_QUERIES = { trending: 'the', popular: 'love', latest: '2024' };

const getDiscoveryContent = async (type, category, page = 1) => {
  const t = validateContentType(type);
  const cacheKey = cacheService.buildKey('discovery', t, category, page);
  return cacheService.remember(cacheKey, async () => {
    const q = DISCOVERY_QUERIES[category] || 'the';
    logger.info(`[MovieBoxService] discovery: type=${t} category=${category}`);
    const raw = await callBridge('search', { query: q, type: t });
    return {
      items: normalizer.normalizeSearchResults(raw.items || []),
      category,
      content_type: t,
    };
  });
};

const getTrendingMovies = (page) => getDiscoveryContent('movie', 'trending', page);
const getTrendingSeries = (page) => getDiscoveryContent('series', 'trending', page);
const getPopularMovies = (page) => getDiscoveryContent('movie', 'popular', page);
const getPopularSeries = (page) => getDiscoveryContent('series', 'popular', page);
const getLatestMovies = (page) => getDiscoveryContent('movie', 'latest', page);
const getLatestSeries = (page) => getDiscoveryContent('series', 'latest', page);

// ── Health ────────────────────────────────────────────────────────────────────

const checkHealth = async () => {
  const start = Date.now();
  try {
    await callBridge('search', { query: 'test', type: 'movie' });
    return { ok: true, latency_ms: Date.now() - start };
  } catch {
    return { ok: false, latency_ms: Date.now() - start };
  }
};

export default {
  search, getHomepage,
  getMovieDetails, getSeriesDetails,
  getMovieDownloads, getSeriesEpisodeDownloads,
  getTrendingMovies, getTrendingSeries,
  getPopularMovies, getPopularSeries,
  getLatestMovies, getLatestSeries,
  checkHealth,
};
