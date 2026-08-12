/**
 * Court Side Kino – Configuration Template
 * Copy this file to config.js and fill in your values.
 */
const CONFIG = {
  SUPABASE_URL: 'YOUR_SUPABASE_URL',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
  EMAIL_WORKER_URL: 'https://csk-email-worker.YOUR_SUBDOMAIN.workers.dev',
  PAYMENT_WORKER_URL: 'https://csk-payment-worker.YOUR_SUBDOMAIN.workers.dev',
  FILM_SYNC_WORKER_URL: 'https://csk-film-sync-worker.YOUR_SUBDOMAIN.workers.dev',
  TMDB_API_KEY: '',
  TMDB_ACCESS_TOKEN: '',
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
  CURRENCY: 'EUR',
  CURRENCY_SYMBOL: '€',
  TICKET_PRICE: 10,
  TICKET_INCLUDES: 'inkl. einer Tüte Popcorn',
  SEAT_ROWS: 6,
  SEATS_PER_ROW: 8,
  ENABLE_WEATHER: true,
  ENABLE_DARK_MODE: true,
  ENABLE_ENGLISH: false,
};

Object.freeze(CONFIG);
Object.freeze(CONFIG.LOCATION);
