/* === PILLARS-3D START ===
 * Scroll-driven 3D rotating carousel for the Foundation section
 * (index.html — data-pillars-3d-section). Adds `.is-3d-active` to
 * the stage, then pins the section and rotates the ring as the user
 * scrolls so each pillar (Mindset → Nutrition → Training → Recovery)
 * comes to the front in turn.
 *
 * Gates:
 *   - prefers-reduced-motion: reduce  → no-op (static grid stays)
 *   - viewport width < 768 px         → no-op (static grid stays)
 *   - window.gsap / ScrollTrigger absent → no-op
 *
 * To fully remove the feature, delete this file, the CSS block
 * marked PILLARS-3D in css/styles.css, and the matching markup
 * block in index.html.
 */
(function () {
  'use strict';

  const stage   = document.querySelector('[data-pillars-3d]');
  const section = document.querySelector('[data-pillars-3d-section]');
  if (!stage || !section) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow       = window.innerWidth < 768;
  if (reduceMotion || narrow) return; // static 2×2 grid path

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

  ready(function () {
    gsap.registerPlugin(ScrollTrigger);

    // Flip the stage into 3D mode. CSS handles the rest of the layout.
    stage.classList.add('is-3d-active');

    const ring  = stage.querySelector('.pillars-3d-ring');
    const faces = stage.querySelectorAll('.pillar-face');
    if (!ring || !faces.length) return;

    // Track the current front-facing pillar index (0-3) so we can
    // dim the three that aren't facing the viewer. Range of rotateY
    // during the scrub is 0 → -270; front-face = round(-rotY / 90).
    const dimFacesForRotation = (deg) => {
      const active = ((-deg / 90) % 4 + 4) % 4;      // 0..3, wraps cleanly
      faces.forEach((f) => {
        const idx = parseInt(f.dataset.face, 10);
        // Weight by the shortest arc distance (0..2) to the front.
        const dist = Math.min(Math.abs(idx - active), 4 - Math.abs(idx - active));
        // active=1.0 opacity, +1 face away=0.55, +2 (back)=0.25.
        f.style.opacity = String(1 - dist * 0.375);
      });
    };
    dimFacesForRotation(0);

    // Main scrub timeline. Rotates the ring from 0 → -270 across
    // the pinned scroll range so faces 1→2→3→4 come to the front.
    gsap.to(ring, {
      rotateY: -270,
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start:   'top top',
        end:     '+=2400',   // ~4 screens
        scrub:   1,
        pin:     true,
        anticipatePin: 1,
        snap: {
          snapTo:  [0, 1/3, 2/3, 1],
          duration: 0.3,
          ease:    'power1.inOut',
        },
        invalidateOnRefresh: true,
        onUpdate: (self) => dimFacesForRotation(self.progress * -270),
      },
    });

    // Kick a refresh once everything (fonts, images) has landed.
    if (document.readyState === 'complete') {
      ScrollTrigger.refresh();
    } else {
      window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
    }
  });
})();
/* === PILLARS-3D END === */
