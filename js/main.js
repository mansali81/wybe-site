document.addEventListener('DOMContentLoaded', () => {

  // ── SCROLL PROGRESS BAR ──────────────────────────────
  // Thin lime line at the very top of the viewport; width tracks how far the
  // user has scrolled through the document. Small, godaylight-ish accent.
  (function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bar = document.createElement('div');
    bar.className = 'wybe-scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    let ticking = false;
    const update = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop || document.body.scrollTop;
      const max = (h.scrollHeight - h.clientHeight) || 1;
      bar.style.width = (Math.min(1, scrolled / max) * 100).toFixed(2) + '%';
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    update();
  })();

  // ── NAVBAR MOBILE TOGGLE ──────────────────────────────
  const menuBtn = document.getElementById('menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
    // Close mobile menu on any in-page link click
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => mobileMenu.classList.add('hidden'));
    });
  }

  // ── ACTIVE NAV LINK (single-page anchors) ─────────────
  // Highlight whichever nav link points to the section currently in view.
  const navLinks = document.querySelectorAll('[data-nav-link]');
  if (navLinks.length && 'IntersectionObserver' in window) {
    const sectionMap = new Map();
    navLinks.forEach(link => {
      const id = link.getAttribute('href').replace('#', '');
      const sec = document.getElementById(id);
      if (sec) sectionMap.set(sec, link);
    });
    const navObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(l => { l.classList.remove('text-burgundy'); l.classList.add('text-cream'); });
          const link = sectionMap.get(entry.target);
          if (link) { link.classList.add('text-burgundy'); link.classList.remove('text-cream'); }
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sectionMap.forEach((_, sec) => navObs.observe(sec));
  }

  // ── WEB3FORMS HANDLER ────────────────────────────────
  // Every form with `data-form` submits to web3forms, swaps in the success
  // panel that follows it (the next sibling element).
  document.querySelectorAll('form[data-form]').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn ? btn.textContent : '';
      const successEl = form.nextElementSibling;

      if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }

      const data = Object.fromEntries(new FormData(form));
      data.access_key = '9dd51d8a-998b-4b71-bda2-fd22eb6a752a';
      data.subject = form.dataset.subject || 'WYBE Enquiry';

      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (res.ok) {
          form.classList.add('hidden');
          if (successEl) successEl.classList.remove('hidden');
        } else { throw new Error(); }
      } catch {
        if (btn) { btn.textContent = originalText; btn.disabled = false; }
      }
    });
  });

  // ── SCROLL-IN ANIMATIONS ──────────────────────────────
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if ('IntersectionObserver' in window && !reduceMotion) {
    const sections = document.querySelectorAll('section');
    if (sections.length) {
      const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.remove('section-pre-animate');
            entry.target.classList.add('section-in-view');
            sectionObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

      sections.forEach((section, idx) => {
        if (idx === 0) {
          section.classList.add('section-in-view');
          return;
        }
        section.classList.add('section-pre-animate');
        sectionObserver.observe(section);
      });
    }
  }

  // ── HERO SCROLL-JACKED STORY (v3, sprinter cutout) ─────
  // Hero is 250vh with a sticky-pinned 100vh viewport inside. Scrolling
  // drives:
  //   0.00..0.85  Sprinter cutout translates from off-screen-LEFT to
  //               off-screen-RIGHT. Streaks fire at their --fire progress
  //               values, so each accumulates in the sprinter's wake.
  //               (Sand mp4 in the background autoplays + loops
  //               independently and stays heavily blurred by CSS.)
  //   0.87..1.00  Veil + H1/subtitle/CTA fade in as the sprinter clears
  //               the frame.
  // Under prefers-reduced-motion the CSS falls back and this is a no-op.
  (function () {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hero      = document.getElementById('home');
    const sprinter  = document.querySelector('.hero-sprinter');
    const streaks   = document.querySelectorAll('.hero-streak');
    const veil      = document.querySelector('.hero-veil');
    const content   = document.querySelector('[data-hero-content]');
    if (!hero) return;
    if (reduceMotion) {
      if (content) content.classList.add('is-revealed');
      if (veil)    veil.classList.add('is-visible');
      streaks.forEach(el => el.classList.add('is-active'));
      return;
    }

    // Scroll progress through the WHOLE hero section (0..1). Since the
    // inside is sticky-pinned, scroll from hero-top down maps to 0..1
    // while the visible area stays put.
    const progress = () => {
      const rect  = hero.getBoundingClientRect();
      const range = Math.max(1, hero.offsetHeight - window.innerHeight);
      return Math.max(0, Math.min(1, -rect.top / range));
    };

    const SPRINTER_UNTIL = 0.85;   // sprinter finishes traveling by 0.85
    const REVEAL_AT      = 0.87;   // text + veil reveal at 0.87
    // Sprinter starts off-screen LEFT (-40vw) and ends off-screen RIGHT
    // (+40vw). At progress ~0.5 he's centered.
    const START_TX = -40;
    const END_TX   =  40;

    const streakFires = Array.from(streaks).map(el =>
      parseFloat(getComputedStyle(el).getPropertyValue('--fire')) || 0
    );

    let latestP = 0;
    let ticking = false;
    const apply = () => {
      const p = latestP;

      // Sprinter translate: linear across scroll 0..SPRINTER_UNTIL.
      const sp = Math.min(1, p / SPRINTER_UNTIL);
      const tx = START_TX + (END_TX - START_TX) * sp;
      if (sprinter) sprinter.style.setProperty('--tx', tx.toFixed(2) + 'vw');

      // Streaks: fire when scroll progress crosses each --fire threshold.
      for (let i = 0; i < streaks.length; i++) {
        streaks[i].classList.toggle('is-active', p >= streakFires[i]);
      }

      // Text + veil reveal at the end.
      const reveal = p >= REVEAL_AT;
      if (content) content.classList.toggle('is-revealed', reveal);
      if (veil)    veil.classList.toggle('is-visible',    reveal);

      ticking = false;
    };

    window.addEventListener('scroll', () => {
      latestP = progress();
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    }, { passive: true });
    window.addEventListener('resize', () => {
      latestP = progress();
      apply();
    });

    latestP = progress();
    apply();
  })();

  // ── PARALLAX ──────────────────────────────────────────
  // Elements tagged with [data-parallax] translate vertically with scroll.
  // If they also have [data-parallax-3d], a perspective rotateX + slight
  // scale-down is applied so the element appears to tilt back and recede
  // as the user scrolls past — gives the hero video a cinematic 3D feel.
  const parallaxEls = document.querySelectorAll('[data-parallax]');
  if (parallaxEls.length && !reduceMotion) {
    let ticking = false;
    const updateParallax = () => {
      const y = window.scrollY;
      parallaxEls.forEach(el => {
        const speed = parseFloat(el.dataset.parallax) || 0.3;
        const ty = y * speed;
        const is3d = el.dataset.parallax3d === 'true' || el.dataset.parallax3d === '';
        if (is3d) {
          // Tilt up to ~10° on a full viewport-height of scroll, plus a base
          // zoom (1.2× = 20% in) so the hero video reads closer-up. The scale
          // still tapers slightly on scroll for the parallax depth effect.
          const vh = Math.max(1, window.innerHeight);
          const progress = Math.min(1, y / vh);
          const angle = progress * 10;          // 0° → 10°
          const scale = 1.45 - progress * 0.07; // 1.45 → 1.38
          el.style.transform =
            `translate3d(0, ${ty}px, 0) rotateX(${angle}deg) scale(${scale})`;
        } else {
          el.style.transform = `translate3d(0, ${ty}px, 0)`;
        }
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateParallax);
        ticking = true;
      }
    }, { passive: true });
    updateParallax();
  }

});
