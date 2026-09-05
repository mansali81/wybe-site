// ── API BASE URL ─────────────────────────────────────
// Update this after deploying the wybe-api project to Vercel.
var WYBE_API_BASE = 'https://wybe-api.vercel.app';

// LEGACY STUB — kept so any cached page referencing buildResultsHtml
// does not throw a ReferenceError. Real PDF generation is now server-side.
function buildResultsHtml(name, email, s) {
  if (!s) return null;

  const M_BMI  = 'Weight (kg) &divide; height&sup2; (m&sup2;). BMI screens for weight class, not body composition.';
  const M_IBW  = 'Broca\'s Index (height in cm &minus; 100), &plusmn;5&thinsp;kg band.';
  const M_BFP  = 'U.S. Navy circumference method (neck, waist, height), ~&plusmn;4&ndash;5% of DEXA/BIA. This method is not fully accurate but gives a rough idea &mdash; DEXA or BIA remain the gold standard for body fat testing.';
  const M_TDEE = 'Mifflin-St&thinsp;Jeor equation, adjusted for activity level.';

  const WHAT = {
    bmi: {
      'Underweight':   'Increasing lean muscle mass through structured resistance training and a modest calorie surplus can help.',
      'Normal weight': 'Maintain your healthy weight through consistent training and balanced nutrition.',
      'Overweight':    'A structured plan with progressive training and a small calorie deficit can help bring this into the healthy range.',
      'Obese':         'A structured plan combining progressive training and a supervised calorie deficit is strongly recommended.',
    },
    bfp: {
      'Essential fat':          'Maintain your fat levels — they are at the essential minimum for bodily function.',
      'Athletic':               'A strong, athletic range — maintain it with consistent training and balanced nutrition.',
      'Fitness':                'A healthy fitness range — keep up consistent training and balanced nutrition.',
      'Acceptable / Average':   'Focus on resistance training and a balanced diet to move toward the fitness range.',
      'Obese':                  'A combination of regular training and a supervised calorie deficit is strongly recommended.',
      'Outside plausible range':'Please double-check your measurements and recalculate.',
    },
    tdee: {
      'Low energy needs, careful with cuts':  'Be careful with further calorie cuts — eating too little can impair recovery and hormonal health.',
      'Moderate metabolic range':             'Your intake is in a healthy range. Adjust slightly depending on your goal.',
      'High energy needs':                    'A calorie deficit diet refers to replacing certain nutrients that are effective for body functions. Strongly recommend for nutrition consultation.',
      'Very high energy needs, athlete tier': 'Your calorie needs are at an athletic level. Work with a nutritionist to fuel training and recovery optimally.',
    },
  };

  const infoCell = (label, value) => value
    ? '<td style="padding:4px 16px 14px 0;vertical-align:top;">'
      + '<p style="margin:0 0 2px;font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#FF6600;">' + label + '</p>'
      + '<p style="margin:0;font-size:13px;font-weight:700;color:#FFFFFF;line-height:1.3;">' + value + '</p>'
      + '</td>'
    : '';

  const metricCard = (label, valueLarge, valueSuffix, category, noteText, method, whatTodo) =>
    '<td width="50%" style="padding:6px;" valign="top">'
    + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#1c1c1c;border:1px solid #2e2e2e;border-radius:6px;">'
    + '<tr><td style="padding:18px;">'
    + '<p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#FF6600;">' + label + '</p>'
    + '<p style="margin:0 0 4px;line-height:1;"><span style="font-size:40px;font-weight:900;color:#FFFFFF;">' + valueLarge + '</span>'
      + (valueSuffix ? '<span style="font-size:15px;font-weight:400;color:#AAAAAA;"> ' + valueSuffix + '</span>' : '') + '</p>'
    + '<p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#FF6600;">' + category + '</p>'
    + (noteText ? '<p style="margin:0 0 12px;font-size:12px;color:#BBBBBB;line-height:1.5;">' + noteText + '</p>' : '')
    + '<div style="height:1px;background:#2e2e2e;margin:10px 0;"></div>'
    + '<p style="margin:0 0 8px;font-size:11px;color:#888888;line-height:1.5;"><strong style="color:#AAAAAA;">Method:</strong> ' + method + '</p>'
    + (whatTodo ? '<p style="margin:0;font-size:12px;color:#CCCCCC;line-height:1.5;"><strong style="color:#FFFFFF;">What to do:</strong> ' + whatTodo + '</p>' : '')
    + '</td></tr></table>'
    + '</td>';

  const genderLabel = s.gender === 'male' ? 'Male' : s.gender === 'female' ? 'Female' : '';

  const bmiCard  = s.bmi
    ? metricCard('Body Mass Index', s.bmi.value, '', s.bmi.category, s.bmi.note, M_BMI, WHAT.bmi[s.bmi.category] || '')
    : '<td width="50%"></td>';
  const ibwCard  = s.ibw
    ? metricCard('Ideal Body Weight', s.ibw.point, 'kg', 'Healthy target', s.ibw.note, M_IBW,
        'Stay within this band through consistent training and a balanced diet.')
    : '<td width="50%"></td>';
  const bfpCard  = s.bfp
    ? metricCard('Body Fat %', s.bfp.value, '%', s.bfp.category, s.bfp.note, M_BFP, WHAT.bfp[s.bfp.category] || '')
    : '<td width="50%"></td>';
  const tdeeCard = s.tdee
    ? metricCard('Daily Calorie Needs', s.tdee.value.toLocaleString(), 'kcal/day', s.tdee.category,
        'Maintenance target, kcal/day.', M_TDEE, WHAT.tdee[s.tdee.category] || '')
    : '<td width="50%"></td>';

  const calTargets = s.tdee
    ? '<tr><td style="background:#0f0f0f;border-left:1px solid #222;border-right:1px solid #222;padding:4px 24px 20px;">'
      + '<p style="margin:0 0 10px;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#888888;">CALORIE TARGETS</p>'
      + '<div style="height:1px;background:#2e2e2e;margin-bottom:14px;"></div>'
      + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#1c1c1c;border:1px solid #2e2e2e;border-radius:6px;">'
      + '<tr>'
      + '<td width="33%" style="padding:14px 10px;text-align:center;border-right:1px solid #2e2e2e;" valign="top">'
        + '<p style="margin:0 0 4px;font-size:9px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#888888;">CUT (FAT LOSS)</p>'
        + '<p style="margin:0;font-size:20px;font-weight:900;color:#FFFFFF;">' + s.tdee.cut.toLocaleString() + ' kcal</p>'
      + '</td>'
      + '<td width="34%" style="padding:14px 10px;text-align:center;border-right:1px solid #2e2e2e;" valign="top">'
        + '<p style="margin:0 0 4px;font-size:9px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#888888;">MAINTAIN</p>'
        + '<p style="margin:0;font-size:20px;font-weight:900;color:#FF6600;">' + s.tdee.maintain.toLocaleString() + ' kcal</p>'
      + '</td>'
      + '<td width="33%" style="padding:14px 10px;text-align:center;" valign="top">'
        + '<p style="margin:0 0 4px;font-size:9px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#888888;">LEAN BULK</p>'
        + '<p style="margin:0;font-size:20px;font-weight:900;color:#FFFFFF;">' + s.tdee.bulk.toLocaleString() + ' kcal</p>'
      + '</td>'
      + '</tr>'
      + '</table>'
      + '</td></tr>'
    : '';

  return '<!DOCTYPE html>'
    + '<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WYBE Body Composition Report</title></head>'
    + '<body style="margin:0;padding:0;background:#0a0a0a;font-family:Helvetica,Arial,sans-serif;">'
    + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;"><tr><td align="center" style="padding:20px 10px;">'
    + '<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">'

    // Header
    + '<tr><td style="background:#1A2E22;padding:18px 24px;border-radius:6px 6px 0 0;">'
    + '<table width="100%" cellpadding="0" cellspacing="0"><tr>'
    + '<td style="font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#F6F2E8;">BODY COMPOSITION REPORT</td>'
    + '<td align="right" style="font-size:26px;font-weight:900;letter-spacing:0.05em;color:#FF6600;">WYBE</td>'
    + '</tr></table></td></tr>'

    // User info
    + '<tr><td style="background:#111111;padding:16px 24px 4px;border:1px solid #222222;border-top:none;">'
    + '<table cellpadding="0" cellspacing="0"><tr>'
    + infoCell('Name', name)
    + infoCell('Age', s.age ? String(s.age) : '')
    + infoCell('Gender', genderLabel)
    + infoCell('Activity Level', s.activityLabel || '')
    + '</tr><tr>'
    + infoCell('Height', s.height ? s.height + ' cm' : '')
    + infoCell('Weight', s.weight ? s.weight + ' kg' : '')
    + infoCell('Neck', s.neck ? s.neck + ' cm' : '')
    + infoCell('Waist', s.waist ? s.waist + ' cm' : '')
    + '</tr><tr>'
    + infoCell('Email', email)
    + '</tr></table></td></tr>'

    // YOUR RESULTS heading
    + '<tr><td style="background:#0f0f0f;padding:20px 24px 10px;border-left:1px solid #222;border-right:1px solid #222;">'
    + '<table width="100%" cellpadding="0" cellspacing="0"><tr>'
    + '<td style="font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#888888;padding-right:14px;white-space:nowrap;">YOUR RESULTS</td>'
    + '<td style="border-top:1px solid #2e2e2e;"></td>'
    + '</tr></table></td></tr>'

    // Row 1: BMI + IBW
    + '<tr><td style="background:#0f0f0f;padding:0 18px;border-left:1px solid #222;border-right:1px solid #222;">'
    + '<table width="100%" cellpadding="0" cellspacing="0"><tr>' + bmiCard + ibwCard + '</tr></table></td></tr>'

    // Row 2: BFP + TDEE
    + '<tr><td style="background:#0f0f0f;padding:0 18px 16px;border-left:1px solid #222;border-right:1px solid #222;">'
    + '<table width="100%" cellpadding="0" cellspacing="0"><tr>' + bfpCard + tdeeCard + '</tr></table></td></tr>'

    // Calorie targets
    + calTargets

    // Next step CTA
    + '<tr><td style="background:#151515;border:1px solid #222;border-top:none;padding:20px 24px;border-radius:0 0 6px 6px;">'
    + '<table width="100%" cellpadding="0" cellspacing="0"><tr>'
    + '<td valign="middle" style="font-size:13px;color:#CCCCCC;line-height:1.5;padding-right:16px;">'
    + '<strong style="color:#FFFFFF;">Next step:</strong> book a session with Mansoor to translate these numbers into a concrete training and nutrition plan.'
    + '</td>'
    + '<td valign="middle" align="right" style="white-space:nowrap;">'
    + '<a href="https://mansoorahamadali.com/#services" style="display:inline-block;border:1.5px solid #FF6600;color:#FF6600;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:10px 16px;border-radius:4px;text-decoration:none;">Book a Consultation</a>'
    + '</td></tr></table></td></tr>'

    // Footer
    + '<tr><td style="padding:16px 0;">'
    + '<table width="100%" cellpadding="0" cellspacing="0"><tr>'
    + '<td style="font-size:10px;color:#555555;">Generated at wybe.fit &mdash; for educational reference only. All figures are estimates.</td>'
    + '<td align="right" style="font-size:10px;color:#555555;white-space:nowrap;">WYBE &copy; 2026</td>'
    + '</tr></table></td></tr>'

    + '</table></td></tr></table>'
    + '</body></html>';
}

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
        // .hero { padding: var(--nav-h) 0 24px } — a --nav-h change
        // resizes the hero and invalidates every ScrollTrigger start/end
        // measured against it. ScrollTrigger debounces its own resize
        // refresh, but its ordering against this synchronous write is
        // not guaranteed, so be explicit.
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
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
    const update = () => {
      const on = window.scrollY > 50;
      nav.classList.toggle('is-scrolled', on);
      if (header) {
        header.classList.toggle('is-scrolled', on);
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
    let _menuTouchToggled = false;
    menuBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      _menuTouchToggled = true;
      const isOpen = menuBtn.getAttribute('aria-expanded') === 'true';
      setOpen(!isOpen);
      setTimeout(() => { _menuTouchToggled = false; }, 500);
    });
    menuBtn.addEventListener('click', () => {
      if (_menuTouchToggled) return;
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

  // ── FORM HANDLER ─────────────────────────────────────
  // Waitlist and contact forms POST to Google Apps Script.
  // Any other data-form falls back to Web3Forms.
  var GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwnUAj4Casd_hvkBuLpYaJYaHeq7VXU0wdZZ1YvaPqXtwonbYPqILYhGr-uSwbyLBa29Q/exec';

  document.querySelectorAll('form[data-form]').forEach(function(form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      var originalText = btn ? btn.textContent : '';
      var successEl = form.nextElementSibling;
      var subj = form.dataset.subject || '';
      var raw = Object.fromEntries(new FormData(form));

      if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }

      // Hide any previous error for this form
      var errElId = subj === 'WYBE, Quick Contact' ? 'contact-send-error' : subj === '1825 Days, Waitlist' ? 'waitlist-send-error' : null;
      if (errElId) { var prevErr = document.getElementById(errElId); if (prevErr) prevErr.classList.add('hidden'); }

      try {
        var params = null;

        if (subj === '1825 Days, Waitlist') {
          var dialEl = document.getElementById('wl-dialcode-value');
          var numEl  = document.getElementById('wl-mobile-num');
          var cHidEl = document.getElementById('wl-country-hidden');
          var mobileVal  = (dialEl ? dialEl.value : '') + (numEl ? numEl.value.trim() : (raw.mobile || ''));
          var countryVal = (cHidEl && cHidEl.value) ? cHidEl.value : (raw.country || '');
          params = new URLSearchParams({ source: 'waitlist', name: raw.name || '', email: raw.email || '', mobile: mobileVal, country: countryVal });
        } else if (subj === 'WYBE, Quick Contact') {
          params = new URLSearchParams({ source: 'contact', name: raw.name || '', email: raw.email || '', message: raw.message || '' });
        } else {
          raw.access_key = '9dd51d8a-998b-4b71-bda2-fd22eb6a752a';
          raw.subject = subj || 'WYBE Enquiry';
          var res = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(raw),
          });
          if (!res.ok) throw new Error('Request failed');
          if (btn) { btn.textContent = originalText; btn.disabled = false; }
          form.classList.add('hidden');
          if (successEl) successEl.classList.remove('hidden');
          return;
        }

        await fetch(GAS_ENDPOINT, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        });

        if (btn) { btn.textContent = originalText; btn.disabled = false; }

        if (subj === 'WYBE, Quick Contact') {
          form.reset();
          var tick = document.getElementById('contact-tick');
          if (tick) {
            tick.classList.remove('hidden');
            tick.classList.add('visible');
            setTimeout(function() {
              tick.classList.add('hidden');
              tick.classList.remove('visible');
            }, 3000);
          }
        } else {
          form.classList.add('hidden');
          if (successEl) successEl.classList.remove('hidden');
        }
      } catch (err) {
        if (btn) { btn.textContent = originalText; btn.disabled = false; }
        if (errElId) { var errEl = document.getElementById(errElId); if (errEl) errEl.classList.remove('hidden'); }
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

  // ── HERO FIXED-WINDOW PARALLAX ────────────────────────
  // The danielrama.com/#intro model:
  //   (a) .hero-bg + .hero-tint become a position:fixed, viewport-sized
  //       window that does NOT scroll away with the page.
  //   (b) The <img> inside drifts at ~0.2x scroll speed — the depth cue.
  //   (c) #about (opaque, later in tree order) rises and wipes over the
  //       window like a curtain. That is pure paint order — zero JS.
  //   (d) .hero-content rises at ~1.35x and fades out by ~55 % progress.
  //
  // Progressive enhancement: the .is-fixed class is the ONLY thing that
  // switches the layer to fixed, and every fixed rule in styles.css is
  // scoped behind it. If GSAP never arrives the class is never added and
  // the hero renders exactly as it did before this feature — it can
  // never be left in a half-applied state.
  (function () {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const bg      = hero.querySelector('.hero-bg');
    const tint    = hero.querySelector('.hero-tint');
    const img     = hero.querySelector('.hero-bg__img');
    const content = hero.querySelector('.hero-content');
    if (!bg || !img || !content) return;

    // GSAP + ScrollTrigger load with `defer` (they execute BEFORE
    // DOMContentLoaded, so they are normally already here), but poll
    // anyway for a slow CDN — same pattern as js/scenes.js. Deliberately
    // NOT waiting for window.load: that waits on Hero.webp decoding,
    // which is exactly the window in which the user could scroll and
    // watch the layer snap from absolute to fixed.
    function whenGsapReady(cb) {
      if (window.gsap && window.ScrollTrigger) { cb(); return; }
      let tries = 0;
      const t = setInterval(() => {
        if ((window.gsap && window.ScrollTrigger) || tries++ > 60) {
          clearInterval(t);
          if (window.gsap && window.ScrollTrigger) cb();
        }
      }, 50);
    }

    whenGsapReady(function () {
      const gsap = window.gsap;
      const ScrollTrigger = window.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);

      // Mobile browsers fire resize when the URL bar collapses. Without
      // this ScrollTrigger re-measures mid-scroll and the hero jumps.
      // Real desktop resizes still refresh normally.
      ScrollTrigger.config({ ignoreMobileResize: true });

      // gsap.matchMedia (NOT the deprecated ScrollTrigger.matchMedia —
      // that one does not revert non-ScrollTrigger inline styles).
      // Deliberately not reusing the module-level `reduceMotion` const:
      // it is captured once at load, whereas matchMedia responds live to
      // an OS-level motion-preference change and tears down cleanly.
      const mm = gsap.matchMedia();

      // ── >= 768px, motion-safe: the fixed window ──────────
      mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
        hero.classList.add('is-fixed');

        // Symmetric drift: +10 % -> -10 % of hero height = 0.20 * H of
        // travel over 0.20 * H of scroll = the 0.2x rate. Function-based
        // so invalidateOnRefresh re-measures after a --nav-h rewrite or
        // a viewport resize instead of replaying a stale pixel value.
        const drift = () => hero.offsetHeight * 0.10;

        // (a) image drift inside the fixed window
        gsap.fromTo(img,
          { y: () => drift() },
          {
            y: () => -drift(),
            ease: 'none',
            scrollTrigger: {
              trigger: hero,
              start: 'top top',
              end: 'bottom top',
              scrub: true,
              invalidateOnRefresh: true,
            },
          }
        );

        // (b) copy rises FASTER than the page. It already travels -1.0H
        // by sitting in normal flow; this adds -0.35H on top, for a net
        // 1.35x. Targets .hero-content (the PARENT) on purpose — the
        // .hero-tagline / .hero-sub / .hero-cta children each carry
        // `animation: hero-enter ... both`, whose fill-mode:both final
        // keyframe would override a transform set on them directly.
        gsap.to(content, {
          y: () => -hero.offsetHeight * 0.35,
          ease: 'none',
          scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
            invalidateOnRefresh: true,
          },
        });

        // (c) ...and is fully faded by ~55 % of the hero scroll.
        // autoAlpha, NOT opacity: it lands visibility:hidden at exactly
        // 0, so the invisible "Book Now" CTA stops taking clicks and
        // leaves the tab order instead of sitting there as a phantom
        // hit target and a phantom tab stop.
        gsap.to(content, {
          autoAlpha: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: () => '+=' + (hero.offsetHeight * 0.55),
            scrub: true,
            invalidateOnRefresh: true,
          },
        });

        // (d) switch the layer off once the hero is off-screen so it
        // costs nothing — a full-viewport masked layer would otherwise
        // composite every frame for the whole page.
        // SEPARATE trigger with start:'top bottom' so it also reads as
        // active at scrollY 0 (the drift trigger's 'top top' start does
        // not). onRefresh as well as onToggle so a deep-link load like
        // /#contact computes its state from self.isActive instead of
        // waiting for a scroll event that never comes.
        const setLive = (on) => {
          bg.style.visibility = on ? 'visible' : 'hidden';
          if (tint) tint.style.visibility = on ? 'visible' : 'hidden';
          img.style.willChange = on ? 'transform' : 'auto';
        };
        // Read the state straight off geometry rather than off
        // self.isActive: onRefresh fires DURING the refresh, before the
        // trigger's progress has been applied, so isActive is stale
        // there. That is exactly the deep-link case (/#contact loads
        // with the hero already thousands of px above the viewport) —
        // relying on isActive left the layer visible over the whole page.
        const heroInView = () => {
          const r = hero.getBoundingClientRect();
          return r.bottom > 0 && r.top < (window.innerHeight || 0);
        };
        ScrollTrigger.create({
          trigger: hero,
          start: 'top bottom',
          end: 'bottom top',
          onToggle:  (self) => setLive(self.isActive),
          onRefresh: () => setLive(heroInView()),
        });
        // ...and once now, so the very first paint after the class lands
        // is correct even if no refresh or scroll event ever arrives.
        setLive(heroInView());

        // Cleanup when the query stops matching (resize across 768px, or
        // the user flips prefers-reduced-motion). matchMedia reverts the
        // inline styles IT set; the class and the manual writes above
        // are ours to undo.
        return () => {
          hero.classList.remove('is-fixed');
          bg.style.visibility = '';
          if (tint) tint.style.visibility = '';
          img.style.willChange = '';
          content.style.visibility = '';
        };
      });

      // ── < 768px, motion-safe: in-flow scrub only ─────────
      // iOS Safari + position:fixed + a resizing visual viewport is the
      // classic failure mode for this effect (the reference site drops
      // it on mobile too). Keep the layer absolute and ship the small,
      // safe scrub that shipped before. 768px matches the existing
      // .hero-bg .parallax-img mobile override in styles.css.
      mm.add('(max-width: 767px) and (prefers-reduced-motion: no-preference)', () => {
        gsap.to(img, {
          yPercent: -5,
          ease: 'none',
          scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
            invalidateOnRefresh: true,
          },
        });
      });

      // Late layout settles. The hero is min-height:100vh so image decode
      // cannot change its height, but --nav-h is rewritten on
      // document.fonts.ready and .hero's padding reads it; and sections
      // below can shift total document height once images land.
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => ScrollTrigger.refresh());
      }
      window.addEventListener('load', () => {
        ScrollTrigger.refresh();
        // A fresh load with a hash (/#contact) gets re-scrolled by the
        // HASH ANCHOR module below, which runs at load -> fonts.ready ->
        // +120 ms. Both refreshes above fire BEFORE that, so the hero
        // would be left measured against the pre-jump scroll position
        // and the fixed layer would stay painted over the whole page.
        // Re-run once the jump has settled. Only when there IS a hash.
        if (window.location.hash) {
          const after = () => setTimeout(() => ScrollTrigger.refresh(), 220);
          if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(after);
          } else {
            after();
          }
        }
      }, { once: true });
    });
  })();

  // ── HASH ANCHOR SCROLL ON FRESH PAGE LOAD ────────────
  // The browser fires its native anchor jump before JS has run or images
  // have loaded, so layout shifts from content/fonts push the final scroll
  // position off. This re-scrolls after everything has settled, honouring
  // the fixed header height so the section title isn't hidden behind it.
  (function () {
    if (!window.location.hash) return;
    function scrollToHash() {
      const hash = window.location.hash;
      if (!hash) return;
      let target;
      try { target = document.querySelector(hash); } catch (e) { return; }
      if (!target) return;
      const navH = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10
      ) || 0;
      const top = target.getBoundingClientRect().top + window.scrollY - navH;
      window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
    }
    // Wait for full load (images, fonts) then scroll, with a small extra
    // delay to absorb any remaining layout paint from lazy-loaded content.
    function scheduleScroll() {
      const done = () => setTimeout(scrollToHash, 120);
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(done);
      } else {
        done();
      }
    }
    if (document.readyState === 'complete') {
      scheduleScroll();
    } else {
      window.addEventListener('load', scheduleScroll, { once: true });
    }
  })();

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
        if (now) now.textContent = '$' + (on ? t.dataset.combo : t.dataset.base);
        if (was) was.textContent = '$' + (on ? t.dataset.comboWas : t.dataset.was);
        // Also swap the tier's Stripe checkout URL so ticking the
        // add-on routes to the combo (programme + consultation)
        // Payment Link instead of the base one.
        const targetUrl = on ? t.dataset.comboUrl : t.dataset.baseUrl;
        if (targetUrl) t.href = targetUrl;
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
  // All testimonial cards are capped at a fixed body height so every
  // card lands at ~378px total (28px top pad + 265px body + 12px margin
  // + ~57px meta + 16px bottom pad). Bodies taller than the cap get
  // .is-truncated → fade gradient + "Read More" button. Read-more click
  // uses event delegation with lazy modal lookup (modal lives at end of
  // <body>, always resolvable by then).
  (function() {
    const cards   = () => Array.from(document.querySelectorAll('.wybe-testimonial'));
    const bodies  = () => Array.from(document.querySelectorAll('.wybe-testimonial__body'));

    // Fixed body cap (px): 44px top-pad + 250px body + 10px margin + ~57px meta
    // + 16px bottom-pad = ~377px card height (≈378px target).
    const BODY_CAP = 250;

    const equalize = () => {
      const allCards  = cards();
      const allBodies = bodies();
      if (!allCards.length) return;
      // Reset height overrides; temporarily collapse any expanded cards so
      // measurements are clean, then re-expand them after.
      const wasExpanded = new Set(
        allCards.filter(c => c.classList.contains('is-expanded'))
      );
      allBodies.forEach(b => { b.style.maxHeight = 'none'; });
      allCards.forEach(c => { c.style.removeProperty('height'); c.classList.remove('is-expanded'); });
      // Force layout flush.
      void allCards[0].offsetHeight;
      // Cap every body to BODY_CAP; mark truncated if content overflows.
      allBodies.forEach(b => {
        b.style.maxHeight = BODY_CAP + 'px';
        // scrollHeight reflects full content even with overflow:hidden.
        b.classList.toggle('is-truncated', b.scrollHeight > BODY_CAP + 2);
      });
      // Measure first card height and lock all others to it.
      const benchH = allCards[0].offsetHeight;
      allCards.forEach((c, i) => {
        if (i === 0) return;
        c.style.height = benchH + 'px';
      });
      // Restore any cards the user had expanded before resize.
      wasExpanded.forEach(c => c.classList.add('is-expanded'));
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
