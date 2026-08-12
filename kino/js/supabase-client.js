/**
 * Court Side Kino – Supabase Client
 * Database operations with error handling and loading states
 */

let supabaseClient = null;

/**
 * Initialize Supabase client (call once on page load)
 */
function initSupabase() {
  if (supabaseClient) return supabaseClient;

  if (typeof supabase === 'undefined') {
    console.error('Supabase JS library not loaded');
    return null;
  }

  supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  return supabaseClient;
}

/**
 * Generic query wrapper with error handling
 */
async function dbQuery(queryFn, errorMessage = 'Datenbankfehler') {
  try {
    const { data, error } = await queryFn();
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error(errorMessage, err);
    return { data: null, error: err.message || errorMessage };
  }
}

// ============================================================
// FILMS
// ============================================================

async function getFilms() {
  return dbQuery(
    () => initSupabase().from('films').select('*').order('created_at', { ascending: false }),
    'Fehler beim Laden der Filme'
  );
}

async function getFilmBySlug(slug) {
  return dbQuery(
    () => initSupabase().from('films').select('*').eq('slug', slug).single(),
    'Film nicht gefunden'
  );
}

async function getFeaturedFilms() {
  return dbQuery(
    () => initSupabase().from('films').select('*').eq('is_featured', true).limit(3),
    'Fehler beim Laden der Highlights'
  );
}

async function getPublicDomainFilms() {
  return dbQuery(
    () => initSupabase()
      .from('films')
      .select('*')
      .eq('is_public_domain', true)
      .order('release_year', { ascending: true }),
    'Fehler beim Laden der Public-Domain-Filme'
  );
}

async function getFilmByTmdbId(tmdbId) {
  return dbQuery(
    () => initSupabase().from('films').select('*').eq('tmdb_id', tmdbId).maybeSingle(),
    'Film nicht gefunden'
  );
}

// ============================================================
// SCREENINGS
// ============================================================

let _localScreeningsCache = null;
let _localFilmsCache = null;

async function loadLocalFilmsCache() {
  if (_localFilmsCache) return _localFilmsCache;
  try {
    const res = await fetch('data/films-cache.json');
    if (!res.ok) return [];
    _localFilmsCache = await res.json();
    return _localFilmsCache;
  } catch {
    return [];
  }
}

async function loadLocalScreeningsCache() {
  if (_localScreeningsCache) return _localScreeningsCache;
  try {
    const res = await fetch('data/screenings-cache.json');
    if (!res.ok) return [];
    const screenings = await res.json();
    const films = await loadLocalFilmsCache();
    const byId = Object.fromEntries(films.map(f => [f.id, f]));
    _localScreeningsCache = screenings.map(s => ({
      ...s,
      films: byId[s.film_id] || { id: s.film_id, title: s.film_id, slug: s.film_id },
    }));
    return _localScreeningsCache;
  } catch {
    return [];
  }
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

async function getLocalUpcomingScreenings() {
  const all = await loadLocalScreeningsCache();
  const today = todayISO();
  return all
    .filter(s => s.screening_date >= today)
    .sort((a, b) =>
      a.screening_date.localeCompare(b.screening_date) ||
      String(a.start_time).localeCompare(String(b.start_time))
    );
}

async function getScreenings() {
  const result = await dbQuery(
    () => initSupabase()
      .from('screenings')
      .select('*, films(*)')
      .gte('screening_date', todayISO())
      .order('screening_date', { ascending: true }),
    'Fehler beim Laden der Vorstellungen'
  );

  if (result.data?.length) return result;

  const local = await getLocalUpcomingScreenings();
  if (local.length) {
    console.info(`Showing ${local.length} screenings from local cache`);
    return { data: local, error: null };
  }
  return result;
}

async function getScreeningById(id) {
  const result = await dbQuery(
    () => initSupabase()
      .from('screenings')
      .select('*, films(*)')
      .eq('id', id)
      .single(),
    'Vorstellung nicht gefunden'
  );
  if (result.data) return result;

  const local = await loadLocalScreeningsCache();
  const found = local.find(s => s.id === id) || null;
  return { data: found, error: found ? null : 'Vorstellung nicht gefunden' };
}

async function getNextScreening() {
  const result = await dbQuery(
    () => initSupabase()
      .from('screenings')
      .select('*, films(*)')
      .gte('screening_date', todayISO())
      .eq('is_sold_out', false)
      .order('screening_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(1)
      .single(),
    'Keine kommende Vorstellung'
  );
  if (result.data) return result;

  const local = await getLocalUpcomingScreenings();
  const next = local.find(s => !s.is_sold_out) || null;
  return { data: next, error: next ? null : 'Keine kommende Vorstellung' };
}

async function getScreeningsByFilm(filmId) {
  const result = await dbQuery(
    () => initSupabase()
      .from('screenings')
      .select('*')
      .eq('film_id', filmId)
      .gte('screening_date', todayISO())
      .order('screening_date', { ascending: true }),
    'Fehler beim Laden der Vorstellungen'
  );
  if (result.data?.length) return result;

  const local = await getLocalUpcomingScreenings();
  const filtered = local.filter(s => s.film_id === filmId || s.films?.slug === filmId);
  return { data: filtered, error: null };
}

// ============================================================
// TICKETS
// ============================================================

async function createTicket(ticketData) {
  const reference = 'CSK-' + Date.now().toString(36).toUpperCase();
  const qrData = JSON.stringify({
    ref: reference,
    screening: ticketData.screening_id,
    seats: ticketData.seat_numbers,
  });

  return dbQuery(
    () => initSupabase()
      .from('tickets')
      .insert({
        ...ticketData,
        booking_reference: reference,
        qr_code_data: qrData,
        payment_status: 'pending',
      })
      .select()
      .single(),
    'Fehler bei der Buchung'
  );
}

async function getTicketByReference(reference) {
  return dbQuery(
    () => initSupabase()
      .from('tickets')
      .select('*, screenings(*, films(*))')
      .eq('booking_reference', reference)
      .single(),
    'Buchung nicht gefunden'
  );
}

async function updateTicketPayment(ticketId, paymentData) {
  return dbQuery(
    () => initSupabase()
      .from('tickets')
      .update(paymentData)
      .eq('id', ticketId)
      .select()
      .single(),
    'Fehler beim Aktualisieren der Zahlung'
  );
}

// ============================================================
// SEAT AVAILABILITY
// ============================================================

async function getSeatAvailability(screeningId) {
  return dbQuery(
    () => initSupabase()
      .from('seat_availability')
      .select('*')
      .eq('screening_id', screeningId)
      .order('seat_number', { ascending: true }),
    'Fehler beim Laden der Sitzplätze'
  );
}

async function reserveSeats(screeningId, seatNumbers, ticketId) {
  const updates = seatNumbers.map(num =>
    initSupabase()
      .from('seat_availability')
      .update({ is_available: false, ticket_id: ticketId })
      .eq('screening_id', screeningId)
      .eq('seat_number', num)
  );

  try {
    const results = await Promise.all(updates);
    const errors = results.filter(r => r.error);
    if (errors.length > 0) throw new Error('Einige Sitzplätze konnten nicht reserviert werden');
    return { data: true, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

// ============================================================
// MENU ITEMS
// ============================================================

async function getMenuItems(category = null) {
  let query = initSupabase()
    .from('menu_items')
    .select('*')
    .eq('is_available', true)
    .order('sort_order', { ascending: true });

  if (category) {
    query = query.eq('category', category);
  }

  return dbQuery(() => query, 'Fehler beim Laden der Speisekarte');
}

// ============================================================
// RESERVATIONS
// ============================================================

async function createReservation(reservationData) {
  return dbQuery(
    () => initSupabase()
      .from('reservations')
      .insert(reservationData)
      .select()
      .single(),
    'Fehler bei der Reservierung'
  );
}

// ============================================================
// NEWSLETTER
// ============================================================

async function subscribeNewsletter(email) {
  const token = crypto.randomUUID();

  return dbQuery(
    () => initSupabase()
      .from('newsletter_subscribers')
      .insert({
        email,
        status: 'pending',
        confirm_token: token,
      })
      .select()
      .single(),
    'Fehler bei der Newsletter-Anmeldung'
  );
}

async function checkNewsletterEmail(email) {
  return dbQuery(
    () => initSupabase()
      .from('newsletter_subscribers')
      .select('id, status')
      .eq('email', email)
      .maybeSingle(),
    'Fehler bei der E-Mail-Prüfung'
  );
}
