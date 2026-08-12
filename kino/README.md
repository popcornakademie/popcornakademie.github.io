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
├── imbiss.html                 # Food menu
├── suesses.html                # Popcorn & sweets
├── biergarten.html             # Drinks & reservations
├── ueber-uns.html              # About us
├── kontakt.html                # Contact, FAQ, map
├── buchung-erfolgreich.html    # Booking confirmation
├── 404.html                    # Error page
├── css/
│   ├── global.css              # Variables, reset, typography
│   ├── layout.css              # Header, footer, hero, grid
│   ├── components.css          # Cards, forms, seat plan
│   └── animations.css          # Keyframes, scroll reveal
├── js/
│   ├── config.js               # Site configuration
│   ├── supabase-client.js      # Database operations
│   ├── utils.js                # Helpers, cart, toast
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

### 4. Cloudflare Pages Deployment

1. Push repository to GitHub
2. In Cloudflare Dashboard → Pages → Create project
3. Connect Git repository
4. Build settings:
   - **Build command:** (leave empty)
   - **Build output directory:** `/` (or the kino subfolder path)
   - **Root directory:** `kino` (if deploying as subfolder)
5. Deploy

For GitHub Pages subfolder deployment at `popcornakademie.github.io/kino`, push files to the `kino/` directory in the `popcornakademie.github.io` repository.

## Environment Variables

### Frontend (`js/config.js`)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `EMAIL_WORKER_URL` | Deployed email worker URL |
| `PAYMENT_WORKER_URL` | Deployed payment worker URL |

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
