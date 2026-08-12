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

  if (typeof supabase === 'undefined' || typeof CONFIG === 'undefined') {
    console.warn('Supabase/CONFIG not ready – using local catalog');
    return null;
  }

  try {
    supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    return supabaseClient;
  } catch (err) {
    console.warn('Supabase init failed:', err);
    return null;
  }
}

/**
 * Generic query wrapper with error handling + timeout
 * (avoids hanging forever when Supabase is slow/unreachable)
 */
async function dbQuery(queryFn, errorMessage = 'Datenbankfehler', timeoutMs = 2500) {
  try {
    const client = initSupabase();
    if (!client) throw new Error('Supabase nicht verfügbar');

    const result = await Promise.race([
      queryFn(client),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Zeitüberschreitung')), timeoutMs)
      ),
    ]);

    const { data, error } = result;
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.warn(errorMessage, err.message || err);
    return { data: null, error: err.message || errorMessage };
  }
}

// ============================================================
// LOCAL CATALOG (embedded + JSON fallback)
// ============================================================

let _localScreeningsCache = null;
let _localFilmsCache = null;

function todayISO() {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

async function loadLocalFilmsCache() {
  if (_localFilmsCache) return _localFilmsCache;

  if (Array.isArray(window.LOCAL_FILMS) && window.LOCAL_FILMS.length) {
    _localFilmsCache = window.LOCAL_FILMS;
    return _localFilmsCache;
  }

  try {
    const res = await fetch('data/films-cache.json');
    if (res.ok) {
      _localFilmsCache = await res.json();
      return _localFilmsCache;
    }
  } catch (_) { /* ignore */ }

  _localFilmsCache = [];
  return _localFilmsCache;
}

async function loadLocalScreeningsCache() {
  if (_localScreeningsCache) return _localScreeningsCache;

  let screenings = Array.isArray(window.LOCAL_SCREENINGS) ? window.LOCAL_SCREENINGS : null;

  if (!screenings) {
    try {
      const res = await fetch('data/screenings-cache.json');
      if (res.ok) screenings = await res.json();
    } catch (_) { /* ignore */ }
  }

  if (!Array.isArray(screenings)) screenings = [];

  const films = await loadLocalFilmsCache();
  const byId = Object.fromEntries(films.map(f => [f.id, f]));
  _localScreeningsCache = screenings.map(s => ({
    ...s,
    films: byId[s.film_id] || { id: s.film_id, title: s.film_id, slug: s.film_id },
  }));
  return _localScreeningsCache;
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

// ============================================================
// FILMS
// ============================================================

async function getFilms() {
  const result = await dbQuery(
    (db) => db.from('films').select('*').order('created_at', { ascending: false }),
    'Fehler beim Laden der Filme'
  );
  if (result.data?.length) return result;

  const local = await loadLocalFilmsCache();
  return { data: local, error: local.length ? null : result.error };
}

async function getFilmBySlug(slug) {
  const result = await dbQuery(
    (db) => db.from('films').select('*').eq('slug', slug).single(),
    'Film nicht gefunden'
  );
  if (result.data) return result;

  const local = await loadLocalFilmsCache();
  const found = local.find(f => f.slug === slug) || null;
  return { data: found, error: found ? null : 'Film nicht gefunden' };
}

async function getFeaturedFilms() {
  const result = await dbQuery(
    (db) => db.from('films').select('*').eq('is_featured', true).limit(3),
    'Fehler beim Laden der Highlights'
  );
  if (result.data?.length) return result;

  const local = await loadLocalFilmsCache();
  const featured = local.filter(f => f.is_featured).slice(0, 3);
  return { data: featured.length ? featured : local.slice(0, 3), error: null };
}

async function getPublicDomainFilms() {
  const result = await dbQuery(
    (db) => db
      .from('films')
      .select('*')
      .eq('is_public_domain', true)
      .order('release_year', { ascending: true }),
    'Fehler beim Laden der Public-Domain-Filme'
  );
  if (result.data?.length) return result;

  const local = await loadLocalFilmsCache();
  return { data: local.filter(f => f.is_public_domain), error: null };
}

async function getFilmByTmdbId(tmdbId) {
  return dbQuery(
    (db) => db.from('films').select('*').eq('tmdb_id', tmdbId).maybeSingle(),
    'Film nicht gefunden'
  );
}

// ============================================================
// SCREENINGS
// ============================================================

async function getScreenings() {
  // Local catalog first – Supabase screenings table may not exist yet
  const localUpcoming = await getLocalUpcomingScreenings();
  if (localUpcoming.length) {
    // Still try Supabase in background-friendly short timeout; prefer DB if populated
    const result = await dbQuery(
      (db) => db
        .from('screenings')
        .select('*, films(*)')
        .gte('screening_date', todayISO())
        .order('screening_date', { ascending: true }),
      'Fehler beim Laden der Vorstellungen',
      2000
    );
    if (result.data?.length) return result;

    console.info(`Showing ${localUpcoming.length} screenings from local catalog`);
    return { data: localUpcoming, error: null };
  }

  const result = await dbQuery(
    (db) => db
      .from('screenings')
      .select('*, films(*)')
      .gte('screening_date', todayISO())
      .order('screening_date', { ascending: true }),
    'Fehler beim Laden der Vorstellungen'
  );
  if (result.data?.length) return result;

  // Last resort: show full local season even if date filter emptied it
  const allLocal = await loadLocalScreeningsCache();
  if (allLocal.length) {
    console.info(`Showing full local season (${allLocal.length} screenings)`);
    return { data: allLocal, error: null };
  }

  return { data: [], error: result.error };
}

async function getScreeningById(id) {
  const result = await dbQuery(
    (db) => db
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
    (db) => db
      .from('screenings')
      .select('*, films(*)')
      .gte('screening_date', todayISO())
      .eq('is_sold_out', false)
      .order('screening_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(1)
      .maybeSingle(),
    'Keine kommende Vorstellung'
  );
  if (result.data) return result;

  const local = await getLocalUpcomingScreenings();
  const next = local.find(s => !s.is_sold_out) || null;
  return { data: next, error: next ? null : 'Keine kommende Vorstellung' };
}

async function getScreeningsByFilm(filmId) {
  const result = await dbQuery(
    (db) => db
      .from('screenings')
      .select('*')
      .eq('film_id', filmId)
      .gte('screening_date', todayISO())
      .order('screening_date', { ascending: true }),
    'Fehler beim Laden der Vorstellungen'
  );
  if (result.data?.length) return result;

  const local = await getLocalUpcomingScreenings();
  const filtered = local.filter(s => s.film_id === filmId || s.films?.slug === filmId || s.films?.id === filmId);
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
    (db) => db
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
    (db) => db
      .from('tickets')
      .select('*, screenings(*, films(*))')
      .eq('booking_reference', reference)
      .single(),
    'Buchung nicht gefunden'
  );
}

async function updateTicketPayment(ticketId, paymentData) {
  return dbQuery(
    (db) => db
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
  const result = await dbQuery(
    (db) => db
      .from('seat_availability')
      .select('*')
      .eq('screening_id', screeningId)
      .order('seat_number', { ascending: true }),
    'Fehler beim Laden der Sitzplätze'
  );
  if (result.data?.length) return result;

  // Local fallback: all seats available for catalog screenings
  const screening = (await loadLocalScreeningsCache()).find(s => s.id === screeningId);
  const total = screening?.total_seats || CONFIG.SEAT_ROWS * CONFIG.SEATS_PER_ROW || 48;
  const seats = Array.from({ length: total }, (_, i) => ({
    screening_id: screeningId,
    seat_number: i + 1,
    is_available: true,
    ticket_id: null,
  }));
  return { data: seats, error: null };
}

async function reserveSeats(screeningId, seatNumbers, ticketId) {
  const client = initSupabase();
  if (!client) {
    // Local mode: no persistent seat lock
    return { data: true, error: null };
  }

  const updates = seatNumbers.map(num =>
    client
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
  return dbQuery((db) => {
    let query = db
      .from('menu_items')
      .select('*')
      .eq('is_available', true)
      .order('sort_order', { ascending: true });
    if (category) query = query.eq('category', category);
    return query;
  }, 'Fehler beim Laden der Speisekarte');
}

// ============================================================
// RESERVATIONS
// ============================================================

async function createReservation(reservationData) {
  return dbQuery(
    (db) => db.from('reservations').insert(reservationData).select().single(),
    'Fehler bei der Reservierung'
  );
}

// ============================================================
// NEWSLETTER
// ============================================================

async function subscribeNewsletter(email) {
  const token = crypto.randomUUID();

  return dbQuery(
    (db) => db
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
    (db) => db
      .from('newsletter_subscribers')
      .select('id, status')
      .eq('email', email)
      .maybeSingle(),
    'Fehler bei der E-Mail-Prüfung'
  );
}
