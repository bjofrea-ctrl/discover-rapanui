# Discover Rapa Nui — Plan Integral: Negocio + Backend "Nivel Dios"

> Copia de resguardo del plan de trabajo (negocio + arquitectura técnica) generado durante la sesión de desarrollo con Claude. Se guarda acá, dentro del repo, para que no se pierda si se borra el entorno de trabajo temporal donde se originó. Última actualización: 16 de julio de 2026.

## Contexto

`discover-rapanui` es hoy una landing estática (HTML/CSS/JS, sin build tool) que actúa como "puerta publicitaria" para una empresa de bodas destino y experiencias premium en Rapa Nui (Isla de Pascua). El diseño visual ya está aprobado por el cliente y no se toca. El sitio no está desplegado todavía — es el momento ideal para resolver dos huecos estructurales antes de salir a producción:

1. **No hay negocio digitalizado detrás del diseño**: el formulario de contacto no guarda nada (solo simula el envío), no hay pipeline de leads, no hay portal de cliente real — `portal.html` usa una contraseña compartida hardcodeada en el JS (`RAPANUI2025`) que cualquiera puede leer en el código fuente o saltarse desde la consola del navegador. Todos los "clientes" verían el mismo contenido genérico.
2. **No hay estrategia comercial explícita** que conecte el diseño bonito con captación, conversión y retención de clientes reales en un mercado de nicho (bodas destino de lujo) con competidores locales (operadores de ceremonias ancestrales, hoteles con eventos) e internacionales (plataformas de bodas destino en Hawái, Polinesia Francesa, etc.).

El pedido del dueño del negocio es elevar el proyecto a "nivel dios": un backend real con panel de administración total para el operador, y un portal individual y autenticado para cada cliente — todo esto en paralelo con un plan de negocio y marketing accionable, investigado con datos de mercado reales (2026).

Decisiones ya validadas con el usuario:
- Backend **a medida** (no comprar HoneyBook/Dubsado/Aisle Planner), pero usando esas herramientas como benchmark de funcionalidad.
- Equipo **solo/pequeño, sin developer fijo** → priorizar servicios gestionados (BaaS) de bajo mantenimiento sobre infraestructura propia.
- Plan de negocio y plan técnico **con el mismo peso**, ejecutados en fases paralelas.
- Mantener el diseño visual actual (paleta carbón/terracota/oro/arena, Playfair Display + Plus Jakarta Sans).

---

## Parte A — Plan de Negocio y Crecimiento

### A.1 Diagnóstico de mercado (investigación 2026)

- El mercado global de bodas destino se proyecta en **USD 16.2B en 2026**, creciendo a ~5-15% CAGR según la fuente, lo que confirma categoría en expansión, no de nicho decreciente.
- Tendencia dominante 2026: **"Micro-Luxe"** — parejas acotan la lista de invitados (30-50 personas) para redirigir presupuesto a una experiencia ultra-premium por invitado, no para ahorrar. Esto calza perfecto con el plan "Elopement Íntimo" ya existente: hay que posicionarlo como *premium*, no como *económico*.
- Tendencia de **"experiencia multi-día"**: las parejas ya no quieren un solo día de 12 horas, sino una experiencia extendida (llegada, actividades, ceremonia, despedida). Rapa Nui, por su aislamiento geográfico (vuelos limitados, estadías de 4-7 días mínimo), **ya fuerza naturalmente este formato** — es una ventaja competitiva que hoy no se comunica explícitamente en la landing.
- Precios de referencia:
  - Elopement internacional: USD 3,000–7,000+ (regiones comparables: Europa desde USD 1,400; EE.UU. desde USD 1,925).
  - Bodas destino completas: USD 10,000–25,000+ en el segmento premium.
  - Costos locales en Rapa Nui: alojamiento boutique CLP 50,000–120,000/noche/persona; tours guiados CLP 100,000–160,000; entrada al parque ~CLP 80,000.
  - **Conclusión de pricing**: Discover Rapa Nui puede posicionar el Elopement Íntimo en el rango **USD 4,000–7,000** y la Boda Completa en **USD 12,000–20,000+** (según invitados), publicando *rangos* (no cifras exactas) en la web para calificar leads sin perder la cotización personalizada.
- Competencia identificada: operadores de ceremonias ancestrales en la isla (ej. servicios tipo "Amu'a", "Iorana Rapa Nui") y hoteles con salón de eventos (ej. Altiplanico). Ninguno de los que se pudo revisar tiene un portal de cliente digital — **es un diferenciador real y defendible** para Discover Rapa Nui ser el único operador con un portal de seguimiento post-venta profesional.
- Regulación clave: el Parque Nacional Rapa Nui es administrado por la comunidad indígena **Ma'u Henua** desde 2018; toda ceremonia en sitios patrimoniales (Tongariki, Orongo, Anakena) requiere guía acreditado y permiso gestionado. Esto ya aparece en `portal.html` ("Permiso Mau Henua... gestionado por nosotros") — hay que convertirlo en un mensaje de marketing explícito ("turismo respetuoso, gestión de permisos incluida"), no solo un ítem de checklist interno.

### A.2 Posicionamiento recomendado

**"El único operador de bodas en Rapa Nui con seguimiento digital de principio a fin."** — La propuesta de valor no es solo "boda bonita en isla remota" (todos los competidores dicen eso), sino **tranquilidad operativa**: portal en tiempo real, cronograma con estado real de avance, comunicación centralizada, gestión de permisos con la comunidad Rapa Nui incluida y transparente.

Mensajes clave a reforzar en la landing y el portal:
- Autenticidad cultural con respeto (partnership visible con Ma'u Henua / comunidad rapanui, no apropiación).
- Logística "sin estrés" para un destino que es objetivamente complejo de coordinar (vuelos limitados, pocos proveedores, alta demanda estacional).
- Exclusividad ("Micro-Luxe"): pocos eventos por temporada, atención dedicada — nunca vender volumen.

### A.3 Ideas de crecimiento (priorizadas por impacto/esfuerzo)

**Corto plazo (0–3 meses, bajo esfuerzo):**
1. **Formulario de contacto funcional** (ver Parte B) con calificación de lead automática por presupuesto/fecha/tamaño de evento — deja de perder leads que hoy se van a `console.log` de la nada.
2. **Rangos de precio públicos** en los planes (según A.1) para filtrar leads no calificados antes de que el equipo pierda tiempo cotizando a quien no puede pagar el servicio.
3. **CTA de WhatsApp Business** directo (botón flotante) — en destinos remotos, WhatsApp convierte mejor que formularios de email para parejas internacionales. Integrable de forma económica (Meta cobra por conversación, hay BSPs desde bajo costo) y conectable al futuro backend como canal de leads adicional.
4. **Reposicionar contenido de Instagram** (ya hay tooling propio: `analisis/scrape_instagram.mjs` + `analisis/carruseles/generate.py`) hacia contenido de "proceso" (bts de coordinación, testimonios en video, el paso a paso del portal) en vez de solo fotos bonitas — la investigación 2026 confirma que "posts con contexto convierten más que estética sola". Reels priorizados por el algoritmo.

**Mediano plazo (3–9 meses):**
5. **Programa de referidos/afiliados con fotógrafos y proveedores locales** (comisión 10–20%) — patrón validado en la industria: fotógrafos que mantienen relación activa con planners ven +65% en bookings de alta gama. Ya existe la sección "Proveedores Aliados" en `portal.html`; formalizarla como programa con incentivos reales.
6. **Paquete "experiencia multi-día"** explícito (4-7 días, no solo "el día de la boda") con actividades incluidas del catálogo de tours ya existente — empaquetar lo que ya se ofrece a la carta como una narrativa de "viaje de bodas completo", alineado con la tendencia dominante 2026.
7. **Portal de cliente como herramienta de venta, no solo post-venta**: dar acceso a una vista previa/demo del portal ANTES de contratar (a leads calificados) como diferenciador competitivo tangible en la conversación de ventas — nadie más en la isla lo tiene.
8. **SEO local + contenido evergreen** en español e inglés (la mayoría de tráfico de bodas destino busca en inglés): páginas dedicadas por tipo de ceremonia, guías de documentos, FAQ de logística — contenido que además reduce la carga operativa (menos preguntas repetidas por WhatsApp).

**Largo plazo (9+ meses):**
9. **Expandir el CRM interno a producto**: si el portal a medida funciona bien, podría ofrecerse como servicio de "planificador digital" a otros operadores turísticos de la isla (línea de ingresos B2B secundaria) — evaluar solo después de validar internamente.
10. **Certificación/alianza formal con Ma'u Henua** como sello de turismo responsable, comunicado activamente como ventaja competitiva y de marca.

### A.4 Métricas de éxito

- Tasa de conversión lead → cotización → contrato (hoy: no medible, no hay datos).
- Costo de adquisición por canal (Instagram orgánico vs. WhatsApp vs. referidos).
- Tiempo de respuesta a leads (objetivo: <24h, automatizable con notificación del backend).
- % de clientes que usan el portal activamente (proxy de percepción de valor/diferenciación).

### A.5 Instrumentación del funnel y SLA de respuesta

El portal no debe tratarse como "área privada" sino como argumento de venta — se puede mostrar en demo a leads calificados antes de contratar, posicionado como un **"luxury planning workspace"** (no un simple "portal de cliente"), reforzando el diferenciador del ítem A.3.7.

Funnel comercial con 5 etapas nombradas, ya soportadas técnicamente por los `status` existentes:

1. Lead recibido (`leads.status = 'nuevo'`)
2. Lead respondido (`leads.status = 'contactado'`)
3. Cotización enviada (`leads.status = 'cotizado'`)
4. Contrato firmado (`leads.status = 'ganado'` → `events.status = 'contratado'`)
5. Evento activo (`events.status = 'planificacion'`/`'completado'`)

Falta solo visualizar esto como embudo en el admin (candidato a Fase 3/4 del dashboard). Junto con esto, definir y **comunicar activamente** un SLA de respuesta a leads (ej. "respondemos en menos de 24h") como parte de la propuesta de valor, no solo como métrica interna a medir pasivamente.

---

## Parte B — Backend y Portal "Nivel Dios" (arquitectura técnica)

### B.1 Puntos confirmados en el código actual (por qué hay que actuar)

- `frontend/index.html` (form de contacto): los inputs no tenían atributo `name` — se agregaron.
- `frontend/assets/js/main.js`: el submit solo hacía `preventDefault()` + `setTimeout` simulando éxito — reemplazado por backend real.
- `frontend/assets/js/portal.js`: tenía una contraseña `RAPANUI2025` hardcodeada en texto plano, validada 100% en cliente — reemplazada por autenticación real.
- `frontend/portal.html`: todo el contenido era HTML estático — ahora es dinámico y personalizado por cliente.
- El proyecto **no usa build tool** (no hay `package.json` en `frontend/`, todo se sirve directo). Esta es una restricción de diseño real que se respetó en toda la implementación.

### B.2 Stack elegido: Supabase + JS vanilla (sin framework, sin build step)

**Decisión: Supabase (Postgres + Auth + Storage + Edge Functions) + JavaScript vanilla vía `<script type="module">` importando `supabase-js` desde CDN (`esm.sh`) + Resend para emails, hosteado en Cloudflare Pages o Netlify.**

Por qué **no** introducir Next.js/React en el MVP: el sitio ya es HTML/CSS/JS puro sin pipeline de build; meter un framework implica Node/npm, paso de build, gestión de env vars server/cliente — overhead operativo innecesario para un equipo sin developer fijo, cuando Supabase ya resuelve toda la capa de backend.

Por qué **Supabase** y no Firebase/Pocketbase/Appwrite/InsForge:
- Modelo **relacional (Postgres)** calza naturalmente con "cliente → evento → hitos → checklist → documentos".
- **Row Level Security de Postgres** da aislamiento por cliente con policies SQL legibles y auditables.
- **Supabase Studio** sirve como panel admin funcional desde el día 1 sin escribir una línea de UI — clave dado que no hay developer fijo.
- **Edge Functions** en plan gratis permiten llamadas salientes sin necesitar upgrade pagado.
- 100% gestionado, sin servidores ni backups que mantener a mano.
- Madurez y ecosistema muy superiores a alternativas más nuevas evaluadas (ej. InsForge, un BaaS "agent-native" interesante para una capa de IA a futuro, pero no para reemplazar el core transaccional ya construido — ver nota de evaluación más abajo).

⚠️ **Advertencia operativa**: en el plan gratis, un proyecto Supabase se **pausa tras 7 días de inactividad**. Antes de dar acceso a clientes reales hay que subir a **Supabase Pro (US$25/mes)**.

### B.3 Modelo de datos (Postgres, RLS en todas las tablas)

- **`profiles`**: `role` ('admin' | 'client'), `full_name`.
- **`clients`**: la pareja/cuenta — `auth_user_id`, datos de contacto, `internal_notes` (solo admin).
- **`events`**: la boda en sí — `client_id`, `event_type`, `ceremony_type`, `event_date`, `status`, `coordinator_name`, `budget_amount`, `budget_currency`.
- **`leads`**: pipeline de pre-venta desde el formulario.
- **`event_milestones`**: cronograma real por evento.
- **`checklist_items`**: documentos + checklist de viaje por evento, persistente.
- **`vendor_contacts`**: proveedores asignados por evento + contactos globales.
- **`event_services`**: actividades/servicios incluidos (ceremonia ancestral/civil, arriendo de casa, restaurant, cena, cóctel, tour, etc.) con costo y cantidad.
- **`documents`**: metadata de archivos en Supabase Storage.
- **`messages`**: mensajería coordinador↔cliente por evento.
- **`milestone_templates`/`checklist_templates`**: catálogo reusable.
- **`finance_transactions`/`finance_imports`**: contabilidad de la empresa (admin-only).

**Aislamiento multi-cliente**: policy RLS estándar reutilizada en las tablas dependientes de `event_id`:
```sql
using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  or event_id in (
    select e.id from events e join clients c on c.id = e.client_id
    where c.auth_user_id = auth.uid()
  )
)
```
Función RPC `toggle_checklist_item(item_id, checked)` con `SECURITY DEFINER` para que el cliente marque checklist sin poder alterar `label`/`category` vía API REST.

### B.4 Autenticación

**Supabase Auth con Magic Link** (`signInWithOtp`), sin contraseñas.
- Auto-registro deshabilitado: solo el admin crea cuentas de cliente vía Edge Function `invite-client`.
- `portal.js` es un guard de sesión puro (`getSession`/`onAuthStateChange`).
- `portal-data.js` consulta los datos del cliente autenticado (RLS filtra automático) y renderiza.

### B.5 Panel admin "nivel dios"

- **Fase 0**: Supabase Studio como panel admin (sin código de UI).
- **Fase 1** *(implementada)*: Mini panel custom vanilla JS en `frontend/admin/` — pipeline de leads, conversión a cliente, editor de evento completo.
- **Fase 2** *(implementada)*: Mensajería, plantillas reutilizables, documentos, contabilidad.
- **Fase 3** *(futuro)*: dashboard más rico, solo si el volumen lo justifica.

### B.6 Formulario de contacto → backend real

Edge Function `submit-lead`: valida campos server-side, honeypot anti-spam, inserta en `leads`, notifica por email vía Resend.

### B.7 Costo mensual estimado (USD)

| Ítem | Desarrollo/pruebas | Producción con clientes reales |
|---|---|---|
| Supabase | $0 (Free) | **$25/mes (Pro)** |
| Resend | $0 | $0 |
| Hosting (Cloudflare Pages/Netlify) | $0 | $0 |
| Dominio | ~$1/mes | ~$1/mes |
| **Total** | **~$0-1/mes** | **~$26-30/mes** |

Costos futuros opcionales: WhatsApp Business API, Stripe.

---

## Parte C — Plan de Ejecución Integrado (fases en paralelo)

| Fase | Negocio/Marketing | Backend/Técnico |
|---|---|---|
| **Fase 0** | Rangos de precio públicos; mensajes de posicionamiento | Proyecto Supabase + schema; `submit-lead` + Resend; magic link; deploy |
| **Fase 1 — MVP** | Botón WhatsApp; contenido Instagram "de proceso" | Modelo de datos completo + RLS; portal con datos reales; admin Fase 1 |
| **Fase 2** | Referidos con proveedores; "experiencia multi-día"; SEO bilingüe | Mensajería; plantillas reutilizables |
| **Fase 3** (futuro) | Alianza Ma'u Henua; línea B2B | Dashboard más rico; pagos (Stripe); WhatsApp Business API; evaluar InsForge como capa de IA; backoffice analítico de proveedores (márgenes, tiempos, performance) |

---

## Parte D — Bugs visuales corregidos

1. **`mix-blend-mode: difference` en `nav`**: rompía el menú mobile (quedaba transparente/ilegible) y volvía impredecibles los colores de marca sobre el hero (botón se veía magenta). Reemplazado por un scrim de degradado oscuro fijo.
2. **Nav fijo tapaba títulos de sección** al navegar: faltaba `scroll-padding-top`. Agregado.
3. **Imagen con marca de agua** (`gallery8.jpg`, un moai con texto "This is RAPA..." superpuesto) usada como foto real en la galería y en "Villa Mana Rapa Nui": reemplazada reasignando imágenes ya existentes en el repo (`gallery1.jpg`, `hero2.jpg`).
4. **Bug adicional descubierto al arreglar el #1**: el botón ✕ para cerrar el menú mobile quedaba tapado por el overlay y no se podía tocar — corregido con z-index.

---

## Parte E — Presupuesto, servicios incluidos y contabilidad *(implementado)*

- **Presupuesto por evento**: `events.budget_amount`/`budget_currency`, editable desde el admin, comparado contra el costo total de servicios.
- **Servicios/actividades incluidas**: tabla `event_services` con los tipos pedidos (ceremonia ancestral, civil, arriendo de casa, restaurant, cena, cóctel, tour, etc.), visible también en el portal del cliente.
- **Contabilidad de la empresa** (admin-only): `finance_transactions`/`finance_imports`, flujo de caja mensual, EERR por categoría/rango, importación de Excel con vista previa y trazabilidad por `import_batch_id`.

---

## Parte F — Funcionalidades adicionales implementadas (ronda posterior)

- **Mensajería** coordinador↔cliente completa (admin y portal), sobre la tabla `messages` ya existente.
- **Subida de documentos** desde el admin al bucket `event-documents`.
- **Gestión de plantillas** reutilizables (`milestone_templates`/`checklist_templates`) + botón "Aplicar plantillas" en el editor de evento.
- **Botón de WhatsApp flotante** en la landing (número placeholder, marcado como `TODO`).
- **Rangos de precio públicos** en los planes de la landing.

---

## Nota de evaluación: InsForge vs. Supabase

Se investigó InsForge (BaaS open-source "agent-native": Postgres, Auth, Storage, Realtime, Edge Functions, Sites, Compute, y un Model Gateway de IA sobre OpenRouter, administrable vía MCP/CLI por un agente de IA) como alternativa. Conclusión:

- **Precio prácticamente idéntico** a Supabase en los tiers relevantes — no es un diferenciador de costo.
- **RLS + Postgres + JWT**: mismo paradigma conceptual que Supabase, pero con SDK propio (`@insforge/sdk`, no compatible como reemplazo directo de `supabase-js`) — migrar implicaría reescribir todo el código ya construido y verificado, no solo cambiar credenciales.
- **Plataforma más nueva y con menor trayectoria** que Supabase (algunas piezas, como "Compute", en preview privado).
- **Decisión**: no migrar el core ya construido. Sí evaluar InsForge más adelante (Fase 3) como capa adicional específica de IA, sin exponer los datos transaccionales críticos (auth, documentos, pagos) a una plataforma menos probada. La razón central: usar InsForge solo para IA es una feature opcional que puede fallar sin tumbar el negocio; usar InsForge para todo apuesta la operación completa a una plataforma con mucho menos track record.
- **Actualización**: el usuario ya creó cuentas reales de Supabase e InsForge. Esto no cambia la decisión de arquitectura — elimina fricción de setup para cuando se llegue a Fase 3, pero no adelanta la secuencia (operación real primero, IA después).

Casos de uso de IA (Fase 3, vía InsForge Model Gateway) priorizados por valor/riesgo:
1. **Concierge en el portal**: responde preguntas frecuentes sobre planes, documentos, tiempos, tours y logística.
2. **Triage de leads**: clasifica presupuesto, idioma, urgencia, tipo de evento y probabilidad de cierre.
3. **Búsqueda semántica** sobre contenido comercial, testimonios, FAQs y material de Instagram (pgvector + embeddings).
4. **Copiloto interno para el admin** (distinto del concierge de cara al cliente): ayuda a redactar respuestas a leads, proponer itinerarios y sugerir próximos pasos por evento — acelera al coordinador sin tocar procesos críticos financieros.

---

## Riesgos a evitar

Los principales riesgos de este proyecto no son técnicos, sino estratégicos/de disciplina de ejecución:

- **Sobreingeniería temprana**: agregar demasiadas piezas (IA, integraciones, plataformas nuevas) antes de tener operación real, tráfico y datos.
- **Tratar el portal como módulo secundario** en vez de argumento de venta central — es parte del posicionamiento premium, no solo un "área privada" técnica.
- **Meter IA demasiado pronto**, sin tráfico ni proceso comercial definido — primero revenue y operación, después búsqueda semántica y concierge, recién después automatizaciones más profundas.
- **Competir por precio** en vez de sostener la propuesta boutique/premium — el modelo tiene sentido como operación de pocos eventos por temporada y ticket alto, no de volumen.
- **Comunicar solo estética** (fotos bonitas) y no el verdadero valor diferencial: tranquilidad, claridad, control y experiencia guiada de principio a fin.

---

## Parte I — División de trabajo: OpenCode implementa, Claude Code audita

Todo lo que dependía de código ya está construido y mergeado a `main` (schema con RLS, Edge Functions, admin, portal, presupuesto/servicios/contabilidad, mensajería/documentos/plantillas, fixes visuales). Lo que queda son pasos de **cuentas reales y credenciales** (ver "Pendientes" abajo) que este entorno no puede ejecutar por no tener acceso a las cuentas del usuario. Esa parte la ejecuta **OpenCode**, corriendo en el Mac del usuario con acceso a browser/terminal/CLI y credenciales reales. El rol de Claude Code pasa a **auditor**: revisar cada cambio que OpenCode empuje al repo contra los patrones de seguridad ya establecidos y el checklist de verificación end-to-end.

**Tareas para OpenCode (orden secuencial):**

| # | Tarea | Entregable verificable |
|---|---|---|
| 1 | Crear proyecto Supabase real | URL + anon key + project ref |
| 2 | Ejecutar migraciones `0001_init.sql` y `0002_budget_services_finance.sql` | Tablas y policies visibles en Table Editor |
| 3 | Habilitar Auth por magic link + redirect URL de `portal.html` | Login de prueba llega el email |
| 4 | Deploy de Edge Functions `submit-lead`/`invite-client` + secrets | `supabase functions list` muestra ambas activas |
| 5 | Cuenta Resend, verificar dominio, generar API key | Email de prueba recibido |
| 6 | Completar `frontend/assets/js/config.js` con credenciales reales (nunca la `service_role key`) | Sitio local sin warning de consola |
| 7 | Probar el flujo completo siguiendo el checklist de "Verificación end-to-end" (abajo) | Cada ítem pasa |
| 8 | Deploy del sitio a Cloudflare Pages o Netlify | URL pública funcionando |
| 9 | Upgrade a Supabase Pro antes del primer cliente real | Sin auto-pausa a 7 días |
| 10 | Reemplazar el placeholder del número de WhatsApp Business | Botón abre chat real |

**Restricciones para OpenCode**: no tocar `style.css` ni la estructura HTML existente; nunca commitear la `service_role key` ni secrets en el repo; no reescribir `0001`/`0002` (migración nueva `0003_...` si hace falta un cambio); no adelantar la Fase 3 de IA/InsForge.

**Rol de auditoría (Claude Code)**: tras cada bloque de tareas, revisar el diff en `main` (secrets expuestos, cambios no autorizados a RLS/migraciones/diseño), verificar estáticamente y con Playwright cuando el sitio esté público, marcar en este documento qué ítems de "Pendientes" quedaron resueltos, y reportar un resumen con cualquier riesgo encontrado antes de avanzar a la siguiente tarea.

---

## Pendientes (dependen del usuario, no de código)

1. Crear proyecto Supabase real y ejecutar las migraciones (`backend/SETUP.md`).
2. Cuenta Resend + configurar secrets de las Edge Functions.
3. Completar `frontend/assets/js/config.js` con credenciales reales.
4. Deploy del sitio a Cloudflare Pages o Netlify (hoy no está publicado en internet).
5. Número real de WhatsApp Business (hoy placeholder marcado con `TODO`).
6. Subir a Supabase Pro (US$25/mes) antes de invitar al primer cliente real.
7. Decisiones de negocio no técnicas: programa de referidos, contenido SEO bilingüe, alianza formal con Ma'u Henua.

## Verificación end-to-end (una vez conectado el backend real)

- Formulario de contacto → aparece en `leads` + llega email.
- Convertir lead en cliente → llega invitación por magic link.
- Login en el portal → cronograma/checklist/documentos/servicios/mensajes del evento correcto.
- Checklist marcado en el portal persiste y se refleja en el admin.
- Aislamiento RLS entre dos clientes de prueba.
- Presupuesto vs. servicios calcula bien; Excel de contabilidad importa correctamente.
- Cuenta `role='client'` no puede ver leads, eventos de otros clientes, ni la sección de Contabilidad.
