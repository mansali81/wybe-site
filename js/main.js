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

});
