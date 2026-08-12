/**
 * Court Side Kino – Film Cache Service
 * Supabase-first loading with 7-day TTL
 */

/** Cache TTL: 7 days in milliseconds */
const FILM_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Check if cached film data is still valid
 * @param {Object} film - Film record from Supabase
 * @returns {boolean}
 */
function isCacheValid(film) {
  if (!film?.last_synced) return false;
  const synced = new Date(film.last_synced).getTime();
  return Date.now() - synced < FILM_CACHE_TTL_MS;
}

/**
 * Check if entire film catalog needs refresh
 * @param {Object[]} films
 * @returns {boolean}
 */
function isCatalogCacheStale(films) {
  if (!films?.length) return true;
  return films.some(f => !isCacheValid(f));
}

/**
 * Get film from Supabase by slug, tmdb_id, or wikidata_id
 * @param {string|number} identifier - slug, tmdb_id, or wikidata Q-ID
 * @returns {Promise<{data: Object|null, error: string|null}>}
 */
async function getFilmFromCache(identifier) {
  if (!identifier) return { data: null, error: 'Kein Identifier' };

  // Try slug first
  let result = await getFilmBySlug(String(identifier));
  if (result.data) return result;

  // Try tmdb_id
  if (/^\d+$/.test(String(identifier))) {
    result = await dbQuery(
      () => initSupabase().from('films').select('*').eq('tmdb_id', parseInt(identifier, 10)).maybeSingle(),
      'Film nicht im Cache'
    );
    if (result.data) return result;
  }

  // Try wikidata_id
  const qid = String(identifier).startsWith('Q') ? identifier : `Q${identifier}`;
  return dbQuery(
    () => initSupabase().from('films').select('*').eq('wikidata_id', qid).maybeSingle(),
    'Film nicht im Cache'
  );
}

/**
 * Get all public-domain films from Supabase
 * @returns {Promise<{data: Object[]|null, error: string|null}>}
 */
async function getPublicDomainFilmsFromCache() {
  return dbQuery(
    () => initSupabase()
      .from('films')
      .select('*')
      .eq('is_public_domain', true)
      .order('release_year', { ascending: true }),
    'Fehler beim Laden der Public-Domain-Filme'
  );
}

/**
 * Save or update film in Supabase cache
 * @param {Object} filmData - Normalized film record
 * @returns {Promise<{data: Object|null, error: string|null}>}
 */
async function saveFilmToCache(filmData) {
  if (!filmData?.slug) {
    return { data: null, error: 'Film slug fehlt' };
  }

  filmData.last_synced = new Date().toISOString();

  // Try upsert by slug
  return dbQuery(
    () => initSupabase()
      .from('films')
      .upsert(filmData, { onConflict: 'slug' })
      .select()
      .single(),
    'Fehler beim Speichern im Cache'
  );
}

/**
 * Map local JSON seed entries to displayable film records
 * @param {Object} meta
 * @param {number} index
 */
function mapLocalFilmMeta(meta, index = 0) {
  return {
    id: meta.slug || `local-${index}`,
    slug: meta.slug,
    title: meta.title,
    release_year: meta.year,
    director: meta.director || null,
    wikidata_id: meta.wikidataId || null,
    is_public_domain: true,
    is_featured: index < 3,
    genre: 'Klassiker',
    description: meta.alternativeTitles?.length
      ? `Auch bekannt als: ${meta.alternativeTitles.slice(0, 2).join(', ')}`
      : (meta.director
        ? `Public-Domain-Klassiker von ${meta.director} (${meta.year}).`
        : `Public-Domain-Film (${meta.year}).`),
    duration_min: null,
    poster_url: '',
    rating: null,
    source: 'local',
    last_synced: null,
  };
}

/**
 * Load films from local public-domain-films.json (offline / empty DB fallback)
 * @returns {Promise<Object[]>}
 */
async function loadFilmsFromLocalJson() {
  try {
    const list = typeof loadPublicDomainFilmList === 'function'
      ? await loadPublicDomainFilmList()
      : await (await fetch('data/public-domain-films.json')).json();

    if (!Array.isArray(list) || !list.length) return [];
    return list.map(mapLocalFilmMeta);
  } catch (err) {
    console.warn('Local film JSON fallback failed:', err);
    return [];
  }
}

/**
 * Load films – Supabase first, local JSON fallback, optional background sync
 * @param {Object} [options]
 * @param {boolean} [options.forceSync=false]
 * @returns {Promise<Object[]>}
 */
async function loadFilmsWithCache(options = {}) {
  const { forceSync = false } = options;

  const { data: films, error } = await getFilms();
  if (error) {
    console.warn('Supabase film load failed:', error);
  }

  const cached = films || [];
  const needsSync = forceSync || isCatalogCacheStale(cached);

  // Prefer live Supabase data when available
  if (cached.length && !forceSync) {
    if (needsSync && typeof syncFilmsFromAPIs === 'function') {
      syncFilmsFromAPIs({ silent: true }).catch(err => {
        console.warn('Background sync failed:', err);
      });
    }
    return cached;
  }

  // Empty DB or forced sync: try API sync, then fall back to local JSON
  if (needsSync && typeof syncFilmsFromAPIs === 'function') {
    try {
      await syncFilmsFromAPIs({ silent: true });
      const refreshed = await getFilms();
      if (refreshed.data?.length) return refreshed.data;
    } catch (err) {
      console.warn('Background sync failed, using local JSON fallback:', err);
    }
  }

  if (cached.length) return cached;

  const local = await loadFilmsFromLocalJson();
  if (local.length) {
    console.info(`Showing ${local.length} films from local JSON (Supabase empty or unreachable).`);
  }
  return local;
}

/**
 * Get cache age in human-readable German
 * @param {Object} film
 */
function getCacheAgeLabel(film) {
  if (!film?.last_synced) return 'Nicht synchronisiert';
  const days = Math.floor((Date.now() - new Date(film.last_synced).getTime()) / (86400000));
  if (days === 0) return 'Heute aktualisiert';
  if (days === 1) return 'Gestern aktualisiert';
  return `Vor ${days} Tagen aktualisiert`;
}

if (typeof window !== 'undefined') {
  window.FilmCache = {
    FILM_CACHE_TTL_MS,
    isCacheValid,
    isCatalogCacheStale,
    getFilmFromCache,
    getPublicDomainFilmsFromCache,
    saveFilmToCache,
    loadFilmsFromLocalJson,
    mapLocalFilmMeta,
    loadFilmsWithCache,
    getCacheAgeLabel,
  };
}
