/**
 * Court Side Kino – Wikidata API Client
 * Fallback for Public-Domain films not fully covered by TMDb
 * @see https://www.wikidata.org/wiki/Wikidata:Data_access
 */

const WIKIDATA_ENTITY_URL = 'https://www.wikidata.org/wiki/Special:EntityData';
const WIKIDATA_API_URL = 'https://www.wikidata.org/w/api.php';
const COMMONS_FILE_PATH = 'https://commons.wikimedia.org/wiki/Special:FilePath';

/** Wikidata property IDs */
const WD = {
  INSTANCE_OF: 'P31',
  DIRECTOR: 'P57',
  PUBLICATION_DATE: 'P577',
  DURATION: 'P2047',
  IMAGE: 'P18',
  VIDEO: 'P7422',
  IMDB: 'P345',
  TMDB: 'P4947',
  TITLE: 'P1476',
  FILM: 'Q11424',
};

/**
 * Fetch entity JSON from Wikidata
 * @param {string} qid - e.g. 'Q151895'
 * @returns {Promise<Object>}
 */
async function getWikidataEntity(qid) {
  const id = qid.replace(/^Q/, '');
  const url = `${WIKIDATA_ENTITY_URL}/Q${id}.json`;

  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Wikidata entity ${qid}: ${res.status}`);

  const json = await res.json();
  return json.entities?.[`Q${id}`] || null;
}

/**
 * Get label in preferred language
 * @param {Object} entity
 * @param {string} [lang='de']
 */
function getEntityLabel(entity, lang = 'de') {
  const labels = entity.labels || {};
  return labels[lang]?.value || labels.en?.value || labels.de?.value || null;
}

/**
 * Get claim values for a property
 * @param {Object} entity
 * @param {string} propertyId
 */
function getClaimValues(entity, propertyId) {
  const claims = entity.claims?.[propertyId] || [];
  return claims.map(c => c.mainsnak?.datavalue?.value).filter(Boolean);
}

/**
 * Resolve Wikidata time value to year
 * @param {Object} timeValue
 */
function timeToYear(timeValue) {
  if (!timeValue?.time) return null;
  const match = timeValue.time.match(/([+-]?\d+)-/);
  return match ? Math.abs(parseInt(match[1], 10)) : null;
}

/**
 * Build Commons image URL from filename
 * @param {string} filename
 */
function commonsImageUrl(filename) {
  if (!filename) return null;
  return `${COMMONS_FILE_PATH}/${encodeURIComponent(filename)}?width=500`;
}

/**
 * Classify and normalize video URL
 * @param {string} url
 */
function classifyVideoUrl(url) {
  if (!url) return null;
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return { type: 'youtube', url, label: 'Video' };
  }
  if (url.includes('archive.org')) {
    return { type: 'archive', url, label: 'Internet Archive' };
  }
  if (url.includes('wikimedia.org') || url.includes('commons.wikimedia')) {
    return { type: 'commons', url, label: 'Wikimedia Commons' };
  }
  return { type: 'external', url, label: 'Video' };
}

/**
 * Extract video sources from Wikidata entity
 * @param {Object} entity
 * @returns {Array<{type: string, url: string, label: string}>}
 */
function getVideoSourcesFromEntity(entity) {
  const videoUrls = getClaimValues(entity, WD.VIDEO)
    .map(v => (typeof v === 'string' ? v : v.url || null))
    .filter(Boolean);

  const sources = videoUrls.map(classifyVideoUrl).filter(Boolean);

  // Deduplicate by URL
  const seen = new Set();
  return sources.filter(s => {
    if (seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });
}

/**
 * Search film via Wikidata entity lookup (by known Q-ID)
 * @param {string} wikidataId
 * @returns {Promise<Object|null>}
 */
async function getFilmDetailsFromWikidata(wikidataId) {
  const entity = await getWikidataEntity(wikidataId);
  if (!entity) return null;
  return parseWikidataFilm(entity, wikidataId);
}

/**
 * Search by title/year using Wikidata API search (fallback)
 * @param {string} title
 * @param {number} [year]
 */
async function searchFilmInWikidata(title, year) {
  const params = new URLSearchParams({
    action: 'wbsearchentities',
    search: title,
    language: 'de',
    format: 'json',
    origin: '*',
    type: 'item',
    limit: '5',
  });

  const res = await fetch(`${WIKIDATA_API_URL}?${params}`);
  if (!res.ok) throw new Error(`Wikidata search failed: ${res.status}`);

  const data = await res.json();
  const results = data.search || [];

  for (const hit of results) {
    const details = await getFilmDetailsFromWikidata(hit.id);
    if (!details) continue;
    if (!year || details.release_year === year || Math.abs((details.release_year || 0) - year) <= 1) {
      return details;
    }
  }

  return null;
}

/**
 * Parse Wikidata entity into film record shape
 * @param {Object} entity
 * @param {string} wikidataId
 */
function parseWikidataFilm(entity, wikidataId) {
  const title = getEntityLabel(entity, 'de') || getEntityLabel(entity, 'en');
  const pubDates = getClaimValues(entity, WD.PUBLICATION_DATE);
  const releaseYear = pubDates.length ? timeToYear(pubDates[0]) : null;

  const images = getClaimValues(entity, WD.IMAGE);
  const posterFilename = images[0];
  const posterUrl = typeof posterFilename === 'string'
    ? commonsImageUrl(posterFilename)
    : null;

  const durations = getClaimValues(entity, WD.DURATION);
  const durationMin = durations.length ? Math.round(durations[0].amount) : 90;

  const imdbIds = getClaimValues(entity, WD.IMDB);
  const tmdbIds = getClaimValues(entity, WD.TMDB);

  const videoSources = getVideoSourcesFromEntity(entity);

  return {
    title,
    description: '', // Wikidata rarely has descriptions in entity JSON; filled by TMDb merge
    genre: 'Klassiker',
    duration_min: durationMin,
    poster_url: posterUrl,
    backdrop_url: posterUrl,
    release_year: releaseYear,
    wikidata_id: wikidataId.startsWith('Q') ? wikidataId : `Q${wikidataId}`,
    tmdb_id: tmdbIds.length ? parseInt(String(tmdbIds[0]), 10) : null,
    imdb_id: imdbIds.length ? String(imdbIds[0]) : null,
    source: 'wikidata',
    is_public_domain: true,
    video_sources: videoSources,
    last_synced: new Date().toISOString(),
  };
}

/**
 * Map Wikidata film + meta to full Supabase record
 * @param {Object} wikidataFilm
 * @param {Object} meta - from public-domain-films.json
 */
function mapWikidataToFilmRecord(wikidataFilm, meta = {}) {
  const slug = meta.slug || slugify(wikidataFilm.title || meta.title);
  const trailerFromVideos = (wikidataFilm.video_sources || [])
    .find(v => v.type === 'youtube');

  return {
    title: meta.title || wikidataFilm.title,
    slug,
    description: wikidataFilm.description || meta.description || '',
    genre: wikidataFilm.genre || 'Klassiker',
    duration_min: wikidataFilm.duration_min || 90,
    rating: null,
    trailer_url: trailerFromVideos?.url || null,
    poster_url: wikidataFilm.poster_url,
    backdrop_url: wikidataFilm.backdrop_url || wikidataFilm.poster_url,
    director: meta.director || null,
    cast: [],
    release_year: meta.year || wikidataFilm.release_year,
    tmdb_id: wikidataFilm.tmdb_id || null,
    wikidata_id: wikidataFilm.wikidata_id || meta.wikidataId,
    source: 'wikidata',
    is_public_domain: true,
    video_sources: wikidataFilm.video_sources || [],
    last_synced: new Date().toISOString(),
    imdb_id: wikidataFilm.imdb_id || null,
    is_featured: false,
  };
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

if (typeof window !== 'undefined') {
  window.WikidataClient = {
    getWikidataEntity,
    getFilmDetailsFromWikidata,
    searchFilmInWikidata,
    mapWikidataToFilmRecord,
    getVideoSourcesFromEntity,
    commonsImageUrl,
  };
}
