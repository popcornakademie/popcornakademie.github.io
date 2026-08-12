/**
 * Court Side Kino – Admin Sync Page
 */
document.addEventListener('DOMContentLoaded', () => {
  initSupabase();

  document.getElementById('btn-sync-all')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-sync-all');
    const log = document.getElementById('sync-log');
    const status = document.getElementById('sync-status');

    btn.disabled = true;
    btn.textContent = 'Sync läuft...';
    log.innerHTML = '';
    status.innerHTML = '<p>Sync gestartet...</p>';

    try {
      const result = await syncFilmsFromAPIs({
        silent: true,
        onProgress: (current, total, r) => {
          const line = document.createElement('div');
          line.textContent = `[${current}/${total}] ${r.title || r.film?.title}: ${r.success ? '✓ ' + r.source : '✗ ' + (r.error || 'Fehler')}`;
          log.appendChild(line);
        },
      });

      status.innerHTML = `<p><strong>Fertig:</strong> ${result.synced} synchronisiert, ${result.failed} fehlgeschlagen</p>`;
      showToast('Sync abgeschlossen', result.failed ? 'warning' : 'success');
    } catch (err) {
      status.innerHTML = `<p style="color:var(--color-error);">Fehler: ${sanitize(err.message)}</p>`;
      showToast('Sync fehlgeschlagen', 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Alle 10 Filme synchronisieren';
  });
});
