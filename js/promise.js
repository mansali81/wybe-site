/**
 * WYBE Promise + Commitment manifesto — splash-first scroll reveal.
 * ────────────────────────────────────────────────────────────────
 * Each .wybe-statement (Promise, Commitment) has its own ScrollTrigger.
 * When the block enters the viewport:
 *   1. The lime splash blob scales 0.6 → 1 and fades in (~0.5 s ease-out).
 *   2. After ~0.25 s of overlap, the heading and body wipe in from the
 *      left (clip-path 0 100% 0 0 → 0 0 0 0) with a slight rise and fade.
 * Each block reveals independently as it crosses the viewport threshold.
 *
 * prefers-reduced-motion: this controller is a no-op — CSS shows every-
 * thing statically.
 */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const statements = document.querySelectorAll('[data-statement]');
  if (!statements.length) return;

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

    statements.forEach((block) => {
      const splash = block.querySelector('[data-splash]');
      const lines  = block.querySelectorAll('[data-line]');
      if (!splash || !lines.length) return;

      // Pin initial states via gsap.set — same source of truth as CSS.
      gsap.set(splash, { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' });
      gsap.set(lines,  { opacity: 0, y: 20, clipPath: 'inset(0% 100% 0% 0%)' });

      // Build the reveal timeline; ScrollTrigger fires it once the block
      // is ~15 % up from the viewport bottom (comfortably in view before
      // motion starts).
      const tl = gsap.timeline({
        paused: true,
        defaults: { ease: 'power2.out' }
      });

      // 1) Splash lands first (0.5 s ease-out).
      tl.to(splash, {
        opacity: 1,
        scale: 1,
        duration: 0.5
      }, 0);

      // 2) Heading + body wipe in, starting at 0.25 s (slight overlap so
      //    the type feels born from the splash, not sequential).
      tl.to(lines, {
        opacity: 1,
        y: 0,
        clipPath: 'inset(0% 0% 0% 0%)',
        duration: 0.75,
        stagger: 0.12
      }, 0.25);

      ScrollTrigger.create({
        trigger: block,
        start: 'top 85%',
        toggleActions: 'play none none reverse',
        onEnter: () => tl.play(),
        onLeaveBack: () => tl.reverse(),
        invalidateOnRefresh: true
      });
    });
  }
})();
