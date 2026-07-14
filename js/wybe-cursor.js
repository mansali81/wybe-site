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

  // Kettlebell SVG mark. Horseshoe handle over a filled circle, in lime.
  const KETTLEBELL_SVG =
    '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M11 9 Q11 4 16 4 Q21 4 21 9" fill="none" stroke="#DDFF55" stroke-width="2.4" stroke-linecap="round"/>' +
      '<circle cx="16" cy="20" r="8.5" fill="#DDFF55"/>' +
      '<rect x="10" y="9" width="12" height="3" rx="1.2" fill="#DDFF55"/>' +
    '</svg>';

  const kb   = document.createElement('div');
  const ring = document.createElement('div');
  kb.className   = 'wybe-cursor wybe-cursor__kb';
  ring.className = 'wybe-cursor wybe-cursor__ring';
  kb.innerHTML   = KETTLEBELL_SVG;
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
