/**
 * WYBE hero — scroll-scrubbed video + text reveal + read-beat hold.
 * ─────────────────────────────────────────────────────────────────
 * Pins the hero and runs a GSAP + ScrollTrigger timeline with scrub:true
 * so scroll progress drives everything:
 *   0 → ~5 u   video.currentTime scrubs from 0 → duration (~5 s clip)
 *   0.35 → 1.55u  .hero-tagline wipes in left-to-right (clip-path)
 *   1.7  → 3.1 u  .hero-sub     wipes in
 *   3.2  → 4.4 u  .hero-cta     wipes in
 *   5    → 5.6 u  empty hold — the "read beat" (~50 vh of scroll) with
 *                 the hero pinned before it smoothly releases into the
 *                 next section.
 *
 * The pin distance is +=560% of viewport height (≈ 5 s of video scrub
 * plus ~60 vh of hold at normal scroll speed).
 *
 * Video: muted, playsinline, preload="auto", NEVER auto-plays. We drive
 * it by writing currentTime. Modern browsers show the first decoded
 * frame as soon as metadata loads — that acts as the poster.
 *
 * prefers-reduced-motion: the controller returns early — CSS reveals all
 * text immediately and the video sits at its first frame.
 *
 * Mobile (≤768 px): skip the pin + scrub. Text is revealed immediately.
 */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const heroEl  = document.querySelector('section.hero');
  const content = document.querySelector('[data-hero-content]');
  const video   = document.getElementById('hero-scrub');
  if (!heroEl || !content || !video) return;

  const tagline = content.querySelector('.hero-tagline');
  const sub     = content.querySelector('.hero-sub');
  const cta     = content.querySelector('.hero-cta');
  const items   = [tagline, sub, cta].filter(Boolean);

  // Reduced motion + touch/mobile short-circuit — CSS keeps text visible
  // via the initial cascade if we bail here.
  if (reduceMotion) {
    revealAll();
    return;
  }

  function revealAll() {
    items.forEach(el => {
      el.style.opacity = '1';
      el.style.clipPath = 'none';
      el.style.webkitClipPath = 'none';
    });
  }

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

    // On mobile: no pin, no scrub. Text is fully visible from the start.
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) {
      revealAll();
      return;
    }

    // Prime the video — seek to first frame so a "poster" shows before
    // metadata is available.
    try { video.currentTime = 0; } catch (_) {}

    // Once metadata is available we know the duration; build the timeline.
    const setup = () => {
      const duration = (isFinite(video.duration) && video.duration > 0) ? video.duration : 5;

      // Initial hidden state (belt-and-braces — CSS also sets these).
      gsap.set(items, { opacity: 0, clipPath: 'inset(0 100% 0 0)' });

      // Timeline is driven by scrub: the timeline's playhead maps 1-to-1
      // to scroll progress across the pinned range.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: heroEl,
          start: 'top top',
          end: '+=560%',   // ~5s video @ ~100vh/s + ~60vh read-beat hold
          pin: true,
          pinSpacing: true,
          scrub: 1,
          invalidateOnRefresh: true
        }
      });

      // Video scrub — occupies units 0 → 5 (matches the ~5 s clip).
      tl.to(video, { currentTime: duration, duration: 5, ease: 'none' }, 0);

      // Text wipes in left-to-right, staggered within the video window.
      const REV = { clipPath: 'inset(0 0 0 0)', opacity: 1, ease: 'power2.out' };
      tl.to(tagline, Object.assign({ duration: 1.2 }, REV), 0.35);
      tl.to(sub,     Object.assign({ duration: 1.4 }, REV), 1.70);
      tl.to(cta,     Object.assign({ duration: 1.2 }, REV), 3.20);

      // Empty "hold" at the end — a 0.6-unit tween on a dummy object.
      // With +=560% and a total timeline of 5.6 units, this corresponds
      // to ~60 vh of extra scroll where the hero is still pinned and
      // fully revealed — the ~2s read beat before smoothly releasing.
      tl.to({}, { duration: 0.6 }, 5.0);
    };

    if (video.readyState >= 1) {
      setup();
    } else {
      video.addEventListener('loadedmetadata', setup, { once: true });
      // Kick a load in case the browser was lazy about it.
      try { video.load(); } catch (_) {}
    }

    // Debounced resize — recompute canvas nothing (no canvas anymore)
    // and let ScrollTrigger recalc the pin math.
    let rz;
    window.addEventListener('resize', () => {
      clearTimeout(rz);
      rz = setTimeout(() => ScrollTrigger.refresh(), 120);
    });
  }
})();
