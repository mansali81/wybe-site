/**
 * WYBE animated background canvas.
 * ────────────────────────────────
 * A single full-viewport canvas pinned behind all page content. At rest it is
 * a quiet dot grid on navy with three types of themed glyphs mixed in:
 *
 *   - "node"    → small dot (default; represents a neural node)
 *   - "neuron"  → central dot with three short radiating strokes (mindset)
 *   - "muscle"  → dumbbell mark, two dots on a short bar (strength)
 *   - "egg"     → small oval (nutrition)
 *
 * When the pointer enters a region the aura brightens dots + glyphs to lime
 * and draws lime edges between grid neighbours inside the aura, giving the
 * impression of a neural network revealing itself only where the user looks.
 *
 * No dependencies. Respects prefers-reduced-motion (renders a static frame).
 * Devicepixel-ratio aware, resizes cleanly on window resize.
 */
(function () {
  'use strict';

  const NAVY   = '#002233';
  const LIME   = '221, 255, 85';        // rgb, for rgba() interpolation
  const WHITE  = '255, 255, 255';
  const GAP    = 48;                    // grid spacing in CSS px
  const AURA   = 240;                   // cursor influence radius in CSS px
  const MAX_LINE_DIST = GAP * 1.55;     // neighbours we may draw an edge to
  const BASE_ALPHA_DOT   = 0.09;
  const BASE_ALPHA_GLYPH = 0.11;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const canvas = document.getElementById('wybe-bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  let width  = 0;
  let height = 0;
  let dpr    = 1;
  const nodes = [];             // flat array of { x, y, kind, phase, ci, ri }
  const cellIndex = new Map();  // "ci,ri" → index into nodes[]

  // Pointer state. Off-screen sentinel so mobile / no-cursor devices stay quiet.
  const pointer = { x: -1e5, y: -1e5, targetX: -1e5, targetY: -1e5, active: false };

  // Pick a glyph kind deterministically from grid coords so the pattern is
  // stable across resizes (no re-scatter on window resize).
  function kindAt(c, r) {
    // Small prime hash — stable + evenly distributed.
    const h = ((c * 92821) ^ (r * 61729)) >>> 0;
    const m = h % 100;
    if (m < 2)  return 'muscle';   // 2%   dumbbell mark
    if (m < 4)  return 'egg';      // 2%   egg oval
    if (m < 7)  return 'neuron';   // 3%   neuron branch
    return 'node';                 // 93%  plain dot
  }

  function build() {
    nodes.length = 0;
    cellIndex.clear();
    const cols = Math.ceil(width  / GAP) + 1;
    const rows = Math.ceil(height / GAP) + 1;
    // Nudge grid start so it looks anchored to the viewport corner minus a tiny
    // offset — avoids a "row of dots along the very edge" pattern.
    const ox = -GAP * 0.25;
    const oy = -GAP * 0.25;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = ox + c * GAP + ((r % 2) ? GAP * 0.5 : 0); // hex-offset stagger
        const y = oy + r * GAP;
        // Deterministic per-cell tiny phase for the base pulse.
        const phase = ((c * 13 + r * 7) % 100) / 100 * Math.PI * 2;
        const idx = nodes.length;
        nodes.push({ x, y, kind: kindAt(c, r), phase, ci: c, ri: r });
        cellIndex.set(`${c},${r}`, idx);
      }
    }
  }

  function resize() {
    dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    width  = window.innerWidth;
    height = window.innerHeight;
    canvas.width  = Math.round(width  * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width  = width  + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  // Draw the glyph body. Alpha is passed in from the render loop so the
  // cursor aura can amp it up; positions are in CSS px.
  function drawNode(n, alpha, sizeScale) {
    const a = alpha;
    if (a <= 0.002) return;
    const rgb = (alpha > 0.14) ? LIME : WHITE;
    switch (n.kind) {
      case 'node': {
        const s = 1 + sizeScale * 1.4;
        ctx.beginPath();
        ctx.arc(n.x, n.y, s, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${a})`;
        ctx.fill();
        break;
      }
      case 'neuron': {
        // Central dot + 3 radiating short strokes (120° apart), rotated by phase
        // so each neuron feels individual.
        const s = 1.4 + sizeScale * 1.3;
        ctx.beginPath();
        ctx.arc(n.x, n.y, s, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${a})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${rgb},${a * 0.85})`;
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        const len = 8 + sizeScale * 6;
        for (let i = 0; i < 3; i++) {
          const ang = n.phase + i * (Math.PI * 2 / 3);
          const x2 = n.x + Math.cos(ang) * len;
          const y2 = n.y + Math.sin(ang) * len;
          ctx.beginPath();
          ctx.moveTo(n.x + Math.cos(ang) * (s + 1), n.y + Math.sin(ang) * (s + 1));
          ctx.lineTo(x2, y2);
          ctx.stroke();
          // tiny terminal bulb
          ctx.beginPath();
          ctx.arc(x2, y2, 0.9 + sizeScale * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb},${a * 0.85})`;
          ctx.fill();
        }
        break;
      }
      case 'muscle': {
        // Dumbbell: two filled circles connected by a short horizontal bar.
        const s   = 1.9 + sizeScale * 1.2;
        const gap = 8 + sizeScale * 3;
        // bar
        ctx.strokeStyle = `rgba(${rgb},${a})`;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(n.x - gap * 0.5, n.y);
        ctx.lineTo(n.x + gap * 0.5, n.y);
        ctx.stroke();
        // weights
        ctx.fillStyle = `rgba(${rgb},${a})`;
        ctx.beginPath();
        ctx.arc(n.x - gap * 0.5, n.y, s, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(n.x + gap * 0.5, n.y, s, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'egg': {
        // Vertical oval.
        const rx = 2.4 + sizeScale * 1.1;
        const ry = 3.4 + sizeScale * 1.4;
        ctx.beginPath();
        ctx.ellipse(n.x, n.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${a})`;
        ctx.fill();
        break;
      }
    }
  }

  // Squared distance helper — cheaper than hypot inside the hot loop.
  function distSq(ax, ay, bx, by) {
    const dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  }

  // Precompute nearby-neighbour offsets so the edge loop only checks nodes
  // that could possibly be within MAX_LINE_DIST. With a hex-staggered grid,
  // the six closest cells are (dc, dr) ∈ {(-1,-1),(0,-1),(1,-1),(-1,0),(1,0),
  // (-1,1),(0,1),(1,1)} — we filter by actual distance below anyway.
  const NEIGHBOUR_OFFSETS = [
    [1, 0], [-1, 1], [0, 1], [1, 1] // only "forward" half so each edge is drawn once
  ];

  let then = performance.now();
  function frame(now) {
    const dt = Math.min(48, now - then); // ms since last frame, clamped
    then = now;

    // Ease pointer toward its target for a smoother aura (feels less jittery).
    pointer.x += (pointer.targetX - pointer.x) * Math.min(1, dt / 90);
    pointer.y += (pointer.targetY - pointer.y) * Math.min(1, dt / 90);

    ctx.clearRect(0, 0, width, height);

    const auraSq = AURA * AURA;
    const timeSec = now * 0.001;

    // 1) Draw glyphs / dots with proximity-based lime blend.
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const dSq = distSq(n.x, n.y, pointer.x, pointer.y);
      const near = dSq < auraSq ? (1 - Math.sqrt(dSq) / AURA) : 0;   // 0..1
      // Base pulse: very small so the ambient scene feels alive but calm.
      const pulse = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(timeSec * 1.4 + n.phase));
      const isGlyph = n.kind !== 'node';
      const baseA = (isGlyph ? BASE_ALPHA_GLYPH : BASE_ALPHA_DOT) * pulse;
      const alpha = Math.min(1, baseA + near * (isGlyph ? 0.90 : 0.85));
      drawNode(n, alpha, near);
    }

    // 2) Draw edges only for nodes inside (or nearly inside) the aura.
    if (pointer.active && auraSq > 0) {
      ctx.lineCap = 'round';
      const cols = Math.ceil(width / GAP) + 1;
      const rows = Math.ceil(height / GAP) + 1;
      // Bounds of cells that could possibly contain aura points — cheap prune.
      const centerCol = Math.floor((pointer.x + GAP * 0.25) / GAP);
      const centerRow = Math.floor((pointer.y + GAP * 0.25) / GAP);
      const cellRadius = Math.ceil(AURA / GAP) + 1;
      const c0 = Math.max(0, centerCol - cellRadius);
      const c1 = Math.min(cols - 1, centerCol + cellRadius);
      const r0 = Math.max(0, centerRow - cellRadius);
      const r1 = Math.min(rows - 1, centerRow + cellRadius);
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const idx = cellIndex.get(`${c},${r}`);
          if (idx == null) continue;
          const a = nodes[idx];
          const aNearSq = distSq(a.x, a.y, pointer.x, pointer.y);
          if (aNearSq > auraSq) continue;
          const aNear = 1 - Math.sqrt(aNearSq) / AURA;
          for (let k = 0; k < NEIGHBOUR_OFFSETS.length; k++) {
            const [dc, dr] = NEIGHBOUR_OFFSETS[k];
            const jIdx = cellIndex.get(`${c + dc},${r + dr}`);
            if (jIdx == null) continue;
            const b = nodes[jIdx];
            const linkSq = distSq(a.x, a.y, b.x, b.y);
            if (linkSq > MAX_LINE_DIST * MAX_LINE_DIST) continue;
            const bNearSq = distSq(b.x, b.y, pointer.x, pointer.y);
            if (bNearSq > auraSq) continue;
            const bNear = 1 - Math.sqrt(bNearSq) / AURA;
            const strength = (aNear + bNear) * 0.5;
            const alpha = strength * 0.55;
            ctx.strokeStyle = `rgba(${LIME},${alpha})`;
            ctx.lineWidth = Math.max(0.6, strength * 1.4);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
    }

    if (!reduceMotion) requestAnimationFrame(frame);
  }

  // Pointer wiring: track mouse over the whole viewport (canvas is
  // pointer-events:none so the events land on the page, not the canvas).
  function onMove(x, y) {
    pointer.targetX = x;
    pointer.targetY = y;
    pointer.active = true;
  }
  window.addEventListener('pointermove', (e) => onMove(e.clientX, e.clientY), { passive: true });
  window.addEventListener('touchmove',   (e) => {
    if (e.touches && e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  window.addEventListener('pointerleave', () => { pointer.active = false; pointer.targetX = -1e5; pointer.targetY = -1e5; });

  window.addEventListener('resize', resize);
  resize();

  if (reduceMotion) {
    // One static frame, no aura, no animation loop.
    pointer.active = false;
    frame(performance.now());
  } else {
    requestAnimationFrame(frame);
  }
})();
