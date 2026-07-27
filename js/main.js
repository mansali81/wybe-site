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
  // After ~50 px of scroll, deepen the nav shadow (CSS class .is-scrolled).
  (function () {
    const nav = document.getElementById('wybe-nav');
    if (!nav) return;
    let ticking = false;
    const update = () => {
      const on = window.scrollY > 50;
      nav.classList.toggle('is-scrolled', on);
      // Deepened shadow now lives on the .wybe-header wrapper (the fixed,
      // isolated compositor layer). Toggle the class there too so the CSS
      // rule that owns the shadow fires. Historic listeners on the
      // .wybe-nav class keep working unchanged.
      const header = nav.closest('.wybe-header') || document.querySelector('.wybe-header');
      if (header) header.classList.toggle('is-scrolled', on);
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

  // ── PARALLAX ──────────────────────────────────────────
  // Elements tagged with [data-parallax] translate vertically with scroll.
  // If they also have [data-parallax-3d], a perspective rotateX + slight
  // scale-down is applied so the element appears to tilt back and recede
  // as the user scrolls past — gives the hero video a cinematic 3D feel.
  const parallaxEls = document.querySelectorAll('[data-parallax]');
  if (parallaxEls.length && !reduceMotion) {
    let ticking = false;
    const updateParallax = () => {
      const y = window.scrollY;
      parallaxEls.forEach(el => {
        const speed = parseFloat(el.dataset.parallax) || 0.3;
        const ty = y * speed;
        const is3d = el.dataset.parallax3d === 'true' || el.dataset.parallax3d === '';
        if (is3d) {
          // Tilt up to ~10° on a full viewport-height of scroll, plus a base
          // zoom (1.2× = 20% in) so the hero video reads closer-up. The scale
          // still tapers slightly on scroll for the parallax depth effect.
          const vh = Math.max(1, window.innerHeight);
          const progress = Math.min(1, y / vh);
          const angle = progress * 10;          // 0° → 10°
          const scale = 1.45 - progress * 0.07; // 1.45 → 1.38
          el.style.transform =
            `translate3d(0, ${ty}px, 0) rotateX(${angle}deg) scale(${scale})`;
        } else {
          el.style.transform = `translate3d(0, ${ty}px, 0)`;
        }
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateParallax);
        ticking = true;
      }
    }, { passive: true });
    updateParallax();
  }

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
    );
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

  // ── TESTIMONIALS SLIDER (scroll-driven, no pin) ──────
  // Translates the .testimonials-track horizontally based on how
  // far the #results section has passed through the viewport.
  // Progress 0 (section top just entered viewport bottom) → track
  // at x=0. Progress 1 (section bottom just exited viewport top)
  // → track fully shifted left by its overflow amount.
  // No ScrollTrigger pin — the section keeps its natural height,
  // zero dead vertical space, and the horizontal motion happens
  // during the normal vertical scroll through the section.
  (function() {
    if (reduceMotion) return;
    const track = document.querySelector('.testimonials-track');
    const container = document.querySelector('.testimonials-container');
    const section = document.getElementById('results');
    if (!track || !container || !section) return;
    // Mobile stacks vertically (CSS flex-wrap:wrap); skip transform.
    const mql = window.matchMedia('(min-width: 768px)');
    let overflow = 0, sectionTop = 0, sectionHeight = 0, vh = 0;

    const measure = () => {
      if (!mql.matches) { overflow = 0; return; }
      const rect = section.getBoundingClientRect();
      sectionTop = rect.top + (window.scrollY || window.pageYOffset || 0);
      sectionHeight = rect.height;
      vh = window.innerHeight || 1;
      overflow = Math.max(0, track.scrollWidth - container.clientWidth);
    };

    let ticking = false;
    const update = () => {
      if (overflow <= 0) { track.style.transform = 'translate3d(0,0,0)'; ticking = false; return; }
      const sy = window.scrollY || window.pageYOffset || 0;
      // travel = distance the section moves from "top hits viewport
      // bottom" to "bottom hits viewport top" = sectionHeight + vh.
      const travel = sectionHeight + vh;
      const raw = (sy + vh - sectionTop) / travel;
      const progress = Math.max(0, Math.min(1, raw));
      const x = -progress * overflow;
      track.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
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
