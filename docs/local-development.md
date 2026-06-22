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

- `POST /v1/auth/dev-login` con `{ "role": "customer" | "admin" }` inicia sesión
  como **Cliente** (`cliente@dracing.local`) o **Administrador**
  (`admin@dracing.local`).
- `GET /v1/auth/google` — cuando no hay credenciales de Google configuradas —
  inicia sesión como Cliente y redirige al destino solicitado.

Por eso el botón **«Agendar una cita»** funciona de inmediato: abre el modal de
agendamiento, inicia sesión de forma transparente y registra una **Honda NAVI**
de prueba (el taller atiende solo ese modelo, por lo que no se pide elegir moto).

Este acceso se desactiva automáticamente en producción (`allowDevLogin` en
`AuthRoutesOptions`).

### Ver como Cliente o Administrador

En desarrollo, un switch discreto abajo a la derecha (`AccountSwitcher`, solo
visible con `import.meta.env.DEV`) permite alternar entre las dos cuentas:

- **Cliente** → vista de cliente (`/app/appointments`), donde se agendan citas.
- **Administrador** → agenda del taller (`/app/admin`), donde se ven y gestionan
  las citas agendadas.

Flujo sugerido para verlo funcionando:

1. **Cliente** → agenda una cita desde el modal.
2. **Administrador** → la cita aparece en la agenda del taller (al refrescar).

En producción no existe este switch: cada cuenta entra con su login de Google
real y su rol correspondiente.

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

## Roles y administrador principal

Hay dos roles: `customer` (cliente) y `admin`. Los clientes agendan y siguen sus
citas; los administradores acceden a la intranet del taller (`/app/admin`) con más
privilegios.

El rol se asigna por correo mediante la variable **`ADMIN_EMAILS`** (lista
separada por comas). Al iniciar sesión con Google, si el correo está en esa lista
se promueve a `admin`; cualquier otro correo queda como `customer`. El primer
correo configurado es el administrador principal del taller. En local se define
en el script `dev` de `apps/backend` (por defecto
`soporte.francisco.meza@gmail.com`).

## Notas para producción

- Configurar `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_REDIRECT_URI`.
- Definir `ADMIN_EMAILS` con el/los correo(s) del administrador principal.
- `NODE_ENV=production` deshabilita el acceso de desarrollo.
- `COOKIE_SECURE=true` y URLs HTTPS en `API_ORIGIN` / `APP_ORIGIN`.
