/**
 * WYBE custom cursor.
 * ───────────────────
 * A lime kettlebell follows the pointer 1:1 (fitness-forward mark); a
 * larger ring lags behind it with a spring-easing so it feels alive.
 * Interactive elements (links, buttons, [data-story-jump] rail labels)
 * inflate the ring and swing the kettlebell for clear affordance.
 *
 * SAFETY GATES — the cursor only mounts when ALL of the following
 * hold; otherwise the native OS cursor is used unchanged:
 *   - (hover: hover) — device supports hovering (i.e. not touch-only)
 *   - (pointer: fine) — has a precise pointer (mouse / trackpad)
 *   - prefers-reduced-motion: no-preference — user hasn't asked
 *     for reduced motion (spring-eased ring qualifies as motion)
 *
 * The CSS rule that hides the native cursor (`cursor: none`) is gated
 * on the same three conditions, so pre-JS / no-JS visits still get a
 * native cursor on any device that shouldn't see the custom one.
 * All cursor elements carry `pointer-events: none` in CSS so they can
 * never intercept clicks. Native :hover / :focus-visible outlines on
 * links and buttons are untouched.
 */
(function () {
  'use strict';

  // Match the three CSS gates: hover-capable, fine pointer, motion OK.
  const supportsHover  = window.matchMedia('(hover: hover) and (pointer: fine)');
  const motionOK       = window.matchMedia('(prefers-reduced-motion: no-preference)');
  if (!supportsHover.matches) return;
  if (!motionOK.matches) return;

  // Minimised brand mark: solid orange dot for the pointer, ripple
  // rings emit behind it on movement (see rippleTick below).
  const BRAND_MARK_SVG =
    '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="16" cy="16" r="9" fill="#FF6600"/>' +
      '<circle cx="16" cy="16" r="4" fill="#1E1E1E"/>' +
    '</svg>';

  const kb   = document.createElement('div');
  const ring = document.createElement('div');
  kb.className   = 'wybe-cursor wybe-cursor__kb';
  ring.className = 'wybe-cursor wybe-cursor__ring';
  kb.innerHTML   = BRAND_MARK_SVG;
  kb.setAttribute('aria-hidden', 'true');
  ring.setAttribute('aria-hidden', 'true');

  // Append late so it lands on top of everything.
  function mount() {
    document.body.appendChild(ring);
    document.body.appendChild(kb);
  }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);

  // Pointer state.
  let mx = -100, my = -100;
  let rx = -100, ry = -100;
  let visible = false;

  function showOnce() {
    if (visible) return;
    visible = true;
    kb.classList.add('is-visible');
    ring.classList.add('is-visible');
  }

  // Ripple emitter — spawns an expanding orange ring every ~48 px of
  // pointer travel. Rings animate via CSS keyframes and self-remove
  // after 900 ms via the animationend listener.
  let lastRipX = -1000, lastRipY = -1000;
  const RIPPLE_STEP = 48;
  function spawnRipple(x, y) {
    const r = document.createElement('div');
    r.className = 'wybe-cursor__ripple';
    r.style.left = x + 'px';
    r.style.top  = y + 'px';
    document.body.appendChild(r);
    r.addEventListener('animationend', () => r.remove(), { once: true });
  }

  window.addEventListener('pointermove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    // Position via CSS custom properties so the CSS transform (which
    // composes translate + scale + rotate for hover states) can read
    // the pointer position without being clobbered by an inline
    // style.transform value.
    kb.style.setProperty('--tx', mx + 'px');
    kb.style.setProperty('--ty', my + 'px');
    showOnce();
    // Emit a ripple ring when the pointer has travelled RIPPLE_STEP px.
    const dx = mx - lastRipX, dy = my - lastRipY;
    if (dx * dx + dy * dy >= RIPPLE_STEP * RIPPLE_STEP) {
      spawnRipple(mx, my);
      lastRipX = mx; lastRipY = my;
    }
  }, { passive: true });

  // If the pointer leaves the window, fade the cursor and park it off-screen.
  window.addEventListener('pointerleave', () => {
    visible = false;
    kb.classList.remove('is-visible');
    ring.classList.remove('is-visible');
  });
  window.addEventListener('blur', () => {
    visible = false;
    kb.classList.remove('is-visible');
    ring.classList.remove('is-visible');
  });

  // RAF loop: ease the ring toward the kettlebell for a smooth trail.
  function tick() {
    rx += (mx - rx) * 0.22;
    ry += (my - ry) * 0.22;
    ring.style.setProperty('--tx', rx + 'px');
    ring.style.setProperty('--ty', ry + 'px');
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // Hover-affordance state. We watch pointerover/pointerout instead of
  // adding per-element listeners so newly rendered elements are
  // handled automatically. The class must live on the cursor elements
  // themselves (kb, ring), not on a wrapper — that matches the CSS
  // selectors `.wybe-cursor__kb.is-hover` / `.wybe-cursor__ring.is-hover`.
  const HOVER_SELECTOR =
    'a, button, [role="button"], summary, label, select, [data-story-jump], .wybe-rail-row';
  const TITLE_SELECTOR = '[data-story-jump], .wybe-rail-row';

  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest(HOVER_SELECTOR);
    if (!t) return;
    kb.classList.add('is-hover');
    ring.classList.add('is-hover');
    if (t.matches(TITLE_SELECTOR)) {
      kb.classList.add('is-hover-title');
      ring.classList.add('is-hover-title');
    }
  });
  document.addEventListener('pointerout', (e) => {
    const t = e.target.closest(HOVER_SELECTOR);
    if (!t) return;
    // Only clear if we're actually leaving the hoverable (relatedTarget
    // is outside it). Prevents flicker when moving between nested
    // elements.
    const to = e.relatedTarget;
    if (to && t.contains(to)) return;
    kb.classList.remove('is-hover', 'is-hover-title');
    ring.classList.remove('is-hover', 'is-hover-title');
  });
})();
