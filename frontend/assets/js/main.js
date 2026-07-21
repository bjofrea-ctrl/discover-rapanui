import { CONFIG } from './config.js';

document.addEventListener('DOMContentLoaded', () => {

  // Loader with min 400ms to prevent flash on fast connections
  const loader = document.getElementById('loader');
  const loaderStart = Date.now();
  window.addEventListener('load', () => {
    const elapsed = Date.now() - loaderStart;
    const delay = Math.max(0, 400 - elapsed);
    setTimeout(() => loader.classList.add('hidden'), delay);
  });

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
    menuToggle.setAttribute('aria-expanded', isOpen);
    menuToggle.setAttribute('aria-label', isOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
  });
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
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

  // Contact form handler
  const contactForm = document.getElementById('contactForm');
  const formError = document.getElementById('formError');
  if (contactForm) {
    contactForm.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = contactForm.querySelector('button');
      const originalText = btn.textContent;

      if (formError) {
        formError.style.display = 'none';
        formError.textContent = '';
      }

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

  // Gallery lightbox
  let currentLightboxIndex = -1;
  let lightboxImages = [];
  let lightboxOverlay = null;

  function openLightbox(index) {
    lightboxOverlay = document.createElement('div');
    lightboxOverlay.setAttribute('role', 'dialog');
    lightboxOverlay.setAttribute('aria-label', 'Galería de imágenes');
    lightboxOverlay.style.cssText = `position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;padding:40px;`;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    closeBtn.setAttribute('aria-label', 'Cerrar galería');
    closeBtn.style.cssText = 'position:absolute;top:20px;right:20px;background:none;border:none;color:white;cursor:pointer;padding:8px;z-index:10;';

    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
    prevBtn.setAttribute('aria-label', 'Imagen anterior');
    prevBtn.style.cssText = 'position:absolute;left:20px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.1);border:none;color:white;cursor:pointer;padding:12px;border-radius:50%;z-index:10;';

    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
    nextBtn.setAttribute('aria-label', 'Siguiente imagen');
    nextBtn.style.cssText = 'position:absolute;right:20px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.1);border:none;color:white;cursor:pointer;padding:12px;border-radius:50%;z-index:10;';

    const imgEl = document.createElement('img');
    imgEl.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;border-radius:4px;';

    function showImage(i) {
      if (i < 0 || i >= lightboxImages.length) return;
      currentLightboxIndex = i;
      const src = lightboxImages[i];
      const linkEl = document.querySelector(`.glightbox[href="${CSS.escape(src)}"]`) ||
                     document.querySelector(`.glightbox img[src*="${CSS.escape(src.split('/').pop())}"]`);
      imgEl.alt = linkEl?.querySelector('img')?.alt || 'Galería Rapa Nui';
      imgEl.src = src;
      prevBtn.style.display = lightboxImages.length > 1 ? '' : 'none';
      nextBtn.style.display = lightboxImages.length > 1 ? '' : 'none';
    }

    closeBtn.addEventListener('click', () => closeLightbox());
    prevBtn.addEventListener('click', () => showImage(currentLightboxIndex - 1));
    nextBtn.addEventListener('click', () => showImage(currentLightboxIndex + 1));
    lightboxOverlay.addEventListener('click', (e) => {
      if (e.target === lightboxOverlay) closeLightbox();
    });

    lightboxOverlay.appendChild(closeBtn);
    lightboxOverlay.appendChild(prevBtn);
    lightboxOverlay.appendChild(nextBtn);
    lightboxOverlay.appendChild(imgEl);
    document.body.appendChild(lightboxOverlay);
    document.addEventListener('keydown', handleLightboxKeydown);
    showImage(index);
  }

  function closeLightbox() {
    if (lightboxOverlay) {
      lightboxOverlay.remove();
      lightboxOverlay = null;
    }
    document.removeEventListener('keydown', handleLightboxKeydown);
    currentLightboxIndex = -1;
  }

  function handleLightboxKeydown(e) {
    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === 'ArrowLeft') {
      currentLightboxIndex > 0 && openLightbox(currentLightboxIndex - 1);
    } else if (e.key === 'ArrowRight') {
      currentLightboxIndex < lightboxImages.length - 1 && openLightbox(currentLightboxIndex + 1);
    }
  }

  // Collect all gallery images
  document.querySelectorAll('.glightbox').forEach((link, i) => {
    const imgSrc = link.getAttribute('href');
    if (imgSrc) lightboxImages.push(imgSrc);
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const idx = lightboxImages.indexOf(imgSrc);
      openLightbox(idx);
    });
  });

  // Touch fallback for gallery hover effects
  if ('ontouchstart' in window) {
    document.querySelectorAll('.tour-card, .cabana-card').forEach(card => {
      card.addEventListener('touchstart', function () {
        document.querySelectorAll('.tour-card, .cabana-card').forEach(c => c.classList.remove('touch-hover'));
        this.classList.add('touch-hover');
      });
    });
  }

});
