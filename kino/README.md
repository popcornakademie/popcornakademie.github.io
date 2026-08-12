# Court Side Kino

Open-Air Kino am Tennisplatz des Sportcenters Hahn in Wolfratshausen – by Popcornakademie.

**Live:** [popcornakademie.github.io/kino](https://popcornakademie.github.io/kino)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| Hosting | Cloudflare Pages (Git-based) |
| Database | Supabase (PostgreSQL) |
| Email | Resend API (via Cloudflare Worker) |
| Payment | SumUp API (via Cloudflare Worker) |
| Maps | Leaflet + OpenStreetMap |
| Weather | Open-Meteo API |

## Project Structure

```
├── index.html                  # Homepage
├── programm.html               # Film program & calendar
├── tickets.html                # Ticket booking with seat plan
├── biergarten.html             # Imbiss: popcorn, food, drinks & reservations
├── ueber-uns.html              # About us
├── kontakt.html                # Contact, FAQ, map
├── buchung-erfolgreich.html    # Booking confirmation
├── 404.html                    # Error page
├── css/
│   ├── global.css              # Variables, reset, typography
│   ├── layout.css              # Header, footer, hero, grid
│   ├── components.css          # Cards, forms, seat plan
│   ├── animations.css          # Keyframes, scroll reveal
│   └── popcorn-theme.css       # Popcorn Akademie visual theme
├── js/
│   ├── config.js               # Site configuration
│   ├── supabase-client.js      # Database operations
│   ├── utils.js                # Helpers, cart, toast
│   ├── popcorn.js              # Floating popcorn animations
│   ├── animations.js           # Scroll reveal, FAQ
│   └── pages/
│       └── menu.js             # Imbiss menu + reservation
│   ├── animations.js           # Scroll & parallax
│   ├── app.js                  # App initialization
│   ├── components/             # Reusable UI components
│   └── pages/                  # Page-specific scripts
├── workers/
│   ├── email-worker/           # Resend email handler
│   └── payment-worker/         # SumUp payment handler
├── supabase/
│   ├── schema.sql              # Database schema + RLS
│   └── seed.sql                # Sample data
├── robots.txt
└── sitemap.xml
```

## Setup

### 1. Supabase Database

```bash
# Install Supabase CLI
npm install -g supabase

# Login and link project
supabase login
supabase init
supabase link --project-ref fixatrnmeuhfaspkvlcc

# Push schema and seed data
supabase db push
# Or run schema.sql and seed.sql in the Supabase SQL Editor
```

### 2. Frontend Configuration

Copy the example config and fill in your values:

```bash
cp js/config.example.js js/config.js
```

Edit `js/config.js`:
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` – from Supabase Dashboard
- `EMAIL_WORKER_URL` – after deploying the email worker
- `PAYMENT_WORKER_URL` – after deploying the payment worker

### 3. Cloudflare Workers

#### Email Worker

```bash
cd workers/email-worker
npm install -g wrangler
wrangler login
wrangler secret put RESEND_API_KEY
wrangler deploy
```

#### Payment Worker

```bash
cd workers/payment-worker
wrangler secret put SUMUP_API_KEY
wrangler secret put SUMUP_MERCHANT_CODE
wrangler deploy
```

Update `js/config.js` with the deployed worker URLs.

### 4. Deployment

#### GitHub Pages (aktuell)

Das Projekt liegt im Repository `popcornakademie.github.io` unter dem Ordner `kino/`:

```
popcornakademie.github.io/
└── kino/              ← Projekt-Root (diese Dateien)
    ├── index.html
    ├── css/
    ├── js/
    └── ...
```

Erreichbar unter: **https://popcornakademie.github.io/kino/**

#### Cloudflare Pages (optional)

1. Repository mit GitHub verbinden
2. Build settings:
   - **Build command:** (leer lassen)
   - **Build output directory:** `/`
   - **Root directory:** `kino`
3. Deploy

## Environment Variables

### Frontend (`js/config.js`)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `EMAIL_WORKER_URL` | Deployed email worker URL |
| `PAYMENT_WORKER_URL` | Deployed payment worker URL |
| `FILM_SYNC_WORKER_URL` | Film sync worker URL (TMDb + Wikidata → Supabase) |

### Film Sync Worker (Wrangler Secrets)

| Secret | Description |
|--------|-------------|
| `TMDB_API_KEY` | TMDb API key ([developer.themoviedb.org](https://developer.themoviedb.org)) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |

## TMDb + WikiFlix Film-Daten

### Architektur

```
TMDb API (primär) → film-sync-worker → Supabase films-Table → Frontend
Wikidata (fallback) ↗                      ↑ 7-Tage Cache
```

### Setup

1. **Migration ausführen:** `supabase/schema.sql` + `supabase/migration-films-api.sql` im Supabase SQL Editor
2. **TMDb API-Key** in `js/config.js` (oder Worker-Secret)
3. **Lokaler Sync (ohne Cloudflare):**
   ```bash
   node scripts/sync-films.mjs
   ```
   Schreibt auch `data/films-cache.json`, falls die Tabelle noch fehlt.
4. **Film-Sync Worker deployen (optional):**
   ```bash
   cd workers/film-sync-worker
   npx wrangler login
   npx wrangler secret put TMDB_API_KEY
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   npx wrangler deploy
   ```
5. **Worker-URL** in `js/config.js` → `FILM_SYNC_WORKER_URL`
6. **Screenings seeden:** `supabase/seed-public-domain.sql` ausführen

### Public-Domain-Filme (10)

Nosferatu (1922), Metropolis (1927), Das Cabinet des Dr. Caligari (1920), Die Nacht der lebenden Toten (1968), Battleship Potemkin (1925), Der Mann mit der Kamera (1929), Steamboat Willie (1928), The Great Train Robbery (1903), Sunrise (1927), Freaks (1932)

Konfiguration: `data/public-domain-films.json` · Cache: `data/films-cache.json`

### Cache-Verhalten

- Frontend lädt Filme aus Supabase (`loadFilmsWithCache()`)
- Fallback: `data/films-cache.json` (volle TMDb-Daten), dann `public-domain-films.json`
- TTL: 7 Tage (`last_synced` Feld)
- Bei stale Cache: automatischer Background-Sync via Worker
- Manueller Sync: `admin-sync.html`

### TMDb Attribution

TMDb-Logo und Link werden automatisch im Footer eingefügt (Pflicht laut TMDb Terms).

### Email Worker (Wrangler Secrets)

| Secret | Description |
|--------|-------------|
| `RESEND_API_KEY` | Resend API key |

### Payment Worker (Wrangler Secrets)

| Secret | Description |
|--------|-------------|
| `SUMUP_API_KEY` | SumUp API key |
| `SUMUP_MERCHANT_CODE` | SumUp merchant code |

> **Security:** Never commit API keys, database passwords, or worker secrets to the repository. The Supabase anon key is safe for client-side use with RLS enabled.

## Features

- Responsive mobile-first design with dark/light mode
- Dynamic film program loaded from Supabase
- Interactive seat plan with real-time availability
- SumUp payment integration
- Email confirmations (booking, reservation, newsletter, contact)
- Weather widget for open-air relevance
- Countdown to next screening
- Newsletter signup with double opt-in
- Biergarten reservation form
- Cookie consent banner (GDPR)
- SEO: semantic HTML, Open Graph, Schema.org, sitemap
- Accessibility: ARIA labels, keyboard navigation, focus states
- Print-friendly ticket confirmation

## Local Development

No build step required. Serve files with any static server:

```bash
# Python
python3 -m http.server 8080

# Node.js
npx serve .

# PHP
php -S localhost:8080
```

Open `http://localhost:8080` in your browser.

## Browser Support

Chrome, Firefox, Safari, Edge (latest versions). Mobile browsers fully supported.

## License

© 2026 Popcornakademie · Court Side Kino
