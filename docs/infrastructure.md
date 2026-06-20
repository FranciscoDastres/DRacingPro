# Infraestructura y Docker

## Imágenes

### Frontend

Dockerfile multi-stage:

1. `deps`: imagen Node fijada por digest, instalación reproducible con
   `pnpm install --frozen-lockfile`.
2. `build`: compila Vite; solo variables públicas `VITE_*` no sensibles.
3. `runtime`: Nginx/Caddy sin privilegios sirve `/dist`, aplica headers y hace
   proxy de `/api` hacia el backend. Incluye fallback de SPA a `index.html`.

### Backend

Dockerfile multi-stage:

1. Instala dependencias con lockfile.
2. Genera Prisma y compila TypeScript.
3. Construye una salida con dependencias de producción.
4. Runtime Node slim, usuario no root, filesystem de solo lectura, `dumb-init`,
   `NODE_ENV=production` y endpoint `/health`.

Las migraciones se ejecutan como job/contenedor de una sola vez antes de poner la
nueva API en servicio; nunca desde cada réplica al arrancar.

## Compose de desarrollo

Servicios previstos:

```text
frontend :5173  -> API /api
backend  :3000  -> postgres:5432
postgres :5432  -> volumen nombrado
migrate          -> job dependiente de postgres healthy
```

- Bind mounts y hot reload solo en un override de desarrollo.
- Healthchecks reales: `pg_isready` para PostgreSQL y `/health/ready` para API.
- `depends_on` ordena procesos, pero la API además reintenta conexión con backoff.
- `.env.example` documenta nombres; `.env` y credenciales no se versionan.
- La base no publica el puerto en producción.

## Producción y CI/CD

Pipeline por pull request:

1. Instalar con lockfile y caché por hash.
2. Lint, typecheck y pruebas unitarias en paralelo.
3. PostgreSQL efímero: aplicar migraciones y ejecutar integración.
4. Build frontend/API y E2E de los flujos críticos.
5. Escaneo de dependencias, secretos e imágenes.

En rama principal: construir una vez, etiquetar por SHA, publicar las imágenes,
ejecutar backup/migración, desplegar API y frontend, comprobar salud y habilitar
rollback a la imagen anterior. PostgreSQL usa backups automáticos y restauraciones
probadas; assets y aplicación permanecen stateless.

Variables mínimas:

```text
DATABASE_URL
APP_ORIGIN
API_ORIGIN
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
SESSION_SECRET
COOKIE_NAME
TZ=America/Santiago
```
