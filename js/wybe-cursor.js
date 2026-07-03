/**
 * WYBE custom cursor.
 * ───────────────────
 * A lime dot follows the pointer 1:1 (feels precise); a larger ring lags
 * behind it with a spring-easing so it feels alive. Interactive elements
 * (links, buttons, [data-story-jump] rail labels) inflate the ring for
 * clear affordance. On touch / coarse-pointer devices the whole system
 * is skipped and native cursors are used.
 */
(function () {
  'use strict';

  const supports = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (!supports.matches) return;

  const dot  = document.createElement('div');
  const ring = document.createElement('div');
  dot.className  = 'wybe-cursor wybe-cursor__dot';
  ring.className = 'wybe-cursor wybe-cursor__ring';
  dot.setAttribute('aria-hidden', 'true');
  ring.setAttribute('aria-hidden', 'true');

  // Append late so it lands on top of everything.
  function mount() {
    document.body.appendChild(ring);
    document.body.appendChild(dot);
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
    dot.classList.add('is-visible');
    ring.classList.add('is-visible');
  }

  window.addEventListener('pointermove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
    showOnce();
  }, { passive: true });

  // If the pointer leaves the window, fade the cursor and park it off-screen.
  window.addEventListener('pointerleave', () => {
    visible = false;
    dot.classList.remove('is-visible');
    ring.classList.remove('is-visible');
  });
  window.addEventListener('blur', () => {
    visible = false;
    dot.classList.remove('is-visible');
    ring.classList.remove('is-visible');
  });

  // RAF loop: ease the ring toward the dot for a smooth trail.
  function tick() {
    rx += (mx - rx) * 0.22;
    ry += (my - ry) * 0.22;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // Hover-affordance state. We watch pointerover/pointerout instead of adding
  // per-element listeners so newly rendered elements are handled automatically.
  const HOVER_SELECTOR =
    'a, button, [role="button"], summary, label, select, [data-story-jump], .wybe-rail-row';
  const TITLE_SELECTOR = '[data-story-jump], .wybe-rail-row';

  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest(HOVER_SELECTOR);
    if (!t) return;
    dot.classList.add('is-hover');
    ring.classList.add('is-hover');
    if (t.matches(TITLE_SELECTOR)) {
      dot.classList.add('is-hover-title');
      ring.classList.add('is-hover-title');
    }
  });
  document.addEventListener('pointerout', (e) => {
    const t = e.target.closest(HOVER_SELECTOR);
    if (!t) return;
    // Only clear if we are actually leaving the hoverable (relatedTarget is
    // outside it). Prevents flicker when moving between nested elements.
    const to = e.relatedTarget;
    if (to && t.contains(to)) return;
    dot.classList.remove('is-hover', 'is-hover-title');
    ring.classList.remove('is-hover', 'is-hover-title');
  });
})();
