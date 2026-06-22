# Desarrollo local

Guía para levantar D Racing Pro en una máquina de desarrollo, incluyendo el
acceso de desarrollo (sin Google) y el flujo de agendamiento.

## Requisitos

- Node.js 20.19+
- pnpm 10
- Docker con Compose (para PostgreSQL)

## Puesta en marcha

```bash
pnpm install
pnpm db:up        # levanta PostgreSQL en Docker
pnpm db:migrate   # aplica migraciones y datos de referencia
pnpm dev          # construye paquetes, libera puertos y arranca front + API
```

Al terminar:

| Servicio   | URL                              |
| ---------- | -------------------------------- |
| Frontend   | <http://localhost:5180>          |
| API        | <http://localhost:3001/api>      |
| PostgreSQL | `localhost:55432` (vía Docker)   |

`pnpm dev` ejecuta `dev:free-ports` (`fuser -k 5180/tcp 3001/tcp`) antes de
arrancar. Esto evita el error `EADDRINUSE: address already in use` cuando quedó
una instancia previa ocupando el puerto.

> Los puertos `5180`/`3001` y la base en `55432` se eligieron para no chocar con
> otros proyectos que puedan correr en `5173`/`3000`/`5432` en la misma máquina.
> Se definen como overrides locales en el script `dev` de `apps/backend` y en
> `vite.config.ts`. La configuración canónica del backend sigue leyéndose de las
> variables de entorno (ver `apps/backend/src/config/env.ts`).

## Acceso de desarrollo (sin Google)

La aplicación protege el área `/app` (incluido el calendario) detrás del login de
Google. Para no depender de credenciales OAuth en local, el backend habilita un
acceso de desarrollo cuando `NODE_ENV !== 'production'`:

- `POST /v1/auth/dev-login` crea una sesión para un usuario sintético
  (`dev@dracing.local`).
- `GET /v1/auth/google` — cuando no hay credenciales de Google configuradas —
  inicia esa misma sesión de desarrollo y redirige al destino solicitado.

Por eso el botón **«Agendar una cita»** funciona de inmediato: abre el modal de
agendamiento, inicia sesión de forma transparente y registra una **Honda NAVI**
de prueba (el taller atiende solo ese modelo, por lo que no se pide elegir moto).

Este acceso se desactiva automáticamente en producción (`allowDevLogin` en
`AuthRoutesOptions`).

## Flujo de agendamiento

El componente `BookingModal` (`apps/frontend/src/features/appointments`) abre el
agendamiento como una capa sobre la landing, sin navegar a otra página:

1. Servicios disponibles (con precio y duración).
2. Calendario y bloques de **45 minutos** entre **09:30 y 18:00**, excluyendo la
   colación de **14:00 a 15:00** (zona horaria `America/Santiago`).
3. Confirmación de la cita.

La lógica de fechas/horarios compartida vive en
`apps/frontend/src/features/appointments/appointment-helpers.ts`.

## Solución de problemas

| Síntoma                                              | Causa probable                                              | Solución                                                                 |
| --------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| `EADDRINUSE` / «Port 5180 is already in use»        | Otra instancia del dev sigue corriendo                     | `pnpm dev` ya libera los puertos; o manualmente `fuser -k 5180/tcp 3001/tcp` |
| `password authentication failed for user "dracing"` | `DATABASE_URL` apunta a un PostgreSQL incorrecto           | Verificar que la base de Docker esté en `55432` (`docker ps`)            |
| `Cannot GET /v1/...` (formato Express)              | El puerto lo ocupa otra app (no este backend Fastify)      | Liberar el puerto y reiniciar `pnpm dev`                                  |

## Notas para producción

- Configurar `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_REDIRECT_URI`.
- `NODE_ENV=production` deshabilita el acceso de desarrollo.
- `COOKIE_SECURE=true` y URLs HTTPS en `API_ORIGIN` / `APP_ORIGIN`.
