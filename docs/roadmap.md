# Roadmap

## Fase 1 — Configuración

**Estado: completada el 20 de junio de 2026.**

- Inicializar workspace pnpm, TypeScript estricto, Vite, Fastify y Tailwind.
- Reglas compartidas de lint/format, hooks y convenciones de commits.
- Compose local con PostgreSQL, healthchecks y migraciones.
- Pipeline base de lint, typecheck, unit tests y build.

**Salida:** un cambio en frontend/API compila y se prueba igual localmente y en CI.

## Fase 2 — Auth y base de datos

**Estado: completada técnicamente el 20 de junio de 2026. La prueba contra Google
requiere credenciales OAuth del propietario del proyecto.**

- Implementar migraciones, seed idempotente de servicios/bahías/horarios.
- Repositorios, transacciones y pruebas de invariantes de agenda.
- OAuth Google + PKCE, sesiones, logout, CSRF y guards de rol/propiedad.
- CRUD de motos y catálogo de servicios.

**Salida:** un cliente inicia/cierra sesión, administra sus NAVI y ninguna carrera
puede producir reservas incompatibles.

## Fase 3 — Panel cliente y admin

**Estado: en progreso desde el 20 de junio de 2026. Panel cliente, navegación,
motos, catálogo, agendamiento y operación base del panel administrador
implementados. La edición de catálogo, horarios y excepciones también está
operativa. Timeline cliente y novedades dentro de la aplicación también están
implementados. La cancelación de citas por el cliente ya aplica propiedad,
transiciones, auditoría y validación E2E en móvil. La agenda administrativa ya
ofrece vistas diaria y semanal con rangos calculados en la zona del taller.
La reasignación de bahía también está protegida contra solapamientos y queda
registrada en auditoría. Queda pendiente la automatización E2E durable.**

- Cliente: onboarding, motos, disponibilidad, reserva, cancelación e historial.
- Cliente: timeline del estado de la moto y notificaciones.
- Admin: agenda diaria/semanal, confirmación, reasignación y estados.
- Admin: catálogo, horarios, excepciones y actualizaciones de la moto.
- Accesibilidad, responsive, pruebas E2E y observabilidad funcional.

**Salida:** flujo completo desde reserva hasta entrega, probado por rol en móvil y
desktop.

## Fase 4 — Despliegue y CI/CD

- Dockerfiles endurecidos, registro de imágenes y entornos staging/producción.
- Migraciones previas a despliegue, backups, rollback y smoke tests.
- Logs, métricas, alertas, trazas y política de retención.
- Revisión de seguridad, carga de agenda y recuperación ante fallos.

**Salida:** despliegue repetible por SHA, observable y reversible, con restauración
de base de datos ensayada.

## Orden recomendado dentro del MVP

1. Contratos y migración inicial.
2. Auth/sesiones y autorización.
3. Catálogo, motos y motor de disponibilidad.
4. Crear/cancelar cita con control de concurrencia.
5. Operación admin y timeline.
6. Notificaciones y refinamiento visual.

## Estado actual y plan de avance (junio 2026)

Las plataformas de cliente y administrador están construidas y operativas con un
acceso de desarrollo. El landing fue rediseñado (TopBar, hero con carrusel,
testimonios, footer informativo y páginas legales). Se endureció la seguridad del
backend (helmet, rate-limit) y se optimizó el bundle (code-splitting). Próximos
hitos, en orden de prioridad:

1. **Autenticación real con Google (en curso).** El flujo OAuth (PKCE, nonce,
   state, sesiones) está implementado; falta configurar credenciales reales
   (`GOOGLE_*` en `.env`), registrar la URI de redirección en Google Cloud y
   verificar el flujo de punta a punta. Google crea solo clientes; el único
   administrador se aprovisiona por comando y contraseña local. El acceso de
   desarrollo queda deshabilitado en producción (`NODE_ENV`).
2. **Plataforma del cliente.** Pulir estados vacíos, carga, errores, responsive y
   accesibilidad en dashboard, reserva, motos, timeline y novedades; onboarding.
3. **Intranet de administrador.** Panel-resumen con métricas (citas del día,
   próximas, por estado) y gestión de clientes/motos desde el admin.
4. **Calidad.** Pruebas E2E durables (Playwright) para login, reserva y operación
   admin; cerrar cobertura.
5. **DevOps / despliegue.** Secretos de producción, pipeline de deploy (frontend,
   API, migraciones), dominio, HTTPS, observabilidad. La protección de la rama
   `main` ya está configurada.
6. **Contenido y legal.** Completar razón social, RUT y correo reales; fotos NAVI
   y logo definitivos.
