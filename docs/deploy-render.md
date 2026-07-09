# Despliegue: backend en Render + frontend en Vercel

## Arquitectura

```text
navegador ──► Vercel (frontend estático + rewrites)
                 ├── /v1/*     ──► Render (dracing-backend)
                 ├── /health/* ──► Render (dracing-backend)
                 └── /*        ──► index.html (SPA)
Render backend ──► Render PostgreSQL (red interna)
```

El frontend llama a la API con rutas relativas y la sesión usa cookies
`SameSite=Lax`, así que el navegador **nunca** habla directo con
`onrender.com`: todo pasa por los rewrites de Vercel
(`apps/frontend/vercel.json`). Eso mantiene la cookie en el dominio de Vercel
(first-party) y evita CORS.

Consecuencia importante: `APP_ORIGIN` **y** `API_ORIGIN` apuntan al dominio de
Vercel. La URL `*.onrender.com` solo se usa dentro de `vercel.json`.

## Pasos

1. **Crear los servicios en Render** con el blueprint (`render.yaml` en la
   raíz): New → Blueprint → seleccionar el repo. Crea `dracing-backend` (web,
   Docker) y `dracing-db` (PostgreSQL). También puede hacerse a mano en el
   dashboard replicando lo que describe `render.yaml` (Dockerfile
   `apps/backend/Dockerfile`, contexto `.`, health check `/health/ready`).
2. **Completar las variables `sync: false`** en el dashboard (tabla abajo).
3. **Aplicar migraciones** (sección siguiente) — sin esto `/health/ready`
   responde 503 y el deploy no se marca sano.
4. **Actualizar `apps/frontend/vercel.json`** con la URL real del servicio si
   no es `https://dracing-backend.onrender.com`, y redesplegar el frontend.
5. **Google OAuth**: en Google Cloud Console agregar el redirect
   `https://<dominio-vercel>/v1/auth/google/callback` y setear ese mismo valor
   en `GOOGLE_REDIRECT_URI`.
6. **Crear el admin inicial** si aplica: `pnpm --filter @dracing/backend
admin:create` apuntando `DATABASE_URL` a la base de Render (ver abajo cómo
   conectarse desde fuera).

## Variables de entorno del backend

| Variable               | Valor                                                         | Origen    |
| ---------------------- | ------------------------------------------------------------- | --------- |
| `NODE_ENV`             | `production` (desactiva el dev-login)                         | blueprint |
| `COOKIE_SECURE`        | `true` (obligatoria en producción, la valida `config/env.ts`) | blueprint |
| `TZ`                   | `America/Santiago`                                            | blueprint |
| `SESSION_SECRET`       | generada por Render (`generateValue`)                         | blueprint |
| `DATABASE_URL`         | connection string interna de `dracing-db`                     | blueprint |
| `APP_ORIGIN`           | `https://<dominio-vercel>`                                    | manual    |
| `API_ORIGIN`           | `https://<dominio-vercel>` (mismo dominio, ver arquitectura)  | manual    |
| `GOOGLE_CLIENT_ID`     | de Google Cloud Console                                       | manual    |
| `GOOGLE_CLIENT_SECRET` | de Google Cloud Console                                       | manual    |
| `GOOGLE_REDIRECT_URI`  | `https://<dominio-vercel>/v1/auth/google/callback`            | manual    |
| `FLOW_API_BASE`        | sandbox por defecto; `https://www.flow.cl/api` en producción  | blueprint |
| `FLOW_API_KEY`         | credencial Flow (opcional hasta activar pagos)                | manual    |
| `FLOW_SECRET_KEY`      | credencial Flow (opcional hasta activar pagos)                | manual    |

No hace falta setear `PORT`/`HOST`: Render inyecta `PORT` y el backend lo lee.
En el frontend (Vercel) `VITE_API_URL` debe quedar **vacía o sin definir** para
que la landing use rutas relativas a través del proxy.

## Migraciones

Las migraciones son SQL plano en `database/migrations/`, aplicadas por
`packages/database/scripts/migrate.mjs` (Node + `pg`, sin `psql`; misma
semántica idempotente que `infra/docker/run-migrations.sh`). La imagen Docker
incluye script y migraciones.

- **Plan pago**: descomentar `preDeployCommand` en `render.yaml` y quedan
  automáticas en cada deploy.
- **Plan free** (elige una):
  - Shell del servicio en el dashboard:
    `node packages/database/scripts/migrate.mjs`
  - Desde tu máquina, contra la URL **externa** de la base (dashboard →
    dracing-db → External Database URL, agregando tu IP al allowlist):

    ```bash
    DATABASE_URL='<external-url>?sslmode=require' pnpm db:migrate:deploy
    ```

## Verificación post-deploy

```bash
curl https://<servicio>.onrender.com/health/live    # {"status":"ok"}
curl https://<servicio>.onrender.com/health/ready   # {"status":"ok"} si la DB responde
curl https://<dominio-vercel>/health/ready          # lo mismo, vía proxy
```

Luego probar login con Google desde la landing y una reserva completa.

## Limitaciones y notas

- **Free tier**: el servicio se duerme tras 15 min sin tráfico (primer request
  tarda ~1 min) y la base free **expira a los 30 días** si no se pasa a plan
  pago. Los timers internos (reconciliación de pagos Flow y expiración de
  holds) no corren mientras el servicio duerme.
- **IP del cliente / rate limiting**: detrás de Vercel + Render hay dos proxies.
  El default (`TRUSTED_PROXY` sin setear = 1 hop) hace que el rate limit por IP
  vea la IP de egreso de Vercel, agrupando a todos los usuarios. Si el rate
  limiting molesta, setear `TRUSTED_PROXY=2` (con el tradeoff de que un request
  directo a `onrender.com` puede falsear su IP; ver `config/env.ts`).
- Los webhooks de Flow (`urlConfirmation`) también pasan por el dominio de
  Vercel porque se construyen con `API_ORIGIN`.
