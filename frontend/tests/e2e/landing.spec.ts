import { test, expect } from '@playwright/test';

test.describe('Discover Rapa Nui - Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForLoadState('networkidle');
  });

  test('should load without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });

  test('should have correct title and meta tags', async ({ page }) => {
    await expect(page).toHaveTitle('Discover Rapa Nui — Bodas Destino y Experiencias Premium');
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', /Organizamos tu boda o evento ideal en Rapa Nui/);
  });

  test('should display hero section with correct content', async ({ page }) => {
    const hero = page.locator('.hero');
    await expect(hero).toBeVisible();

    await expect(page.locator('.hero-content .subtitle')).toHaveText('Bodas Destino · Experiencias · Rapa Nui');
    // Firefox/WebKit render font differently - use flexible matching
    await expect(page.locator('.hero-content h1')).toContainText('El lugar donde el');
    await expect(page.locator('.hero-content h1')).toContainText('amor toca la eternidad');
    await expect(page.locator('.hero-content p')).toContainText('Organizamos tu ceremonia o evento soñado');
  });

  test('should have working CTA buttons in hero', async ({ page }) => {
    const primaryCTA = page.locator('.hero-cta .btn-primary');
    const outlineCTA = page.locator('.hero-cta .btn-outline');

    await expect(primaryCTA).toHaveText('Explorar Planes');
    await expect(primaryCTA).toHaveAttribute('href', '#plans');

    await expect(outlineCTA).toHaveText('Solicitar Información');
    await expect(outlineCTA).toHaveAttribute('href', '#contact');
  });

  test('should navigate to sections via anchor links', async ({ page }) => {
    await page.click('a[href="#plans"]');
    await expect(page.locator('#plans')).toBeInViewport();

    await page.click('a[href="#tours"]');
    await expect(page.locator('#tours')).toBeInViewport();

    await page.click('a[href="#cabanas"]');
    await expect(page.locator('#cabanas')).toBeInViewport();
  });

  test('should display both wedding plans', async ({ page }) => {
    const plansSection = page.locator('#plans');
    await expect(plansSection).toBeVisible();

    await expect(page.locator('.plan-card').nth(0)).toContainText('Elopement Íntimo');
    await expect(page.locator('.plan-card').nth(1)).toContainText('Boda Completa');
    await expect(page.locator('.plan-badge')).toHaveText('Más Elegido');
  });

  test('should display tours grid with 6 experiences', async ({ page }) => {
    await expect(page.locator('#tours')).toBeVisible();
    const tourCards = page.locator('.tour-card');
    await expect(tourCards).toHaveCount(6);

    const tourNames = [
      'Ruta de los Moai',
      'Atardecer en Tahai',
      'Ceremonia Ancestral',
      'Aventura Marina',
      'Cabalgata al Atardecer',
      'Cena Típica Rapa Nui',
    ];
    for (const name of tourNames) {
      await expect(page.locator('.tour-card', { hasText: name })).toBeVisible();
    }
  });

  test('should display cabañas section with 2 options', async ({ page }) => {
    await expect(page.locator('#cabanas')).toBeVisible();
    const cabanaCards = page.locator('.cabana-card');
    await expect(cabanaCards).toHaveCount(2);

    await expect(cabanaCards.first()).toContainText('Cabañas Hare Nui');
    await expect(cabanaCards.nth(1)).toContainText('Villa Mana Rapa Nui');
  });

  test('should display gallery with 8 images', async ({ page }) => {
    await expect(page.locator('#gallery')).toBeVisible();
    const galleryImages = page.locator('.gallery-grid img');
    await expect(galleryImages).toHaveCount(8);
  });

  test('should display testimonials', async ({ page }) => {
    await expect(page.locator('#testimonials')).toBeVisible();
    const testimonialCards = page.locator('.testimonial-card');
    await expect(testimonialCards).toHaveCount(2);
    await expect(testimonialCards.first()).toContainText('María & Pablo');
    await expect(testimonialCards.nth(1)).toContainText('Sarah & James');
  });

  test('should have working portal access link', async ({ page }) => {
    const portalLink = page.locator('.portal-btn');
    await expect(portalLink).toBeVisible();
    await expect(portalLink).toHaveAttribute('href', 'portal.html');
    await expect(portalLink).toContainText('Ingresar al Portal de Clientes');
  });

  test('should display contact form with all fields', async ({ page }) => {
    await expect(page.locator('#contact')).toBeVisible();

    const form = page.locator('#contactForm');
    await expect(form).toBeVisible();

    await expect(form.locator('input[placeholder="Nombre"]')).toBeVisible();
    await expect(form.locator('input[placeholder="Email"]')).toBeVisible();
    await expect(form.locator('input[placeholder="País de origen"]')).toBeVisible();
    await expect(form.locator('select')).toBeVisible();
    await expect(form.locator('input[placeholder="N° aproximado de invitados"]')).toBeVisible();
    await expect(form.locator('textarea')).toBeVisible();
    await expect(form.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show success feedback on form submit', async ({ page }) => {
    const form = page.locator('#contactForm');
    await form.locator('input[placeholder="Nombre"]').fill('Test User');
    await form.locator('input[placeholder="Email"]').fill('test@example.com');
    await form.locator('input[placeholder="País de origen"]').fill('Chile');
    await form.locator('select').selectOption('Boda / Ceremonia');
    await form.locator('input[placeholder="N° aproximado de invitados"]').fill('50');
    await form.locator('textarea').fill('Mensaje de prueba');

    await form.locator('button[type="submit"]').click();

    const btn = form.locator('button[type="submit"]');
    await expect(btn).toHaveText('Mensaje Enviado ✓');
    await expect(btn).toHaveCSS('background-color', 'rgb(42, 125, 122)'); // teal
  });

  test('should have functional mobile menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    const menuToggle = page.locator('#menuToggle');
    await expect(menuToggle).toBeVisible();

    await menuToggle.click();
    await expect(page.locator('.nav-links.open')).toBeVisible();
    await expect(page.locator('.nav-links.open a')).toHaveCount(7);

    await page.locator('.nav-links.open a[href="#about"]').click();
    await expect(page.locator('.nav-links.open')).not.toBeVisible();
  });

  test('should have footer with correct links', async ({ page }) => {
    await expect(page.locator('footer')).toBeVisible();
    await expect(page.locator('footer .logo')).toContainText('Discover.Rapa Nui');

    const socialLinks = page.locator('footer .social a');
    await expect(socialLinks).toHaveCount(3);
    await expect(socialLinks.nth(0)).toHaveAttribute('href', 'https://www.instagram.com/discover.rapanui/');
  });
});

test.describe('Discover Rapa Nui - Portal Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/portal.html');
    await page.waitForLoadState('networkidle');
  });

  test('should show login screen initially', async ({ page }) => {
    await expect(page.locator('#loginScreen')).toBeVisible();
    await expect(page.locator('#portalContent')).not.toBeVisible();
    await expect(page.locator('#logoutBtn')).not.toBeVisible();
  });

  test('should login with correct password and show portal content', async ({ page }) => {
    await page.fill('#passwordInput', 'rapanui2025');
    await page.click('#loginBtn');

    await expect(page.locator('#loginScreen')).toHaveClass(/hidden/);
    await expect(page.locator('#portalContent')).toBeVisible();
    await expect(page.locator('#logoutBtn')).toBeVisible();
  });

  test('should show error on wrong password', async ({ page }) => {
    await page.fill('#passwordInput', 'wrongpassword');
    await page.click('#loginBtn');

    await expect(page.locator('#loginError')).toBeVisible();
    await expect(page.locator('#loginError')).toHaveText('Código incorrecto. Intenta nuevamente.');
  });

  test('should display timeline with 6 milestones', async ({ page }) => {
    await page.fill('#passwordInput', 'rapanui2025');
    await page.click('#loginBtn');

    const timelineItems = page.locator('.timeline-item');
    await expect(timelineItems).toHaveCount(6);
    await expect(timelineItems.first()).toContainText('Reserva y Contrato');
    await expect(timelineItems.last()).toContainText('¡Tu Boda en Rapa Nui!');
  });

  test('should display document checklists for civil and ancestral ceremonies', async ({ page }) => {
    await page.fill('#passwordInput', 'rapanui2025');
    await page.click('#loginBtn');

    // Use specific heading locators
    await expect(page.locator('h3', { hasText: 'Para Ceremonia Civil' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Para Ceremonia Ancestral' })).toBeVisible();

    // Check specific list items using more specific selectors
    await expect(page.locator('.portal-card ul li', { hasText: 'Cédula de identidad' })).toBeVisible();
    await expect(page.locator('.portal-card ul li', { hasText: 'Permiso Mau Henua' })).toBeVisible();
  });

test('should display vendor contacts and emergency info', async ({ page }) => {
    await page.fill('#passwordInput', 'rapanui2025');
    await page.click('#loginBtn');

    // Use specific heading locators
    await expect(page.locator('h3', { hasText: 'Coordinación' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Proveedores Aliados' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Emergencias' })).toBeVisible();
  });

  test('should have travel checklist with 8 items', async ({ page }) => {
    await page.fill('#passwordInput', 'rapanui2025');
    await page.click('#loginBtn');

    const checkboxes = page.locator('.checklist-item input[type="checkbox"]');
    await expect(checkboxes).toHaveCount(8);
  });

  test('should logout and return to login screen', async ({ page }) => {
    await page.fill('#passwordInput', 'rapanui2025');
    await page.click('#loginBtn');

    await page.click('#logoutBtn');

    await expect(page.locator('#loginScreen')).toBeVisible();
    await expect(page.locator('#portalContent')).not.toBeVisible();
    await expect(page.locator('#logoutBtn')).not.toBeVisible();
  });

  test('should persist login in localStorage', async ({ page }) => {
    await page.fill('#passwordInput', 'rapanui2025');
    await page.click('#loginBtn');

    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#portalContent')).toBeVisible();
    await expect(page.locator('#loginScreen')).not.toBeVisible();
  });
});

test.describe('Visual Regression', () => {
  test.skip('landing page full screenshot', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('landing-full.png', { fullPage: true });
  });

  test.skip('portal page screenshot after login', async ({ page }) => {
    await page.goto('/portal.html');
    await page.waitForLoadState('networkidle');
    await page.fill('#passwordInput', 'rapanui2025');
    await page.click('#loginBtn');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('portal-logged-in.png', { fullPage: true });
  });

  test.skip('mobile landing page screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/index.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('landing-mobile.png', { fullPage: true });
  });
});