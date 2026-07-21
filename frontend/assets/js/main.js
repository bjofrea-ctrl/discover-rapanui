import { CONFIG } from './config.js';

document.addEventListener('DOMContentLoaded', () => {

  // Loader
  const loader = document.getElementById('loader');
  setTimeout(() => loader.classList.add('hidden'), 1200);

  // Nav scroll effect
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 80);
  });

  // Mobile menu
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');
  menuToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    menuToggle.textContent = isOpen ? '✕' : '☰';
    menuToggle.setAttribute('aria-expanded', isOpen);
    menuToggle.setAttribute('aria-label', isOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
  });
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      menuToggle.textContent = '☰';
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Abrir menú de navegación');
    });
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Reveal animations on scroll
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  // Contact form handler — envía el lead al backend real (Supabase Edge Function)
  const contactForm = document.getElementById('contactForm');
  const formError = document.getElementById('formError');
  if (contactForm) {
    contactForm.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = contactForm.querySelector('button');
      const originalText = btn.textContent;

      if (formError) formError.style.display = 'none';

      const formData = new FormData(contactForm);
      const payload = Object.fromEntries(formData.entries());
      if (payload.guest_count === '') delete payload.guest_count;
      else if (payload.guest_count) payload.guest_count = Number(payload.guest_count);

      if (!payload.name || !payload.email || !payload.event_type) {
        if (formError) {
          formError.textContent = 'Por favor completa nombre, email y tipo de evento.';
          formError.style.display = 'block';
        }
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Enviando...';

      try {
        const res = await fetch(CONFIG.SUBMIT_LEAD_FUNCTION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: CONFIG.SUPABASE_ANON_KEY,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`request_failed_${res.status}`);

        btn.textContent = 'Mensaje Enviado ✓';
        btn.style.background = '#2a7d7a';
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = originalText;
          btn.style.background = '';
          contactForm.reset();
        }, 3000);
      } catch (err) {
        console.error('submit-lead failed', err);
        btn.disabled = false;
        btn.textContent = originalText;
        if (formError) {
          formError.textContent = 'No pudimos enviar tu mensaje. Intenta nuevamente o escríbenos por Instagram/WhatsApp.';
          formError.style.display = 'block';
        }
      }
    });
  }

  // Gallery click to expand (simple lightbox)
  document.querySelectorAll('.gallery-grid img').forEach(img => {
    img.addEventListener('click', () => {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:40px;';
      overlay.addEventListener('click', () => overlay.remove());

      const fullImg = document.createElement('img');
      fullImg.src = img.src;
      fullImg.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;border-radius:4px;';
      fullImg.alt = img.alt;

      overlay.appendChild(fullImg);
      document.body.appendChild(overlay);
    });
  });

});
