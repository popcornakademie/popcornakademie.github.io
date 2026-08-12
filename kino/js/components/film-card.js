/**
 * Court Side Kino – Film Card Component
 */
function renderFilmCard(film, screening = null) {
  const price = screening
    ? formatPrice(getTicketUnitPrice(screening))
    : formatPrice(typeof CONFIG !== 'undefined' ? CONFIG.TICKET_PRICE : 10);

  const dateInfo = screening
    ? `<span>${formatDate(screening.screening_date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
       <span>${formatTime(screening.start_time)}</span>`
    : film.release_year
      ? `<span>${film.release_year}</span>`
      : '';

  const pdBadge = film.is_public_domain
    ? '<span class="badge badge--tennis">Public Domain</span>'
    : '';

  const sourceBadge = film.source === 'wikidata' && !film.tmdb_id
    ? '<span class="badge" style="background:var(--color-gray-200);">WikiFlix</span>'
    : '';

  return `
    <article class="film-card reveal" data-film-slug="${film.slug}">
      <a href="programm.html?film=${film.slug}" class="film-card__link" aria-label="${sanitize(film.title)} – Details ansehen">
        <div class="film-card__poster">
          <img src="${film.poster_url || 'assets/images/poster-placeholder.jpg'}" alt="Filmplakat: ${sanitize(film.title)}" loading="lazy" width="400" height="600" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop'">
          <div class="film-card__badges">
            <span class="badge badge--genre">${sanitize(film.genre || 'Film')}</span>
            ${pdBadge}
            ${sourceBadge}
            ${film.rating ? `<span class="badge badge--rating">${sanitize(film.rating)}</span>` : ''}
            ${screening?.is_sold_out ? '<span class="badge badge--sold-out">Ausverkauft</span>' : ''}
          </div>
        </div>
        <div class="film-card__body">
          <h3 class="film-card__title">${sanitize(film.title)}</h3>
          <div class="film-card__meta">
            ${film.duration_min ? `<span>${film.duration_min} Min.</span>` : ''}
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
    const screening = screenings.find(s => s.film_id === film.id || s.film_id === film.slug);
    return renderFilmCard(film, screening);
  }).join('');
  container.classList.add('reveal--visible');
  container.querySelectorAll('.reveal').forEach(el => el.classList.add('reveal--visible'));
  if (typeof observeReveals === 'function') observeReveals(container);
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
 * Shows forecast for dusk/sunset hour of the current day
 */
async function initWeatherWidget(container) {
  if (!container || !CONFIG.ENABLE_WEATHER) return;

  const { lat, lng } = CONFIG.LOCATION;

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,weather_code&daily=sunset&timezone=Europe/Berlin&forecast_days=1`
    );
    const data = await res.json();
    const times = data.hourly?.time || [];
    const temps = data.hourly?.temperature_2m || [];
    const codes = data.hourly?.weather_code || [];
    const sunsetIso = data.daily?.sunset?.[0];

    if (!times.length || !sunsetIso) {
      container.innerHTML = '';
      return;
    }

    // Sunset time parts (already Europe/Berlin from API)
    const sunsetTime = sunsetIso.includes('T') ? sunsetIso.split('T')[1] : sunsetIso;
    const [sunsetH, sunsetM] = sunsetTime.split(':').map(Number);
    const sunsetMinutes = sunsetH * 60 + sunsetM;

    // Pick hourly slot closest to sunset
    let idx = 0;
    let bestDiff = Infinity;
    times.forEach((t, i) => {
      const timePart = t.includes('T') ? t.split('T')[1] : t;
      const [hh, mm] = timePart.split(':').map(Number);
      const diff = Math.abs(hh * 60 + mm - sunsetMinutes);
      if (diff < bestDiff) {
        bestDiff = diff;
        idx = i;
      }
    });

    const temp = Math.round(temps[idx]);
    const code = codes[idx];
    const icon = getWeatherIcon(code);
    const duskLabel = `${String(sunsetH).padStart(2, '0')}:${String(sunsetM).padStart(2, '0')}`;

    container.innerHTML = `
      <div class="weather-widget">
        <span class="weather-widget__icon" aria-hidden="true">${icon}</span>
        <div>
          <div class="weather-widget__temp">${temp}°C</div>
          <div class="weather-widget__desc">${getWeatherDesc(code)} · Dunkel ab ${duskLabel} Uhr · Wolfratshausen</div>
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

/**
 * Render video player for Public-Domain / WikiFlix sources
 * @param {Object} film
 * @returns {string}
 */
function renderFilmVideoPlayer(film) {
  const sources = film.video_sources || [];
  if (!sources.length) {
    return film.trailer_url
      ? renderYouTubeEmbed(film.trailer_url, `${film.title} – Trailer`)
      : '<p class="text-muted">Video demnächst verfügbar</p>';
  }

  const primary = sources.find(s => s.type === 'archive')
    || sources.find(s => s.type === 'commons')
    || sources.find(s => s.type === 'youtube')
    || sources[0];

  if (primary.type === 'youtube') {
    return renderYouTubeEmbed(primary.url, primary.label || 'Video');
  }

  if (primary.type === 'archive') {
    return `
      <div class="video-player">
        <iframe src="${sanitize(primary.url)}" title="${sanitize(film.title)}" allowfullscreen loading="lazy" class="video-player__iframe"></iframe>
        <p class="video-player__source">Quelle: Internet Archive · Public Domain</p>
      </div>`;
  }

  return `
    <div class="video-player">
      <video controls preload="metadata" class="video-player__video" poster="${film.poster_url || ''}">
        <source src="${sanitize(primary.url)}" type="video/mp4">
        <a href="${sanitize(primary.url)}" target="_blank" rel="noopener">Video ansehen</a>
      </video>
      <p class="video-player__source">Quelle: ${sanitize(primary.label || 'Wikimedia')} · Public Domain</p>
    </div>`;
}

function renderYouTubeEmbed(url, title) {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (!match) return `<a href="${sanitize(url)}" target="_blank" rel="noopener" class="btn btn--outline">Video ansehen</a>`;
  return `
    <div class="video-player">
      <iframe src="https://www.youtube-nocookie.com/embed/${match[1]}" title="${sanitize(title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy" class="video-player__iframe"></iframe>
    </div>`;
}
