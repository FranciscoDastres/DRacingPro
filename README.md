# D Racing Pro

Base de arquitectura para la plataforma de gestión de citas de un taller
especializado en Honda NAVI.

## Decisiones base

- Monorepo TypeScript con `pnpm`.
- Frontend SPA: React, Vite, TypeScript y Tailwind CSS.
- API: Node.js, Fastify y TypeScript, organizada por módulos y capas limpias.
- Persistencia: PostgreSQL; Prisma se usará como adaptador, no dentro del dominio.
- Autenticación: Google OAuth 2.0/OIDC mediante Authorization Code + PKCE y sesión
  segura administrada por el backend.
- Despliegues independientes para frontend, API y migraciones.

## Documentación

- [Modelo de datos](docs/data-model.md)
- [Arquitectura y estructura](docs/architecture.md)
- [Seguridad y autenticación](docs/security.md)
- [UI/UX](docs/ui-ux.md)
- [Infraestructura y Docker](docs/infrastructure.md)
- [Roadmap](docs/roadmap.md)

La primera migración propuesta está en
[`database/migrations/001_initial_schema.sql`](database/migrations/001_initial_schema.sql).

## Desarrollo local

Requisitos: Node.js 20.19+, pnpm 10 y Docker con Compose.

```bash
cp .env.example .env
pnpm install
pnpm db:up
pnpm db:migrate
pnpm dev
```

- Frontend: <http://localhost:5173>
- API: <http://localhost:3000/api>
- Liveness: <http://localhost:3000/health/live>
- Readiness: <http://localhost:3000/health/ready>

Si alguno de los puertos está ocupado, se puede cambiar en `.env` mediante
`APP_PORT`, `API_PORT` y `POSTGRES_PORT`.

Para levantar el stack productivo completo mediante imágenes locales:

```bash
pnpm dev:up
```

Comandos de calidad:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Configurar Google OAuth

Crear un cliente OAuth 2.0 de tipo **Web application** en Google Cloud y registrar
esta URI de redirección para el entorno local:

```text
http://localhost:3000/v1/auth/google/callback
```

Después configurar en `.env`:

```text
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/v1/auth/google/callback
SESSION_SECRET=<valor-aleatorio-de-al-menos-32-caracteres>
COOKIE_SECURE=false
```

En producción, las URLs deben ser HTTPS y `COOKIE_SECURE=true`. Si se cambian
`API_PORT` o `APP_PORT`, también se deben actualizar las URLs registradas en
Google y las variables `API_ORIGIN`, `APP_ORIGIN` y `GOOGLE_REDIRECT_URI`.

Endpoints principales implementados:

```text
GET    /v1/auth/google
GET    /v1/auth/google/callback
GET    /v1/auth/me
POST   /v1/auth/logout
GET    /v1/services
GET    /v1/motorcycles
POST   /v1/motorcycles
PATCH  /v1/motorcycles/:id
DELETE /v1/motorcycles/:id
GET    /v1/availability
GET    /v1/appointments
POST   /v1/appointments
PATCH  /v1/appointments/:id/cancel
GET    /v1/appointments/:id/timeline
GET    /v1/notifications
GET    /v1/admin/appointments
PATCH  /v1/admin/appointments/:id/status
PATCH  /v1/admin/appointments/:id/service-bay
GET    /v1/admin/service-bays
POST   /v1/admin/appointments/:id/motorcycle-updates
GET    /v1/admin/workshop/services
POST   /v1/admin/workshop/services
GET    /v1/admin/workshop/hours
POST   /v1/admin/workshop/hours
GET    /v1/admin/workshop/exceptions
POST   /v1/admin/workshop/exceptions
```
