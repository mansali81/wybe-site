/* ═══════════════════════════════════════════════════════════════════════════
   WYBE — CANONICAL SITE CHROME
   ─────────────────────────────────────────────────────────────────────────
   EDIT THIS FILE to change the nav menu or footer across the entire site.
   All pages load this script, which replaces their static header/footer with
   the canonical versions defined below. The static HTML in each .html file
   is the no-JS fallback — keep it in sync when you edit here.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {

  /* ── CANONICAL HEADER ──────────────────────────────────────────────────── */
  var HEADER_HTML = [
    '<nav id="wybe-nav" class="wybe-nav" role="navigation" aria-label="Primary">',
    '  <div class="px-6">',
    '    <div class="flex items-center justify-between h-[96px]">',
    '      <a href="/" class="wybe-brand" aria-label="WYBE — Wellness You Build Everyday, home">',
    '        <img src="/images/logo-mark-orange.png" alt="" class="wybe-brand__logo">',
    '      </a>',
    '      <button id="menu-btn" type="button" class="wybe-hamburger" aria-label="Open menu" aria-controls="mobile-menu" aria-expanded="false">',
    '        <span></span><span></span><span></span>',
    '      </button>',
    '    </div>',
    '  </div>',
    '  <div id="mobile-menu" class="wybe-mobile-menu hidden" role="menu">',
    '    <a href="/"                          class="wybe-mobile-link" role="menuitem">Home</a>',
    '    <a href="/#about"                    class="wybe-mobile-link" role="menuitem">About</a>',
    '    <a href="/faq.html"                  class="wybe-mobile-link" role="menuitem">FAQ</a>',
    '    <a href="/#services"                 class="wybe-mobile-link" role="menuitem">Services</a>',
    '    <a href="/#calculators"              class="wybe-mobile-link" role="menuitem">Calculator</a>',
    '    <a href="/publication.html"          class="wybe-mobile-link" role="menuitem">Publication</a>',
    '    <a href="/about.html#certifications" class="wybe-mobile-link" role="menuitem">Certifications</a>',
    '  </div>',
    '</nav>'
  ].join('\n');

  /* ── CANONICAL FOOTER ──────────────────────────────────────────────────── */
  var FOOTER_HTML = [
    '<div class="max-w-6xl mx-auto px-6 pt-16 pb-12">',
    '  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">',
    '    <div>',
    '      <a href="/#home" class="mb-3 wybe-footer-wordmark" aria-label="WYBE — Wellness You Build Everyday, home">',
    '        <img src="/images/logo-mark-orange.png" alt="" class="wybe-footer-wordmark__img">',
    '      </a>',
    '      <p class="font-sans text-sm text-white/70 leading-relaxed">Wellness You Build Everyday.<br>UAE &middot; Global</p>',
    '    </div>',
    '    <div>',
    '      <p class="font-sans text-xs tracking-widest uppercase text-white/50 mb-4">Navigate</p>',
    '      <ul class="space-y-0">',
    '        <li><a href="/" class="font-sans text-sm text-white/70 hover:text-white transition-colors">Home</a></li>',
    '        <li><a href="/#about" class="font-sans text-sm text-white/70 hover:text-white transition-colors">About me</a></li>',
    '        <li><a href="/#book" class="font-sans text-sm text-white/70 hover:text-white transition-colors">My Book</a></li>',
    '      </ul>',
    '    </div>',
    '    <div>',
    '      <p class="font-sans text-xs tracking-widest uppercase text-white/50 mb-4">Services</p>',
    '      <ul class="space-y-0">',
    '        <li><a href="/#services" class="font-sans text-sm text-white/70 hover:text-white transition-colors">Workout Program</a></li>',
    '        <li><a href="/#services" class="font-sans text-sm text-white/70 hover:text-white transition-colors">Fitness Consultation</a></li>',
    '        <li><a href="/#services" class="font-sans text-sm text-white/70 hover:text-white transition-colors">Nutrition Consultation</a></li>',
    '        <li><a href="/#services" class="font-sans text-sm text-white/70 hover:text-white transition-colors">Personal Training</a></li>',
    '      </ul>',
    '    </div>',
    '    <div>',
    '      <p class="font-sans text-xs tracking-widest uppercase text-white/50 mb-4">Follow</p>',
    '      <div class="flex gap-5 mb-6">',
    '        <a href="https://instagram.com/wybewithmansoor" target="_blank" rel="noopener noreferrer" aria-label="Instagram" class="text-burgundy hover:text-burgundy-dark transition-colors">',
    '          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>',
    '        </a>',
    '        <a href="https://tiktok.com/@wybewithmansoor" target="_blank" rel="noopener noreferrer" aria-label="TikTok" class="text-burgundy hover:text-burgundy-dark transition-colors">',
    '          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.28 8.28 0 0 0 4.84 1.54V6.79a4.85 4.85 0 0 1-1.07-.1z"/></svg>',
    '        </a>',
    '        <a href="https://youtube.com/@wybewithmansoor" target="_blank" rel="noopener noreferrer" aria-label="YouTube" class="text-burgundy hover:text-burgundy-dark transition-colors">',
    '          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
    '        </a>',
    '      </div>',
    '      <p class="font-sans text-xs tracking-widest uppercase text-white/50 mb-4">Contact</p>',
    '      <div class="flex gap-5">',
    '        <a href="#" data-email data-user="mansoor" data-domain="wybe.fit" aria-label="Email Mansoor" class="text-burgundy hover:text-burgundy-dark transition-colors">',
    '          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z"/><path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z"/></svg>',
    '        </a>',
    '        <a href="https://wa.me/971527530530" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" class="text-burgundy hover:text-burgundy-dark transition-colors">',
    '          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/></svg>',
    '        </a>',
    '      </div>',
    '    </div>',
    '  </div>',
    '</div>',
    '<div class="border-t border-white/10">',
    '  <div class="max-w-6xl mx-auto px-6 pt-6 pb-16 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">',
    '    <p class="font-sans text-xs text-white/40">&copy; 2026 <a href="/#home" class="text-burgundy font-bold wybe-footer-link">WYBE</a> &middot; Mansoor Ahamad Ali Mohamed &middot; All rights reserved &middot; Dubai, UAE</p>',
    '    <p class="font-sans text-xs text-white/40 flex flex-wrap items-center gap-x-3 gap-y-1">',
    '      <a href="/privacy-policy.html" class="hover:text-white transition-colors">Privacy Policy</a>',
    '      <span class="text-white/25">&middot;</span>',
    '      <a href="/terms-of-service.html" class="hover:text-white transition-colors">Terms of Service</a>',
    '      <span class="text-white/25">&middot;</span>',
    '      <a href="/legal-notice.html" class="hover:text-white transition-colors">Legal Notice</a>',
    '      <span class="text-white/25">&middot;</span>',
    '      <a href="https://mansoorahamadali.com" target="_blank" rel="noopener noreferrer" class="hover:text-white transition-colors">mansoorahamadali.com</a>',
    '    </p>',
    '  </div>',
    '</div>'
  ].join('\n');

  /* ── INJECT ────────────────────────────────────────────────────────────── */
  var header = document.querySelector('header.wybe-header');
  if (header) header.innerHTML = HEADER_HTML;

  var footer = document.querySelector('footer');
  if (!footer) {
    footer = document.createElement('footer');
    var main = document.querySelector('main');
    if (main) main.insertAdjacentElement('afterend', footer);
    else document.body.appendChild(footer);
  }
  footer.className = 'text-white border-t border-cream/10';
  footer.innerHTML = FOOTER_HTML;

})();
