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
