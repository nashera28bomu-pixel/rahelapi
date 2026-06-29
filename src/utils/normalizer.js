/**
 * @file utils/normalizer.js
 * @description Response normalization layer.
 *
 * Transforms raw MovieBox Python data into a consistent Cymor API format.
 * The frontend NEVER sees MovieBox-specific field names.
 * If MovieBox changes its response structure, only this file needs updating.
 *
 * Provider pattern: each provider implements this same normalization interface.
 */

/**
 * Normalize a search result item from MovieBox into Cymor format.
 * @param {object} item - Raw item from Python bridge
 * @returns {object} Normalized content item
 */
export const normalizeSearchItem = (item) => {
  if (!item) return null;
  const raw = item._raw || item;

  return {
    id: item.id || raw.id || raw.item_id || null,
    title: item.title || raw.title || raw.name || 'Unknown Title',
    year: item.year || raw.year || raw.release_year || null,
    poster: item.poster || raw.poster_url || raw.thumbnail || raw.cover || null,
    page_url: item.page_url || raw.page_url || null,
    content_type: item.content_type || 'unknown',
    rating: raw.rating || raw.score || null,
    genre: raw.genre || raw.genres || null,
    description: raw.description || raw.overview || null,
  };
};

/**
 * Normalize full content details (movie or series).
 * @param {object} raw - Raw details from Python bridge
 * @param {'movie'|'series'} contentType
 * @returns {object} Normalized content details
 */
export const normalizeContentDetails = (raw, contentType = 'movie') => {
  if (!raw) return null;

  const base = {
    id: raw.id || raw.item_id || null,
    title: raw.title || raw.name || 'Unknown Title',
    original_title: raw.original_title || raw.original_name || null,
    year: raw.year || raw.release_year || null,
    release_date: raw.release_date || raw.aired || null,
    poster: raw.poster_url || raw.thumbnail || raw.cover || null,
    backdrop: raw.backdrop || raw.banner || null,
    description: raw.description || raw.overview || raw.plot || null,
    rating: raw.rating || raw.score || null,
    duration: raw.duration || raw.runtime || null,
    genres: normalizeGenres(raw.genre || raw.genres),
    cast: normalizeCast(raw.actors || raw.cast || raw.casts),
    director: raw.director || raw.directors || null,
    language: raw.language || raw.languages || null,
    country: raw.country || null,
    content_type: contentType,
    page_url: raw.page_url || null,
  };

  if (contentType === 'series') {
    base.seasons = raw.seasons || raw.season_count || null;
    base.episodes = raw.episodes || null;
    base.status = raw.status || null;
    base.network = raw.network || null;
  }

  return base;
};

/**
 * Normalize a list of download links from MovieBox into Cymor format.
 * @param {Array} downloads - Raw download items from Python bridge
 * @returns {Array} Normalized download links
 */
export const normalizeDownloads = (downloads = []) => {
  if (!Array.isArray(downloads)) return [];

  return downloads
    .filter(Boolean)
    .map((item) => ({
      quality: item.quality || item.resolution || item.label || 'Unknown',
      size: item.size || item.file_size || null,
      url: item.url || item.download_url || item.link || null,
      format: item.format || item.extension || 'mp4',
      language: item.language || item.lang || null,
      provider: 'moviebox',
    }))
    .filter((d) => d.url); // Only include items with valid URLs
};

/**
 * Normalize subtitle/caption links.
 * @param {Array} captions - Raw caption items from Python bridge
 * @returns {Array} Normalized subtitle entries
 */
export const normalizeSubtitles = (captions = []) => {
  if (!Array.isArray(captions)) return [];

  return captions
    .filter(Boolean)
    .map((item, index) => ({
      language: item.language || item.lang || 'Unknown',
      country: item.country || null,
      url: item.url || item.subtitle_url || item.link || null,
      format: item.format || 'srt',
      is_default: index === 0, // First subtitle is default
      provider: 'moviebox',
    }))
    .filter((s) => s.url);
};

/**
 * Normalize search results list.
 * @param {Array} items
 * @returns {Array}
 */
export const normalizeSearchResults = (items = []) => {
  if (!Array.isArray(items)) return [];
  return items.map(normalizeSearchItem).filter(Boolean);
};

/**
 * Normalize genres into a clean array.
 * @param {any} genres
 * @returns {string[]}
 */
const normalizeGenres = (genres) => {
  if (!genres) return [];
  if (Array.isArray(genres)) return genres.map(String);
  if (typeof genres === 'string') return genres.split(',').map((g) => g.trim()).filter(Boolean);
  return [];
};

/**
 * Normalize cast list.
 * @param {any} cast
 * @returns {Array}
 */
const normalizeCast = (cast) => {
  if (!cast) return [];
  if (Array.isArray(cast)) {
    return cast.slice(0, 10).map((c) => {
      if (typeof c === 'string') return { name: c };
      return { name: c.name || c.actor || String(c), role: c.role || c.character || null };
    });
  }
  return [];
};

export default {
  normalizeSearchItem,
  normalizeContentDetails,
  normalizeDownloads,
  normalizeSubtitles,
  normalizeSearchResults,
};
