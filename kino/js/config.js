/**
 * Court Side Kino – Configuration
 * Copy config.example.js to config.js and fill in your values.
 * NEVER commit secrets (Resend, SumUp, DB password) to this file.
 */
const CONFIG = {
  // Supabase (anon key is safe for client-side with RLS)
  SUPABASE_URL: 'https://fixatrnmeuhfaspkvlcc.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_40AaJc838gjs2lpsXJcQwg_TptELGPM',

  // Cloudflare Workers (set after deployment)
  EMAIL_WORKER_URL: 'https://csk-email-worker.YOUR_SUBDOMAIN.workers.dev',
  PAYMENT_WORKER_URL: 'https://csk-payment-worker.YOUR_SUBDOMAIN.workers.dev',
  FILM_SYNC_WORKER_URL: 'https://csk-film-sync-worker.YOUR_SUBDOMAIN.workers.dev',

  // TMDb (only used for direct calls; prefer FILM_SYNC_WORKER_URL in production)
  TMDB_API_KEY: '571b549f304aa24f708509fcd8573094',
  TMDB_ACCESS_TOKEN: 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1NzFiNTQ5ZjMwNGFhMjRmNzA4NTA5ZmNkODU3MzA5NCIsIm5iZiI6MTc4NjUzMDI5Mi40LCJzdWIiOiI2YTdjNDlmNGMwMzM5NmNhZDNhNTVjNTQiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.ycFvp9DEefNXU71BZN3SgvXPYLjmMu_R0CMMpru1hLU',

  // Site
  SITE_NAME: 'Court Side Kino',
  SITE_TAGLINE: 'Open-Air Kino am Tennisplatz',
  SITE_URL: 'https://popcornakademie.github.io/kino',
  LOCATION: {
    name: 'Sportcenter Hahn',
    address: 'Hahner Straße 12',
    city: 'Wolfratshausen',
    zip: '82515',
    lat: 47.9128,
    lng: 11.4214,
  },

  // Pricing defaults – flat rate per person (includes popcorn)
  CURRENCY: 'EUR',
  CURRENCY_SYMBOL: '€',
  TICKET_PRICE: 10,
  TICKET_INCLUDES: 'inkl. einer Tüte Popcorn',

  // Seat plan: 6 rows × 8 seats = 48
  SEAT_ROWS: 6,
  SEATS_PER_ROW: 8,

  // Feature flags
  ENABLE_WEATHER: true,
  ENABLE_DARK_MODE: true,
  ENABLE_ENGLISH: false,
};

// Freeze to prevent accidental mutation
Object.freeze(CONFIG);
Object.freeze(CONFIG.LOCATION);
