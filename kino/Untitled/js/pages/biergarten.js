/**
 * Court Side Kino – Biergarten Page Script
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Load menu items (reuse menu.js logic)
  const categories = {
    'menu-bier-grid': 'bier',
    'menu-getraenk-grid': 'getraenk',
    'menu-cocktail-grid': 'cocktail',
  };

  for (const [containerId, category] of Object.entries(categories)) {
    const container = document.getElementById(containerId);
    if (!container) continue;
    const { data: items } = await getMenuItems(category);
    if (items?.length) renderMenuCards(items, container);
  }

  // Reservation form
  document.getElementById('reservation-form')?.addEventListener('submit', async (e) => {
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

    const { data, error } = await createReservation(reservationData);

    if (error) {
      showToast('Reservierung fehlgeschlagen', 'error');
    } else {
      showToast('Reservierung eingegangen! Bestätigung per E-Mail folgt.', 'success');
      e.target.reset();

      // Send confirmation email via worker
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
});
