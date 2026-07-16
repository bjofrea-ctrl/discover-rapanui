# Discover Rapa Nui — Setup del Backend (Fase 0 + Fase 1)

Guía paso a paso para dejar operativo el backend real: leads con notificación por email,
portal de cliente con login por magic link, y panel admin. Todo el código ya está en el
repo (`backend/` y `frontend/`); esto es lo que falta configurar manualmente en las
cuentas externas (Supabase, Resend, hosting).

No requiere instalar nada localmente (ni Supabase CLI ni Docker) — todo se hace desde
los dashboards web.

---

## 1. Crear el proyecto Supabase

1. Crear cuenta en [supabase.com](https://supabase.com) y un nuevo proyecto (elige región cercana, ej. `sa-east-1` São Paulo).
2. Guarda la **contraseña de la base de datos** que te pida (no se usa en este setup, pero consérvala).
3. En **Project Settings → API**, copia:
   - `Project URL`
   - `anon public` key
   - (más adelante, en un paso solo del servidor) `service_role` key — **nunca la pongas en el frontend**.

## 2. Ejecutar la migración SQL

1. Ve a **SQL Editor** en el dashboard de Supabase.
2. Abre `backend/supabase/migrations/0001_init.sql` de este repo, copia todo el contenido, pégalo en el SQL Editor y ejecútalo (▶ Run). Es idempotente, se puede re-ejecutar sin problema.
3. Verifica en **Table Editor** que aparecieron las tablas: `profiles`, `leads`, `clients`, `events`, `event_milestones`, `checklist_items`, `vendor_contacts`, `documents`, `messages`, `milestone_templates`, `checklist_templates`.
4. Verifica en **Storage** que existe el bucket privado `event-documents`.
5. Ejecuta también `backend/supabase/migrations/0002_budget_services_finance.sql` (mismo procedimiento: pegar en el SQL Editor y correr). Agrega presupuesto por evento, el listado de actividades/servicios incluidos (`event_services`) y el módulo de contabilidad (`finance_transactions`, `finance_imports`).
6. Verifica en **Storage** que también existe el bucket privado `finance-imports`.

### Formato del Excel para importar movimientos contables

La sección "Contabilidad" del panel admin importa archivos `.xlsx`/`.xls` con **5 columnas, en este orden, sin encabezado obligatorio** (si hay una fila de encabezado, se descarta sola porque no calza con "ingreso"/"egreso"):

| Columna | Contenido | Ejemplo |
|---|---|---|
| A | Fecha (`YYYY-MM-DD`) | `2026-03-15` |
| B | Tipo (`ingreso` o `egreso`, en minúscula) | `ingreso` |
| C | Categoría (texto libre, ej. `venta_evento`, `arriendo`, `sueldos`, `marketing`, `proveedores`) | `venta_evento` |
| D | Descripción | `Seña boda María & Pablo` |
| E | Monto (número, sin símbolo de moneda) | `1500000` |

Todas las filas se importan en pesos chilenos (CLP). El admin ve una vista previa antes de confirmar, y el archivo original queda guardado en el bucket `finance-imports` para trazabilidad — se puede identificar y deshacer un import completo por su `import_batch_id` en la tabla `finance_transactions`.

## 3. Configurar Auth (magic link, sin registro público)

1. Ve a **Authentication → Providers → Email** y confirma que "Email" está habilitado con "Magic Link" (no se necesita contraseña).
2. Ve a **Authentication → Settings** (o "Sign In / Providers" según la versión del dashboard) y **desactiva "Allow new users to sign up"** — las cuentas de cliente solo las crea el admin desde el panel, nunca por auto-registro.
3. En **Authentication → URL Configuration**, agrega como "Redirect URLs" las URLs donde vas a servir `frontend/portal.html` y `frontend/admin/index.html` (ej. `https://tudominio.cl/portal.html`, `https://tudominio.cl/admin/`, y también `http://localhost:PUERTO/...` si vas a probar en local).

## 4. Crear tu propio usuario admin

1. Ve a **Authentication → Users → Add User** (o "Invite user") y crea tu propio usuario con tu email real.
2. Inicia sesión una vez en `frontend/portal.html` o `frontend/admin/index.html` (una vez desplegado, ver paso 8) para que se cree automáticamente tu fila en `profiles` (lo hace un trigger).
3. Vuelve al **SQL Editor** y ejecútate a ti mismo como admin:
   ```sql
   update public.profiles set role = 'admin' where id = (
     select id from auth.users where email = 'TU_EMAIL_AQUI'
   );
   ```
4. Ahora puedes entrar a `frontend/admin/index.html` con ese email.

## 5. Desplegar las Edge Functions

Necesitas la [Supabase CLI](https://supabase.com/docs/guides/cli) instalada donde vayas a correr estos comandos una sola vez (no hace falta en producción, es solo para el deploy):

```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase functions deploy submit-lead --no-verify-jwt
supabase functions deploy invite-client
```

- `submit-lead` va con `--no-verify-jwt` porque la llama gente anónima desde el formulario público.
- `invite-client` **no** lleva ese flag: valida el JWT del admin dentro de la propia función.

## 6. Configurar secrets de las funciones

En **Project Settings → Edge Functions → Secrets** (o vía CLI: `supabase secrets set ...`), agrega:

```
RESEND_API_KEY=re_xxxxxxxx
NOTIFY_EMAIL_TO=info@discoverrapanui.cl
NOTIFY_EMAIL_FROM=leads@tudominio.cl
```

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase automáticamente en toda Edge Function, no hace falta configurarlos.

## 7. Crear cuenta en Resend (email transaccional)

1. Crear cuenta gratis en [resend.com](https://resend.com) (free tier: 3.000 emails/mes).
2. Verificar tu dominio (o usar el dominio de pruebas de Resend mientras tanto) para poder usarlo como `NOTIFY_EMAIL_FROM`.
3. Generar una API key y ponerla en `RESEND_API_KEY` (paso 6).

## 8. Completar la configuración del frontend

Edita `frontend/assets/js/config.js` y reemplaza los placeholders:

```js
export const CONFIG = {
  SUPABASE_URL: "https://TU-PROYECTO.supabase.co",
  SUPABASE_ANON_KEY: "tu-anon-key-publica",
  SUBMIT_LEAD_FUNCTION_URL: "https://TU-PROYECTO.supabase.co/functions/v1/submit-lead",
  INVITE_CLIENT_FUNCTION_URL: "https://TU-PROYECTO.supabase.co/functions/v1/invite-client",
};
```

La `anon key` es pública y segura de exponer — el acceso real a los datos lo protege RLS, no este archivo. Nunca pongas aquí la `service_role key`.

## 9. Deploy del sitio estático

El sitio sigue siendo HTML/CSS/JS puro (`frontend/`), sin build step. Cualquiera de estas opciones sirve:

- **Cloudflare Pages**: conectar el repo, "root directory" = `frontend`, sin comando de build, directorio de salida = `frontend` (raíz).
- **Netlify**: mismo enfoque, "publish directory" = `frontend`.

Después del primer deploy, vuelve al paso 3 y agrega la URL real de producción a los Redirect URLs de Supabase Auth.

## 10. Subir a Supabase Pro antes de dar acceso a clientes reales

⚠️ En el plan gratis, el proyecto Supabase **se pausa tras 7 días sin actividad**. Bien para desarrollo, pero antes de invitar al primer cliente real, sube a **Pro (US$25/mes)** en Project Settings → Billing, para que el portal no quede inaccesible.

---

## Cómo probar que todo funciona (checklist)

- [ ] Enviar el formulario de contacto en `index.html` → aparece la fila en `leads` (Table Editor) y llega el email a `NOTIFY_EMAIL_TO`.
- [ ] Entrar a `admin/index.html`, loguearte con tu email admin, ver el lead en el pipeline.
- [ ] "Convertir en cliente" sobre ese lead con tu propio email personal (de prueba) → revisa que llega el correo de invitación de Supabase.
- [ ] Aceptar la invitación, entrar a `portal.html` con ese email (magic link) → deberías ver un cronograma vacío (o con lo que hayas cargado desde el editor de evento en el admin).
- [ ] Desde `admin/index.html`, abrir el editor del evento de prueba, agregar un hito de cronograma y un ítem de checklist → refrescar `portal.html` del cliente y confirmar que aparecen.
- [ ] Marcar un ítem del checklist desde `portal.html` → confirmar que el cambio persiste al recargar, y que se refleja en el admin.
- [ ] Crear una segunda cuenta de cliente de prueba y confirmar que **no** ve los datos del primer cliente (aislamiento por RLS).
- [ ] En el editor del evento, guardar un presupuesto y agregar 2-3 servicios (ceremonia, tour, cena, etc.) → confirmar que el resumen "% del presupuesto" se calcula bien y que el cliente los ve en "Qué Incluye tu Experiencia" en `portal.html`.
- [ ] En "Contabilidad", agregar un movimiento manual y confirmar que aparece en Flujo de Caja y en el listado.
- [ ] Subir un Excel de prueba con el formato de 5 columnas documentado arriba → revisar la vista previa, confirmar, y verificar que las filas quedan en `finance_transactions` y el archivo en el bucket `finance-imports`.
- [ ] Seleccionar un rango de meses en EERR y confirmar que los totales por categoría cuadran con lo cargado.
- [ ] Con la cuenta de cliente de prueba (no admin), confirmar que no puede acceder a ninguna sección de Contabilidad (ni siquiera ve el panel admin, por el guard de `role`).
