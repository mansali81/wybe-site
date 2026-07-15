/**
 * WYBE shared "sticky scene" scroll reveal.
 * ─────────────────────────────────────────
 * Any element marked [data-scene] participates in the Daylight-style
 * sticky-snap pattern:
 *   - CSS pins the scene's inner container (.wybe-scene__pin) for
 *     ~one viewport of dwell as it enters the viewport.
 *   - This controller finds every .line-inner descendant inside the
 *     scene, hides it below its mask (yPercent 105), then rises them
 *     into view (yPercent 0) with a staggered expo-out ease when a
 *     ScrollTrigger enters the scene. Scrolling back up reverses the
 *     reveal so the choreography still lands the second time.
 *
 * Mobile (≤ 768 px) and prefers-reduced-motion return early; CSS
 * collapses the pin to a normal stack and shows all copy statically.
 */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scenes = document.querySelectorAll('[data-scene]');
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

    // Mobile: CSS drops the pin to a natural stack. Skip the reveal so
    // horizontal-nav / touch users always see the copy.
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) return;

    scenes.forEach((scene) => {
      const lines = scene.querySelectorAll('.line-inner');
      if (!lines.length) return;

      // Initial hidden state — inside the mask, translated fully below.
      gsap.set(lines, { yPercent: 105 });

      // Reveal timeline: staggered rise-in, expo.out easing.
      // willChange is added at onStart and removed at onComplete/onReverseComplete
      // so the lines are only promoted to a compositor layer during
      // the tween — never persistently. See css/styles.css for why the
      // static will-change on .line-inner was removed.
      const setWC = (v) => gsap.set(lines, { willChange: v });
      const tl = gsap.timeline({
        paused: true,
        defaults: { ease: 'expo.out' },
        onStart:           () => setWC('transform'),
        onComplete:        () => setWC('auto'),
        onReverseComplete: () => setWC('auto'),
      });
      tl.to(lines, {
        yPercent: 0,
        duration: 0.9,
        stagger: 0.08
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
