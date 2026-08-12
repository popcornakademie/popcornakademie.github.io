/**
 * Court Side Kino – Main App Initialization
 */
document.addEventListener('DOMContentLoaded', () => {
  initSupabase();
  initNavbar();
  initFooter();
  initThemeToggle();
  initCookieConsent();

  // Mark page as loaded for entrance animation
  document.body.classList.add('page-enter');
});

/**
 * Shared HTML partials for header and footer
 * Used via data-include attributes or inline in each page
 */
function getHeaderHTML(activePage = '') {
  const pages = [
    { href: 'index.html', label: 'Start' },
    { href: 'programm.html', label: 'Programm' },
    { href: 'tickets.html', label: 'Tickets' },
    { href: 'imbiss.html', label: 'Imbiss' },
    { href: 'suesses.html', label: 'Süßes' },
    { href: 'biergarten.html', label: 'Biergarten' },
    { href: 'ueber-uns.html', label: 'Über uns' },
    { href: 'kontakt.html', label: 'Kontakt' },
  ];

  const navLinks = pages.map(p => `
    <li><a href="${p.href}" class="nav__link ${p.href === activePage ? 'nav__link--active' : ''}"
      ${p.href === activePage ? 'aria-current="page"' : ''}>${p.label}</a></li>
  `).join('');

  return `
    <a href="#main" class="skip-link">Zum Inhalt springen</a>
    <header class="header" role="banner">
      <div class="header__inner">
        <a href="index.html" class="header__logo" aria-label="Court Side Kino – Startseite">
          <span class="header__logo-icon" aria-hidden="true">🎾</span>
          <span>
            Court Side Kino
            <span class="header__logo-sub">by Popcornakademie</span>
          </span>
        </a>
        <div class="header__actions">
          <button class="theme-toggle" aria-label="Dunkelmodus aktivieren" type="button"></button>
          <button class="nav-toggle" aria-expanded="false" aria-controls="main-nav" aria-label="Menü öffnen" type="button">
            <span class="nav-toggle__bar"></span>
            <span class="nav-toggle__bar"></span>
            <span class="nav-toggle__bar"></span>
          </button>
        </div>
        <nav id="main-nav" class="nav" role="navigation" aria-label="Hauptnavigation">
          <ul class="nav__list">
            ${navLinks}
            <li><a href="tickets.html" class="nav__link nav__link--cta">Tickets kaufen</a></li>
          </ul>
        </nav>
      </div>
    </header>
    <div class="nav__overlay" aria-hidden="true"></div>
  `;
}

function getFooterHTML() {
  return `
    <footer class="footer" role="contentinfo">
      <div class="container">
        <div class="footer__grid">
          <div>
            <div class="footer__brand">Court Side Kino</div>
            <div class="footer__tagline">by Popcornakademie</div>
            <p>Open-Air Kino am Tennisplatz des Sportcenters Hahn in Wolfratshausen. Filmgenuss unter freiem Himmel mit Biergarten-Feeling.</p>
            <div class="footer__social">
              <a href="https://instagram.com" class="footer__social-link" aria-label="Instagram" target="_blank" rel="noopener">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              <a href="https://facebook.com" class="footer__social-link" aria-label="Facebook" target="_blank" rel="noopener">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
            </div>
          </div>
          <div>
            <h3 class="footer__heading">Programm</h3>
            <a href="programm.html" class="footer__link">Aktuelles Programm</a>
            <a href="tickets.html" class="footer__link">Tickets kaufen</a>
            <a href="imbiss.html" class="footer__link">Imbiss</a>
            <a href="biergarten.html" class="footer__link">Biergarten</a>
          </div>
          <div>
            <h3 class="footer__heading">Infos</h3>
            <a href="ueber-uns.html" class="footer__link">Über uns</a>
            <a href="kontakt.html" class="footer__link">Kontakt & FAQ</a>
            <a href="kontakt.html#anfahrt" class="footer__link">Anfahrt</a>
          </div>
          <div>
            <h3 class="footer__heading">Newsletter</h3>
            <p style="font-size:var(--font-size-sm);margin-bottom:var(--space-sm);">Verpasse keinen Filmabend!</p>
            <form id="footer-newsletter-form" class="footer__newsletter-form" aria-label="Newsletter-Anmeldung">
              <input type="email" class="footer__newsletter-input" placeholder="deine@email.de" required aria-label="E-Mail-Adresse">
              <button type="submit" class="btn btn--primary btn--sm">Anmelden</button>
            </form>
          </div>
        </div>
        <div class="footer__bottom">
          <span>&copy; ${new Date().getFullYear()} Court Side Kino · Popcornakademie · Sportcenter Hahn, Wolfratshausen</span>
          <span>
            <a href="kontakt.html#datenschutz" class="footer__link" style="display:inline;">Datenschutz</a> ·
            <a href="kontakt.html#impressum" class="footer__link" style="display:inline;">Impressum</a>
          </span>
        </div>
      </div>
    </footer>
    <div class="cookie-banner" role="dialog" aria-label="Cookie-Hinweis">
      <div class="cookie-banner__inner">
        <p class="cookie-banner__text">Wir verwenden Cookies, um dein Erlebnis zu verbessern. <a href="kontakt.html#datenschutz" style="color:var(--color-accent);">Mehr erfahren</a></p>
        <div class="cookie-banner__actions">
          <button class="btn btn--primary btn--sm" data-cookie-accept type="button">Akzeptieren</button>
          <button class="btn btn--outline btn--sm" data-cookie-decline type="button" style="color:var(--color-white);border-color:var(--color-gray-400);">Ablehnen</button>
        </div>
      </div>
    </div>
  `;
}

function getCookieBannerHTML() {
  return '';
}

function getHeadLinks(pageTitle = '') {
  return `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Court Side Kino – Open-Air Kino am Tennisplatz in Wolfratshausen. Filmabende unter freiem Himmel by Popcornakademie @ Sportcenter Hahn.">
    <meta name="theme-color" content="#1a2a4a">
    <meta property="og:title" content="${pageTitle || 'Court Side Kino'}">
    <meta property="og:description" content="Open-Air Kino am Tennisplatz in Wolfratshausen – Filmgenuss mit Biergarten-Feeling">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${CONFIG.SITE_URL}">
    <meta property="og:image" content="${CONFIG.SITE_URL}/assets/images/og-image.jpg">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;700;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/global.css">
    <link rel="stylesheet" href="css/layout.css">
    <link rel="stylesheet" href="css/components.css">
    <link rel="stylesheet" href="css/animations.css">
    <link rel="icon" href="assets/images/favicon.ico" type="image/x-icon">
    <title>${pageTitle ? pageTitle + ' – ' : ''}Court Side Kino</title>
  `;
}

function getScripts(pageScript = '') {
  return `
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js" defer></script>
    <script src="js/config.js" defer></script>
    <script src="js/utils.js" defer></script>
    <script src="js/supabase-client.js" defer></script>
    <script src="js/components/navbar.js" defer></script>
    <script src="js/components/film-card.js" defer></script>
    <script src="js/components/seat-plan.js" defer></script>
    <script src="js/animations.js" defer></script>
    <script src="js/app.js" defer></script>
    ${pageScript ? `<script src="js/pages/${pageScript}" defer></script>` : ''}
  `;
}
