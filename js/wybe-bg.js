/**
 * WYBE animated background — "Vital Signs".
 * ───────────────────────────────────────────
 * Fitness-first, not tech-first. Three layers on a navy field:
 *
 *   1. Muscle fibers ─ slow-drifting horizontal sine curves that read as
 *      striations under skin. Represents STRENGTH / anatomy.
 *   2. Nerve pulses ─ sparse dots that softly flash on their own rhythm,
 *      like nerve signals firing at breath / heart cadence. Represents
 *      MINDSET / nervous-system calm.
 *   3. Cursor heartbeat rings ─ the cursor emits expanding lime rings
 *      every ~340 ms while it's on the page, like sonar / an ECG spike
 *      radiating outward. Represents NUTRITION / vital circulation.
 *
 * All three layers brighten to lime within a 220 px aura around the pointer
 * so movement literally "lights up the muscle". No grid, no network graph,
 * no dumbbell glyphs — this reads as fitness, not tech.
 *
 * No dependencies. Respects prefers-reduced-motion (renders a static
 * frame). DevicePixelRatio-aware and resizes cleanly.
 */
(function () {
  'use strict';

  const canvas = document.getElementById('wybe-bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const LIME  = '221, 255, 85';
  const CREAM = '246, 242, 232';

  const AURA          = 220;
  const AURA_SQ       = AURA * AURA;
  const RING_LIFE     = 1400;   // ms per heartbeat ring
  const RING_MAX      = 300;    // final radius in px
  const RING_INTERVAL = 340;    // ms between emitted rings
  const MAX_RINGS     = 8;

  let width  = 0;
  let height = 0;
  let dpr    = 1;

  const fibers = [];
  const nerves = [];
  const rings  = [];

  const pointer = {
    x: -1e5, y: -1e5,
    targetX: -1e5, targetY: -1e5,
    active: false,
    lastEmit: 0
  };

  function build() {
    // 1. Fibers — one per ~60 vertical px, jittered baseY, sine wave shape.
    fibers.length = 0;
    const fiberCount = Math.max(8, Math.floor(height / 58));
    for (let i = 0; i < fiberCount; i++) {
      const rowH = height / fiberCount;
      fibers.push({
        baseY:      (i + 0.5) * rowH + (Math.random() - 0.5) * rowH * 0.7,
        ampY:       10 + Math.random() * 26,             // vertical amplitude
        freqX:      0.0028 + Math.random() * 0.005,      // ~700-1500 px wavelength
        phase:      Math.random() * Math.PI * 2,
        driftSpeed: 0.18 + Math.random() * 0.28,         // radians per second
        thickness:  0.9  + Math.random() * 0.9,
        alphaBase:  0.055 + Math.random() * 0.055
      });
    }

    // 2. Nerve pulses — density scales with viewport area.
    nerves.length = 0;
    const nerveCount = Math.max(24, Math.floor((width * height) / 26000));
    for (let i = 0; i < nerveCount; i++) {
      nerves.push({
        x:      Math.random() * width,
        y:      Math.random() * height,
        phase:  Math.random() * Math.PI * 2,
        period: 2.6 + Math.random() * 4.5  // seconds
      });
    }
  }

  function resize() {
    dpr    = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    width  = window.innerWidth;
    height = window.innerHeight;
    canvas.width  = Math.round(width  * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width  = width  + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  function distSq(ax, ay, bx, by) {
    const dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  }

  // Cubic ease-out for heartbeat ring expansion.
  function easeOut(t) { const u = 1 - t; return 1 - u * u * u; }

  let then = performance.now();

  function frame(now) {
    const dt      = Math.min(60, now - then);
    then          = now;
    const timeSec = now * 0.001;

    // Ease pointer toward its target for a smoother aura.
    pointer.x += (pointer.targetX - pointer.x) * Math.min(1, dt / 90);
    pointer.y += (pointer.targetY - pointer.y) * Math.min(1, dt / 90);

    // Emit a new heartbeat ring at the (eased) pointer position.
    if (pointer.active && (now - pointer.lastEmit) > RING_INTERVAL) {
      rings.push({ x: pointer.x, y: pointer.y, birth: now });
      pointer.lastEmit = now;
      if (rings.length > MAX_RINGS) rings.shift();
    }

    ctx.clearRect(0, 0, width, height);

    // ── LAYER 1: Muscle fibers ──────────────────────────
    // Sample each fiber every STEP px along x; draw as short line segments so
    // segments near the cursor can be tinted lime independently.
    const STEP = 22;
    for (let i = 0; i < fibers.length; i++) {
      const f       = fibers[i];
      const phase   = f.phase + timeSec * f.driftSpeed;
      const t0      = 0;
      const y0      = f.baseY + f.ampY * Math.sin(f.freqX * t0 + phase);
      let   prevX   = t0;
      let   prevY   = y0;
      ctx.lineWidth = f.thickness;
      ctx.lineCap   = 'round';
      for (let x = STEP; x <= width; x += STEP) {
        const y  = f.baseY + f.ampY * Math.sin(f.freqX * x + phase);
        // Midpoint distance to cursor drives lime tint intensity.
        const mx = (prevX + x) * 0.5, my = (prevY + y) * 0.5;
        const dSq = distSq(mx, my, pointer.x, pointer.y);
        let   alpha = f.alphaBase;
        let   color = CREAM;
        if (dSq < AURA_SQ) {
          const near = 1 - Math.sqrt(dSq) / AURA;
          alpha = Math.min(0.85, f.alphaBase + near * 0.60);
          color = LIME;
        }
        ctx.strokeStyle = `rgba(${color}, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, y);
        ctx.stroke();
        prevX = x; prevY = y;
      }
    }

    // ── LAYER 2: Nerve pulses ───────────────────────────
    for (let i = 0; i < nerves.length; i++) {
      const n      = nerves[i];
      const t      = timeSec / n.period + n.phase / (Math.PI * 2);
      const pulse  = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);        // 0..1
      const dSq    = distSq(n.x, n.y, pointer.x, pointer.y);
      let   alpha  = 0.06 + pulse * 0.14;
      let   color  = CREAM;
      let   radius = 1.1 + pulse * 0.9;
      if (dSq < AURA_SQ) {
        const near = 1 - Math.sqrt(dSq) / AURA;
        alpha  = Math.min(0.9, alpha + near * 0.55);
        radius = radius + near * 1.6;
        color  = LIME;
      }
      ctx.fillStyle = `rgba(${color}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── LAYER 3: Cursor heartbeat rings ─────────────────
    for (let i = rings.length - 1; i >= 0; i--) {
      const r   = rings[i];
      const age = now - r.birth;
      const t   = age / RING_LIFE;
      if (t >= 1) { rings.splice(i, 1); continue; }
      const eased = easeOut(t);
      const radius = 6 + eased * RING_MAX;
      const alpha  = (1 - t) * (1 - t) * 0.65;   // quadratic fade-out
      ctx.strokeStyle = `rgba(${LIME}, ${alpha})`;
      ctx.lineWidth   = Math.max(0.6, 2.4 * (1 - t));
      ctx.beginPath();
      ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (!reduceMotion) requestAnimationFrame(frame);
  }

  // ── Pointer wiring ────────────────────────────────────
  window.addEventListener('pointermove', (e) => {
    pointer.targetX = e.clientX;
    pointer.targetY = e.clientY;
    pointer.active  = true;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches[0]) {
      pointer.targetX = e.touches[0].clientX;
      pointer.targetY = e.touches[0].clientY;
      pointer.active  = true;
    }
  }, { passive: true });

  window.addEventListener('pointerleave', () => {
    pointer.active  = false;
    pointer.targetX = -1e5;
    pointer.targetY = -1e5;
  });

  window.addEventListener('resize', resize);
  resize();

  if (reduceMotion) {
    pointer.active = false;
    frame(performance.now());
  } else {
    requestAnimationFrame(frame);
  }
})();
