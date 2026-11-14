/**
 * WYBE lightweight event tracking.
 * ────────────────────────────────
 * Fires named custom events into whichever analytics provider is on
 * the page. Currently wired for Plausible (window.plausible), but the
 * helper checks for Fathom (window.fathom.trackEvent) too, so if the
 * site swaps providers only the <script> tag in <head> needs to
 * change — this file keeps working.
 *
 * Guarantees:
 *   - Zero events fire until a real user gesture (click / submit).
 *     The provider's own pageview call is the only automatic hit.
 *   - Each listed action fires EXACTLY ONE named event per gesture
 *     (form-submit path or click, never both).
 *   - No blocking work: everything is delegated + guarded, so a
 *     missing provider or a failed call never breaks page interaction.
 *
 * Events fired (name → props):
 *   Calculator Calculate   → { source: 'index' | 'calculators-page' }
 *   Calculator Email Report→ (no props)
 *   Booking Request        → { service: 'Fitness' | 'Nutrition' | 'Personal Training' }
 *   Reservation            → { plan: 'Digital Plan' }        // quiz result CTA
 *   Waitlist Signup        → { list: '1825 Days' }
 *   Contact Submit         → (no props)                        // #contact Web3Forms
 *   Testimonial Submit     → (no props)                        // testimonials.html form
 *   Quiz Complete          → { plan: 'Beginner'|'Intermediate'|'Advanced'|'unknown' }
 *   WhatsApp Click         → { location: 'nav' | 'contact-dm' | 'footer' | 'other' }
 *
 * To add a new event: give the trigger a data-track="Event Name"
 * attribute — the delegated click listener at the bottom of this file
 * will call wybeTrack automatically. For form-submit tracking, add a
 * matching data-subject entry to SUBJECT_TO_EVENT below.
 */
(function () {
  'use strict';

  // ── GA4 mirror ────────────────────────────────────────
  // gtag() exists on every page (the <head> snippet defines it before
  // gtag.js loads), but Consent Mode holds everything until the visitor
  // accepts, so calling it before consent is safe and sends nothing.
  // NEVER pass a name, email, phone number or body measurement here.
  function ga(name, params) {
    if (!name) return;
    try {
      if (typeof window.gtag === 'function') {
        params ? window.gtag('event', name, params) : window.gtag('event', name);
      }
    } catch (_) { /* analytics must never break the page */ }
  }
  window.wybeGA = ga;

  // Plausible event name -> GA4 event. Only events that ALREADY fire at
  // success or on a click belong here. The three Web3Forms-style submits
  // fire their Plausible event at submit time, so their GA4 conversions
  // are sent from the wybe:form-success listener further down instead.
  var GA_FROM_PLAUSIBLE = {
    'Calculator Submit':       function () { return ['generate_lead', { lead_source: 'calculator' }]; },
    'Calculator Email Report': function () { return ['generate_lead', { lead_source: 'calculator' }]; },
    'WhatsApp Click':          function (p) { return ['whatsapp_click', { location: (p && p.location) || 'other' }]; },
  };

  // Public helper: window.wybeTrack('Event Name', { prop: 'value' })
  window.wybeTrack = function (name, props) {
    if (!name) return;
    try {
      var map = GA_FROM_PLAUSIBLE[name];
      if (map) { var spec = map(props); ga(spec[0], spec[1]); }
    } catch (_) {}
    try {
      if (typeof window.plausible === 'function') {
        props ? window.plausible(name, { props: props }) : window.plausible(name);
        return;
      }
      // Fallback: Fathom (tracks by ID; use the same string as the name).
      if (window.fathom && typeof window.fathom.trackEvent === 'function') {
        window.fathom.trackEvent(name);
      }
    } catch (_) { /* analytics must never break the page */ }
  };

  // ── Web3Forms submits → Booking Request / Reservation / etc.
  // Map each data-subject to a (event, props) pair so we get a single
  // clean named event per form intent.
  const SUBJECT_TO_EVENT = {
    'WYBE, Fitness Consultation Booking':   { name: 'Booking Request', props: { service: 'Fitness' } },
    'WYBE, Nutrition Consultation Booking': { name: 'Booking Request', props: { service: 'Nutrition' } },
    'WYBE, Personal Training Application':  { name: 'Booking Request', props: { service: 'Personal Training' } },
    'WYBE, Plan Purchase Request':          { name: 'Reservation',     props: { plan: 'Digital Plan' } },
    '1825 Days, Waitlist':                  { name: 'Waitlist Signup', props: { list: '1825 Days' } },
    'WYBE, Quick Contact':                  { name: 'Contact Submit' },
    'WYBE, Testimonial Submission':         { name: 'Testimonial Submit' },
  };

  document.addEventListener('submit', function (e) {
    const form = e.target;
    if (!form || form.tagName !== 'FORM') return;

    // Calculator email PDF form: skip — its own handler fires
    // wybeTrack('Calculator Email Report') on the successful response
    // (not on the submit intent) so we don't double-count failures.
    if (form.id === 'ucalc-email-form') return;
    // Unified calculator "Calculate" (only real calc form on the page)
    if (form.id === 'unified-calc-form') {
      const isDedicatedPage = /\/calculators\.html/.test(location.pathname);
      window.wybeTrack('Calculator Calculate', {
        source: isDedicatedPage ? 'calculators-page' : 'index',
      });
      return;
    }
    // Web3Forms envelopes — subject-driven mapping.
    const subject = form.dataset.subject || '';
    if (subject && SUBJECT_TO_EVENT[subject]) {
      const spec = SUBJECT_TO_EVENT[subject];
      window.wybeTrack(spec.name, spec.props);
    }
  }, true); // capture so it runs before Web3Forms handler kicks in

  // ── Delegated clicks: WhatsApp anchors + any data-track element.
  document.addEventListener('click', function (e) {
    const el = e.target.closest && e.target.closest('a, button');
    if (!el) return;

    // WhatsApp links (footer, contact DM row, anywhere)
    const href = el.getAttribute('href') || '';
    if (/^https:\/\/wa\.me\//i.test(href)) {
      window.wybeTrack('WhatsApp Click', { location: whatsappLocation(el) });
      return;
    }

    // Generic opt-in: <a data-track="Event Name" data-track-props='{"k":"v"}'>
    const named = el.dataset.track;
    if (named) {
      let props;
      if (el.dataset.trackProps) {
        try { props = JSON.parse(el.dataset.trackProps); } catch (_) {}
      }
      window.wybeTrack(named, props);
    }
  });

  // ── GA4 conversions that must fire ONLY on a successful submit.
  //    js/main.js dispatches wybe:form-success after the network call
  //    resolves; the detail carries the form's subject and nothing else.
  var GA_FROM_SUBJECT = {
    '1825 Days, Waitlist':          ['generate_lead', { lead_source: 'book_waitlist' }],
    'WYBE, Quick Contact':          ['generate_lead', { lead_source: 'contact_form' }],
    'WYBE, Testimonial Submission': ['testimonial_submit', null],
  };
  document.addEventListener('wybe:form-success', function (e) {
    var subject = (e && e.detail && e.detail.subject) || '';
    var spec = GA_FROM_SUBJECT[subject];
    if (spec) ga(spec[0], spec[1]);
  });

  // ── GA4-only clicks. Plausible's own events are deliberately NOT
  //    touched here: these two are new to GA4 and add no Plausible call.
  var SOCIAL = [
    [/instagram\.com/i, 'instagram'],
    [/tiktok\.com/i,    'tiktok'],
    [/youtube\.com|youtu\.be/i, 'youtube'],
  ];
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';

    // Stripe Payment Links -> begin_checkout
    if (/^https:\/\/buy\.stripe\.com\//i.test(href)) {
      ga('begin_checkout', {
        item_name: checkoutName(a),
        value: checkoutValue(a),
        currency: 'USD'
      });
      return;
    }
    for (var i = 0; i < SOCIAL.length; i++) {
      if (SOCIAL[i][0].test(href)) { ga('social_click', { platform: SOCIAL[i][1] }); return; }
    }
  });

  // "<card title>, <tier>" where the markup offers both, e.g.
  // "Fitness Consultation, 2 sessions". Falls back to the link's own text.
  function checkoutName(a) {
    var card = a.closest('.service-card');
    var title = card && card.querySelector('.service-card__title');
    var tier = a.querySelector('.service-tier__level') || a.querySelector('.wybe-tier-card__eyebrow');
    var parts = [];
    if (title) parts.push(clean(title.textContent));
    if (tier) parts.push(clean(tier.textContent));
    if (!parts.length) parts.push(clean(a.dataset.tier || a.textContent) || 'unknown');
    return parts.join(', ').slice(0, 100);
  }

  // The charged price, i.e. the "now" figure, never the struck-through one.
  function checkoutValue(a) {
    var now = a.querySelector('.service-tier__now');
    var text = now ? now.textContent : a.textContent;
    var m = String(text).replace(/,/g, '').match(/\$\s*(\d+(?:\.\d{1,2})?)/);
    return m ? Number(m[1]) : undefined;
  }

  function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  // ── Quiz completion is announced elsewhere via wybe:quiz-end;
  //    that event carries the recommended plan on detail.plan.
  document.addEventListener('wybe:quiz-end', function (e) {
    const plan = (e && e.detail && e.detail.plan) || 'unknown';
    window.wybeTrack('Quiz Complete', { plan: plan });
  });

  // Best-effort labelling for WhatsApp clicks so the analytics
  // dashboard shows where the click came from.
  function whatsappLocation(el) {
    if (el.closest('.wybe-nav'))       return 'nav';
    if (el.closest('#contact'))        return 'contact-dm';
    if (el.closest('footer'))          return 'footer';
    return 'other';
  }
})();
