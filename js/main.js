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

  // ── HERO RUNNER: SCROLL-SCRUBBED VIDEO + SPEED STREAKS ─
  // The runner mp4 never plays on its own. As the user scrolls through the
  // hero, we map scroll progress (0..1) → video.currentTime, so the clip
  // advances frame-by-frame with the scroll. Lime streaks scale-in on the
  // same progress, staggered so they read as a motion trail behind him.
  // Falls back to a static first frame if scrubbing is unsupported (e.g.,
  // some older mobile Safari), or is disabled entirely under
  // prefers-reduced-motion.
  (function () {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hero    = document.getElementById('home');
    const video   = document.getElementById('hero-runner-video');
    const streaks = document.querySelectorAll('.hero-streak');
    if (!hero || !video) return;
    if (reduceMotion) return; // CSS already hides the video and streaks stay at 0

    // Ready the video without playing it. On loadedmetadata we can seek.
    let duration = 0;
    const primeVideo = () => {
      duration = isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
      // Nudge to a first stable frame so an initial poster shows before any
      // scroll happens.
      try { video.currentTime = 0.001; } catch (_) {}
    };
    if (video.readyState >= 1) primeVideo();
    else video.addEventListener('loadedmetadata', primeVideo, { once: true });

    // Fallback: if the video can't seek (readyState never advances), leave the
    // element at first frame and let the streaks carry the effect.

    // Compute scroll progress through the hero. We consume the FIRST viewport-
    // height of scroll past hero-top so the whole runner sequence plays before
    // the next section arrives.
    const progress = () => {
      const rect = hero.getBoundingClientRect();
      const range = Math.max(1, hero.offsetHeight - window.innerHeight * 0.35);
      const scrolled = -rect.top;
      return Math.max(0, Math.min(1, scrolled / range));
    };

    let latestP = 0;
    let ticking = false;
    const apply = () => {
      const p = latestP;
      // Video scrub. Skip if not yet loaded enough to seek.
      if (duration > 0 && video.readyState >= 2) {
        // Guard against setting currentTime to exactly duration (some browsers
        // dispatch 'ended' and freeze). Cap at duration - a small delta.
        const t = Math.min(duration - 0.05, p * duration);
        if (Math.abs(video.currentTime - t) > 0.02) {
          try { video.currentTime = t; } catch (_) {}
        }
      }
      // Streaks: each one has a stagger delay in --d (0..0.35). Scale from
      // 0 to 1 as progress crosses that delay + a 0.35 window.
      streaks.forEach((el) => {
        const d = parseFloat(getComputedStyle(el).getPropertyValue('--d')) || 0;
        const local = Math.max(0, Math.min(1, (p - d) / 0.4));
        el.style.transform = `scaleX(${local.toFixed(3)})`;
        el.classList.toggle('is-active', local > 0.01);
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      latestP = progress();
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    }, { passive: true });
    // Also apply once at load in case the browser restored a mid-page scroll.
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
