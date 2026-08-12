/**
 * Court Side Kino – Popcorn Akademie-style animations
 * Floating popcorn kernels, marquee, popmark reveal
 */

(function initPopcornEffects() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  initPopmarks();
  initMarquee();
  if (!reduce) initFloatingPopcorn();

  function initPopmarks() {
    const marks = document.querySelectorAll('.popmark');
    if (!marks.length) return;

    document.querySelectorAll('.hero .popmark').forEach(el => el.classList.add('in'));

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );

    marks.forEach(el => {
      if (!el.closest('.hero')) observer.observe(el);
    });
  }

  function initMarquee() {
    const track = document.getElementById('marquee-track');
    if (!track) return;

    const items = [
      'Open-Air Kino',
      'Popcorn frisch gepoppt',
      'Biergarten-Feeling',
      'Tennisplatz bei Nacht',
      'Court Side Kino',
      'by Popcornakademie',
      'Wolfratshausen',
      'Film unter Sternen',
    ];

    const segment = items.map(text => `<span>${text} <em>✦</em></span>`).join('');
    track.innerHTML = segment + segment;
  }

  function initFloatingPopcorn() {
    document.querySelectorAll('[data-drift]').forEach(container => {
      const count = parseInt(container.dataset.drift, 10) || 9;
      for (let i = 0; i < count; i++) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        use.setAttribute('href', '#pop');
        svg.appendChild(use);

        const size = 14 + Math.random() * 24;
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.style.width = `${size}px`;
        svg.style.height = `${size}px`;
        svg.style.color = '#FFF4E0';
        svg.style.left = `${Math.random() * 100}%`;
        svg.style.top = `${50 + Math.random() * 45}%`;
        svg.style.setProperty('--dx', `${((Math.random() - 0.5) * 160).toFixed(0)}px`);
        svg.style.setProperty('--dy', `${(-180 - Math.random() * 200).toFixed(0)}px`);
        svg.style.setProperty('--rot', `${((Math.random() - 0.5) * 300).toFixed(0)}deg`);
        svg.style.animation = `drift ${(9 + Math.random() * 8).toFixed(1)}s linear ${(Math.random() * 9).toFixed(1)}s infinite`;
        container.appendChild(svg);
      }
    });
  }
})();
