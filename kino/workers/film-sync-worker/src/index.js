/**
 * Court Side Kino – Film Sync Worker
 * Server-side TMDb + Wikidata sync → Supabase (keeps API keys secret)
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE = 'https://image.tmdb.org/t/p';
const SYNC_DELAY = 300;

const PUBLIC_DOMAIN_FILMS = [
  { title: 'Nosferatu – Eine Symphonie des Grauens', year: 1922, director: 'F.W. Murnau', wikidataId: 'Q151895', tmdbSearchTitle: 'Nosferatu', slug: 'nosferatu' },
  { title: 'Metropolis', year: 1927, director: 'Fritz Lang', wikidataId: 'Q151756', tmdbSearchTitle: 'Metropolis', slug: 'metropolis' },
  { title: 'Das Cabinet des Dr. Caligari', year: 1920, director: 'Robert Wiene', wikidataId: 'Q506403', tmdbSearchTitle: 'The Cabinet of Dr. Caligari', slug: 'cabinet-des-dr-caligari' },
  { title: 'Die Nacht der lebenden Toten', year: 1968, director: 'George A. Romero', wikidataId: 'Q126867', tmdbSearchTitle: 'Night of the Living Dead', slug: 'night-of-the-living-dead' },
  { title: 'Battleship Potemkin', year: 1925, director: 'Sergei Eisenstein', wikidataId: 'Q171699', tmdbSearchTitle: 'Battleship Potemkin', slug: 'battleship-potemkin' },
  { title: 'Der Mann mit der Kamera', year: 1929, director: 'Dziga Vertov', wikidataId: 'Q174289', tmdbSearchTitle: 'Man with a Movie Camera', slug: 'man-with-a-movie-camera' },
  { title: 'Steamboat Willie', year: 1928, director: 'Walt Disney', wikidataId: 'Q191447', tmdbSearchTitle: 'Steamboat Willie', slug: 'steamboat-willie' },
  { title: 'The Great Train Robbery', year: 1903, director: 'Edwin S. Porter', wikidataId: 'Q841487', tmdbSearchTitle: 'The Great Train Robbery', slug: 'the-great-train-robbery' },
  { title: 'Sunrise – Lied von zwei Menschen', year: 1927, director: 'F.W. Murnau', wikidataId: 'Q728055', tmdbSearchTitle: 'Sunrise: A Song of Two Humans', slug: 'sunrise' },
  { title: 'Freaks', year: 1932, director: 'Tod Browning', wikidataId: 'Q1145802', tmdbSearchTitle: 'Freaks', slug: 'freaks' },
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

const delay = ms => new Promise(r => setTimeout(r, ms));

// ============================================================
// TMDb
// ============================================================

async function tmdbFetch(path, params, apiKey, accessToken) {
  const qs = new URLSearchParams({ ...params, language: 'de-DE' });
  if (apiKey) qs.set('api_key', apiKey);

  const headers = { Accept: 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${TMDB_BASE}${path}?${qs}`, { headers });
  if (res.status === 429) {
    await delay(10000);
    return tmdbFetch(path, params, apiKey, accessToken);
  }
  if (!res.ok) throw new Error(`TMDb ${res.status}: ${await res.text()}`);
  return res.json();
}

async function searchTMDb(title, year, env) {
  const data = await tmdbFetch('/search/movie', { query: title, year: String(year) }, env.TMDB_API_KEY, env.TMDB_ACCESS_TOKEN);
  const results = data.results || [];
  if (!results.length) return null;
  const match = results.find(r => r.release_date?.startsWith(String(year)));
  return match || results[0];
}

async function getTMDbDetails(id, env) {
  return tmdbFetch(`/movie/${id}`, { append_to_response: 'credits,videos,images' }, env.TMDB_API_KEY, env.TMDB_ACCESS_TOKEN);
}

function mapTMDb(details, meta) {
  const poster = details.poster_path ? `${TMDB_IMAGE}/w500${details.poster_path}` : null;
  const backdrop = details.backdrop_path ? `${TMDB_IMAGE}/w1280${details.backdrop_path}` : null;
  const trailer = (details.videos?.results || []).find(v => v.site === 'YouTube');
  const director = (details.credits?.crew || []).find(c => c.job === 'Director');
  const cast = (details.credits?.cast || []).slice(0, 5).map(c => c.name);

  return {
    title: meta.title,
    slug: meta.slug,
    description: details.overview || '',
    genre: details.genres?.[0]?.name || 'Klassiker',
    duration_min: details.runtime || 90,
    trailer_url: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
    poster_url: poster,
    backdrop_url: backdrop,
    director: director?.name || meta.director,
    cast,
    release_year: meta.year,
    tmdb_id: details.id,
    wikidata_id: meta.wikidataId,
    source: 'tmdb',
    is_public_domain: true,
    is_featured: false,
    video_sources: trailer ? [{ type: 'youtube', url: `https://www.youtube.com/watch?v=${trailer.key}`, label: 'Trailer' }] : [],
    imdb_id: details.imdb_id || null,
    last_synced: new Date().toISOString(),
  };
}

// ============================================================
// Wikidata
// ============================================================

async function getWikidataEntity(qid) {
  const id = qid.replace(/^Q/, '');
  const res = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/Q${id}.json`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.entities?.[`Q${id}`] || null;
}

function getClaims(entity, prop) {
  return (entity.claims?.[prop] || []).map(c => c.mainsnak?.datavalue?.value).filter(Boolean);
}

function wikidataEnrich(entity, film) {
  const images = getClaims(entity, 'P18');
  const videos = getClaims(entity, 'P7422').map(v => typeof v === 'string' ? v : v?.url).filter(Boolean);
  const imdb = getClaims(entity, 'P345');

  if (!film.poster_url && images[0]) {
    film.poster_url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(images[0])}?width=500`;
    film.backdrop_url = film.poster_url;
  }

  const videoSources = [...(film.video_sources || [])];
  for (const url of videos) {
    if (!videoSources.some(v => v.url === url)) {
      const type = url.includes('youtube') ? 'youtube' : url.includes('archive.org') ? 'archive' : 'commons';
      videoSources.push({ type, url, label: type === 'archive' ? 'Internet Archive' : 'Video' });
    }
  }
  film.video_sources = videoSources;
  film.imdb_id = film.imdb_id || (imdb[0] ? String(imdb[0]) : null);
  film.wikidata_id = film.wikidata_id || entity.id;
  return film;
}

async function wikidataOnly(meta) {
  const entity = await getWikidataEntity(meta.wikidataId);
  if (!entity) return null;

  const labels = entity.labels || {};
  const title = labels.de?.value || labels.en?.value || meta.title;
  const images = getClaims(entity, 'P18');
  const videos = getClaims(entity, 'P7422').map(v => typeof v === 'string' ? v : v?.url).filter(Boolean);

  const poster = images[0]
    ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(images[0])}?width=500`
    : null;

  return {
    title: meta.title,
    slug: meta.slug,
    description: '',
    genre: 'Klassiker',
    duration_min: 90,
    poster_url: poster,
    backdrop_url: poster,
    director: meta.director,
    cast: [],
    release_year: meta.year,
    wikidata_id: meta.wikidataId,
    source: 'wikidata',
    is_public_domain: true,
    is_featured: false,
    video_sources: videos.map(url => ({
      type: url.includes('youtube') ? 'youtube' : url.includes('archive.org') ? 'archive' : 'commons',
      url,
      label: 'Video',
    })),
    last_synced: new Date().toISOString(),
  };
}

// ============================================================
// Supabase
// ============================================================

async function upsertFilm(env, film) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/films?on_conflict=slug`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Prefer': 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(film),
  });

  if (!res.ok) throw new Error(`Supabase upsert: ${await res.text()}`);
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

// ============================================================
// Sync
// ============================================================

async function syncFilm(meta, env) {
  let film = null;
  let source = 'none';

  try {
    const hit = await searchTMDb(meta.tmdbSearchTitle, meta.year, env);
    if (hit?.id) {
      await delay(SYNC_DELAY);
      const details = await getTMDbDetails(hit.id, env);
      film = mapTMDb(details, meta);
      source = 'tmdb';
    }
  } catch (e) {
    console.warn(`TMDb failed: ${meta.title}`, e.message);
  }

  try {
    const entity = await getWikidataEntity(meta.wikidataId);
    if (entity) {
      if (film) {
        film = wikidataEnrich(entity, film);
      } else {
        film = await wikidataOnly(meta);
        source = 'wikidata';
      }
    }
  } catch (e) {
    console.warn(`Wikidata failed: ${meta.title}`, e.message);
  }

  if (!film) return { success: false, title: meta.title, error: 'Not found', source };

  const saved = await upsertFilm(env, film);
  return { success: true, title: meta.title, source, film: saved };
}

async function syncAll(env) {
  const results = [];
  let synced = 0, failed = 0;

  for (const meta of PUBLIC_DOMAIN_FILMS) {
    const result = await syncFilm(meta, env);
    results.push(result);
    if (result.success) synced++; else failed++;
    await delay(SYNC_DELAY);
  }

  return { synced, failed, results };
}

// ============================================================
// TMDb Proxy (for client-side reads)
// ============================================================

async function proxyTMDb(url, env) {
  const path = url.searchParams.get('path');
  if (!path) return json({ error: 'Missing path' }, 400);

  const params = {};
  for (const [k, v] of url.searchParams) {
    if (k !== 'path') params[k] = v;
  }
  if (env.TMDB_API_KEY) params.api_key = env.TMDB_API_KEY;
  params.language = 'de-DE';

  const headers = { Accept: 'application/json' };
  if (env.TMDB_ACCESS_TOKEN) headers.Authorization = `Bearer ${env.TMDB_ACCESS_TOKEN}`;

  const qs = new URLSearchParams(params);
  const res = await fetch(`${TMDB_BASE}${path}?${qs}`, { headers });
  const data = await res.json();
  return json(data, res.status);
}

// ============================================================
// Handler
// ============================================================

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url = new URL(request.url);

    try {
      // TMDb proxy
      if (url.pathname === '/tmdb') {
        return proxyTMDb(url, env);
      }

      // Sync all
      if (url.pathname === '/sync' && request.method === 'POST') {
        if ((!env.TMDB_API_KEY && !env.TMDB_ACCESS_TOKEN) || !env.SUPABASE_SERVICE_ROLE_KEY) {
          return json({ error: 'Worker not configured (need TMDB key + SUPABASE_SERVICE_ROLE_KEY)' }, 500);
        }
        const data = await syncAll(env);
        return json(data);
      }

      // Sync single
      const singleMatch = url.pathname.match(/^\/sync\/([a-z0-9-]+)$/);
      if (singleMatch && request.method === 'POST') {
        const meta = PUBLIC_DOMAIN_FILMS.find(f => f.slug === singleMatch[1]);
        if (!meta) return json({ error: 'Unknown film' }, 404);
        const result = await syncFilm(meta, env);
        return json(result);
      }

      return json({ error: 'Not found' }, 404);
    } catch (err) {
      console.error(err);
      return json({ error: err.message }, 500);
    }
  },
};
