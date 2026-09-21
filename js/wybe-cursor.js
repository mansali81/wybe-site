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

  // ── TRAIL (time-based) ───────────────────────────────
  // A dot spawns every TRAIL_INTERVAL ms inside the rAF loop, at the
  // ball's current CSS position. Time-based emission gives even dot
  // spacing regardless of movement speed or main-thread load, and
  // keeps the trail behind the ball (not ahead). A live-node cap
  // prevents fast sweeps from flooding the DOM — oldest node is
  // removed immediately when the cap is hit, before animationend.
  const MAX_TRAIL      = 20;
  const TRAIL_INTERVAL = 25;   // ms between dots
  const MIN_TRAIL_MOVE = 2;    // px — don't stack dots on a stationary pointer
  const trailNodes     = [];
  let lastTrailTime    = 0;
  let lastDotX         = -1000;
  let lastDotY         = -1000;
  let rafId            = null;

  function spawnTrail(x, y) {
    if (trailNodes.length >= MAX_TRAIL) {
      const oldest = trailNodes.shift();
      oldest.remove();
    }
    const d = document.createElement('div');
    d.className = 'wybe-cursor__trail';
    d.style.left = x + 'px';
    d.style.top  = y + 'px';
    document.body.appendChild(d);
    trailNodes.push(d);
    d.addEventListener('animationend', () => {
      const i = trailNodes.indexOf(d);
      if (i !== -1) trailNodes.splice(i, 1);
      d.remove();
    }, { once: true });
  }

  function rafLoop(ts) {
    rafId = null;
    if (!visible) return;
    if (ts - lastTrailTime >= TRAIL_INTERVAL) {
      const x = parseFloat(ball.style.getPropertyValue('--tx')) || 0;
      const y = parseFloat(ball.style.getPropertyValue('--ty')) || 0;
      const dx = x - lastDotX;
      const dy = y - lastDotY;
      if (dx * dx + dy * dy >= MIN_TRAIL_MOVE * MIN_TRAIL_MOVE) {
        spawnTrail(x, y);
        lastDotX = x;
        lastDotY = y;
      }
      lastTrailTime = ts;
    }
    rafId = requestAnimationFrame(rafLoop);
  }

  function startRaf() {
    if (!rafId) rafId = requestAnimationFrame(rafLoop);
  }

  // ── POINTER TRACKING ────────────────────────────────
  // leaveTimer debounces pointerleave: rapid horizontal mouse sweeps
  // repeatedly cross the viewport edge, triggering spurious hides.
  // Wait 150 ms before actually hiding; cancel if pointermove arrives.
  let leaveTimer = null;

  window.addEventListener('pointermove', (e) => {
    ball.style.setProperty('--tx', e.clientX + 'px');
    ball.style.setProperty('--ty', e.clientY + 'px');
    if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
    showOnce();
    startRaf();
  }, { passive: true });

  window.addEventListener('pointerleave', () => {
    leaveTimer = setTimeout(() => {
      visible = false;
      ball.classList.remove('is-visible');
      leaveTimer = null;
    }, 150);
  });

  window.addEventListener('blur', () => {
    // Genuine window focus loss — hide immediately.
    if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
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
