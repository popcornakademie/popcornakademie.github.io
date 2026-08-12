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

  // Pricing defaults
  CURRENCY: 'EUR',
  CURRENCY_SYMBOL: '€',

  // Seat plan
  SEAT_ROWS: 8,
  SEATS_PER_ROW: 10,

  // Feature flags
  ENABLE_WEATHER: true,
  ENABLE_DARK_MODE: true,
  ENABLE_ENGLISH: false,
};

// Freeze to prevent accidental mutation
Object.freeze(CONFIG);
Object.freeze(CONFIG.LOCATION);
