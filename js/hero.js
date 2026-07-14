/**
 * WYBE hero — scroll-scrubbed video + pinned read-beat hold.
 * ──────────────────────────────────────────────────────────
 * Text visibility is owned by CSS: .hero-tagline / .hero-sub / .hero-cta
 * are visible by default and receive a short CSS `hero-enter` fade-up
 * animation on page load (see css/styles.css). Nothing here touches
 * their opacity or transform — pre-JS, no-JS, mobile, and reduced-
 * motion all paint the hero copy above the fold immediately.
 *
 * This controller only drives the video scrub and a short pinned hold:
 *   0 → 1     video.currentTime scrubs 0 → duration across the pin
 *   1 → 1.2   empty hold — a brief "read beat" before the hero
 *             releases into the next section.
 *
 * Pin distance is +=120% of viewport height so the hero completes in
 * ~1.2 screens of scroll — scrolling feels responsive and users no
 * longer need to wheel through a wall of pinned scroll to reach the
 * next section. A previous version pinned for +=560% and made the
 * whole page feel scroll-jacked.
 *
 * Video: muted, playsinline, preload="auto", NEVER auto-plays. We drive
 * it by writing currentTime. Modern browsers show the first decoded
 * frame as soon as metadata loads — that acts as the poster.
 *
 * prefers-reduced-motion + mobile (≤768 px): skip the pin + scrub. The
 * video sits at its first frame; the CSS entrance animation on desktop
 * is auto-skipped for reduced-motion users too.
 */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const heroEl = document.querySelector('section.hero');
  const video  = document.getElementById('hero-scrub');
  if (!heroEl || !video) return;

  if (reduceMotion) return;

  // Wait for GSAP + ScrollTrigger (both loaded via defer).
  function ready(cb) {
    if (window.gsap && window.ScrollTrigger) { cb(); return; }
    if (document.readyState === 'complete') {
      let tries = 0;
      const t = setInterval(() => {
        if ((window.gsap && window.ScrollTrigger) || tries++ > 40) {
          clearInterval(t);
          if (window.gsap && window.ScrollTrigger) cb();
        }
      }, 50);
    } else {
      window.addEventListener('load', () => ready(cb), { once: true });
    }
  }
  ready(init);

  function init() {
    gsap.registerPlugin(ScrollTrigger);

    // On mobile: no pin, no scrub. Text is already visible via CSS.
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) return;

    // Prime the video — seek to first frame so a "poster" shows before
    // metadata is available.
    try { video.currentTime = 0; } catch (_) {}

    // Header height reader — offsets the pin so the pinned hero sits
    // BELOW the fixed .wybe-nav. Defaults to 97 (matches CSS --nav-h).
    const navH = () => {
      const nav = document.getElementById('wybe-nav');
      return nav ? Math.round(nav.getBoundingClientRect().height) : 97;
    };

    // Build the timeline once metadata is available (need duration).
    const setup = () => {
      const duration = (isFinite(video.duration) && video.duration > 0) ? video.duration : 5;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: heroEl,
          start: () => `top top+=${navH()}`,
          end: '+=120%',
          pin: true,
          pinType: 'fixed',
          pinSpacing: true,
          scrub: true,
          invalidateOnRefresh: true
        }
      });

      // Video scrub — 1 timeline unit maps to the entire pinned range.
      tl.to(video, { currentTime: duration, duration: 1, ease: 'none' }, 0);

      // Short hold tail — ~20 vh of extra scroll where the hero stays
      // pinned before smoothly releasing into the next section.
      tl.to({}, { duration: 0.2 }, 1.0);
    };

    if (video.readyState >= 1) {
      setup();
    } else {
      video.addEventListener('loadedmetadata', setup, { once: true });
      try { video.load(); } catch (_) {}
    }

    // Debounced resize — invalidateOnRefresh recomputes the pin start
    // via navH() so a responsive header change still produces a gap-
    // free pin.
    let rz;
    window.addEventListener('resize', () => {
      clearTimeout(rz);
      rz = setTimeout(() => ScrollTrigger.refresh(), 120);
    });
  }
})();
