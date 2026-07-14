/**
 * WYBE Four Pillars — Daylight-style sticky-pinned reveal.
 * ─────────────────────────────────────────────────────────
 * Each `[data-pillar-scene]` block is a full-viewport sticky-pinned card
 * (CSS handles the pin). This controller runs an independent ScrollTrigger
 * per scene that tweens the per-line `.line-inner` elements from
 * `yPercent: 105` (below the mask) → `yPercent: 0` (in view) with a small
 * stagger and expo-out easing as the scene enters the viewport.
 * Scrolling back UP past the trigger reverses the animation so the
 * choreography still lands the second time.
 *
 * Mobile (≤ 768 px) and prefers-reduced-motion return early; CSS in
 * styles.css collapses the pin to a normal stack and keeps the type
 * visible at rest so nothing gets stuck below its mask.
 */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scenes = document.querySelectorAll('[data-pillar-scene]');
  if (!scenes.length) return;
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

    // On mobile the CSS collapses pins to a normal stack; skip the reveal
    // machinery entirely so a horizontal-nav user always sees the copy.
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) return;

    scenes.forEach((scene) => {
      const lines = scene.querySelectorAll('.line-inner');
      if (!lines.length) return;

      // Initial hidden state — inside the mask, translated fully below.
      gsap.set(lines, { yPercent: 105 });

      // Reveal timeline, driven by ScrollTrigger enter/leaveBack.
      const tl = gsap.timeline({
        paused: true,
        defaults: { ease: 'expo.out' }
      });
      tl.to(lines, {
        yPercent: 0,
        duration: 0.9,
        stagger: 0.09
      });

      ScrollTrigger.create({
        trigger: scene,
        start: 'top 60%',
        end: 'bottom 40%',
        onEnter:      () => tl.play(),
        onEnterBack:  () => tl.play(),
        onLeave:      () => tl.progress(1),
        onLeaveBack:  () => tl.reverse(),
        invalidateOnRefresh: true
      });
    });
  }
})();
