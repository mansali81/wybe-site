/**
 * WYBE hero — light-sweep + text-reveal + short read-beat pin.
 * ────────────────────────────────────────────────────────────
 * On page load a single lime "ray" sweeps once from the left edge to the
 * right edge of the hero over 1.8 s (power2.out). The sweep progress drives:
 *   - A canvas render of the bright vertical bar + trailing horizontal
 *     streaks, mix-blend-mode:screen fusing them with the video underneath.
 *   - Staggered reveals of .hero-tagline, .hero-headline, .hero-sub,
 *     .hero-cta via clip-path inset() + opacity + y — as if the light is
 *     painting them into view.
 * When the sweep completes the timeline resolves; the canvas is painted
 * once with a small residual glow on the right and never re-rendered
 * (no scroll-driven redraw, no loop).
 *
 * On desktop we also add a ScrollTrigger pin (start: top top,
 * end: +=60%, pinSpacing: true, invalidateOnRefresh: true) so the hero
 * holds still for a ~2-second read-beat before smoothly releasing into
 * the next section. Mobile skips the pin.
 *
 * prefers-reduced-motion: the whole controller returns early — CSS keeps
 * the text visible (opacity: 1, clip-path: none) and no ray is drawn.
 */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const heroEl  = document.querySelector('section.hero');
  const content = document.querySelector('[data-hero-content]');
  const rays    = document.getElementById('hero-rays');
  if (!heroEl || !content || !rays) return;

  const items = [
    content.querySelector('.hero-tagline'),
    content.querySelector('.hero-headline'),
    content.querySelector('.hero-sub'),
    content.querySelector('.hero-cta')
  ].filter(Boolean);

  if (reduceMotion) return; // CSS handles the reduced-motion path

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

    // ── Canvas setup ───────────────────────────────
    const ctx = rays.getContext('2d');
    let cssW = 0, cssH = 0, dpr = 1;
    function resizeCanvas() {
      dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
      cssW = window.innerWidth;
      cssH = window.innerHeight;
      rays.width  = Math.round(cssW * dpr);
      rays.height = Math.round(cssH * dpr);
      rays.style.width  = cssW + 'px';
      rays.style.height = cssH + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resizeCanvas();

    // ── Ray renders ────────────────────────────────
    // Sweep: a bright vertical bar with soft edges + trailing horizontal
    // streaks. The bar's centre X is mapped from the sweep progress
    // (with off-screen buffers on both ends so it enters/exits cleanly).
    function renderSweep(p) {
      ctx.clearRect(0, 0, cssW, cssH);
      const x = p * (cssW + 200) - 100;

      // Vertical bar
      const barW = 220;
      const bar = ctx.createLinearGradient(x - barW, 0, x + barW, 0);
      bar.addColorStop(0.00, 'rgba(221, 255, 85, 0)');
      bar.addColorStop(0.50, 'rgba(221, 255, 85, 0.92)');
      bar.addColorStop(1.00, 'rgba(221, 255, 85, 0)');
      ctx.fillStyle = bar;
      ctx.fillRect(x - barW, 0, barW * 2, cssH);

      // Trailing horizontal streaks — cluster near the runner band
      const rows = 8;
      for (let i = 0; i < rows; i++) {
        const yFrac = (i + 0.5) / rows;
        const y = yFrac * cssH;
        const len = 240 + Math.sin(i * 1.7) * 80;
        const g = ctx.createLinearGradient(x - len, y, x, y);
        g.addColorStop(0.0, 'rgba(221, 255, 85, 0)');
        g.addColorStop(0.75, 'rgba(221, 255, 85, 0.35)');
        g.addColorStop(1.0, 'rgba(221, 255, 85, 0.75)');
        ctx.fillStyle = g;
        ctx.fillRect(x - len, y - 1.5, len, 3);
      }
    }

    // Final resting state: small residual lime glow off-screen right so the
    // scene doesn't end abruptly. Painted once; never re-rendered.
    function renderFinalState() {
      ctx.clearRect(0, 0, cssW, cssH);
      const cx = cssW + 40;
      const cy = cssH * 0.5;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, cssH * 0.55);
      g.addColorStop(0.0, 'rgba(221, 255, 85, 0.18)');
      g.addColorStop(0.5, 'rgba(221, 255, 85, 0.06)');
      g.addColorStop(1.0, 'rgba(221, 255, 85, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cssW, cssH);
    }

    // ── Load timeline: sweep + staggered text reveal ──
    // Initial hidden state set via GSAP so if inline styles trump anything
    // the CSS applied, the animation still starts from a known state.
    gsap.set(items, { opacity: 0, clipPath: 'inset(0 100% 0 0)' });
    gsap.set(items.slice(0, 3), { y: 20 });

    const sweep = { p: 0 };
    const tl = gsap.timeline({
      onUpdate: function () { renderSweep(sweep.p); },
      onComplete: function () {
        renderFinalState();
        // Clear inline transforms on any element that has a hover transform
        // (CTA). Nothing to clear on the others; opacity + clip-path stay.
        gsap.set(items[3], { clearProps: 'transform' });
      }
    });

    // Sweep tween — drives canvas x position. 1.8 s, ease-out.
    tl.to(sweep, { p: 1, duration: 1.8, ease: 'power2.out' }, 0);

    // Text reveals — each fully hidden → fully revealed inside 1.8 s.
    // First three get the small slide-up; CTA is opacity + clip only so
    // its :hover scale transform isn't overridden by inline transforms.
    const REV = { clipPath: 'inset(0 0 0 0)', ease: 'power2.out' };
    tl.to(items[0], Object.assign({ opacity: 1, y: 0, duration: 0.90 }, REV), 0.05);
    tl.to(items[1], Object.assign({ opacity: 1, y: 0, duration: 1.00 }, REV), 0.35);
    tl.to(items[2], Object.assign({ opacity: 1, y: 0, duration: 0.90 }, REV), 0.65);
    tl.to(items[3], Object.assign({ opacity: 1,         duration: 0.70 }, REV), 1.10);
    // Total: 1.10 + 0.70 = 1.80 s

    // ── Read-beat pin ──────────────────────────────
    // Desktop only. Pin for +=60% of viewport (~2s at normal scroll speed)
    // so the reader has time to take in the hero before the next section.
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (!isMobile) {
      ScrollTrigger.create({
        trigger: heroEl,
        start: 'top top',
        end: '+=60%',
        pin: true,
        pinSpacing: true,
        invalidateOnRefresh: true
      });
    }

    // ── Resize handling ────────────────────────────
    // Debounced. Re-sizes the canvas, repaints the final state if the
    // sweep has already finished, and asks ScrollTrigger to recompute pin
    // start/end positions.
    let rz;
    window.addEventListener('resize', () => {
      clearTimeout(rz);
      rz = setTimeout(() => {
        resizeCanvas();
        if (tl.progress() >= 0.999) renderFinalState();
        ScrollTrigger.refresh();
      }, 120);
    });
  }
})();
