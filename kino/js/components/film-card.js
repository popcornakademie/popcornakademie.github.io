/**
 * Court Side Kino – Film Card Component
 */
function renderFilmCard(film, screening = null) {
  const price = screening
    ? formatPrice(screening.price_adult)
    : 'ab 12,00 €';

  const dateInfo = screening
    ? `<span>${formatDate(screening.screening_date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
       <span>${formatTime(screening.start_time)}</span>`
    : '';

  return `
    <article class="film-card reveal" data-film-slug="${film.slug}">
      <a href="programm.html?film=${film.slug}" class="film-card__link" aria-label="${sanitize(film.title)} – Details ansehen">
        <div class="film-card__poster">
          <img src="${film.poster_url || ''}" alt="Filmplakat: ${sanitize(film.title)}" loading="lazy" width="400" height="600">
          <div class="film-card__badges">
            <span class="badge badge--genre">${sanitize(film.genre)}</span>
            ${film.rating ? `<span class="badge badge--rating">${sanitize(film.rating)}</span>` : ''}
            ${screening?.is_sold_out ? '<span class="badge badge--sold-out">Ausverkauft</span>' : ''}
          </div>
        </div>
        <div class="film-card__body">
          <h3 class="film-card__title">${sanitize(film.title)}</h3>
          <div class="film-card__meta">
            <span>${film.duration_min} Min.</span>
            ${dateInfo}
          </div>
          <p class="film-card__description">${sanitize(film.description || '')}</p>
          <div class="film-card__footer">
            <span class="film-card__price">${price}</span>
            <span class="btn btn--sm btn--primary">Tickets</span>
          </div>
        </div>
      </a>
    </article>
  `;
}

function renderFilmCards(films, container, screenings = []) {
  if (!container) return;
  container.innerHTML = films.map(film => {
    const screening = screenings.find(s => s.film_id === film.id);
    return renderFilmCard(film, screening);
  }).join('');
}

/**
 * Court Side Kino – Menu Card Component
 */
function renderMenuCard(item) {
  const tags = [];
  if (item.is_vegan) tags.push('<span class="menu-card__tag menu-card__tag--vegan">Vegan</span>');
  if (item.is_vegetarian && !item.is_vegan) tags.push('<span class="menu-card__tag">Vegetarisch</span>');

  const allergens = item.allergens?.length
    ? `<p class="menu-card__allergens">Allergene: ${item.allergens.join(', ')}</p>`
    : '';

  return `
    <div class="menu-card reveal">
      <div class="menu-card__header">
        <h3 class="menu-card__name">${sanitize(item.name)}</h3>
        <span class="menu-card__price">${formatPrice(item.price)}</span>
      </div>
      ${item.description ? `<p class="menu-card__description">${sanitize(item.description)}</p>` : ''}
      <div class="menu-card__tags">${tags.join('')}</div>
      ${allergens}
    </div>
  `;
}

function renderMenuCards(items, container) {
  if (!container) return;
  container.innerHTML = items.map(renderMenuCard).join('');
}

/**
 * Court Side Kino – Loading Spinner
 */
function renderLoadingSpinner(message = 'Wird geladen...') {
  return `
    <div class="loading-spinner" role="status" aria-label="${sanitize(message)}">
      <div class="loading-spinner__ball"></div>
      <span class="loading-spinner__text">${sanitize(message)}</span>
    </div>
  `;
}

/**
 * Court Side Kino – Countdown Component
 */
function initCountdown(targetDate, container) {
  if (!container || !targetDate) return;

  const target = new Date(targetDate).getTime();

  function update() {
    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      container.innerHTML = '<p class="text-center">Die Vorstellung beginnt gleich!</p>';
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    container.innerHTML = `
      <div class="countdown" role="timer" aria-label="Countdown zur nächsten Vorstellung">
        <div class="countdown__item">
          <span class="countdown__number">${days}</span>
          <span class="countdown__label">Tage</span>
        </div>
        <div class="countdown__item">
          <span class="countdown__number">${String(hours).padStart(2, '0')}</span>
          <span class="countdown__label">Stunden</span>
        </div>
        <div class="countdown__item">
          <span class="countdown__number">${String(minutes).padStart(2, '0')}</span>
          <span class="countdown__label">Minuten</span>
        </div>
        <div class="countdown__item">
          <span class="countdown__number">${String(seconds).padStart(2, '0')}</span>
          <span class="countdown__label">Sekunden</span>
        </div>
      </div>
    `;
  }

  update();
  return setInterval(update, 1000);
}

/**
 * Court Side Kino – Weather Widget
 */
async function initWeatherWidget(container) {
  if (!container || !CONFIG.ENABLE_WEATHER) return;

  const { lat, lng } = CONFIG.LOCATION;

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&timezone=Europe/Berlin`
    );
    const data = await res.json();
    const temp = Math.round(data.current.temperature_2m);
    const code = data.current.weather_code;
    const icon = getWeatherIcon(code);

    container.innerHTML = `
      <div class="weather-widget">
        <span class="weather-widget__icon" aria-hidden="true">${icon}</span>
        <div>
          <div class="weather-widget__temp">${temp}°C</div>
          <div class="weather-widget__desc">${getWeatherDesc(code)} · Wolfratshausen</div>
        </div>
      </div>
    `;
  } catch {
    container.innerHTML = '';
  }
}

function getWeatherIcon(code) {
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '🌨️';
  return '⛈️';
}

function getWeatherDesc(code) {
  if (code === 0) return 'Klarer Himmel';
  if (code <= 3) return 'Teilweise bewölkt';
  if (code <= 67) return 'Regen möglich';
  if (code <= 77) return 'Schnee möglich';
  return 'Gewitter möglich';
}
