/**
 * Court Side Kino – Seat Plan Component
 */
class SeatPlan {
  constructor(container, options = {}) {
    this.container = container;
    this.rows = options.rows || CONFIG.SEAT_ROWS;
    this.seatsPerRow = options.seatsPerRow || CONFIG.SEATS_PER_ROW;
    this.occupiedSeats = new Set(options.occupiedSeats || []);
    this.selectedSeats = new Set(options.selectedSeats || []);
    this.maxSeats = options.maxSeats || 8;
    this.onChange = options.onChange || (() => {});
    this.render();
  }

  render() {
    let html = `
      <div class="seat-plan">
        <div class="seat-plan__screen"></div>
        <div class="seat-plan__grid" role="grid" aria-label="Sitzplan">
    `;

    for (let row = 0; row < this.rows; row++) {
      const rowLabel = String.fromCharCode(65 + row);
      html += `<div class="seat-plan__row" role="row">`;
      html += `<span class="seat-plan__row-label" aria-hidden="true">${rowLabel}</span>`;

      for (let col = 1; col <= this.seatsPerRow; col++) {
        const seatNum = row * this.seatsPerRow + col;
        const isOccupied = this.occupiedSeats.has(seatNum);
        const isSelected = this.selectedSeats.has(seatNum);
        const classes = ['seat'];
        if (isOccupied) classes.push('seat--occupied');
        if (isSelected) classes.push('seat--selected');

        html += `
          <button
            class="${classes.join(' ')}"
            data-seat="${seatNum}"
            role="gridcell"
            aria-label="Sitz ${rowLabel}${col}${isOccupied ? ' – belegt' : isSelected ? ' – ausgewählt' : ' – frei'}"
            ${isOccupied ? 'disabled' : ''}
            aria-pressed="${isSelected}"
          >${col}</button>
        `;
      }

      html += `<span class="seat-plan__row-label" aria-hidden="true">${rowLabel}</span>`;
      html += `</div>`;
    }

    html += `
        </div>
        <div class="seat-plan__legend">
          <span class="seat-plan__legend-item">
            <span class="seat-plan__legend-dot seat-plan__legend-dot--available"></span> Frei
          </span>
          <span class="seat-plan__legend-item">
            <span class="seat-plan__legend-dot seat-plan__legend-dot--selected"></span> Ausgewählt
          </span>
          <span class="seat-plan__legend-item">
            <span class="seat-plan__legend-dot seat-plan__legend-dot--occupied"></span> Belegt
          </span>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.bindEvents();
  }

  bindEvents() {
    this.container.querySelectorAll('.seat:not(.seat--occupied)').forEach(btn => {
      btn.addEventListener('click', () => {
        const seatNum = parseInt(btn.dataset.seat, 10);

        if (this.selectedSeats.has(seatNum)) {
          this.selectedSeats.delete(seatNum);
        } else {
          if (this.selectedSeats.size >= this.maxSeats) {
            showToast(`Maximal ${this.maxSeats} Plätze pro Buchung`, 'warning');
            return;
          }
          this.selectedSeats.add(seatNum);
        }

        this.render();
        this.onChange([...this.selectedSeats].sort((a, b) => a - b));
      });
    });
  }

  getSelected() {
    return [...this.selectedSeats].sort((a, b) => a - b);
  }

  setOccupied(seats) {
    this.occupiedSeats = new Set(seats);
    this.render();
  }
}

/**
 * Court Side Kino – Cart Display Component
 */
function renderCart(container) {
  if (!container) return;

  const data = cart.get();
  if (!data.screening || data.seats.length === 0) {
    container.innerHTML = '<div class="cart__empty">Noch keine Tickets ausgewählt</div>';
    return;
  }

  const priceKey = `price_${data.ticketType}`;
  const unitPrice = data.screening[priceKey] || data.screening.price_adult;
  const total = unitPrice * data.seats.length;
  const filmTitle = data.screening.films?.title || 'Film';

  container.innerHTML = `
    <h3 class="cart__title">Warenkorb</h3>
    <div class="cart__item">
      <span>${sanitize(filmTitle)}</span>
    </div>
    <div class="cart__item">
      <span>${data.seats.length}x ${data.ticketType === 'child' ? 'Kind' : data.ticketType === 'student' ? 'Student' : 'Erwachsener'}</span>
      <span>${formatPrice(unitPrice)}</span>
    </div>
    <div class="cart__item">
      <span>Plätze: ${data.seats.join(', ')}</span>
    </div>
    <div class="cart__total">
      <span>Gesamt</span>
      <span class="cart__total-amount counter-animate">${formatPrice(total)}</span>
    </div>
  `;
}

function initCartListener(container) {
  document.addEventListener('cart:updated', () => renderCart(container));
  renderCart(container);
}
