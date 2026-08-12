/**
 * Court Side Kino – Booking Success Page Script
 */
document.addEventListener('DOMContentLoaded', async () => {
  initSupabase();

  const ref = getQueryParam('ref');
  if (!ref) {
    document.getElementById('booking-details').innerHTML = '<p>Keine Buchungsreferenz gefunden.</p>';
    return;
  }

  const { data: ticket, error } = await getTicketByReference(ref);
  if (error || !ticket) {
    document.getElementById('booking-details').innerHTML = '<p>Buchung nicht gefunden. Bitte prüfe deine E-Mail.</p>';
    return;
  }

  const screening = ticket.screenings;
  const film = screening?.films;

  document.getElementById('booking-details').innerHTML = `
    <h2 style="margin-bottom:var(--space-lg);">${film ? sanitize(film.title) : 'Court Side Kino'}</h2>
    <div style="text-align:left;max-width:400px;margin:0 auto var(--space-xl);">
      <p><strong>Buchungsreferenz:</strong> ${sanitize(ticket.booking_reference)}</p>
      <p><strong>Datum:</strong> ${formatDate(screening.screening_date)}</p>
      <p><strong>Uhrzeit:</strong> ${formatTime(screening.start_time)}</p>
      <p><strong>Plätze:</strong> ${ticket.seat_numbers.join(', ')}</p>
      <p><strong>Name:</strong> ${sanitize(ticket.customer_name)}</p>
      <p><strong>Gesamt:</strong> ${formatPrice(ticket.total_amount)}</p>
    </div>
    <div class="qr-display__code" aria-label="QR-Code für Einlass">
      <div style="font-family:monospace;font-size:0.7rem;word-break:break-all;">${sanitize(ticket.qr_code_data || ticket.booking_reference)}</div>
    </div>
    <p class="text-muted" style="font-size:var(--font-size-sm);">Zeige diesen Code am Einlass vor – digital oder ausgedruckt.</p>
  `;

  // Clear cart
  cart.clear();

  // Trigger confirmation email if payment was successful
  if (ticket.payment_status === 'paid' || ticket.payment_status === 'pending') {
    try {
      await fetch(CONFIG.EMAIL_WORKER_URL + '/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ticket.customer_email,
          name: ticket.customer_name,
          reference: ticket.booking_reference,
          film: film?.title,
          date: screening.screening_date,
          time: screening.start_time,
          seats: ticket.seat_numbers,
          total: ticket.total_amount,
          qr_data: ticket.qr_code_data,
        }),
      });
    } catch (err) {
      console.warn('Confirmation email could not be sent:', err);
    }
  }
});
