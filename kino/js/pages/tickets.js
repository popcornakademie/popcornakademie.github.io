/**
 * Court Side Kino – Tickets Page Script
 */
let currentStep = 1;
let seatPlanInstance = null;
let selectedScreening = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadScreenings();

  // Pre-select screening from URL
  const screeningId = getQueryParam('screening');
  if (screeningId) selectScreening(screeningId);

  // Navigation buttons
  document.getElementById('btn-back-1')?.addEventListener('click', () => goToStep(1));
  document.getElementById('btn-back-2')?.addEventListener('click', () => goToStep(2));
  document.getElementById('btn-next-2')?.addEventListener('click', () => goToStep(3));

  document.getElementById('ticket-type')?.addEventListener('change', (e) => {
    cart.setTicketType(e.target.value);
    renderCart(document.getElementById('cart-container'));
  });

  document.getElementById('customer-form')?.addEventListener('submit', handleCheckout);
});

async function loadScreenings() {
  const container = document.getElementById('screening-list');
  container.innerHTML = renderLoadingSpinner();

  const { data: screenings } = await getScreenings();
  if (!screenings?.length) {
    container.innerHTML = '<p>Keine Vorstellungen verfügbar. <a href="programm.html">Zum Programm</a></p>';
    return;
  }

  container.innerHTML = screenings.map(s => {
    const film = s.films || {};
    const title = film.title || 'Film';
    return `
      <div class="film-card reveal reveal--visible" style="cursor:pointer;" data-screening-id="${s.id}" role="button" tabindex="0" aria-label="Vorstellung wählen: ${sanitize(title)}">
        <div class="film-card__body">
          <h3 class="film-card__title">${sanitize(title)}</h3>
          <div class="film-card__meta">
            <span>${formatDate(s.screening_date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            <span>${formatTime(s.start_time)}</span>
          </div>
          <div class="film-card__footer">
            <span class="film-card__price">ab ${formatPrice(s.price_adult)}</span>
            ${s.is_sold_out
              ? '<span class="badge badge--sold-out">Ausverkauft</span>'
              : `<span class="badge badge--tennis">${s.available_seats} Plätze frei</span>`
            }
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Parent section may still be .reveal without --visible
  container.classList.add('reveal--visible');
  if (typeof observeReveals === 'function') observeReveals(container);

  container.querySelectorAll('[data-screening-id]').forEach(el => {
    el.addEventListener('click', () => selectScreening(el.dataset.screeningId));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectScreening(el.dataset.screeningId);
      }
    });
  });
}

async function selectScreening(id) {
  const { data: screening } = await getScreeningById(id);
  if (!screening || screening.is_sold_out) {
    showToast('Diese Vorstellung ist ausverkauft', 'error');
    return;
  }

  selectedScreening = screening;
  cart.setScreening(screening);
  goToStep(2);

  // Load seat availability
  const { data: seats } = await getSeatAvailability(id);
  const occupied = (seats || []).filter(s => !s.is_available).map(s => s.seat_number);

  seatPlanInstance = new SeatPlan(document.getElementById('seat-plan-container'), {
    occupiedSeats: occupied,
    onChange: (selected) => {
      const data = cart.get();
      data.seats = selected;
      cart.set(data);
      renderCart(document.getElementById('cart-container'));
      document.getElementById('btn-next-2').disabled = selected.length === 0;
    },
  });

  initCartListener(document.getElementById('cart-container'));
}

function goToStep(step) {
  currentStep = step;

  document.querySelectorAll('.booking-step').forEach((el, i) => {
    el.style.display = i + 1 === step ? 'block' : 'none';
  });

  document.querySelectorAll('.progress-bar__step').forEach((el, i) => {
    el.classList.toggle('progress-bar__step--active', i + 1 === step);
    el.classList.toggle('progress-bar__step--completed', i + 1 < step);
  });

  if (step === 3) {
    renderCart(document.getElementById('cart-summary'));
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function handleCheckout(e) {
  e.preventDefault();
  if (!validateForm(e.target)) return;

  const customer = {
    name: document.getElementById('customer-name').value.trim(),
    email: document.getElementById('customer-email').value.trim(),
    phone: document.getElementById('customer-phone').value.trim(),
  };

  cart.setCustomer(customer);
  const data = cart.get();

  if (!data.screening || data.seats.length === 0) {
    showToast('Bitte Sitzplätze auswählen', 'error');
    return;
  }

  goToStep(4);
  setPageLoading(true, 'Buchung wird erstellt...');

  const priceKey = `price_${data.ticketType}`;
  const unitPrice = data.screening[priceKey] || data.screening.price_adult;

  // Create ticket in database
  const { data: ticket, error } = await createTicket({
    screening_id: data.screening.id,
    customer_name: customer.name,
    customer_email: customer.email,
    customer_phone: customer.phone,
    ticket_type: data.ticketType,
    seat_numbers: data.seats,
    quantity: data.seats.length,
    total_amount: unitPrice * data.seats.length,
  });

  if (error) {
    setPageLoading(false);
    showToast('Buchung fehlgeschlagen: ' + error, 'error');
    goToStep(3);
    return;
  }

  // Reserve seats
  await reserveSeats(data.screening.id, data.seats, ticket.id);

  // Create SumUp checkout via worker
  try {
    const res = await fetch(CONFIG.PAYMENT_WORKER_URL + '/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: ticket.total_amount,
        currency: 'EUR',
        reference: ticket.booking_reference,
        ticket_id: ticket.id,
        description: `Court Side Kino – ${data.screening.films?.title || 'Ticket'}`,
        return_url: `${CONFIG.SITE_URL}/buchung-erfolgreich.html?ref=${ticket.booking_reference}`,
      }),
    });

    const payment = await res.json();

    if (payment.checkout_url) {
      // Update ticket with checkout ID
      await updateTicketPayment(ticket.id, { sumup_checkout_id: payment.checkout_id });
      window.location.href = payment.checkout_url;
    } else {
      throw new Error(payment.error || 'Zahlung konnte nicht gestartet werden');
    }
  } catch (err) {
    setPageLoading(false);
    showToast('Zahlungsfehler: ' + err.message, 'error');
    goToStep(3);
  }
}
