document.addEventListener('DOMContentLoaded', () => {

  // ── FIXED NAV HEIGHT SYNC ────────────────────────────
  // The fixed header's real rendered height is written to --nav-h on
  // <html>. Every offset (body padding proxy, .hero margin/height,
  // scroll-padding) reads from --nav-h so responsive height changes
  // (mobile / user zoom / breakpoints) never leave a gap or overlap.
  (function () {
    const nav = document.getElementById('wybe-nav');
    if (!nav) return;
    let last = -1;
    const write = () => {
      const h = Math.round(nav.getBoundingClientRect().height);
      if (h > 0 && h !== last) {
        document.documentElement.style.setProperty('--nav-h', h + 'px');
        last = h;
      }
    };
    write();
    window.addEventListener('resize', write);
    // Fire once more once fonts have painted (nav row may grow slightly).
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(write);
    } else {
      window.addEventListener('load', write, { once: true });
    }
  })();

  // ── SCROLL PROGRESS BAR ──────────────────────────────
  // Thin lime line at the very top of the viewport; width tracks how far the
  // user has scrolled through the document. Small, godaylight-ish accent.
  (function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bar = document.createElement('div');
    bar.className = 'wybe-scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    let ticking = false;
    const update = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop || document.body.scrollTop;
      const max = (h.scrollHeight - h.clientHeight) || 1;
      bar.style.width = (Math.min(1, scrolled / max) * 100).toFixed(2) + '%';
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    update();
  })();

  // ── NAV: scroll-shadow toggle ─────────────────────────
  // Header .is-scrolled toggle (kept for legacy CSS hooks) + hide-
  // on-scroll behaviour: the header vanishes while the user is
  // actively scrolling and reappears ~180 ms after they stop.
  (function () {
    const nav = document.getElementById('wybe-nav');
    if (!nav) return;
    const header = nav.closest('.wybe-header') || document.querySelector('.wybe-header');
    let ticking = false;
    let idleTimer;
    const update = () => {
      const on = window.scrollY > 50;
      nav.classList.toggle('is-scrolled', on);
      if (header) {
        header.classList.toggle('is-scrolled', on);
        // Hide while actively scrolling (any scroll ≥ 50 px).
        header.classList.add('is-hiding');
        clearTimeout(idleTimer);
        // Show again once scroll has been idle for a moment.
        idleTimer = setTimeout(() => header.classList.remove('is-hiding'), 180);
      }
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    update();
  })();

  // ── NAV: mobile hamburger + aria-expanded ─────────────
  const menuBtn = document.getElementById('menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (menuBtn && mobileMenu) {
    const setOpen = (open) => {
      mobileMenu.classList.toggle('hidden', !open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    menuBtn.addEventListener('click', () => {
      const isOpen = menuBtn.getAttribute('aria-expanded') === 'true';
      setOpen(!isOpen);
    });
    // Close mobile menu on any in-page link click
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => setOpen(false));
    });
    // Close on Escape when open
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') setOpen(false);
    });
  }

  // ── ACTIVE NAV LINK (single-page anchors) ─────────────
  // Highlight whichever nav link points to the section currently in view.
  const navLinks = document.querySelectorAll('[data-nav-link]');
  if (navLinks.length && 'IntersectionObserver' in window) {
    const sectionMap = new Map();
    navLinks.forEach(link => {
      const id = link.getAttribute('href').replace('#', '');
      const sec = document.getElementById(id);
      if (sec) sectionMap.set(sec, link);
    });
    const navObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(l => l.classList.remove('is-active'));
          const link = sectionMap.get(entry.target);
          if (link) link.classList.add('is-active');
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sectionMap.forEach((_, sec) => navObs.observe(sec));
  }

  // ── OBFUSCATED MAILTO LINKS ──────────────────────────
  // Every anchor tagged [data-email data-user="…" data-domain="…"] has
  // its href assembled at runtime instead of shipping a raw mailto: in
  // the source. Scrapers that read the static HTML never see the
  // address; scrapers that render JS have to interact with the link
  // before it exists (we set href lazily on the first user gesture,
  // not on load).
  //
  // If the element is tagged [data-render-text], we also fill its
  // textContent with the address on activation, so inline "email
  // me at ..." links show the address instead of an empty <a>.
  (function () {
    const links = document.querySelectorAll('[data-email]');
    if (!links.length) return;
    links.forEach(link => {
      const user   = link.dataset.user   || '';
      const domain = link.dataset.domain || '';
      if (!user || !domain) return;
      const addr = user + '@' + domain;
      const activate = () => {
        if (link.dataset.emailReady === '1') return;
        link.href = 'mailto:' + addr;
        if (link.hasAttribute('data-render-text') && !link.textContent.trim()) {
          link.textContent = addr;
        }
        link.dataset.emailReady = '1';
      };
      // Set on any user gesture — mouse, keyboard, or touch.
      link.addEventListener('mouseenter', activate, { once: true });
      link.addEventListener('focus',      activate, { once: true });
      link.addEventListener('touchstart', activate, { once: true, passive: true });
      link.addEventListener('click',      activate);
      // For data-render-text links we DO need the address visible on
      // load (they read as "emailing " then nothing). Render text
      // immediately in that case, but keep href lazy.
      if (link.hasAttribute('data-render-text') && !link.textContent.trim()) {
        link.textContent = addr;
      }
    });
  })();

  // ── FAQ ACCORDION ────────────────────────────────────
  // Native <button data-faq-trigger aria-controls="X"> toggles the
  // matching <div id="X" role="region" hidden>. Enter/Space are
  // handled by the browser because the trigger IS a <button>; we
  // just flip aria-expanded, remove/add [hidden] (visibility for AT
  // and keyboard), and drive the max-height transition. For reduced-
  // motion users the CSS media query strips the transition; we still
  // set/remove [hidden] + aria-expanded so behaviour is identical.
  (function () {
    const triggers = document.querySelectorAll('[data-faq-trigger]');
    if (!triggers.length) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    triggers.forEach((btn) => {
      const answer = document.getElementById(btn.getAttribute('aria-controls'));
      if (!answer) return;

      const open = () => {
        btn.setAttribute('aria-expanded', 'true');
        answer.hidden = false;
        answer.dataset.open = 'true';
        if (reduceMotion) return;
        // Animate to the exact content height, then clear so multi-
        // line answers reflow correctly on window resize.
        const h = answer.scrollHeight;
        answer.style.maxHeight = h + 'px';
        const clear = (e) => {
          if (e.propertyName !== 'max-height') return;
          answer.style.maxHeight = 'none';
          answer.removeEventListener('transitionend', clear);
        };
        answer.addEventListener('transitionend', clear);
      };
      const close = () => {
        btn.setAttribute('aria-expanded', 'false');
        answer.dataset.open = 'false';
        if (reduceMotion) {
          answer.hidden = true;
          return;
        }
        // If we were at 'none' (fully open, resize-safe), pin the
        // current height first so the collapse has something to
        // transition from.
        const current = answer.scrollHeight;
        answer.style.maxHeight = current + 'px';
        // Next frame: transition to 0.
        requestAnimationFrame(() => {
          answer.style.maxHeight = '0px';
        });
        const done = (e) => {
          if (e.propertyName !== 'max-height') return;
          answer.hidden = true;
          answer.removeEventListener('transitionend', done);
        };
        answer.addEventListener('transitionend', done);
      };

      btn.addEventListener('click', () => {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        if (expanded) close(); else open();
      });
    });
  })();

  // ── PER-ELEMENT REVEAL (.wybe-reveal) ────────────────
  // Any element tagged .wybe-reveal fades + slides up on entry.
  // Used by the Client Results testimonial cards / transformation
  // figures for a light, staggered reveal without needing GSAP.
  // CSS gates the transition behind prefers-reduced-motion: no-preference,
  // so reduced-motion users see the final state instantly.
  //
  // Safety flag: `html.gsap-ready` is added on this IIFE's success
  // path. It gates the hidden-initial state of every reveal target
  // (.wybe-reveal, [data-line], [data-splash]) in css/styles.css.
  // If this IIFE never runs or aborts before setting the class,
  // content stays visible (the fail-safe rules in styles.css force
  // opacity: 1 on all reveal targets when the class isn't present).
  (function () {
    const items = document.querySelectorAll('.wybe-reveal');
    const setReady = () => document.documentElement.classList.add('gsap-ready');
    if (!items.length || !('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('is-visible')); // reveal statically
      setReady();
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      items.forEach(el => el.classList.add('is-visible'));
      setReady();
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    items.forEach(el => io.observe(el));
    setReady();
  })();

  // ── WEB3FORMS HANDLER ────────────────────────────────
  // Every form with `data-form` submits to web3forms, swaps in the success
  // panel that follows it (the next sibling element).
  document.querySelectorAll('form[data-form]').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn ? btn.textContent : '';
      const successEl = form.nextElementSibling;

      if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }

      const data = Object.fromEntries(new FormData(form));
      data.access_key = '9dd51d8a-998b-4b71-bda2-fd22eb6a752a';
      data.subject = form.dataset.subject || 'WYBE Enquiry';

      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (res.ok) {
          form.classList.add('hidden');
          if (successEl) successEl.classList.remove('hidden');
        } else { throw new Error(); }
      } catch {
        if (btn) { btn.textContent = originalText; btn.disabled = false; }
      }
    });
  });

  // ── IN-PAGE HASH-LINK ARRIVAL FIX ───────────────────────
  // Sections start life with .section-pre-animate (opacity:0;
  // translateY(80px); scale(0.95)) and only flip to .section-in-view
  // when the IntersectionObserver below sees them scroll into view.
  // Anchor clicks like Book Now (href="#contact") scroll to the
  // section's layout position immediately, but the content is still
  // invisible for the first frame — reads to the user as "the button
  // did nothing" until a second click (by which time the IO has
  // fired). Force the target section to .section-in-view at click
  // time so the arrival lands on visible content.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const hash = a.getAttribute('href');
    if (!hash || hash === '#') return;
    let target = null;
    try { target = document.querySelector(hash); } catch { return; }
    if (!target) return;
    target.classList.remove('section-pre-animate');
    target.classList.add('section-in-view');
  });

  // ── SCROLL-IN ANIMATIONS ──────────────────────────────
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if ('IntersectionObserver' in window && !reduceMotion) {
    const sections = document.querySelectorAll('section');
    if (sections.length) {
      const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.remove('section-pre-animate');
            entry.target.classList.add('section-in-view');
            sectionObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

      sections.forEach((section, idx) => {
        if (idx === 0) {
          section.classList.add('section-in-view');
          return;
        }
        section.classList.add('section-pre-animate');
        sectionObserver.observe(section);
      });
    }
  }

  // Hero is now text-only — no video, no controller (js/hero.js deleted).

  // ── PER-ELEMENT PARALLAX (unified) ────────────────────
  // Any [data-parallax] element translates vertically as the user scrolls
  // through it. Speed is read from data-parallax-speed (0.1–0.3 range,
  // default 0.15) so hero/large banners can use ~0.2–0.3 and small inline
  // images ~0.1–0.15. IntersectionObserver gates the scroll work: only
  // in-view elements have their transform recalculated on each frame,
  // and will-change:transform is set only while in view. A single rAF
  // loop batches every visible element's update — never one listener
  // per image. The (p - 0.5) * speed * height formula is clamped to
  // ±15 % of wrapper height (±8 % in "gentle" mode) so the translateY
  // sweep never reveals the wrapper's empty edge, matching the 130 %
  // (or 116 %) img-height overhang enforced in CSS.
  (function () {
    if (reduceMotion) return;
    const els = Array.from(document.querySelectorAll('[data-parallax]'));
    if (!els.length) return;
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    const speedMul = isMobile ? 0.5 : 1;    // scroll-linked transforms
                                             // jank on iOS Safari
    const entries = els.map(el => ({
      el,
      // Progress is measured off the visible frame (the wrapper), not the
      // oversized img inside — otherwise the 30 % overhang would make the
      // motion start/end 15 % outside the viewable box.
      frame: el.closest('.parallax-wrapper') || el.parentElement || el,
      speed: (parseFloat(el.dataset.parallaxSpeed) || 0.15) * speedMul,
      overhang: el.dataset.parallaxMode === 'gentle' ? 0.08 : 0.15,
      top: 0,
      height: 0,
      inView: false,
    }));
    const byEl = new Map(entries.map(e => [e.el, e]));
    const measure = () => {
      const sy = window.scrollY || 0;
      for (let i = 0; i < entries.length; i++) {
        const r = entries[i].frame.getBoundingClientRect();
        entries[i].top = r.top + sy;
        entries[i].height = r.height;
      }
    };
    if ('IntersectionObserver' in window) {
      const byFrame = new Map(entries.map(e => [e.frame, e]));
      const io = new IntersectionObserver((recs) => {
        for (let i = 0; i < recs.length; i++) {
          const e = byFrame.get(recs[i].target);
          if (!e) continue;
          e.inView = recs[i].isIntersecting;
          e.el.style.willChange = e.inView ? 'transform' : '';
        }
      }, { rootMargin: '20% 0px' });
      entries.forEach(e => io.observe(e.frame));
    } else {
      entries.forEach(e => {
        e.inView = true;
        e.el.style.willChange = 'transform';
      });
    }
    let ticking = false;
    const update = () => {
      const sy = window.scrollY || 0;
      const vh = window.innerHeight || 1;
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        if (!e.inView || !e.height) continue;
        // Progress 0..1: 0 as the element enters from the bottom, 1 as
        // it exits at the top. Uses the wrapper's actual travel so
        // shorter elements move less time-wise but the same amplitude.
        const travel = e.height + vh;
        const p = Math.max(0, Math.min(1, (sy + vh - e.top) / travel));
        // Raw amplitude scales with wrapper height so the visual feel
        // is consistent regardless of viewport size.
        const raw = (p - 0.5) * e.speed * e.height;
        const cap = e.height * e.overhang;
        const y = raw > cap ? cap : raw < -cap ? -cap : raw;
        e.el.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
      }
      ticking = false;
    };
    const req = () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    };
    window.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', () => { measure(); req(); }, { passive: true });
    window.addEventListener('load', () => { measure(); req(); }, { once: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { measure(); req(); });
    }
    measure();
    update();
  })();

  // ── WRAPPER PARALLAX (translates .parallax-wrapper, NOT the img) ──
  // Every image on the site stays static (object-fit:contain) and
  // fully visible — never crops. To restore the parallax "feel"
  // without touching the image transform, we translate the WRAPPER
  // itself by a small amount tied to the wrapper's viewport progress.
  // Range: ±20 px. rAF-throttled. IntersectionObserver gates so
  // off-screen wrappers cost nothing. Hero uses its own GSAP scrub
  // below; excluded here.
  (function() {
    if (reduceMotion) return;
    const wraps = Array.from(
      document.querySelectorAll('.parallax-wrapper:not(.hero-bg)')
    // Skip wrappers that contain an image already using the per-element
    // parallax module above, so the two systems never double-transform.
    ).filter(w => !w.querySelector('[data-parallax]'));
    if (!wraps.length) return;
    const entries = wraps.map(w => ({
      el: w, top: 0, height: 0, inView: false,
    }));
    const byEl = new Map(entries.map(e => [e.el, e]));
    const measure = () => {
      const sy = window.scrollY || window.pageYOffset || 0;
      for (let i = 0; i < entries.length; i++) {
        const r = entries[i].el.getBoundingClientRect();
        entries[i].top = r.top + sy;
        entries[i].height = r.height;
      }
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((recs) => {
        for (let i = 0; i < recs.length; i++) {
          const e = byEl.get(recs[i].target);
          if (e) e.inView = recs[i].isIntersecting;
        }
      }, { rootMargin: '20% 0px' });
      entries.forEach(e => io.observe(e.el));
    } else {
      entries.forEach(e => { e.inView = true; });
    }
    let ticking = false;
    const update = () => {
      const sy = window.scrollY || window.pageYOffset || 0;
      const vh = window.innerHeight || 1;
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        if (!e.inView) continue;
        // Progress: 0 when wrapper top is at viewport bottom, 1 when
        // wrapper bottom exits viewport top.
        const travel = e.height + vh;
        const p = Math.max(0, Math.min(1, (sy + vh - e.top) / travel));
        // ±20 px translation around 0.5 progress.
        const y = (p - 0.5) * -40;
        e.el.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
      }
      ticking = false;
    };
    const req = () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    };
    window.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', () => { measure(); req(); }, { passive: true });
    window.addEventListener('load', () => { measure(); req(); }, { once: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { measure(); req(); });
    }
    measure();
    update();
  })();

  // ── HERO PARALLAX (subtle, no crop-fighting) ──────────
  // Only the HERO image gets a parallax transform. Every other
  // image on the site is object-fit:contain + transform:none.
  // GSAP scrub tied to #home scroll progress. yPercent stays inside
  // the 6% runway defined by the .hero-bg .parallax-img override
  // (top:-6%; height:112%) so no wrapper-bg peeks at the extremes.
  window.addEventListener('load', () => {
    if (reduceMotion) return;
    if (!window.gsap || !window.ScrollTrigger) return;
    const heroImg = document.querySelector('.hero-bg__img');
    if (!heroImg) return;
    window.gsap.registerPlugin(window.ScrollTrigger);
    window.gsap.to(heroImg, {
      yPercent: -5,
      ease: 'none',
      scrollTrigger: {
        trigger: '#home',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        invalidateOnRefresh: true,
      },
    });
  }, { once: true });

  // ── WORK OUT PROGRAM ADD-ON TOGGLE ───────────────────
  // Ticking the [data-service-addon="wop-consult"] checkbox flips
  // every [data-wop-tier] row's visible "was"/"now" prices from
  // base to combo (base + $49 consultation). Untick to revert.
  (function() {
    const box = document.querySelector('input[data-service-addon="wop-consult"]');
    if (!box) return;
    const tiers = document.querySelectorAll('[data-wop-tier]');
    if (!tiers.length) return;
    const update = () => {
      const on = box.checked;
      tiers.forEach(t => {
        const now = t.querySelector('.service-tier__now');
        const was = t.querySelector('.service-tier__was');
        const base = t.dataset.base;
        const combo = t.dataset.combo;
        const wasBase = t.dataset.was;
        const wasCombo = t.dataset.comboWas;
        if (now) now.textContent = '$' + (on ? combo : base);
        if (was) was.textContent = '$' + (on ? wasCombo : wasBase);
      });
    };
    box.addEventListener('change', update);
    update();
  })();

  // FAQ modal wiring moved out of this file — see the inline
  // script block at the end of index.html. That block attaches
  // listeners directly to each FAQ trigger (no delegation, no
  // dependency on earlier IIFEs completing) so a failure elsewhere
  // in main.js can't silently break FAQ open/close.

  // ── TESTIMONIAL TRUNCATION + MODAL ────────────────────
  // The FIRST testimonial card (Amit) is the benchmark — every
  // body is capped at Amit's natural scrollHeight so all cards
  // render at exactly the same shape. Amit fits fully (his cap
  // = his own content). Longer testimonials exceed the cap →
  // .is-truncated → fade gradient + "Read More" button.
  // Read-more click uses event delegation with lazy modal lookup
  // (modal lives at end of <body>, always resolvable by then).
  (function() {
    const cards   = () => Array.from(document.querySelectorAll('.wybe-testimonial'));
    const bodies  = () => Array.from(document.querySelectorAll('.wybe-testimonial__body'));

    // Amit's card is the benchmark. Cards size INTRINSICALLY to
    // (padding + body + Read-More button if present + meta) — no
    // forced height, so Amit's card ends exactly where his text
    // ends. Longer bodies (Zarine, Anahita) get a body max-height
    // cap equal to Amit's natural scrollHeight, so their bodies
    // truncate to Amit's height and their cards land at the same
    // visible total. Read More expands the body in place.
    const equalize = () => {
      const allCards  = cards();
      const allBodies = bodies();
      if (!allCards.length) return;
      // Reset overrides from any previous pass.
      allBodies.forEach(b => { b.style.maxHeight = 'none'; });
      allCards.forEach(c => { c.style.removeProperty('height'); c.classList.remove('is-expanded'); });
      // Force layout flush.
      void allCards[0].offsetHeight;
      // Cap every body to Amit's body scrollHeight so truncated
      // ones still show is-truncated + Read More.
      const bodyCap = allBodies[0].scrollHeight;
      allBodies.forEach(b => {
        b.style.maxHeight = bodyCap + 'px';
        b.classList.toggle('is-truncated', b.scrollHeight > b.clientHeight + 2);
      });
      // Measure Amit's TOTAL card height (natural — no forcing on Amit).
      const amitH = allCards[0].offsetHeight;
      // Lock every OTHER card to Amit's height. Their bodies flex-fill
      // via the :not(:first-child) rule in styles.css so no empty
      // space appears between text and meta.
      allCards.forEach((c, i) => {
        if (i === 0) return;
        c.style.height = amitH + 'px';
      });
    };

    // Fire equalize after every layout-shifting milestone: initial
    // DOMContentLoaded pass, full window.load (all images decoded),
    // fonts.ready, resize, AND when any testimonial <img> finishes
    // loading (photo avatars can shift meta row height by a few px
    // and throw the measurement off before this).
    equalize();
    window.addEventListener('load',   equalize, { once: true });
    window.addEventListener('resize', equalize, { passive: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(equalize);
    }
    document.querySelectorAll('.wybe-testimonial img').forEach(img => {
      if (img.complete) return;
      img.addEventListener('load',  equalize, { once: true });
      img.addEventListener('error', equalize, { once: true });
    });

    // Read More expands the clicked card downward IN PLACE.
    // .is-expanded on the article overrides the JS-set fixed
    // height + body max-height via CSS !important rules.
    document.addEventListener('click', (e) => {
      const more = e.target.closest('[data-testimonial-more]');
      if (!more) return;
      e.preventDefault();
      const art = more.closest('.wybe-testimonial');
      if (!art) return;
      const isOpen = art.classList.toggle('is-expanded');
      more.innerHTML = isOpen ? 'Read Less ↑' : 'Read More →';
    });
  })();

  // ── TESTIMONIALS CLICK-DRAG SCROLLER ─────────────────
  // Native horizontal overflow-scroll on .testimonials-container
  // handles trackpad/wheel. This IIFE adds click-and-hold + drag
  // so mouse users can drag cards horizontally too. Also normalises
  // vertical wheel over the container to horizontal scroll (so a
  // regular scroll wheel drags the row instead of scrolling the
  // page while the pointer is over the testimonials).
  // No GSAP pin — the section is normal-flow, zero dead vertical
  // space. Mobile stacks vertically via CSS flex-wrap:wrap.
  (function() {
    const container = document.querySelector('.testimonials-container');
    if (!container) return;

    let isDown = false;
    let startX = 0;
    let startScroll = 0;
    let moved = false;

    const onDown = (e) => {
      // Only left mouse button, and skip clicks on the Read More
      // button so those still register as clicks (not drag).
      if (e.button !== undefined && e.button !== 0) return;
      if (e.target.closest('[data-testimonial-more]')) return;
      isDown = true;
      moved = false;
      startX = (e.pageX !== undefined ? e.pageX : e.touches[0].pageX);
      startScroll = container.scrollLeft;
      container.classList.add('is-dragging');
    };
    const onMove = (e) => {
      if (!isDown) return;
      const x = (e.pageX !== undefined ? e.pageX : e.touches[0].pageX);
      const dx = x - startX;
      if (Math.abs(dx) > 3) moved = true;
      container.scrollLeft = startScroll - dx;
      if (e.cancelable) e.preventDefault();
    };
    const onUp = () => {
      if (!isDown) return;
      isDown = false;
      container.classList.remove('is-dragging');
      // If the pointer moved beyond the drag threshold, swallow the
      // trailing click so it doesn't fire on whatever card ended up
      // under the pointer.
      if (moved) {
        const stop = (ev) => { ev.stopPropagation(); ev.preventDefault();
          window.removeEventListener('click', stop, true); };
        window.addEventListener('click', stop, true);
      }
    };

    container.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    // Touch — passive:true so the browser can still do fast
    // native inertial scroll if we don't call preventDefault.
    container.addEventListener('touchstart', onDown, { passive: true });
    container.addEventListener('touchmove', onMove, { passive: true });
    container.addEventListener('touchend', onUp);

    // NOTE: no wheel-to-horizontal handler. A previous version
    // called preventDefault() on every vertical wheel over the
    // container, which trapped the page — user reported "page
    // stuck at Success Stories, does not move". Vertical wheel
    // now bubbles naturally so scrolling past the section works.
    // Horizontal input still comes from: trackpad two-finger
    // horizontal, native scrollbar, click-and-drag (above).
  })();

  // ── SCROLLTRIGGER REFRESH ────────────────────────────
  // The fixed header + font-load can shift page geometry after
  // ScrollTriggers are created (in scenes.js / promise.js). Refresh
  // once on window.load (all assets in) and again on resize +
  // font-face ready. `invalidateOnRefresh: true` on the individual
  // triggers means start/end positions get recomputed each time.
  const refreshST = () => {
    if (window.ScrollTrigger && typeof window.ScrollTrigger.refresh === 'function') {
      window.ScrollTrigger.refresh();
    }
  };
  window.addEventListener('load', refreshST, { once: true });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(refreshST);
  }
  let rzST;
  window.addEventListener('resize', () => {
    clearTimeout(rzST);
    rzST = setTimeout(refreshST, 150);
  });
  // Also refresh when the URL fragment changes (e.g. #services jump
  // from another page) — the browser scroll re-lands after fragment
  // navigation and triggers may need re-measuring.
  window.addEventListener('hashchange', refreshST);

});
