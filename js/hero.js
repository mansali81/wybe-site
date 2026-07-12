/**
 * WYBE hero — scroll-driven runner story.
 * ────────────────────────────────────────
 * Pins the hero for +500vh of scroll distance via GSAP + ScrollTrigger.
 * Scroll progress 0→1 drives:
 *   - video.currentTime 0→duration (smooth scrub via ScrollTrigger scrub: 1)
 *   - a canvas overlay that renders lime motion-streak light rays trailing
 *     behind the runner's on-screen position, with intensity scaling to
 *     scroll velocity and fading out as progress reaches 1
 * The text block is visible from load (CSS fade-up); it no longer waits
 * for scroll to reach the end.
 *
 * No autoplay. The video is preloaded, muted, playsinline, and we never
 * call .play() — its frame is set purely by currentTime.
 *
 * prefers-reduced-motion: the whole controller is a no-op; CSS hides the
 * video and rays.
 */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const heroEl   = document.querySelector('[data-hero]');
  const video    = document.getElementById('hero-scrub');
  const rays     = document.getElementById('hero-rays');
  const content  = document.querySelector('[data-hero-content]');
  if (!heroEl || !video || !rays || !content) return;

  if (reduceMotion) {
    // CSS already keeps the text visible; no ScrollTrigger work to do.
    return;
  }

  // Wait for GSAP + ScrollTrigger to load. Both are deferred CDN scripts.
  function ready(cb) {
    if (window.gsap && window.ScrollTrigger) { cb(); return; }
    if (document.readyState === 'complete') {
      // Retry a few times if scripts haven't attached yet.
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

    // ── 1. Canvas + device-pixel setup ────────────────────────
    const ctx = rays.getContext('2d');
    let cssWidth = 0, cssHeight = 0, dpr = 1;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    function resizeCanvas() {
      dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
      cssWidth  = window.innerWidth;
      cssHeight = window.innerHeight;
      rays.width  = Math.round(cssWidth  * dpr);
      rays.height = Math.round(cssHeight * dpr);
      rays.style.width  = cssWidth  + 'px';
      rays.style.height = cssHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resizeCanvas();

    // ── 2. Ray particle state ─────────────────────────────────
    // Each ray is a horizontal streak trailing to the LEFT of its head.
    // "head" is the x/y of the leading (right) edge; "length" is how far
    // it stretches leftward; "life" fades from 1 → 0 with "decay".
    const RAY_CAP        = isMobile ? 60 : 140;    // hard cap on live rays
    const SPARK_ENABLED  = !isMobile;
    const rayList        = [];

    // Spawn a single ray with parameters that reflect the current scroll
    // velocity (via intensity) and where the runner currently is (headX/Y).
    function spawnRay(headX, headY, intensity) {
      const spread = 0.28 * cssHeight;               // vertical wobble
      const y = headY + (Math.random() - 0.5) * spread;
      rayList.push({
        x:        headX,
        y:        y,
        len:      140 + intensity * 380,
        thick:    1.5 + Math.random() * (1.5 + intensity * 3.5),
        life:     1,
        decay:    0.018 + Math.random() * 0.02,
        sparks:   SPARK_ENABLED ? Math.round(intensity * 6) : 0
      });
      if (rayList.length > RAY_CAP) rayList.splice(0, rayList.length - RAY_CAP);
    }

    // ── 3. Ray render loop (runs continuously, decoupled from scroll) ──
    function renderRays() {
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      // Draw from oldest (dimmest) to newest so newest streaks read on top.
      for (let i = 0; i < rayList.length; i++) {
        const r = rayList[i];
        r.life -= r.decay;
        if (r.life <= 0) continue;
        const a = r.life;

        // Main streak — horizontal gradient from transparent (left) to
        // bright lime at the head (right).
        const x0 = r.x - r.len;
        const x1 = r.x;
        const g  = ctx.createLinearGradient(x0, r.y, x1, r.y);
        g.addColorStop(0.0,  'rgba(221, 255, 85, 0)');
        g.addColorStop(0.55, 'rgba(221, 255, 85, ' + (0.35 * a) + ')');
        g.addColorStop(0.9,  'rgba(221, 255, 85, ' + (0.95 * a) + ')');
        g.addColorStop(1.0,  'rgba(255, 255, 210, ' + a + ')');
        ctx.fillStyle = g;
        ctx.fillRect(x0, r.y - r.thick / 2, r.len, r.thick);

        // Leading edge bloom — brighter blob at the head.
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.thick * 1.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(221, 255, 85, ' + (0.9 * a) + ')';
        ctx.fill();

        // Tail sparks (desktop only) — small bright dots scattered along
        // the streak for a "particle burst" feel.
        for (let s = 0; s < r.sparks; s++) {
          const sx = r.x - Math.random() * r.len;
          const sy = r.y + (Math.random() - 0.5) * 18;
          ctx.beginPath();
          ctx.arc(sx, sy, 0.9 + Math.random() * 1.6, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(221, 255, 85, ' + (0.6 * a) + ')';
          ctx.fill();
        }
      }
      // Compact the array — drop dead rays.
      for (let i = rayList.length - 1; i >= 0; i--) {
        if (rayList[i].life <= 0) rayList.splice(i, 1);
      }
      requestAnimationFrame(renderRays);
    }
    requestAnimationFrame(renderRays);

    // ── 4. GSAP ScrollTrigger — pin + scrub ──────────────────
    // Text is now visible on load (fade-up handled by CSS animation), so we
    // no longer gate reveal behind scroll progress.

    // Velocity trackers for the ray-spawn budget.
    let lastProgress    = 0;
    let smoothedVel     = 0;
    let lastFrameTime   = performance.now();

    // The main ScrollTrigger: pin for 500vh of scroll distance, scrub 1 s
    // smoothing so the video and canvas track finger movement smoothly.
    const st = ScrollTrigger.create({
      trigger:   heroEl,
      start:     'top top',
      end:       '+=500%',       // 500vh of scroll distance ≈ 5 s of video
      pin:       true,
      pinSpacing: true,
      scrub:     1,              // 1 s of scrub smoothing
      anticipatePin: 1,
      invalidateOnRefresh: true,

      onUpdate(self) {
        const now = performance.now();
        const dt  = Math.max(1, now - lastFrameTime);
        lastFrameTime = now;

        const p     = self.progress;
        const dp    = p - lastProgress;
        // Instantaneous velocity in "progress-per-second"; smooth it a
        // little so a jittery trackpad doesn't create rays in flashes.
        const inst  = (Math.abs(dp) / dt) * 1000;
        smoothedVel = smoothedVel * 0.65 + inst * 0.35;
        lastProgress = p;

        // Video scrub. Guard: only seek when the browser has enough frames
        // decoded, and cap just short of duration to avoid the "ended"
        // freeze some browsers dispatch.
        if (video.duration && video.readyState >= 2) {
          const t = Math.min(video.duration - 0.05, p * video.duration);
          if (Math.abs(video.currentTime - t) > 0.03) {
            try { video.currentTime = t; } catch (_) { /* ignore */ }
          }
        }

        // Ray spawn. Runner's approximate on-screen X is a linear function
        // of progress (he traverses the whole viewport width across the
        // scroll). Rays trail LEFT from that head position.
        const HEAD_START_X = -0.05 * cssWidth;   // just off-screen left
        const HEAD_END_X   =  1.05 * cssWidth;   // just off-screen right
        const headX        = HEAD_START_X + (HEAD_END_X - HEAD_START_X) * p;
        const headY        = 0.45 * cssHeight;   // roughly runner's chest

        // Intensity ramps with velocity and fades out as progress → 1 so
        // the scene calms when the character finishes.
        const fadeOut  = Math.max(0, 1 - Math.max(0, (p - 0.9) / 0.1));
        const velNorm  = Math.min(1, smoothedVel * 5);
        const intensity = velNorm * fadeOut;

        // Spawn count per update — more rays when moving fast, none when
        // barely scrolling.
        const baseSpawn  = isMobile ? 1 : 2;
        const extra      = Math.floor(intensity * (isMobile ? 3 : 6));
        const spawns     = baseSpawn + extra;
        if (intensity > 0.05 && p < 0.98) {
          for (let i = 0; i < spawns; i++) {
            // Slight horizontal jitter so successive rays don't stack.
            const jitterX = (Math.random() - 0.5) * 0.02 * cssWidth;
            spawnRay(headX + jitterX, headY, Math.min(1, intensity + Math.random() * 0.15));
          }
        }

      }
    });

    // ── 5. Prime the video: seek to first frame so a poster shows
    //       before the user starts scrolling.
    function primeVideo() {
      try { video.currentTime = 0.001; } catch (_) {}
      ScrollTrigger.refresh();
    }
    if (video.readyState >= 1) primeVideo();
    else video.addEventListener('loadedmetadata', primeVideo, { once: true });

    // ── 6. Resize handling — keep canvas + ScrollTrigger in sync ──
    let rz;
    window.addEventListener('resize', () => {
      clearTimeout(rz);
      rz = setTimeout(() => {
        resizeCanvas();
        ScrollTrigger.refresh();
      }, 120);
    });
  }
})();
