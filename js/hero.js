/**
 * WYBE hero — first-frame poster only, native scrolling.
 * ──────────────────────────────────────────────────────
 * The hero video (#hero-scrub) is primed to its first decoded frame
 * so browsers show it as a poster on load. Nothing else happens on
 * scroll — no pin, no scrub, no ScrollTrigger. The hero scrolls away
 * like any normal section, so scrolling feels immediate.
 *
 * Text visibility is owned by CSS: .hero-tagline / .hero-sub /
 * .hero-cta are visible by default and receive a short CSS
 * `hero-enter` fade-up animation on page load (see css/styles.css).
 * Nothing here touches their opacity or transform — pre-JS, no-JS,
 * mobile, and reduced-motion all paint the hero copy above the fold
 * immediately.
 *
 * Reduced-motion: this file becomes a no-op. The CSS entrance keyframe
 * is already gated behind (prefers-reduced-motion: no-preference).
 */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const video = document.getElementById('hero-scrub');
  if (!video) return;

  // Seek the video to the first frame so a decoded still shows before
  // any metadata / autoplay / scrub concerns. Wrapped in try/catch
  // because Safari can throw on early seeks.
  const primeFirstFrame = () => {
    try { video.currentTime = 0; } catch (_) { /* ignore */ }
  };
  if (video.readyState >= 1) {
    primeFirstFrame();
  } else {
    video.addEventListener('loadedmetadata', primeFirstFrame, { once: true });
    try { video.load(); } catch (_) { /* ignore */ }
  }
})();
