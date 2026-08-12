/**
 * Court Side Kino – Navbar Component
 */
function initNavbar() {
  const header = document.querySelector('.header');
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  const overlay = document.querySelector('.nav__overlay');

  // Scroll effect
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('header--scrolled', window.scrollY > 50);
    }, { passive: true });
  }

  // Mobile menu
  function closeMenu() {
    toggle?.setAttribute('aria-expanded', 'false');
    nav?.classList.remove('nav--open');
    overlay?.classList.remove('nav__overlay--visible');
    document.body.style.overflow = '';
  }

  function openMenu() {
    toggle?.setAttribute('aria-expanded', 'true');
    nav?.classList.add('nav--open');
    overlay?.classList.add('nav__overlay--visible');
    document.body.style.overflow = 'hidden';
  }

  toggle?.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    isOpen ? closeMenu() : openMenu();
  });

  overlay?.addEventListener('click', closeMenu);

  // Close on nav link click
  nav?.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Active link highlighting
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  nav?.querySelectorAll('.nav__link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('nav__link--active');
      link.setAttribute('aria-current', 'page');
    }
  });

  // Escape key closes menu
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });
}

/**
 * Court Side Kino – Footer Component
 */
function initFooter() {
  const newsletterForm = document.getElementById('footer-newsletter-form');
  if (!newsletterForm) return;

  newsletterForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = newsletterForm.querySelector('input[type="email"]');
    const email = emailInput.value.trim();

    if (!isValidEmail(email)) {
      showToast('Bitte gültige E-Mail eingeben', 'error');
      return;
    }

    const btn = newsletterForm.querySelector('button');
    btn.disabled = true;
    btn.textContent = '...';

    const { data: existing } = await checkNewsletterEmail(email);
    if (existing) {
      showToast('Diese E-Mail ist bereits angemeldet', 'warning');
      btn.disabled = false;
      btn.textContent = 'Anmelden';
      return;
    }

    const { data, error } = await subscribeNewsletter(email);
    if (error) {
      showToast('Anmeldung fehlgeschlagen', 'error');
    } else {
      showToast('Fast geschafft! Bitte bestätige deine E-Mail.', 'success');
      emailInput.value = '';

      // Trigger welcome email via worker
      try {
        await fetch(CONFIG.EMAIL_WORKER_URL + '/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, token: data.confirm_token }),
        });
      } catch (err) {
        console.warn('Newsletter email could not be sent:', err);
      }
    }

    btn.disabled = false;
    btn.textContent = 'Anmelden';
  });
}

/**
 * Court Side Kino – Theme Toggle
 */
function initThemeToggle() {
  const toggle = document.querySelector('.theme-toggle');
  if (!toggle || !CONFIG.ENABLE_DARK_MODE) return;

  const saved = localStorage.getItem('csk_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(toggle, saved);

  toggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('csk_theme', next);
    updateThemeIcon(toggle, next);
  });
}

function updateThemeIcon(toggle, theme) {
  toggle.innerHTML = theme === 'dark'
    ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
    : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  toggle.setAttribute('aria-label', theme === 'dark' ? 'Hellmodus aktivieren' : 'Dunkelmodus aktivieren');
}

/**
 * Court Side Kino – Cookie Consent
 */
function initCookieConsent() {
  if (localStorage.getItem('csk_cookies')) return;

  const banner = document.querySelector('.cookie-banner');
  if (!banner) return;

  setTimeout(() => banner.classList.add('cookie-banner--visible'), 1000);

  banner.querySelector('[data-cookie-accept]')?.addEventListener('click', () => {
    localStorage.setItem('csk_cookies', 'accepted');
    banner.classList.remove('cookie-banner--visible');
  });

  banner.querySelector('[data-cookie-decline]')?.addEventListener('click', () => {
    localStorage.setItem('csk_cookies', 'declined');
    banner.classList.remove('cookie-banner--visible');
  });
}
