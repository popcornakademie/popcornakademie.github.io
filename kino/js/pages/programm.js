/**
 * Court Side Kino – Programm Page Script
 */
let allFilms = [];
let allScreenings = [];

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('program-grid');
  grid.innerHTML = renderLoadingSpinner('Programm wird geladen...');

  const [filmsRes, screeningsRes] = await Promise.all([getFilms(), getScreenings()]);
  allFilms = filmsRes.data || [];
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

  renderProgram();

  // Filter events
  document.getElementById('film-search').addEventListener('input', debounce(renderProgram, 300));
  document.getElementById('filter-genre').addEventListener('change', renderProgram);
  document.getElementById('filter-date').addEventListener('change', renderProgram);

  // Check for film detail query param
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
    <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-md);background:var(--color-off-white);border-radius:var(--border-radius);margin-bottom:var(--space-sm);">
      <div>
        <strong>${formatDate(s.screening_date)}</strong> · ${formatTime(s.start_time)}
        ${s.is_sold_out ? '<span class="badge badge--sold-out">Ausverkauft</span>' : ''}
      </div>
      ${!s.is_sold_out ? `<a href="tickets.html?screening=${s.id}" class="btn btn--primary btn--sm">Tickets</a>` : ''}
    </div>
  `).join('');

  detailEl.innerHTML = `
    <div style="display:grid;gap:var(--space-2xl);grid-template-columns:1fr;" class="reveal--visible">
      <div style="display:grid;gap:var(--space-xl);">
        <div style="display:grid;gap:var(--space-xl);grid-template-columns:200px 1fr;">
          <img src="${film.poster_url}" alt="Filmplakat: ${sanitize(film.title)}" style="border-radius:var(--border-radius-lg);width:100%;" width="200" height="300">
          <div>
            <h2>${sanitize(film.title)}</h2>
            <div style="display:flex;gap:var(--space-sm);margin:var(--space-md) 0;">
              <span class="badge badge--genre">${sanitize(film.genre)}</span>
              ${film.rating ? `<span class="badge badge--rating">${sanitize(film.rating)}</span>` : ''}
              <span class="badge">${film.duration_min} Min.</span>
            </div>
            ${film.director ? `<p><strong>Regie:</strong> ${sanitize(film.director)}</p>` : ''}
            ${film.cast ? `<p><strong>Besetzung:</strong> ${film.cast.map(sanitize).join(', ')}</p>` : ''}
            <p>${sanitize(film.description || '')}</p>
            ${film.trailer_url ? `<a href="${film.trailer_url}" target="_blank" rel="noopener" class="btn btn--outline btn--sm" style="margin-top:var(--space-md);">Trailer ansehen</a>` : ''}
            <button onclick="shareContent('${sanitize(film.title)}', 'Im Court Side Kino', window.location.href)" class="btn btn--sm btn--outline" style="margin-top:var(--space-md);margin-left:var(--space-sm);">Teilen</button>
          </div>
        </div>
        <div>
          <h3>Vorstellungen</h3>
          ${screeningList || '<p>Keine Vorstellungen geplant.</p>'}
        </div>
      </div>
    </div>
  `;

  detailEl.scrollIntoView({ behavior: 'smooth' });
}
