/**
 * Court Side Kino – Kontakt Page Script
 */
document.addEventListener('DOMContentLoaded', () => {
  // Leaflet map
  if (typeof L !== 'undefined' && CONFIG.LOCATION) {
    const { lat, lng, name, address, city } = CONFIG.LOCATION;
    const map = L.map('map').setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
    }).addTo(map);
    L.marker([lat, lng]).addTo(map)
      .bindPopup(`<strong>${name}</strong><br>${address}<br>${city}`)
      .openPopup();
  }

  // Contact form
  document.getElementById('contact-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm(e.target)) return;

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Wird gesendet...';

    const data = {
      name: document.getElementById('contact-name').value.trim(),
      email: document.getElementById('contact-email').value.trim(),
      subject: document.getElementById('contact-subject').value.trim(),
      message: document.getElementById('contact-message').value.trim(),
    };

    try {
      await fetch(CONFIG.EMAIL_WORKER_URL + '/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      showToast('Nachricht gesendet! Wir melden uns bald.', 'success');
      e.target.reset();
    } catch {
      showToast('Senden fehlgeschlagen. Bitte versuche es später erneut.', 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Nachricht senden';
  });
});
