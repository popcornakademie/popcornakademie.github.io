/**
 * Court Side Kino – Gastronomie (Imbiss, Süßes, Biergarten)
 */
document.addEventListener('DOMContentLoaded', async () => {
  const categoryMap = {
    'menu-salzig-grid': 'salzig',
    'menu-snack-grid': 'snack',
    'menu-popcorn-grid': 'popcorn',
    'menu-suess-grid': 'suess',
    'menu-kombi-grid': 'kombi',
    'menu-bier-grid': 'bier',
    'menu-getraenk-grid': 'getraenk',
    'menu-cocktail-grid': 'cocktail',
  };

  for (const [containerId, category] of Object.entries(categoryMap)) {
    const container = document.getElementById(containerId);
    if (!container) continue;

    const { data: items } = await getMenuItems(category);
    if (items?.length) {
      renderMenuCards(items, container);
    } else {
      container.innerHTML = '<p class="text-muted">Aktuell keine Einträge verfügbar.</p>';
    }
  }

  initMenuNav();
  initReservationForm();

  if (location.hash) {
    const active = document.querySelector(`.menu-nav a[href="${location.hash}"]`);
    if (active) {
      document.querySelectorAll('.menu-nav__link--active').forEach(el => el.classList.remove('menu-nav__link--active'));
      active.classList.add('menu-nav__link--active');
    }
  }
});

function initMenuNav() {
  const nav = document.querySelector('.menu-nav');
  if (!nav) return;

  const links = nav.querySelectorAll('a[href^="#"]');
  const sections = [...links]
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  links.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', link.getAttribute('href'));
      }
    });
  });

  if (!sections.length) return;

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        links.forEach(link => {
          link.classList.toggle('menu-nav__link--active', link.getAttribute('href') === `#${entry.target.id}`);
        });
      });
    },
    { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
  );

  sections.forEach(section => observer.observe(section));
}

function initReservationForm() {
  document.getElementById('reservation-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!validateForm(e.target)) return;

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Wird gesendet...';

    const reservationData = {
      customer_name: document.getElementById('res-name').value.trim(),
      customer_email: document.getElementById('res-email').value.trim(),
      customer_phone: document.getElementById('res-phone').value.trim() || null,
      reservation_date: document.getElementById('res-date').value,
      reservation_time: document.getElementById('res-time').value,
      party_size: parseInt(document.getElementById('res-party').value, 10),
      notes: document.getElementById('res-notes').value.trim() || null,
    };

    const { error } = await createReservation(reservationData);

    if (error) {
      showToast('Reservierung fehlgeschlagen', 'error');
    } else {
      showToast('Reservierung eingegangen! Bestätigung per E-Mail folgt.', 'success');
      e.target.reset();

      try {
        await fetch(CONFIG.EMAIL_WORKER_URL + '/reservation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reservationData),
        });
      } catch (err) {
        console.warn('Reservation email could not be sent:', err);
      }
    }

    btn.disabled = false;
    btn.textContent = 'Reservierung absenden';
  });
}
