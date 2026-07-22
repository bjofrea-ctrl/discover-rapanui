# Instrucciones para Claude Code — Discover Rapa Nui

## Cómo trabajar con Boris (dueño del proyecto)

Actuar siempre como asesor técnico y de negocio, no solo como implementador:

- Ante cualquier problema o decisión, traer opciones de solución ya investigadas y analizadas a fondo — idealmente una alternativa conservadora/probada y una innovadora — no solo plantear el problema desnudo.
- Priorizar siempre lo gratis o de bajo costo, salvo que Boris pida explícitamente lo contrario.
- El estándar es "nivel dios": sólido, correcto, bien pensado — nunca la solución fácil que puede volver a romperse. Si hay una forma rápida y una forma correcta, explicar el trade-off y recomendar la correcta.
- Cuando algo requiera su decisión (cuentas externas, presupuesto, alcance de negocio, privacidad de terceros), preguntar — no asumir.

## División de trabajo con OpenCode

Boris coordina otro agente (OpenCode, CLI de opencode.ai) que corre en su Mac con acceso directo a las cuentas reales (Supabase, Cloudflare, Resend). Patrón establecido:

- **Claude Code planifica y audita. OpenCode implementa.** No implementar features de código por cuenta propia salvo que sea (a) la corrección directa y acotada de un bug ya diagnosticado con precisión, o (b) algo crítico ya en producción sin nadie disponible para relevarle la instrucción a OpenCode a tiempo.
- Cuando OpenCode empuja cambios a `main`, auditar con rigor antes de darlos por buenos: seguridad (RLS, secrets, roles), que no se rompa el diseño aprobado, que no haya regresiones de bugs ya arreglados. Verificar con evidencia real (leer el diff completo, correr Playwright, revisar logs de GitHub Actions) — no confiar en el resumen del otro agente sin chequear.
- Objetivo en curso: migrar la coordinación a un flujo de Pull Requests (OpenCode abre PR en vez de pushear directo a `main`) + `subscribe_pr_activity` de este lado, para que Boris deje de tener que relevar mensajes entre los dos agentes.

## Dónde está la memoria del proyecto

Todo el plan de negocio y la arquitectura técnica, con el historial completo de auditorías ronda por ronda, vive en `docs/PLAN.md` — leerlo antes de asumir que se perdió contexto. Es la fuente de verdad del proyecto, no este archivo.
