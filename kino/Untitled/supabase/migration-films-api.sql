-- Court Side Kino – Films Table Migration (TMDb + Wikidata)
-- Run after schema.sql in Supabase SQL Editor

-- ============================================================
-- NEW COLUMNS
-- ============================================================
ALTER TABLE films ADD COLUMN IF NOT EXISTS release_year INTEGER;
ALTER TABLE films ADD COLUMN IF NOT EXISTS tmdb_id INTEGER UNIQUE;
ALTER TABLE films ADD COLUMN IF NOT EXISTS wikidata_id TEXT UNIQUE;
ALTER TABLE films ADD COLUMN IF NOT EXISTS source TEXT CHECK (source IN ('tmdb', 'wikidata', 'manual'));
ALTER TABLE films ADD COLUMN IF NOT EXISTS is_public_domain BOOLEAN DEFAULT FALSE;
ALTER TABLE films ADD COLUMN IF NOT EXISTS video_sources JSONB DEFAULT '[]'::jsonb;
ALTER TABLE films ADD COLUMN IF NOT EXISTS last_synced TIMESTAMPTZ;
ALTER TABLE films ADD COLUMN IF NOT EXISTS imdb_id TEXT;

-- Indexes for lookups
CREATE INDEX IF NOT EXISTS idx_films_tmdb_id ON films(tmdb_id) WHERE tmdb_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_films_wikidata_id ON films(wikidata_id) WHERE wikidata_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_films_public_domain ON films(is_public_domain) WHERE is_public_domain = TRUE;
CREATE INDEX IF NOT EXISTS idx_films_last_synced ON films(last_synced);

-- ============================================================
-- RLS: Allow upsert for film sync (anon can insert/update films)
-- Required for client-side sync via service; prefer film-sync-worker in production
-- ============================================================
CREATE POLICY "films_insert_anon" ON films
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "films_update_anon" ON films
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Helper: Upsert film by slug
-- ============================================================
CREATE OR REPLACE FUNCTION upsert_film_by_slug(film_data JSONB)
RETURNS UUID AS $$
DECLARE
  result_id UUID;
BEGIN
  INSERT INTO films (
    title, slug, description, genre, duration_min, rating,
    trailer_url, poster_url, backdrop_url, director, cast,
    language, is_featured, release_year, tmdb_id, wikidata_id,
    source, is_public_domain, video_sources, last_synced, imdb_id
  ) VALUES (
    film_data->>'title',
    film_data->>'slug',
    film_data->>'description',
    COALESCE(film_data->>'genre', 'Klassiker'),
    COALESCE((film_data->>'duration_min')::INTEGER, 90),
    film_data->>'rating',
    film_data->>'trailer_url',
    film_data->>'poster_url',
    film_data->>'backdrop_url',
    film_data->>'director',
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(film_data->'cast', '[]'::jsonb))),
    COALESCE(film_data->>'language', 'Deutsch'),
    COALESCE((film_data->>'is_featured')::BOOLEAN, false),
    (film_data->>'release_year')::INTEGER,
    (film_data->>'tmdb_id')::INTEGER,
    film_data->>'wikidata_id',
    film_data->>'source',
    COALESCE((film_data->>'is_public_domain')::BOOLEAN, false),
    COALESCE(film_data->'video_sources', '[]'::jsonb),
    COALESCE((film_data->>'last_synced')::TIMESTAMPTZ, NOW()),
    film_data->>'imdb_id'
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    genre = EXCLUDED.genre,
    duration_min = EXCLUDED.duration_min,
    rating = EXCLUDED.rating,
    trailer_url = EXCLUDED.trailer_url,
    poster_url = EXCLUDED.poster_url,
    backdrop_url = EXCLUDED.backdrop_url,
    director = EXCLUDED.director,
    cast = EXCLUDED.cast,
    release_year = EXCLUDED.release_year,
    tmdb_id = EXCLUDED.tmdb_id,
    wikidata_id = EXCLUDED.wikidata_id,
    source = EXCLUDED.source,
    is_public_domain = EXCLUDED.is_public_domain,
    video_sources = EXCLUDED.video_sources,
    last_synced = EXCLUDED.last_synced,
    imdb_id = EXCLUDED.imdb_id,
    updated_at = NOW()
  RETURNING id INTO result_id;

  RETURN result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
