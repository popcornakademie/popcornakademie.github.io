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

// ============================================================
// SCREENINGS
// ============================================================

async function getScreenings() {
  return dbQuery(
    () => initSupabase()
      .from('screenings')
      .select('*, films(*)')
      .gte('screening_date', new Date().toISOString().split('T')[0])
      .order('screening_date', { ascending: true }),
    'Fehler beim Laden der Vorstellungen'
  );
}

async function getScreeningById(id) {
  return dbQuery(
    () => initSupabase()
      .from('screenings')
      .select('*, films(*)')
      .eq('id', id)
      .single(),
    'Vorstellung nicht gefunden'
  );
}

async function getNextScreening() {
  const today = new Date().toISOString().split('T')[0];
  return dbQuery(
    () => initSupabase()
      .from('screenings')
      .select('*, films(*)')
      .gte('screening_date', today)
      .eq('is_sold_out', false)
      .order('screening_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(1)
      .single(),
    'Keine kommende Vorstellung'
  );
}

async function getScreeningsByFilm(filmId) {
  return dbQuery(
    () => initSupabase()
      .from('screenings')
      .select('*')
      .eq('film_id', filmId)
      .gte('screening_date', new Date().toISOString().split('T')[0])
      .order('screening_date', { ascending: true }),
    'Fehler beim Laden der Vorstellungen'
  );
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
