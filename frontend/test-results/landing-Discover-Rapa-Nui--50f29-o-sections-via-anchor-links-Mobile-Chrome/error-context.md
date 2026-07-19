# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landing.spec.ts >> Discover Rapa Nui - Landing Page >> should navigate to sections via anchor links
- Location: tests/e2e/landing.spec.ts:48:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('a[href="#plans"]')
    - locator resolved to 2 elements. Proceeding with the first one: <a href="#plans">Planes</a>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
      - waiting 100ms
    53 × waiting for element to be visible, enabled and stable
       - element is not visible
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - navigation [ref=e2]:
    - link "Discover.Rapa Nui" [ref=e3] [cursor=pointer]:
      - /url: "#"
    - button "Menú" [ref=e4] [cursor=pointer]: ☰
  - generic [ref=e5]:
    - generic [ref=e7]:
      - generic [ref=e8]: Bodas Destino · Experiencias · Rapa Nui
      - heading "El lugar donde el amor toca la eternidad" [level=1] [ref=e9]:
        - text: El lugar donde el
        - text: amor
        - emphasis [ref=e10]: toca la eternidad
      - paragraph [ref=e11]: Organizamos tu ceremonia o evento soñado en el destino más mágico del Pacífico. Coordinación integral, experiencias culturales auténticas y una logística impecable de punta a punta.
      - generic [ref=e12]:
        - link "Explorar Planes" [ref=e13] [cursor=pointer]:
          - /url: "#plans"
        - link "Solicitar Información" [ref=e14] [cursor=pointer]:
          - /url: "#contact"
    - generic [ref=e16]: Descubre
  - generic [ref=e20]:
    - generic [ref=e21]: Quiénes Somos
    - heading "Más de 15 años creando momentos únicos en la isla" [level=2] [ref=e22]
    - paragraph [ref=e23]: Discover Rapa Nui nace del amor por esta tierra y su cultura. Desde 2009, hemos acompañado a parejas de todo el mundo a celebrar su amor en el lugar más místico del planeta.
    - paragraph [ref=e24]: Somos operadores locales con redes directas en la isla. Esto significa que coordinamos cada detalle —ceremonia, hospedaje, gastronomía, tours y traslados— con proveedores de confianza, garantizando una experiencia fluida y auténtica.
    - paragraph [ref=e25]: Trabajamos con profundo respeto por la cultura Rapa Nui, colaborando directamente con la comunidad local para ofrecer ceremonias ancestrales legítimas y experiencias culturales significativas.
    - generic [ref=e26]:
      - generic [ref=e27]:
        - generic [ref=e28]: 15+
        - generic [ref=e29]: Años de experiencia
      - generic [ref=e30]:
        - generic [ref=e31]: 200+
        - generic [ref=e32]: Parejas atendidas
      - generic [ref=e33]:
        - generic [ref=e34]: 100%
        - generic [ref=e35]: Experiencias personalizadas
  - generic [ref=e36]:
    - generic [ref=e37]:
      - generic [ref=e38]: Planes de Boda
      - heading "Elige la experiencia que resuene con ustedes" [level=2] [ref=e39]
      - paragraph [ref=e40]: Cada pareja es única, por eso diseñamos cada ceremonia a medida. Contáctanos para una cotización personalizada según la cantidad de invitados, locaciones y servicios adicionales.
    - generic [ref=e41]:
      - generic [ref=e42]:
        - heading "Elopement Íntimo" [level=3] [ref=e43]
        - paragraph [ref=e44]: Para parejas que buscan una ceremonia privada, íntima y profundamente significativa.
        - paragraph [ref=e45]: "* Valor variable según temporada y servicios"
        - list [ref=e46]:
          - listitem [ref=e47]: — Ceremonia simbólica o ancestral Rapa Nui
          - listitem [ref=e48]: — Maestro de ceremonia local (koro)
          - listitem [ref=e49]: — Atuendo tradicional Rapa Nui (opcional)
          - listitem [ref=e50]: — Fotografía profesional (sesión completa)
          - listitem [ref=e51]: — Video documental (3 min)
          - listitem [ref=e52]: — Brindis de bienvenida con espumante chileno
          - listitem [ref=e53]: — Arreglo floral nativo
          - listitem [ref=e54]: — Traslado novios a locación
          - listitem [ref=e55]: — Coordinación logística completa
        - link "Solicitar Cotización" [ref=e56] [cursor=pointer]:
          - /url: "#contact"
      - generic [ref=e57]:
        - generic [ref=e58]: Más Elegido
        - heading "Boda Completa" [level=3] [ref=e59]
        - paragraph [ref=e60]: Para celebrar con familia e invitados. Una experiencia integral con todos los servicios.
        - paragraph [ref=e61]: "* Valor variable según cantidad de invitados"
        - list [ref=e62]:
          - listitem [ref=e63]: — Todo lo del plan Elopement
          - listitem [ref=e64]: — Ceremonia civil + simbólica/ancestral
          - listitem [ref=e65]: — Banquete con gastronomía local e internacional
          - listitem [ref=e66]: — Decoración temática en locación patrimonial
          - listitem [ref=e67]: "— Música en vivo: grupo folclórico Rapa Nui"
          - listitem [ref=e68]: — Animación y sonido profesional
          - listitem [ref=e69]: — Coctelería y barra de tragos
          - listitem [ref=e70]: — Pastel de bodas personalizado
          - listitem [ref=e71]: — Sesión de fotos post-boda en locaciones icónicas
          - listitem [ref=e72]: — Video documental extendido (8-10 min)
          - listitem [ref=e73]: — Maquillaje y peluquería para novia
          - listitem [ref=e74]: — Traslados para novios e invitados
          - listitem [ref=e75]: — Coordinación integral day-of
        - link "Solicitar Cotización" [ref=e76] [cursor=pointer]:
          - /url: "#contact"
  - generic [ref=e77]:
    - generic [ref=e78]:
      - generic [ref=e79]: Experiencias
      - heading "Tours y Actividades en Rapa Nui" [level=2] [ref=e80]
      - paragraph [ref=e81]: Complementa tu estadía con experiencias únicas diseñadas para ti y tus invitados. Desde expediciones culturales hasta aventuras al atardecer.
    - generic [ref=e82]:
      - generic [ref=e83] [cursor=pointer]:
        - img "Tour Rapa Nui" [ref=e85]
        - generic [ref=e86]: Full Day
        - generic [ref=e87]:
          - heading "Ruta de los Moai" [level=3] [ref=e88]
          - paragraph [ref=e89]: "Recorrido por los principales sitios arqueológicos: Tongariki, Rano Raraku, Anakena y Ahu Akivi. Incluye guía local certificado."
      - generic [ref=e90] [cursor=pointer]:
        - img "Atardecer Rapa Nui" [ref=e92]
        - generic [ref=e93]: Experiencia
        - generic [ref=e94]:
          - heading "Atardecer en Tahai" [level=3] [ref=e95]
          - paragraph [ref=e96]: Disfruta del ocaso más emblemático de la isla con un brindis especial frente a los moai. Sesión fotográfica incluida.
      - generic [ref=e97] [cursor=pointer]:
        - img "Ceremonia ancestral Rapa Nui" [ref=e99]
        - generic [ref=e100]: Cultural
        - generic [ref=e101]:
          - heading "Ceremonia Ancestral" [level=3] [ref=e102]
          - paragraph [ref=e103]: Vive un ritual Hanga Tuai auténtico dirigido por un koro Rapa Nui. Cantos, pintura corporal Takona y vestimenta tradicional.
      - generic [ref=e104] [cursor=pointer]:
        - img "Snorkel Rapa Nui" [ref=e106]
        - generic [ref=e107]: Media Jornada
        - generic [ref=e108]:
          - heading "Aventura Marina" [level=3] [ref=e109]
          - paragraph [ref=e110]: Snorkel en aguas cristalinas, navegación en bote tradicional y avistamiento de tortugas marinas en la costa sur de la isla.
      - generic [ref=e111] [cursor=pointer]:
        - img "Cabalgata Rapa Nui" [ref=e113]
        - generic [ref=e114]: Aventura
        - generic [ref=e115]:
          - heading "Cabalgata al Atardecer" [level=3] [ref=e116]
          - paragraph [ref=e117]: Recorre la costa este a caballo mientras el sol se pone sobre el Pacífico. Una experiencia mágica para parejas aventureras.
      - generic [ref=e118] [cursor=pointer]:
        - img "Gastronomía Rapa Nui" [ref=e120]
        - generic [ref=e121]: Gourmet
        - generic [ref=e122]:
          - heading "Cena Típica Rapa Nui" [level=3] [ref=e123]
          - paragraph [ref=e124]: "Cena privada con cocina tradicional: curanto, ceviche de atún, poe y frutas tropicales. Música en vivo incluida."
  - generic [ref=e125]:
    - generic [ref=e126]:
      - generic [ref=e127]: Hospedaje
      - heading "Cabañas y Alojamiento Boutique" [level=2] [ref=e128]
      - paragraph [ref=e129]: Seleccionamos las mejores opciones de hospedaje para que tu estadía en la isla sea tan especial como la ceremonia.
    - generic [ref=e130]:
      - generic [ref=e133]:
        - heading "Cabañas Hare Nui" [level=3] [ref=e134]
        - paragraph [ref=e135]: Cabañas premium con vista al océano, ubicadas a 5 minutos de Hanga Roa. Capacidad para 2-4 personas. Terraza privada, desayuno incluido y acceso directo a la costa.
        - generic [ref=e136]:
          - generic [ref=e137]: 2-4 Pax
          - generic [ref=e138]: Vista al Mar
          - generic [ref=e139]: Desayuno
          - generic [ref=e140]: WiFi
      - generic [ref=e143]:
        - heading "Villa Mana Rapa Nui" [level=3] [ref=e144]
        - paragraph [ref=e145]: Casa completa con 3 dormitorios, piscina privada y jardín tropical. Ideal para grupos de invitados o familias. Ubicación exclusiva en la zona alta de la isla.
        - generic [ref=e146]:
          - generic [ref=e147]: 4-8 Pax
          - generic [ref=e148]: Piscina
          - generic [ref=e149]: Jardín
          - generic [ref=e150]: Cocina Equipada
  - generic [ref=e151]:
    - generic [ref=e152]:
      - generic [ref=e153]: Galería
      - heading "Momentos que inspiran" [level=2] [ref=e154]
      - paragraph [ref=e155]: Cada boda, cada ceremonia, cada atardecer cuenta una historia única.
    - generic [ref=e156]:
      - img "Boda Rapa Nui ceremonia atardecer" [ref=e158] [cursor=pointer]
      - img "Ceremonia ancestral Rapa Nui" [ref=e160] [cursor=pointer]
      - img "Pareja en Rapa Nui" [ref=e162] [cursor=pointer]
      - img "Atardecer en Tahai moai" [ref=e164] [cursor=pointer]
      - img "Moai en Rapa Nui" [ref=e166] [cursor=pointer]
      - img "Tour guiado Rapa Nui" [ref=e168] [cursor=pointer]
      - img "Cabaña boutique vista mar" [ref=e170] [cursor=pointer]
      - img "Experiencia cultural Rapa Nui" [ref=e172] [cursor=pointer]
  - generic [ref=e173]:
    - generic [ref=e174]:
      - generic [ref=e175]: Testimonios
      - heading "Lo que dicen nuestras parejas" [level=2] [ref=e176]
    - generic [ref=e177]:
      - generic [ref=e178]:
        - paragraph [ref=e179]: "\"Fue la experiencia más mágica de nuestras vidas. Desde la ceremonia ancestral hasta la cena en la playa, cada detalle fue perfecto. El equipo de Discover Rapa Nui hizo que todo fluyera sin estrés.\""
        - generic [ref=e180]:
          - generic [ref=e181]: M
          - generic [ref=e182]:
            - generic [ref=e183]: María & Pablo
            - generic [ref=e184]: Boda Completa · Santiago, Chile
      - generic [ref=e185]:
        - paragraph [ref=e186]: "\"Llegamos desde Australia para nuestro elopement y superó todas nuestras expectativas. La ceremonia al atardecer en Anakena, los cantos Rapa Nui, la comida... Fue íntimo, auténtico y perfecto.\""
        - generic [ref=e187]:
          - generic [ref=e188]: S
          - generic [ref=e189]:
            - generic [ref=e190]: Sarah & James
            - generic [ref=e191]: Elopement Íntimo · Sydney, Australia
  - generic [ref=e193]:
    - generic [ref=e194]: Clientes
    - heading "¿Ya eres nuestro cliente?" [level=2] [ref=e195]
    - paragraph [ref=e196]: Ingresa a tu portal exclusivo con información detallada de tu evento, checklists, cronogramas, contactos de proveedores y documentos importantes.
    - link "Ingresar al Portal de Clientes →" [ref=e197] [cursor=pointer]:
      - /url: portal.html
      - text: Ingresar al Portal de Clientes
      - generic [ref=e198]: →
  - generic [ref=e200]:
    - generic [ref=e201]:
      - generic [ref=e202]: Contacto
      - heading "Comienza a planificar tu experiencia" [level=2] [ref=e203]
      - paragraph [ref=e204]: Cuéntanos sobre tu visión y te enviaremos una propuesta personalizada sin compromiso.
    - generic [ref=e205]:
      - generic [ref=e206]:
        - heading "Hablemos" [level=3] [ref=e207]
        - paragraph [ref=e208]:
          - text: Estamos en la isla y disponibles para resolver todas tus dudas. También puedes encontrarnos en Instagram como
          - strong [ref=e209]: "@discover.rapanui"
          - text: .
        - generic [ref=e210]:
          - generic [ref=e211]: 📍
          - generic [ref=e212]:
            - generic [ref=e213]: Ubicación
            - text: Hanga Roa, Isla de Pascua, Chile
        - generic [ref=e214]:
          - generic [ref=e215]: 📱
          - generic [ref=e216]:
            - generic [ref=e217]: WhatsApp
            - text: +56 9 XXXX XXXX
        - generic [ref=e218]:
          - generic [ref=e219]: ✉️
          - generic [ref=e220]:
            - generic [ref=e221]: Email
            - text: info@discoverrapanui.cl
        - generic [ref=e222]:
          - generic [ref=e223]: 📸
          - generic [ref=e224]:
            - generic [ref=e225]: Instagram
            - text: "@discover.rapanui"
      - generic [ref=e226]:
        - generic [ref=e227]:
          - textbox "Nombre" [ref=e228]
          - textbox "Email" [ref=e229]
        - textbox "País de origen" [ref=e230]
        - combobox [ref=e231]:
          - option "Tipo de evento" [selected]
          - option "Boda / Ceremonia"
          - option "Elopement"
          - option "Renovación de votos"
          - option "Tour / Experiencia"
          - option "Hospedaje"
          - option "Otro"
        - spinbutton [ref=e232]
        - textbox "Cuéntanos sobre tu visión, fechas tentativas y cualquier detalle que quieras compartir..." [ref=e233]
        - button "Enviar Mensaje" [ref=e234] [cursor=pointer]
  - contentinfo [ref=e235]:
    - generic [ref=e236]: Discover.Rapa Nui
    - paragraph [ref=e238]: Bodas destino · Experiencias culturales · Hospedaje boutique · Isla de Pascua, Chile
    - generic [ref=e239]:
      - link "Instagram" [ref=e240] [cursor=pointer]:
        - /url: https://www.instagram.com/discover.rapanui/
        - text: 📷
      - link "WhatsApp" [ref=e241] [cursor=pointer]:
        - /url: "#"
        - text: 💬
      - link "Email" [ref=e242] [cursor=pointer]:
        - /url: "#"
        - text: ✉️
    - paragraph [ref=e243]: © 2025 Discover Rapa Nui. Todos los derechos reservados.
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Discover Rapa Nui - Landing Page', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     await page.goto('/index.html');
  6   |     await page.waitForLoadState('networkidle');
  7   |   });
  8   | 
  9   |   test('should load without console errors', async ({ page }) => {
  10  |     const errors: string[] = [];
  11  |     page.on('console', msg => {
  12  |       if (msg.type() === 'error') errors.push(msg.text());
  13  |     });
  14  |     page.on('pageerror', err => errors.push(err.message));
  15  | 
  16  |     await page.waitForTimeout(1000);
  17  |     expect(errors).toHaveLength(0);
  18  |   });
  19  | 
  20  |   test('should have correct title and meta tags', async ({ page }) => {
  21  |     await expect(page).toHaveTitle('Discover Rapa Nui — Bodas Destino y Experiencias Premium');
  22  |     const description = page.locator('meta[name="description"]');
  23  |     await expect(description).toHaveAttribute('content', /Organizamos tu boda o evento ideal en Rapa Nui/);
  24  |   });
  25  | 
  26  |   test('should display hero section with correct content', async ({ page }) => {
  27  |     const hero = page.locator('.hero');
  28  |     await expect(hero).toBeVisible();
  29  | 
  30  |     await expect(page.locator('.hero-content .subtitle')).toHaveText('Bodas Destino · Experiencias · Rapa Nui');
  31  |     // Firefox/WebKit render font differently - use flexible matching
  32  |     await expect(page.locator('.hero-content h1')).toContainText('El lugar donde el');
  33  |     await expect(page.locator('.hero-content h1')).toContainText('amor toca la eternidad');
  34  |     await expect(page.locator('.hero-content p')).toContainText('Organizamos tu ceremonia o evento soñado');
  35  |   });
  36  | 
  37  |   test('should have working CTA buttons in hero', async ({ page }) => {
  38  |     const primaryCTA = page.locator('.hero-cta .btn-primary');
  39  |     const outlineCTA = page.locator('.hero-cta .btn-outline');
  40  | 
  41  |     await expect(primaryCTA).toHaveText('Explorar Planes');
  42  |     await expect(primaryCTA).toHaveAttribute('href', '#plans');
  43  | 
  44  |     await expect(outlineCTA).toHaveText('Solicitar Información');
  45  |     await expect(outlineCTA).toHaveAttribute('href', '#contact');
  46  |   });
  47  | 
  48  |   test('should navigate to sections via anchor links', async ({ page }) => {
> 49  |     await page.click('a[href="#plans"]');
      |                ^ Error: page.click: Test timeout of 30000ms exceeded.
  50  |     await expect(page.locator('#plans')).toBeInViewport();
  51  | 
  52  |     await page.click('a[href="#tours"]');
  53  |     await expect(page.locator('#tours')).toBeInViewport();
  54  | 
  55  |     await page.click('a[href="#cabanas"]');
  56  |     await expect(page.locator('#cabanas')).toBeInViewport();
  57  |   });
  58  | 
  59  |   test('should display both wedding plans', async ({ page }) => {
  60  |     const plansSection = page.locator('#plans');
  61  |     await expect(plansSection).toBeVisible();
  62  | 
  63  |     await expect(page.locator('.plan-card').nth(0)).toContainText('Elopement Íntimo');
  64  |     await expect(page.locator('.plan-card').nth(1)).toContainText('Boda Completa');
  65  |     await expect(page.locator('.plan-badge')).toHaveText('Más Elegido');
  66  |   });
  67  | 
  68  |   test('should display tours grid with 6 experiences', async ({ page }) => {
  69  |     await expect(page.locator('#tours')).toBeVisible();
  70  |     const tourCards = page.locator('.tour-card');
  71  |     await expect(tourCards).toHaveCount(6);
  72  | 
  73  |     const tourNames = [
  74  |       'Ruta de los Moai',
  75  |       'Atardecer en Tahai',
  76  |       'Ceremonia Ancestral',
  77  |       'Aventura Marina',
  78  |       'Cabalgata al Atardecer',
  79  |       'Cena Típica Rapa Nui',
  80  |     ];
  81  |     for (const name of tourNames) {
  82  |       await expect(page.locator('.tour-card', { hasText: name })).toBeVisible();
  83  |     }
  84  |   });
  85  | 
  86  |   test('should display cabañas section with 2 options', async ({ page }) => {
  87  |     await expect(page.locator('#cabanas')).toBeVisible();
  88  |     const cabanaCards = page.locator('.cabana-card');
  89  |     await expect(cabanaCards).toHaveCount(2);
  90  | 
  91  |     await expect(cabanaCards.first()).toContainText('Cabañas Hare Nui');
  92  |     await expect(cabanaCards.nth(1)).toContainText('Villa Mana Rapa Nui');
  93  |   });
  94  | 
  95  |   test('should display gallery with 8 images', async ({ page }) => {
  96  |     await expect(page.locator('#gallery')).toBeVisible();
  97  |     const galleryImages = page.locator('.gallery-grid img');
  98  |     await expect(galleryImages).toHaveCount(8);
  99  |   });
  100 | 
  101 |   test('should display testimonials', async ({ page }) => {
  102 |     await expect(page.locator('#testimonials')).toBeVisible();
  103 |     const testimonialCards = page.locator('.testimonial-card');
  104 |     await expect(testimonialCards).toHaveCount(2);
  105 |     await expect(testimonialCards.first()).toContainText('María & Pablo');
  106 |     await expect(testimonialCards.nth(1)).toContainText('Sarah & James');
  107 |   });
  108 | 
  109 |   test('should have working portal access link', async ({ page }) => {
  110 |     const portalLink = page.locator('.portal-btn');
  111 |     await expect(portalLink).toBeVisible();
  112 |     await expect(portalLink).toHaveAttribute('href', 'portal.html');
  113 |     await expect(portalLink).toContainText('Ingresar al Portal de Clientes');
  114 |   });
  115 | 
  116 |   test('should display contact form with all fields', async ({ page }) => {
  117 |     await expect(page.locator('#contact')).toBeVisible();
  118 | 
  119 |     const form = page.locator('#contactForm');
  120 |     await expect(form).toBeVisible();
  121 | 
  122 |     await expect(form.locator('input[placeholder="Nombre"]')).toBeVisible();
  123 |     await expect(form.locator('input[placeholder="Email"]')).toBeVisible();
  124 |     await expect(form.locator('input[placeholder="País de origen"]')).toBeVisible();
  125 |     await expect(form.locator('select')).toBeVisible();
  126 |     await expect(form.locator('input[placeholder="N° aproximado de invitados"]')).toBeVisible();
  127 |     await expect(form.locator('textarea')).toBeVisible();
  128 |     await expect(form.locator('button[type="submit"]')).toBeVisible();
  129 |   });
  130 | 
  131 |   test('should show success feedback on form submit', async ({ page }) => {
  132 |     const form = page.locator('#contactForm');
  133 |     await form.locator('input[placeholder="Nombre"]').fill('Test User');
  134 |     await form.locator('input[placeholder="Email"]').fill('test@example.com');
  135 |     await form.locator('input[placeholder="País de origen"]').fill('Chile');
  136 |     await form.locator('select').selectOption('Boda / Ceremonia');
  137 |     await form.locator('input[placeholder="N° aproximado de invitados"]').fill('50');
  138 |     await form.locator('textarea').fill('Mensaje de prueba');
  139 | 
  140 |     await form.locator('button[type="submit"]').click();
  141 | 
  142 |     const btn = form.locator('button[type="submit"]');
  143 |     await expect(btn).toHaveText('Mensaje Enviado ✓');
  144 |     await expect(btn).toHaveCSS('background-color', 'rgb(42, 125, 122)'); // teal
  145 |   });
  146 | 
  147 |   test('should have functional mobile menu', async ({ page }) => {
  148 |     await page.setViewportSize({ width: 375, height: 667 });
  149 |     await page.reload();
```