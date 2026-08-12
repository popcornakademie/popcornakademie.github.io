/**
 * Court Side Kino – Menu Pages Script (Imbiss & Süßes)
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
});
