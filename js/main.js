document.addEventListener('DOMContentLoaded', () => {

  // ── NAVBAR MOBILE TOGGLE ──────────────────────────────
  const menuBtn = document.getElementById('menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }

  // ── ACTIVE NAV LINK ───────────────────────────────────
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('[data-nav]').forEach(link => {
    if (link.dataset.nav === page) {
      link.classList.add('text-burgundy');
      link.classList.remove('text-charcoal');
    }
  });

  // ── SCROLL-IN ANIMATIONS ──────────────────────────────
  // Every section after the hero starts hidden and rises into view as the
  // user scrolls. Suppressed for users who prefer reduced motion.
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
          // Hero is visible the moment the page loads.
          section.classList.add('section-in-view');
          return;
        }
        section.classList.add('section-pre-animate');
        sectionObserver.observe(section);
      });
    }
  }

  // ── PARALLAX ──────────────────────────────────────────
  // Any element with [data-parallax="0.3"] translates at a fraction of the
  // scroll speed, creating a depth effect on hero images.
  const parallaxEls = document.querySelectorAll('[data-parallax]');
  if (parallaxEls.length && !reduceMotion) {
    let ticking = false;
    const updateParallax = () => {
      const y = window.scrollY;
      parallaxEls.forEach(el => {
        const speed = parseFloat(el.dataset.parallax) || 0.3;
        el.style.transform = `translate3d(0, ${y * speed}px, 0)`;
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

  // ── CONDITIONAL REVEAL (data-show-when="selector|value") ─
  document.querySelectorAll('[data-show-when]').forEach(target => {
    const [selector, value] = target.dataset.showWhen.split('|');
    const trigger = document.querySelector(selector);
    if (!trigger) return;
    const update = () => target.classList.toggle('hidden', trigger.value !== value);
    trigger.addEventListener('change', update);
    update();
  });

  // ── WEB3FORMS HANDLER ────────────────────────────────
  document.querySelectorAll('form[data-form]').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      const successEl = form.nextElementSibling;

      btn.textContent = 'Sending…';
      btn.disabled = true;

      const data = Object.fromEntries(new FormData(form));
      data.access_key = '8611ac93-789d-40d9-b9d8-a15c6af4b94e';
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
        } else {
          throw new Error();
        }
      } catch {
        btn.textContent = originalText;
        btn.disabled = false;
        const err = form.querySelector('.form-error');
        if (err) err.classList.remove('hidden');
      }
    });
  });

  // ── BOOK NOW MODAL ───────────────────────────────────
  // Injects a contact modal on every page. Triggered by any element with [data-book-now].
  const modalHTML = `
    <div id="book-modal" class="fixed inset-0 z-[100] hidden">
      <div class="absolute inset-0 bg-charcoal/70" data-book-close></div>
      <div class="absolute inset-0 flex items-center justify-center p-4 overflow-y-auto">
        <div class="relative bg-cream w-full max-w-lg max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="book-modal-title">
          <a href="https://wa.me/971527530530" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" class="absolute top-4 right-14 flex items-center gap-2 text-burgundy hover:text-burgundy-dark transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/></svg>
            <span class="font-sans text-xs tracking-widest uppercase">WhatsApp</span>
          </a>
          <button type="button" data-book-close aria-label="Close" class="absolute top-4 right-4 text-charcoal/60 hover:text-charcoal transition-colors p-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          <div class="px-8 pt-12 pb-8">
            <p class="font-sans text-xs tracking-widest uppercase text-charcoal-muted mb-3">Get in Touch</p>
            <div class="w-8 h-px bg-burgundy mb-5"></div>
            <h2 id="book-modal-title" class="font-display text-2xl font-bold text-charcoal mb-6">Let's WYBE</h2>

            <form
              data-form
              data-subject="WYBE — Quick Contact"
              action="https://api.web3forms.com/submit"
              method="POST"
              class="space-y-3"
            >
              <input type="hidden" name="access_key" value="8611ac93-789d-40d9-b9d8-a15c6af4b94e">
              <input type="hidden" name="subject" value="WYBE — Quick Contact">
              <input type="hidden" name="redirect" value="false">
              <div>
                <label for="bm-name" class="font-sans text-xs tracking-widest uppercase text-charcoal/50 block mb-1">Name</label>
                <input type="text" id="bm-name" name="name" required placeholder="Your name" class="border border-charcoal/20 px-4 py-3 font-sans text-sm w-full focus:outline-none focus:border-charcoal/60 placeholder:text-charcoal/30">
              </div>
              <div>
                <label for="bm-email" class="font-sans text-xs tracking-widest uppercase text-charcoal/50 block mb-1">Email</label>
                <input type="email" id="bm-email" name="email" required placeholder="your@email.com" class="border border-charcoal/20 px-4 py-3 font-sans text-sm w-full focus:outline-none focus:border-charcoal/60 placeholder:text-charcoal/30">
              </div>
              <div>
                <label for="bm-message" class="font-sans text-xs tracking-widest uppercase text-charcoal/50 block mb-1">Message</label>
                <textarea id="bm-message" name="message" required rows="4" placeholder="Tell Mansoor what you are looking for." class="border border-charcoal/20 px-4 py-3 font-sans text-sm w-full focus:outline-none focus:border-charcoal/60 placeholder:text-charcoal/30 resize-none"></textarea>
              </div>
              <button type="submit" class="w-full bg-burgundy text-white font-sans text-sm tracking-widest uppercase py-3 hover:bg-burgundy-dark transition-colors">
                Send
              </button>
            </form>

            <div class="hidden py-6 text-center mt-3 border border-charcoal/15">
              <div class="w-8 h-px bg-burgundy mx-auto mb-3"></div>
              <p class="font-display text-lg font-semibold text-charcoal mb-1">Message received.</p>
              <p class="font-sans text-sm text-charcoal/60 max-w-xs mx-auto">Mansoor will reply within 48 hours.</p>
            </div>

            <div class="mt-8 pt-6 border-t border-charcoal/10 text-center">
              <p class="font-sans text-xs tracking-widest uppercase text-charcoal/50 mb-4">Or DM directly</p>
              <div class="flex justify-center gap-6">
                <a href="https://ig.me/m/wybewithmansoor" target="_blank" rel="noopener noreferrer" aria-label="Message on Instagram" class="text-charcoal/70 hover:text-burgundy transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-7 h-7"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="https://www.tiktok.com/@wybewithmansoor" target="_blank" rel="noopener noreferrer" aria-label="Message on TikTok" class="text-charcoal/70 hover:text-burgundy transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-7 h-7"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.28 8.28 0 0 0 4.84 1.54V6.79a4.85 4.85 0 0 1-1.07-.1z"/></svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const modal = document.getElementById('book-modal');
  const openModal = () => {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  };
  const closeModal = () => {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  };
  document.querySelectorAll('[data-book-now]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  });
  modal.querySelectorAll('[data-book-close]').forEach(el => {
    el.addEventListener('click', closeModal);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });

  // Auto-open the Book Now modal on the home page, once per browser session.
  // Visitors can dismiss with the X or by clicking the backdrop.
  if (page === 'index.html' && !sessionStorage.getItem('wybe-book-modal-shown')) {
    sessionStorage.setItem('wybe-book-modal-shown', '1');
    setTimeout(openModal, 800);
  }

  // Re-bind the web3forms handler to the new in-modal form, since it was inserted after the initial pass.
  const modalForm = modal.querySelector('form[data-form]');
  if (modalForm) {
    modalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = modalForm.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      const successEl = modalForm.nextElementSibling;
      btn.textContent = 'Sending…';
      btn.disabled = true;
      const data = Object.fromEntries(new FormData(modalForm));
      data.access_key = '8611ac93-789d-40d9-b9d8-a15c6af4b94e';
      data.subject = modalForm.dataset.subject || 'WYBE — Quick Contact';
      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (res.ok) {
          modalForm.classList.add('hidden');
          if (successEl) successEl.classList.remove('hidden');
        } else { throw new Error(); }
      } catch {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    });
  }

});
