document.addEventListener('DOMContentLoaded', () => {

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
          navLinks.forEach(l => { l.classList.remove('text-burgundy'); l.classList.add('text-charcoal'); });
          const link = sectionMap.get(entry.target);
          if (link) { link.classList.add('text-burgundy'); link.classList.remove('text-charcoal'); }
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
      data.access_key = '8611ac93-789d-40d9-b9d8-a15c6af4b94e';
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

  // ── HERO VIDEO AUTO-SOUND ─────────────────────────────
  // Same pattern as the calculator video: unmute while the hero is in view,
  // mute as soon as the user scrolls past it. Browsers refuse the initial
  // unmute attempt until the user has gestured at the page, so we also
  // listen for the first interaction and retry while the hero is visible.
  (function() {
    const heroVideo = document.getElementById('hero-video');
    const heroSection = document.getElementById('home');
    if (!heroVideo || !heroSection || !('IntersectionObserver' in window)) return;

    let isInView = true;
    const tryUnmute = () => {
      heroVideo.muted = false;
      heroVideo.volume = 1;
      heroVideo.play().catch(() => { heroVideo.muted = true; });
    };

    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        isInView = entry.isIntersecting;
        if (entry.isIntersecting) {
          tryUnmute();
        } else {
          heroVideo.muted = true;
        }
      });
    }, { threshold: 0.35 });
    obs.observe(heroSection);

    // First-gesture retry: browsers block the initial autoplay-with-sound
    // attempt. The instant the user interacts, retry once if hero is still
    // visible.
    const events = ['pointerdown', 'click', 'keydown', 'touchstart'];
    const onFirstGesture = () => {
      events.forEach(ev => window.removeEventListener(ev, onFirstGesture, true));
      if (isInView) tryUnmute();
    };
    events.forEach(ev => window.addEventListener(ev, onFirstGesture, { once: true, passive: true, capture: true }));
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
