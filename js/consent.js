/**
 * WYBE cookie consent banner.
 * ───────────────────────────
 * Google Consent Mode v2. The <head> snippet on every page defaults all
 * four storage types to 'denied' and replays a stored 'granted' before
 * gtag('config'), so this file only has to handle the FIRST visit and any
 * later change of mind.
 *
 * Contract:
 *   - Nothing is shown if a choice is already stored and still fresh.
 *   - Accept  -> store 'granted', gtag('consent','update', all granted).
 *   - Decline -> store 'denied', nothing is updated, so everything stays
 *                denied and no _ga cookie is ever written.
 *   - The choice carries a date and is re-asked after 12 months.
 *   - window.wybeOpenConsent() clears the choice and reopens the banner;
 *     the footer's "Cookie settings" link calls it.
 *
 * Plausible is cookie-free and is NOT gated by this banner.
 *
 * Every localStorage call is wrapped: Safari private mode throws on both
 * read and write, and a thrown analytics helper must never break a page.
 */
(function () {
  'use strict';

  var KEY = 'wybe_consent';
  var KEY_AT = 'wybe_consent_at';
  var MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;   // re-ask after 12 months

  function read(k) {
    try { return localStorage.getItem(k); } catch (_) { return null; }
  }
  function write(k, v) {
    try { localStorage.setItem(k, v); } catch (_) { /* private mode */ }
  }
  function clear() {
    try { localStorage.removeItem(KEY); localStorage.removeItem(KEY_AT); } catch (_) {}
  }

  /** A stored choice counts only while it is under 12 months old. */
  function storedChoice() {
    var v = read(KEY);
    if (v !== 'granted' && v !== 'denied') return null;
    var at = parseInt(read(KEY_AT) || '0', 10);
    if (!at || (Date.now() - at) > MAX_AGE_MS) return null;
    return v;
  }

  function grant() {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted'
      });
    }
  }

  var bar = null;
  var lastFocus = null;

  function close() {
    if (!bar) return;
    bar.remove();
    bar = null;
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  function decide(value) {
    write(KEY, value);
    write(KEY_AT, String(Date.now()));
    if (value === 'granted') grant();
    close();
  }

  function build() {
    if (bar) return;
    lastFocus = document.activeElement;

    bar = document.createElement('div');
    bar.className = 'wybe-consent';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Cookie consent');

    var inner = document.createElement('div');
    inner.className = 'wybe-consent__inner';

    var text = document.createElement('p');
    text.className = 'wybe-consent__text';
    text.appendChild(document.createTextNode(
      'We use cookies to understand how visitors use this site and to improve our services. You can change this anytime. '
    ));
    var link = document.createElement('a');
    link.href = '/privacy-policy.html';
    link.className = 'wybe-consent__link';
    link.textContent = 'Privacy Policy';
    text.appendChild(link);

    var actions = document.createElement('div');
    actions.className = 'wybe-consent__actions';

    var accept = document.createElement('button');
    accept.type = 'button';
    accept.className = 'wybe-consent__btn wybe-consent__btn--accept';
    accept.textContent = 'Accept';
    accept.addEventListener('click', function () { decide('granted'); });

    var decline = document.createElement('button');
    decline.type = 'button';
    decline.className = 'wybe-consent__btn wybe-consent__btn--decline';
    decline.textContent = 'Decline';
    decline.addEventListener('click', function () { decide('denied'); });

    actions.appendChild(accept);
    actions.appendChild(decline);
    inner.appendChild(text);
    inner.appendChild(actions);
    bar.appendChild(inner);

    // Tab is trapped inside the bar so keyboard users cannot tab past an
    // undecided dialog, but Escape is deliberately NOT a dismiss: closing
    // without choosing would leave the page in an undecided state.
    bar.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = bar.querySelectorAll('a[href], button');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    document.body.appendChild(bar);
    accept.focus();
  }

  /** Footer "Cookie settings": forget the choice and ask again. */
  window.wybeOpenConsent = function () {
    clear();
    build();
  };

  // Footer "Cookie settings". Delegated from document so it works on the
  // static fallback footer and on the one js/site-chrome.js injects over it.
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-cookie-settings]');
    if (!t) return;
    e.preventDefault();
    window.wybeOpenConsent();
  });

  if (!storedChoice()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', build, { once: true });
    } else {
      build();
    }
  }
})();
