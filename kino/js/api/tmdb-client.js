/**
 * Court Side Kino – TMDb API Client
 * @see https://developer.themoviedb.org/docs
 *
 * Browser requests go through FILM_SYNC_WORKER_URL proxy (TMDb blocks CORS).
 * Worker bundle can call TMDb directly with TMDB_API_KEY.
 */

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

/** @typedef {Object} TMDbSearchResult */
/** @typedef {Object} TMDbMovieDetails */

/**
 * Build TMDb API URL – uses proxy worker when no direct apiKey
 * @param {string} path - e.g. '/search/movie'
 * @param {Record<string, string|number>} [params]
 * @returns {string}
 */
function buildTMDbUrl(path, params = {}) {
  const proxyUrl = CONFIG.FILM_SYNC_WORKER_URL;
  if (proxyUrl && !proxyUrl.includes('YOUR_SUBDOMAIN')) {
    const qs = new URLSearchParams({ path, ...stringifyParams(params) });
    return `${proxyUrl}/tmdb?${qs}`;
  }
  const qs = new URLSearchParams({
    ...stringifyParams(params),
    api_key: CONFIG.TMDB_API_KEY || '',
  });
  return `${TMDB_BASE}${path}?${qs}`;
}

function stringifyParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)])
  );
}

/**
 * Rate-limited fetch with retry on 429
 * @param {string} url
 * @param {number} [retries=2]
 * @returns {Promise<Response>}
 */
async function tmdbFetch(url, retries = 2) {
  const headers = {};
  if (CONFIG.TMDB_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${CONFIG.TMDB_ACCESS_TOKEN}`;
    headers.Accept = 'application/json';
  }

  const res = await fetch(url, { headers });

  if (res.status === 429 && retries > 0) {
    await delay(10000);
    return tmdbFetch(url, retries - 1);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TMDb API ${res.status}: ${text}`);
  }

  return res;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Search for a film by title and optional year
 * @param {string} title
 * @param {number} [year]
 * @returns {Promise<TMDbSearchResult|null>}
 */
async function searchFilmInTMDb(title, year) {
  const url = buildTMDbUrl('/search/movie', {
    query: title,
    year,
    language: 'de-DE',
  });

  const res = await tmdbFetch(url);
  const data = await res.json();
  const results = data.results || [];

  if (!results.length) return null;

  // Prefer exact year match
  if (year) {
    const yearMatch = results.find(r => {
      const releaseYear = r.release_date ? parseInt(r.release_date.slice(0, 4), 10) : null;
      return releaseYear === year;
    });
    if (yearMatch) return yearMatch;
  }

  return results[0];
}

/**
 * Get full movie details
 * @param {number} tmdbId
 * @returns {Promise<TMDbMovieDetails>}
 */
async function getFilmDetailsFromTMDb(tmdbId) {
  const url = buildTMDbUrl(`/movie/${tmdbId}`, {
    language: 'de-DE',
    append_to_response: 'credits,videos,images',
  });

  const res = await tmdbFetch(url);
  return res.json();
}

/**
 * Get poster and backdrop URLs
 * @param {number} tmdbId
 * @returns {Promise<{poster: string|null, backdrop: string|null}>}
 */
async function getFilmImagesFromTMDb(tmdbId) {
  const details = await getFilmDetailsFromTMDb(tmdbId);
  return extractImagesFromDetails(details);
}

/**
 * Extract best poster/backdrop from movie details or images response
 * @param {Object} details
 */
function extractImagesFromDetails(details) {
  const posterPath = details.poster_path
    || details.images?.posters?.[0]?.file_path;
  const backdropPath = details.backdrop_path
    || details.images?.backdrops?.[0]?.file_path;

  return {
    poster: posterPath ? `${TMDB_IMAGE_BASE}/w500${posterPath}` : null,
    backdrop: backdropPath ? `${TMDB_IMAGE_BASE}/w1280${backdropPath}` : null,
  };
}

/**
 * Get YouTube trailer URL if available
 * @param {number} tmdbId
 * @returns {Promise<string|null>}
 */
async function getFilmVideosFromTMDb(tmdbId) {
  const details = await getFilmDetailsFromTMDb(tmdbId);
  return extractTrailerFromDetails(details);
}

function extractTrailerFromDetails(details) {
  const videos = details.videos?.results || [];
  const trailer = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer')
    || videos.find(v => v.site === 'YouTube');
  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
}

/**
 * Get top cast names
 * @param {Object} details - Movie details with credits
 * @returns {string[]}
 */
function getCastFromDetails(details, limit = 5) {
  return (details.credits?.cast || [])
    .slice(0, limit)
    .map(c => c.name);
}

/**
 * Get director name from credits
 * @param {Object} details
 * @returns {string|null}
 */
function getDirectorFromDetails(details) {
  const director = (details.credits?.crew || []).find(c => c.job === 'Director');
  return director?.name || null;
}

/**
 * Map TMDb movie details to Supabase film record
 * @param {Object} details - TMDb movie details
 * @param {Object} meta - { slug, wikidataId, isPublicDomain }
 * @returns {Object}
 */
function mapTMDbToFilmRecord(details, meta = {}) {
  const { poster, backdrop } = extractImagesFromDetails(details);
  const genres = (details.genres || []).map(g => g.name);
  const releaseYear = details.release_date
    ? parseInt(details.release_date.slice(0, 4), 10)
    : meta.year;

  return {
    title: details.title || meta.title,
    slug: meta.slug || slugify(details.title),
    description: details.overview || '',
    genre: genres[0] || 'Klassiker',
    duration_min: details.runtime || 90,
    rating: details.adult ? 'FSK 18' : null,
    trailer_url: extractTrailerFromDetails(details),
    poster_url: poster,
    backdrop_url: backdrop,
    director: getDirectorFromDetails(details) || meta.director,
    cast: getCastFromDetails(details),
    release_year: releaseYear,
    tmdb_id: details.id,
    wikidata_id: meta.wikidataId || null,
    source: 'tmdb',
    is_public_domain: meta.isPublicDomain !== false,
    video_sources: buildVideoSourcesFromTMDb(details),
    last_synced: new Date().toISOString(),
    imdb_id: details.imdb_id || null,
    is_featured: false,
  };
}

function buildVideoSourcesFromTMDb(details) {
  const sources = [];
  const trailer = extractTrailerFromDetails(details);
  if (trailer) {
    sources.push({ type: 'youtube', url: trailer, label: 'Trailer' });
  }
  return sources;
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Export for module environments; globals for browser
if (typeof window !== 'undefined') {
  window.TMDbClient = {
    searchFilmInTMDb,
    getFilmDetailsFromTMDb,
    getFilmImagesFromTMDb,
    getFilmVideosFromTMDb,
    mapTMDbToFilmRecord,
    extractImagesFromDetails,
    extractTrailerFromDetails,
    getCastFromDetails,
    getDirectorFromDetails,
    TMDB_IMAGE_BASE,
  };
}
