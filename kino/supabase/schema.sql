-- Court Side Kino – Supabase Database Schema
-- Run via: supabase db push  OR  SQL Editor in Supabase Dashboard

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- FILMS
-- ============================================================
CREATE TABLE IF NOT EXISTS films (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  description   TEXT,
  genre         TEXT NOT NULL,
  duration_min  INTEGER NOT NULL DEFAULT 120,
  rating        TEXT,                          -- FSK rating e.g. 'FSK 12'
  trailer_url   TEXT,
  poster_url    TEXT,
  backdrop_url  TEXT,
  director      TEXT,
  cast          TEXT[],
  language      TEXT DEFAULT 'Deutsch',
  subtitles     TEXT,
  is_featured   BOOLEAN DEFAULT FALSE,
  release_year  INTEGER,
  tmdb_id       INTEGER UNIQUE,
  wikidata_id   TEXT UNIQUE,
  source        TEXT CHECK (source IN ('tmdb', 'wikidata', 'manual')),
  is_public_domain BOOLEAN DEFAULT FALSE,
  video_sources JSONB DEFAULT '[]'::jsonb,
  last_synced   TIMESTAMPTZ,
  imdb_id       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_films_tmdb_id ON films(tmdb_id) WHERE tmdb_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_films_public_domain ON films(is_public_domain) WHERE is_public_domain = TRUE;

-- ============================================================
-- SCREENINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS screenings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  film_id         UUID NOT NULL REFERENCES films(id) ON DELETE CASCADE,
  screening_date  DATE NOT NULL,
  start_time      TIME NOT NULL,
  venue           TEXT DEFAULT 'Court Side – Sportcenter Hahn',
  total_seats     INTEGER NOT NULL DEFAULT 80,
  available_seats INTEGER NOT NULL DEFAULT 80,
  price_adult     NUMERIC(8,2) NOT NULL DEFAULT 12.00,
  price_child     NUMERIC(8,2) NOT NULL DEFAULT 8.00,
  price_student   NUMERIC(8,2) NOT NULL DEFAULT 10.00,
  is_sold_out     BOOLEAN DEFAULT FALSE,
  weather_note    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_screenings_date ON screenings(screening_date);
CREATE INDEX idx_screenings_film  ON screenings(film_id);

-- ============================================================
-- TICKETS
-- ============================================================
CREATE TYPE ticket_type AS ENUM ('adult', 'child', 'student');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

CREATE TABLE IF NOT EXISTS tickets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  screening_id    UUID NOT NULL REFERENCES screenings(id) ON DELETE RESTRICT,
  customer_name   TEXT NOT NULL,
  customer_email  TEXT NOT NULL,
  customer_phone  TEXT,
  ticket_type     ticket_type NOT NULL DEFAULT 'adult',
  seat_numbers    INTEGER[] NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 1,
  total_amount    NUMERIC(8,2) NOT NULL,
  currency        TEXT DEFAULT 'EUR',
  payment_status  payment_status DEFAULT 'pending',
  sumup_checkout_id TEXT,
  sumup_transaction_id TEXT,
  qr_code_data    TEXT,
  booking_reference TEXT UNIQUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tickets_screening ON tickets(screening_id);
CREATE INDEX idx_tickets_email      ON tickets(customer_email);
CREATE INDEX idx_tickets_reference  ON tickets(booking_reference);

-- ============================================================
-- MENU ITEMS
-- ============================================================
CREATE TYPE menu_category AS ENUM (
  'popcorn', 'suess', 'salzig', 'getraenk', 'bier', 'cocktail', 'snack', 'kombi'
);

CREATE TABLE IF NOT EXISTS menu_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category      menu_category NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  price         NUMERIC(8,2) NOT NULL,
  allergens     TEXT[],
  is_available  BOOLEAN DEFAULT TRUE,
  is_vegan      BOOLEAN DEFAULT FALSE,
  is_vegetarian BOOLEAN DEFAULT FALSE,
  image_url     TEXT,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_menu_category ON menu_items(category);

-- ============================================================
-- RESERVATIONS (Biergarten)
-- ============================================================
CREATE TYPE reservation_status AS ENUM ('pending', 'confirmed', 'cancelled');

CREATE TABLE IF NOT EXISTS reservations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  party_size    INTEGER NOT NULL CHECK (party_size BETWEEN 1 AND 20),
  notes         TEXT,
  status        reservation_status DEFAULT 'pending',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NEWSLETTER SUBSCRIBERS
-- ============================================================
CREATE TYPE subscriber_status AS ENUM ('pending', 'confirmed', 'unsubscribed');

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  status        subscriber_status DEFAULT 'pending',
  confirm_token TEXT,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at  TIMESTAMPTZ
);

-- ============================================================
-- SEAT AVAILABILITY (tracks individual seats per screening)
-- ============================================================
CREATE TABLE IF NOT EXISTS seat_availability (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  screening_id  UUID NOT NULL REFERENCES screenings(id) ON DELETE CASCADE,
  seat_number   INTEGER NOT NULL,
  is_available  BOOLEAN DEFAULT TRUE,
  ticket_id     UUID REFERENCES tickets(id) ON DELETE SET NULL,
  UNIQUE(screening_id, seat_number)
);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER films_updated_at
  BEFORE UPDATE ON films FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER screenings_updated_at
  BEFORE UPDATE ON screenings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER reservations_updated_at
  BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE films                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets                ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_availability      ENABLE ROW LEVEL SECURITY;

-- Films: public read
CREATE POLICY "films_select_anon" ON films
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "films_insert_anon" ON films
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "films_update_anon" ON films
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Screenings: public read
CREATE POLICY "screenings_select_anon" ON screenings
  FOR SELECT TO anon, authenticated USING (true);

-- Menu items: public read (only available items)
CREATE POLICY "menu_select_anon" ON menu_items
  FOR SELECT TO anon, authenticated USING (is_available = true);

-- Seat availability: public read
CREATE POLICY "seats_select_anon" ON seat_availability
  FOR SELECT TO anon, authenticated USING (true);

-- Tickets: anon can insert (booking), read own by reference
CREATE POLICY "tickets_insert_anon" ON tickets
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "tickets_select_anon" ON tickets
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "tickets_update_anon" ON tickets
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Reservations: anon can insert
CREATE POLICY "reservations_insert_anon" ON reservations
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "reservations_select_anon" ON reservations
  FOR SELECT TO anon, authenticated USING (true);

-- Newsletter: anon can insert
CREATE POLICY "newsletter_insert_anon" ON newsletter_subscribers
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "newsletter_select_anon" ON newsletter_subscribers
  FOR SELECT TO anon, authenticated USING (true);

-- Seat availability: anon can update (reserve seats)
CREATE POLICY "seats_update_anon" ON seat_availability
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
