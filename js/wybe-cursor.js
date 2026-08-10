/**
 * WYBE custom cursor.
 * ───────────────────
 * A single solid orange ball follows the pointer 1:1. That's it —
 * no lagging ring, no ripple emitter, no kettlebell mark. Hovering
 * an interactive element scales the ball up for affordance.
 *
 * SAFETY GATES — the cursor only mounts when ALL of the following
 * hold; otherwise the native OS cursor is used unchanged:
 *   - (hover: hover) — device supports hovering (not touch-only)
 *   - (pointer: fine) — has a precise pointer (mouse / trackpad)
 *   - prefers-reduced-motion: no-preference — user hasn't asked
 *     for reduced motion
 *
 * The CSS rule that hides the native cursor (`cursor: none`) is
 * gated on the same three conditions, so pre-JS / no-JS visits
 * still get a native cursor on any device that shouldn't see the
 * custom one. The ball carries `pointer-events: none` in CSS so
 * it can never intercept clicks.
 */
(function () {
  'use strict';

  const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  const motionOK      = window.matchMedia('(prefers-reduced-motion: no-preference)');
  if (!supportsHover.matches) return;
  if (!motionOK.matches) return;

  const ball = document.createElement('div');
  ball.className = 'wybe-cursor wybe-cursor__kb';
  ball.setAttribute('aria-hidden', 'true');

  function mount() { document.body.appendChild(ball); }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);

  let visible = false;
  function showOnce() {
    if (visible) return;
    visible = true;
    ball.classList.add('is-visible');
  }

  window.addEventListener('pointermove', (e) => {
    // Position via CSS custom properties so the CSS transform (which
    // composes translate + scale for the hover state) can read the
    // pointer position without being clobbered by an inline
    // style.transform value.
    ball.style.setProperty('--tx', e.clientX + 'px');
    ball.style.setProperty('--ty', e.clientY + 'px');
    showOnce();
  }, { passive: true });

  window.addEventListener('pointerleave', () => {
    visible = false;
    ball.classList.remove('is-visible');
  });
  window.addEventListener('blur', () => {
    visible = false;
    ball.classList.remove('is-visible');
  });

  // Hover-affordance state. Watching pointerover/pointerout instead of
  // per-element listeners so newly rendered elements are handled
  // automatically.
  const HOVER_SELECTOR =
    'a, button, [role="button"], summary, label, select, [data-story-jump], .wybe-rail-row';

  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest(HOVER_SELECTOR);
    if (t) ball.classList.add('is-hover');
  });
  document.addEventListener('pointerout', (e) => {
    const t = e.target.closest(HOVER_SELECTOR);
    if (!t) return;
    // Only clear if we're actually leaving the hoverable (relatedTarget
    // is outside it). Prevents flicker when moving between nested
    // elements.
    const to = e.relatedTarget;
    if (to && t.contains(to)) return;
    ball.classList.remove('is-hover');
  });
})();
