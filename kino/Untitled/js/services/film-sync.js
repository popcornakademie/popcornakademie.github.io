/**
 * Court Side Kino – Film Sync Service
 * Orchestrates TMDb → Wikidata fallback → Supabase cache
 */

/** Delay between TMDb requests (rate limit: ~40/10s) */
const SYNC_REQUEST_DELAY_MS = 300;

/**
 * Load public-domain film list
 * @returns {Promise<Object[]>}
 */
async function loadPublicDomainFilmList() {
  try {
    const res = await fetch('data/public-domain-films.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    console.error('Could not load public-domain-films.json:', err);
    return [];
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sync a single film: TMDb first, Wikidata fallback
 * @param {Object} filmMeta - Entry from public-domain-films.json
 * @returns {Promise<{success: boolean, source: string, film: Object|null, error?: string}>}
 */
async function syncSingleFilm(filmMeta) {
  const searchTitle = filmMeta.tmdbSearchTitle || filmMeta.title;
  let filmRecord = null;
  let source = 'none';

  try {
    // Step 1: Try TMDb
    const searchResult = await searchFilmInTMDb(searchTitle, filmMeta.year);

    if (searchResult?.id) {
      await delay(SYNC_REQUEST_DELAY_MS);
      const details = await getFilmDetailsFromTMDb(searchResult.id);
      filmRecord = mapTMDbToFilmRecord(details, {
        slug: filmMeta.slug,
        title: filmMeta.title,
        year: filmMeta.year,
        director: filmMeta.director,
        wikidataId: filmMeta.wikidataId,
        isPublicDomain: true,
      });
      source = 'tmdb';
    }
  } catch (err) {
    console.warn(`TMDb sync failed for "${filmMeta.title}":`, err.message);
  }

  // Step 2: Wikidata fallback or enrichment
  if (!filmRecord || !filmRecord.poster_url) {
    try {
      const wikidataFilm = await getFilmDetailsFromWikidata(filmMeta.wikidataId);

      if (wikidataFilm) {
        if (filmRecord) {
          // Merge: keep TMDb data, fill gaps from Wikidata
          filmRecord.poster_url = filmRecord.poster_url || wikidataFilm.poster_url;
          filmRecord.video_sources = mergeVideoSources(
            filmRecord.video_sources,
            wikidataFilm.video_sources
          );
          filmRecord.wikidata_id = filmMeta.wikidataId;
          filmRecord.imdb_id = filmRecord.imdb_id || wikidataFilm.imdb_id;
        } else {
          filmRecord = mapWikidataToFilmRecord(wikidataFilm, filmMeta);
          source = 'wikidata';
        }
      }
    } catch (err) {
      console.warn(`Wikidata sync failed for "${filmMeta.title}":`, err.message);
    }
  }

  if (!filmRecord) {
    return {
      success: false,
      source: 'none',
      film: null,
      error: `Film nicht gefunden: ${filmMeta.title}`,
    };
  }

  // Ensure metadata
  filmRecord.is_public_domain = true;
  filmRecord.is_featured = filmRecord.is_featured ?? false;

  // Step 3: Save to Supabase
  const { data, error } = await saveFilmToCache(filmRecord);

  if (error) {
    return { success: false, source, film: filmRecord, error };
  }

  return { success: true, source, film: data || filmRecord };
}

/**
 * Merge video source arrays, dedupe by URL
 * @param {Array} a
 * @param {Array} b
 */
function mergeVideoSources(a = [], b = []) {
  const seen = new Set();
  return [...a, ...b].filter(s => {
    if (!s?.url || seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });
}

/**
 * Sync all public-domain films
 * @param {Object} [options]
 * @param {Function} [options.onProgress] - (current, total, result) => void
 * @param {boolean} [options.silent=false]
 * @returns {Promise<{synced: number, failed: number, results: Object[]}>}
 */
async function syncFilmsFromAPIs(options = {}) {
  const { onProgress, silent = false } = options;

  // Prefer server-side sync worker (keeps TMDB_API_KEY secret)
  if (CONFIG.FILM_SYNC_WORKER_URL && !CONFIG.FILM_SYNC_WORKER_URL.includes('YOUR_SUBDOMAIN')) {
    return syncViaWorker(options);
  }

  const filmList = await loadPublicDomainFilmList();
  if (!filmList.length) {
    throw new Error('Keine Filme in public-domain-films.json gefunden');
  }

  if (!silent) setPageLoading(true, 'Filme werden synchronisiert...');

  const results = [];
  let synced = 0;
  let failed = 0;

  for (let i = 0; i < filmList.length; i++) {
    const meta = filmList[i];
    const result = await syncSingleFilm(meta);
    results.push({ title: meta.title, ...result });

    if (result.success) synced++;
    else failed++;

    onProgress?.(i + 1, filmList.length, result);

    if (i < filmList.length - 1) await delay(SYNC_REQUEST_DELAY_MS);
  }

  if (!silent) {
    setPageLoading(false);
    showToast(`${synced} Filme synchronisiert, ${failed} fehlgeschlagen`, synced > 0 ? 'success' : 'warning');
  }

  return { synced, failed, results };
}

/**
 * Trigger sync via Cloudflare Worker (recommended for production)
 * @param {Object} options
 */
async function syncViaWorker(options = {}) {
  const { onProgress, silent = false } = options;

  if (!silent) setPageLoading(true, 'Filme werden synchronisiert...');

  try {
    const res = await fetch(`${CONFIG.FILM_SYNC_WORKER_URL}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Sync worker error: ${res.status}`);
    }

    const data = await res.json();

    if (onProgress && data.results) {
      data.results.forEach((r, i) => onProgress(i + 1, data.results.length, r));
    }

    if (!silent) {
      showToast(
        `${data.synced} Filme synchronisiert${data.failed ? `, ${data.failed} fehlgeschlagen` : ''}`,
        data.synced > 0 ? 'success' : 'warning'
      );
    }

    return data;
  } finally {
    if (!silent) setPageLoading(false);
  }
}

/**
 * Sync one film by slug via worker or client
 * @param {string} slug
 */
async function syncFilmBySlug(slug) {
  if (CONFIG.FILM_SYNC_WORKER_URL && !CONFIG.FILM_SYNC_WORKER_URL.includes('YOUR_SUBDOMAIN')) {
    const res = await fetch(`${CONFIG.FILM_SYNC_WORKER_URL}/sync/${slug}`, { method: 'POST' });
    if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
    return res.json();
  }

  const filmList = await loadPublicDomainFilmList();
  const meta = filmList.find(f => f.slug === slug);
  if (!meta) throw new Error(`Unbekannter Film: ${slug}`);
  return syncSingleFilm(meta);
}

if (typeof window !== 'undefined') {
  window.FilmSync = {
    loadPublicDomainFilmList,
    syncSingleFilm,
    syncFilmsFromAPIs,
    syncFilmBySlug,
    syncViaWorker,
  };
}
