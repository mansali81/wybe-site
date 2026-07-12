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

      // Each splash can carry a data-flip attribute — the Commitment
      // block does — so the two splashes read as two separate "throws
      // of paint" rather than the same PNG twice. We compose the flip
      // + a subtle rotation into the reveal tween via scaleX/scaleY +
      // rotation (never `scale`) so GSAP tracks each axis on its own
      // and the flip is preserved through the animation.
      const flip = splash.hasAttribute('data-flip');
      const finalScaleX = flip ? -1  : 1;
      const finalRot    = flip ? 12  : -6;
      const startScale  = 0.7;

      gsap.set(splash, {
        opacity: 0,
        scaleX:   finalScaleX * startScale,
        scaleY:   startScale,
        rotation: finalRot - (flip ? 8 : -8) // rotate a bit further from final
      });
      gsap.set(lines, {
        opacity: 0,
        y: 20,
        clipPath: 'inset(0% 100% 0% 0%)'
      });

      // Reveal timeline.
      const tl = gsap.timeline({
        paused: true,
        defaults: { ease: 'power2.out' }
      });

      // 1) Splash lands first — scale up, ease in, rotate to rest.
      tl.to(splash, {
        opacity: 1,
        scaleX: finalScaleX,
        scaleY: 1,
        rotation: finalRot,
        duration: 0.55
      }, 0);

      // 2) Heading + body wipe in with a small overlap so the type
      //    feels "born from" the splash, not sequential.
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
