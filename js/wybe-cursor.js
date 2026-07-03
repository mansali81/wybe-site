/**
 * WYBE custom cursor.
 * ───────────────────
 * A lime kettlebell follows the pointer 1:1 (fitness-forward mark); a
 * larger ring lags behind it with a spring-easing so it feels alive.
 * Interactive elements (links, buttons, [data-story-jump] rail labels)
 * inflate the ring and swing the kettlebell for clear affordance. On
 * touch / coarse-pointer devices the whole system is skipped and native
 * cursors are used.
 */
(function () {
  'use strict';

  const supports = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (!supports.matches) return;

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
    // The kettlebell is transformed via CSS for hover/scale states, so keep
    // the position transform on the parent element and let CSS drive the
    // scale/rotation. We concatenate both into one transform string.
    // Use CSS custom properties so the CSS transform (which composes translate
    // + scale + rotate for hover states) can read the pointer position without
    // being clobbered by an inline `style.transform` value.
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
