/**
 * Court Side Kino – Programm Page Script
 */
let allFilms = [];
let allScreenings = [];

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('program-grid');
  grid.innerHTML = renderLoadingSpinner('Programm wird geladen...');

  // Load from Supabase cache (background sync if stale)
  allFilms = await loadFilmsWithCache();
  const screeningsRes = await getScreenings();
  allScreenings = screeningsRes.data || [];

  // Populate date filter
  const dateFilter = document.getElementById('filter-date');
  const dates = [...new Set(allScreenings.map(s => s.screening_date))].sort();
  dates.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = formatDate(d, { weekday: 'short', day: 'numeric', month: 'short' });
    dateFilter.appendChild(opt);
  });

  // Populate genre filter dynamically
  const genreFilter = document.getElementById('filter-genre');
  const genres = [...new Set(allFilms.map(f => f.genre).filter(Boolean))].sort();
  genres.forEach(g => {
    if (![...genreFilter.options].some(o => o.value === g)) {
      const opt = document.createElement('option');
      opt.value = g;
      opt.textContent = g;
      genreFilter.appendChild(opt);
    }
  });

  renderProgram();

  document.getElementById('film-search').addEventListener('input', debounce(renderProgram, 300));
  document.getElementById('filter-genre').addEventListener('change', renderProgram);
  document.getElementById('filter-date').addEventListener('change', renderProgram);

  const filmSlug = getQueryParam('film');
  if (filmSlug) showFilmDetail(filmSlug);
});

function renderProgram() {
  const query = document.getElementById('film-search').value;
  const genre = document.getElementById('filter-genre').value;
  const date = document.getElementById('filter-date').value;

  let filtered = searchFilms(allFilms, query);
  if (genre) filtered = filtered.filter(f => f.genre === genre);

  if (date) {
    const filmIds = allScreenings.filter(s => s.screening_date === date).map(s => s.film_id);
    filtered = filtered.filter(f => filmIds.includes(f.id));
  }

  const grid = document.getElementById('program-grid');
  if (filtered.length === 0) {
    grid.innerHTML = '<p class="text-center text-muted" style="grid-column:1/-1;">Keine Filme gefunden.</p>';
    return;
  }

  renderFilmCards(filtered, grid, allScreenings);
}

async function showFilmDetail(slug) {
  const { data: film } = await getFilmBySlug(slug);
  if (!film) return;

  const { data: screenings } = await getScreeningsByFilm(film.id);
  const detailEl = document.getElementById('film-detail');
  detailEl.style.display = 'block';

  const screeningList = (screenings || []).map(s => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-md);background:var(--color-off-white);border-radius:var(--border-radius);margin-bottom:var(--space-sm);flex-wrap:wrap;gap:var(--space-sm);">
      <div>
        <strong>${formatDate(s.screening_date)}</strong> · ${formatTime(s.start_time)}
        ${s.is_sold_out ? '<span class="badge badge--sold-out">Ausverkauft</span>' : ''}
      </div>
      ${!s.is_sold_out ? `<a href="tickets.html?screening=${s.id}" class="btn btn--primary btn--sm">Tickets</a>` : ''}
    </div>
  `).join('');

  const metaBadges = [
    film.genre ? `<span class="badge badge--genre">${sanitize(film.genre)}</span>` : '',
    film.release_year ? `<span class="badge">${film.release_year}</span>` : '',
    film.is_public_domain ? '<span class="badge badge--tennis">Public Domain</span>' : '',
    film.rating ? `<span class="badge badge--rating">${sanitize(film.rating)}</span>` : '',
    film.duration_min ? `<span class="badge">${film.duration_min} Min.</span>` : '',
  ].filter(Boolean).join('');

  const sourceInfo = film.source
    ? `<p class="text-muted" style="font-size:var(--font-size-xs);">Datenquelle: ${film.source === 'tmdb' ? 'TMDb' : 'Wikidata/WikiFlix'} · ${getCacheAgeLabel(film)}</p>`
    : '';

  detailEl.innerHTML = `
    <div class="film-detail reveal--visible">
      <div class="film-detail__grid">
        <img src="${film.poster_url || ''}" alt="Filmplakat: ${sanitize(film.title)}" class="film-detail__poster" width="240" height="360" onerror="this.style.display='none'">
        <div class="film-detail__info">
          <h2>${sanitize(film.title)}</h2>
          <div class="film-detail__badges">${metaBadges}</div>
          ${film.director ? `<p><strong>Regie:</strong> ${sanitize(film.director)}</p>` : ''}
          ${film.cast?.length ? `<p><strong>Besetzung:</strong> ${film.cast.map(sanitize).join(', ')}</p>` : ''}
          <p>${sanitize(film.description || '')}</p>
          ${sourceInfo}
          <div class="film-detail__actions">
            ${film.trailer_url ? `<a href="${film.trailer_url}" target="_blank" rel="noopener" class="btn btn--outline btn--sm">Trailer</a>` : ''}
            <button onclick="shareContent('${sanitize(film.title)}', 'Im Court Side Kino', window.location.href)" class="btn btn--sm btn--outline">Teilen</button>
          </div>
        </div>
      </div>

      ${film.is_public_domain || film.video_sources?.length ? `
        <div class="film-detail__video">
          <h3>Film & Video</h3>
          ${renderFilmVideoPlayer(film)}
        </div>
      ` : ''}

      <div class="film-detail__screenings">
        <h3>Vorstellungen</h3>
        ${screeningList || '<p>Keine Vorstellungen geplant. <a href="tickets.html">Tickets für kommende Events</a></p>'}
      </div>
    </div>
  `;

  detailEl.scrollIntoView({ behavior: 'smooth' });
}
