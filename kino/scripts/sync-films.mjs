#!/usr/bin/env node
/**
 * Local film sync: TMDb (+ Wikidata fallback) → Supabase
 * Run: node scripts/sync-films.mjs
 *
 * Uses TMDB_API_KEY from env or js/config.js values.
 * Uses Supabase anon key (RLS allows films insert/update).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE = 'https://image.tmdb.org/t/p';
const DELAY_MS = 350;

function loadConfig() {
  const raw = readFileSync(join(root, 'js/config.js'), 'utf8');
  const get = (key) => {
    const m = raw.match(new RegExp(`${key}:\\s*'([^']*)'`));
    return m ? m[1] : '';
  };
  return {
    supabaseUrl: get('SUPABASE_URL'),
    supabaseKey: get('SUPABASE_ANON_KEY'),
    tmdbKey: process.env.TMDB_API_KEY || get('TMDB_API_KEY'),
    tmdbToken: process.env.TMDB_ACCESS_TOKEN || get('TMDB_ACCESS_TOKEN'),
  };
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function tmdbFetch(path, params, cfg) {
  const qs = new URLSearchParams({ ...params, language: 'de-DE' });
  if (cfg.tmdbKey) qs.set('api_key', cfg.tmdbKey);

  const headers = { Accept: 'application/json' };
  if (cfg.tmdbToken) headers.Authorization = `Bearer ${cfg.tmdbToken}`;

  const res = await fetch(`${TMDB_BASE}${path}?${qs}`, { headers });
  if (res.status === 429) {
    await delay(10000);
    return tmdbFetch(path, params, cfg);
  }
  if (!res.ok) throw new Error(`TMDb ${res.status}: ${await res.text()}`);
  return res.json();
}

async function searchTMDb(title, year, cfg) {
  const data = await tmdbFetch('/search/movie', { query: title, year: String(year) }, cfg);
  const results = data.results || [];
  if (!results.length) return null;
  return results.find((r) => r.release_date?.startsWith(String(year))) || results[0];
}

async function getTMDbDetails(id, cfg) {
  return tmdbFetch(`/movie/${id}`, { append_to_response: 'credits,videos,images' }, cfg);
}

function mapTMDb(details, meta) {
  const poster = details.poster_path ? `${TMDB_IMAGE}/w500${details.poster_path}` : null;
  const backdrop = details.backdrop_path ? `${TMDB_IMAGE}/w1280${details.backdrop_path}` : null;
  const trailer = (details.videos?.results || []).find((v) => v.site === 'YouTube');
  const director = (details.credits?.crew || []).find((c) => c.job === 'Director');
  const cast = (details.credits?.cast || []).slice(0, 5).map((c) => c.name);

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
    is_featured: ['nosferatu', 'metropolis', 'cabinet-des-dr-caligari'].includes(meta.slug),
    video_sources: trailer
      ? [{ type: 'youtube', url: `https://www.youtube.com/watch?v=${trailer.key}`, label: 'Trailer' }]
      : [],
    imdb_id: details.imdb_id || null,
    last_synced: new Date().toISOString(),
    language: 'Deutsch',
  };
}

async function getWikidataEntity(qid) {
  const id = String(qid).replace(/^Q/, '');
  const res = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/Q${id}.json`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.entities?.[`Q${id}`] || null;
}

function getClaims(entity, prop) {
  return (entity.claims?.[prop] || [])
    .map((c) => c.mainsnak?.datavalue?.value)
    .filter(Boolean);
}

function wikidataFallback(meta, entity) {
  const images = getClaims(entity, 'P18');
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
    video_sources: [],
    last_synced: new Date().toISOString(),
    language: 'Deutsch',
  };
}

async function upsertFilm(cfg, film) {
  const res = await fetch(`${cfg.supabaseUrl}/rest/v1/films?on_conflict=slug`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: cfg.supabaseKey,
      Authorization: `Bearer ${cfg.supabaseKey}`,
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(film),
  });

  if (!res.ok) {
    throw new Error(`Supabase upsert (${film.slug}): ${await res.text()}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

async function syncFilm(meta, cfg) {
  let film = null;
  let source = 'none';

  try {
    const hit = await searchTMDb(meta.tmdbSearchTitle || meta.title, meta.year, cfg);
    if (hit?.id) {
      await delay(DELAY_MS);
      const details = await getTMDbDetails(hit.id, cfg);
      film = mapTMDb(details, meta);
      source = 'tmdb';
    }
  } catch (err) {
    console.warn(`  TMDb fail: ${meta.title} – ${err.message}`);
  }

  if (!film) {
    try {
      const entity = await getWikidataEntity(meta.wikidataId);
      if (entity) {
        film = wikidataFallback(meta, entity);
        source = 'wikidata';
      }
    } catch (err) {
      console.warn(`  Wikidata fail: ${meta.title} – ${err.message}`);
    }
  }

  if (!film) return { success: false, title: meta.title, source, error: 'Not found' };

  const saved = await upsertFilm(cfg, film);
  return { success: true, title: meta.title, source, slug: saved?.slug || meta.slug };
}

async function main() {
  const cfg = loadConfig();
  if (!cfg.tmdbKey && !cfg.tmdbToken) {
    console.error('Missing TMDB_API_KEY / TMDB_ACCESS_TOKEN');
    process.exit(1);
  }
  if (!cfg.supabaseUrl || !cfg.supabaseKey) {
    console.error('Missing Supabase config in js/config.js');
    process.exit(1);
  }

  const list = JSON.parse(readFileSync(join(root, 'data/public-domain-films.json'), 'utf8'));
  console.log(`Syncing ${list.length} films…\n`);

  let synced = 0;
  let failed = 0;

  for (let i = 0; i < list.length; i++) {
    const meta = list[i];
    process.stdout.write(`[${i + 1}/${list.length}] ${meta.title} … `);
    try {
      const result = await syncFilm(meta, cfg);
      if (result.success) {
        synced++;
        console.log(`✓ ${result.source}`);
      } else {
        failed++;
        console.log(`✗ ${result.error}`);
      }
    } catch (err) {
      failed++;
      console.log(`✗ ${err.message}`);
    }
    await delay(DELAY_MS);
  }

  console.log(`\nDone: ${synced} synced, ${failed} failed`);
  if (failed && !synced) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
