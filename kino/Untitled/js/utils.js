/**
 * Court Side Kino – Utility Functions
 */

/**
 * Format price in EUR
 */
function formatPrice(amount) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: CONFIG.CURRENCY || 'EUR',
  }).format(amount);
}

/**
 * Format date in German locale
 */
function formatDate(dateStr, options = {}) {
  const defaults = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  return new Date(dateStr).toLocaleDateString('de-DE', { ...defaults, ...options });
}

/**
 * Format time (HH:MM)
 */
function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  return `${hours}:${minutes} Uhr`;
}

/**
 * Debounce function calls
 */
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info', duration = 4000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.setAttribute('role', 'alert');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Sanitize user input (basic XSS prevention)
 */
function sanitize(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Get URL query parameter
 */
function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/**
 * Set page loading state
 */
function setPageLoading(isLoading, message = 'Wird geladen...') {
  let overlay = document.getElementById('page-loader');
  if (isLoading && !overlay) {
    overlay = document.createElement('div');
    overlay.id = 'page-loader';
    overlay.className = 'loading-spinner';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(250,249,246,0.9);display:flex;';
    overlay.innerHTML = `
      <div class="loading-spinner__ball"></div>
      <span class="loading-spinner__text">${sanitize(message)}</span>
    `;
    document.body.appendChild(overlay);
  } else if (!isLoading && overlay) {
    overlay.remove();
  }
}

/**
 * Local storage helpers with JSON support
 */
const storage = {
  get(key, fallback = null) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  remove(key) {
    localStorage.removeItem(key);
  },
};

/**
 * Cart management (session-based)
 */
const cart = {
  KEY: 'csk_cart',

  get() {
    return storage.get(this.KEY, { screening: null, seats: [], ticketType: 'adult', customer: {} });
  },

  set(data) {
    storage.set(this.KEY, data);
    document.dispatchEvent(new CustomEvent('cart:updated', { detail: data }));
  },

  clear() {
    storage.remove(this.KEY);
    document.dispatchEvent(new CustomEvent('cart:updated', { detail: null }));
  },

  addSeats(seats) {
    const data = this.get();
    data.seats = [...new Set([...data.seats, ...seats])].sort((a, b) => a - b);
    this.set(data);
  },

  removeSeat(seat) {
    const data = this.get();
    data.seats = data.seats.filter(s => s !== seat);
    this.set(data);
  },

  setScreening(screening) {
    const data = this.get();
    data.screening = screening;
    data.seats = [];
    this.set(data);
  },

  setTicketType(type) {
    const data = this.get();
    data.ticketType = type;
    this.set(data);
  },

  setCustomer(customer) {
    const data = this.get();
    data.customer = customer;
    this.set(data);
  },

  getTotal() {
    const data = this.get();
    if (!data.screening || data.seats.length === 0) return 0;
    const priceKey = `price_${data.ticketType}`;
    const price = data.screening[priceKey] || data.screening.price_adult;
    return price * data.seats.length;
  },
};

/**
 * Share via Web Share API (with fallback)
 */
async function shareContent(title, text, url) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
    } catch (err) {
      if (err.name !== 'AbortError') showToast('Teilen fehlgeschlagen', 'error');
    }
  } else {
    await navigator.clipboard.writeText(url);
    showToast('Link kopiert!', 'success');
  }
}

/**
 * Generate simple QR code placeholder (text-based)
 * In production, use a QR library or server-side generation
 */
function generateQRPlaceholder(data) {
  return data;
}

/**
 * Client-side film search
 */
function searchFilms(films, query) {
  if (!query) return films;
  const q = query.toLowerCase();
  return films.filter(f =>
    f.title.toLowerCase().includes(q) ||
    f.genre.toLowerCase().includes(q) ||
    (f.director && f.director.toLowerCase().includes(q))
  );
}

/**
 * Form validation helper
 */
function validateForm(formEl) {
  const errors = [];
  const fields = formEl.querySelectorAll('[required]');

  fields.forEach(field => {
    field.classList.remove('form-input--error');
    const errorEl = field.parentElement.querySelector('.form-error');
    if (errorEl) errorEl.remove();

    if (!field.value.trim()) {
      errors.push({ field, message: 'Dieses Feld ist erforderlich' });
    } else if (field.type === 'email' && !isValidEmail(field.value)) {
      errors.push({ field, message: 'Bitte gültige E-Mail eingeben' });
    }
  });

  errors.forEach(({ field, message }) => {
    field.classList.add('form-input--error');
    const err = document.createElement('p');
    err.className = 'form-error';
    err.textContent = message;
    field.parentElement.appendChild(err);
  });

  return errors.length === 0;
}
