/**
 * Court Side Kino – Homepage Script
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Weather widget
  initWeatherWidget(document.getElementById('weather-widget'));

  // Next screening countdown
  const { data: nextScreening } = await getNextScreening();
  if (nextScreening) {
    const film = nextScreening.films;
    const infoEl = document.getElementById('next-screening-info');
    if (infoEl) {
      infoEl.textContent = `${film.title} – ${formatDate(nextScreening.screening_date)} um ${formatTime(nextScreening.start_time)}`;
    }

    const dateTime = `${nextScreening.screening_date}T${nextScreening.start_time}`;
    initCountdown(dateTime, document.getElementById('countdown'));
  } else {
    document.getElementById('next-screening-info').textContent = 'Programm wird bald bekannt gegeben';
    document.getElementById('countdown').innerHTML = '<a href="programm.html" class="btn btn--primary">Zum Programm</a>';
  }

  // Featured films (from cache)
  const films = await loadFilmsWithCache();
  const featured = films.filter(f => f.is_featured).slice(0, 3);
  const displayFilms = featured.length ? featured : films.slice(0, 3);
  const { data: screenings } = await getScreenings();
  if (displayFilms.length) {
    renderFilmCards(displayFilms, document.getElementById('featured-films'), screenings || []);
  }

  // Home newsletter form
  const homeForm = document.getElementById('home-newsletter-form');
  homeForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = homeForm.querySelector('input').value.trim();
    if (!isValidEmail(email)) return showToast('Bitte gültige E-Mail eingeben', 'error');

    const { error } = await subscribeNewsletter(email);
    if (error) showToast('Anmeldung fehlgeschlagen', 'error');
    else {
      showToast('Fast geschafft! Bitte bestätige deine E-Mail.', 'success');
      homeForm.reset();
    }
  });
});
