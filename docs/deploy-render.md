# Despliegue: Vercel + Render + Supabase + Cloudinary

## Arquitectura

```text
navegador ──► Vercel (frontend estático + rewrites)
                 ├── /v1/*     ──► Render (dracing-backend)
                 ├── /health/* ──► Render (dracing-backend)
                 └── /*        ──► index.html (SPA)
Render backend ──► Supabase PostgreSQL (Supavisor Session pooler)
Render backend ──► Cloudinary API (imágenes y archivos; configuración preparada)
```

El frontend llama a la API con rutas relativas y la sesión usa cookies
`SameSite=Lax`, así que el navegador no habla directamente con
`onrender.com`: todo pasa por los rewrites de Vercel
(`apps/frontend/vercel.json`). Esto mantiene la cookie en el dominio de Vercel
(first-party) y evita CORS.

`APP_ORIGIN` y `API_ORIGIN` apuntan al dominio estable de Vercel. La URL
`*.onrender.com` solo se usa dentro de `vercel.json`.

## Pasos

1. **Crear el proyecto de Supabase** y copiar desde Connect la cadena del
   **Session pooler** (IPv4, puerto `5432`). Mantener `sslmode=require`.
2. **Crear el entorno de Cloudinary** y obtener Cloud Name, API Key y API
   Secret desde Console Settings → API Keys.
3. **Crear el backend en Render** con el Blueprint (`render.yaml` en la raíz):
   New → Blueprint → seleccionar este repositorio. El Blueprint crea
   `dracing-backend` como servicio web Docker.
4. **Completar las variables `sync: false`** en Render, incluida
   `DATABASE_URL` con la URL de Supabase.
5. **Desplegar el Blueprint**. El contenedor aplica las migraciones antes de
   abrir el puerto y crea el administrador inicial si todavía no existe.
6. **Confirmar la URL de Render**. Si no es
   `https://dracing-backend.onrender.com`, actualizar
   `apps/frontend/vercel.json` y redesplegar Vercel.
7. **Google OAuth**: agregar
   `https://d-racing-pro-frontend.vercel.app/v1/auth/google/callback` como URI
   autorizada en Google Cloud Console.
8. **Verificar** health checks, login de administrador, login de Google y una
   reserva completa.

## Variables del backend

| Variable                | Valor                                                              | Origen    |
| ----------------------- | ------------------------------------------------------------------ | --------- |
| `NODE_ENV`              | `production`                                                       | blueprint |
| `COOKIE_SECURE`         | `true`                                                             | blueprint |
| `TZ`                    | `America/Santiago`                                                 | blueprint |
| `SESSION_SECRET`        | generada por Render                                                | blueprint |
| `DATABASE_URL`          | Supabase Session pooler `:5432` con `sslmode=require`              | manual    |
| `APP_ORIGIN`            | `https://d-racing-pro-frontend.vercel.app`                         | blueprint |
| `API_ORIGIN`            | `https://d-racing-pro-frontend.vercel.app`                         | blueprint |
| `GOOGLE_CLIENT_ID`      | credencial de Google Cloud                                         | manual    |
| `GOOGLE_CLIENT_SECRET`  | credencial de Google Cloud                                         | manual    |
| `GOOGLE_REDIRECT_URI`   | `https://d-racing-pro-frontend.vercel.app/v1/auth/google/callback` | blueprint |
| `ADMIN_EMAIL`           | correo del único administrador                                     | manual    |
| `ADMIN_PASSWORD`        | secreto de 12–128 caracteres                                       | manual    |
| `FLOW_API_BASE`         | `https://sandbox.flow.cl/api`                                      | blueprint |
| `FLOW_API_KEY`          | credencial Flow                                                    | manual    |
| `FLOW_SECRET_KEY`       | credencial Flow                                                    | manual    |
| `CLOUDINARY_CLOUD_NAME` | identificador del entorno Cloudinary                               | manual    |
| `CLOUDINARY_API_KEY`    | API key del entorno Cloudinary                                     | manual    |
| `CLOUDINARY_API_SECRET` | secreto exclusivo del backend                                      | manual    |
| `CLOUDINARY_FOLDER`     | `dracing-pro`                                                      | blueprint |

Render inyecta `PORT`; el backend escucha en `0.0.0.0:$PORT`. En Vercel,
`VITE_API_URL` debe quedar vacía o sin definir para usar el proxy relativo.

## Migraciones y administrador inicial

Las migraciones SQL de `database/migrations/` se aplican con
`packages/database/scripts/migrate.mjs`. El `docker-entrypoint.sh` las ejecuta
antes del servidor y toma un advisory lock de PostgreSQL para impedir carreras
entre despliegues.

Por ese lock y por tratarse de un backend persistente, Render debe usar el
**Session pooler** de Supabase en puerto `5432`. No usar el Transaction pooler
en `6543`.

Después de migrar, el entrypoint crea el administrador cuando existen
`ADMIN_EMAIL` y `ADMIN_PASSWORD`. En arranques posteriores detecta la cuenta y
no reemplaza el hash ni crea una segunda.

Cloudinary queda como configuración preparada para medios: el backend valida
que sus tres credenciales existan juntas, pero todavía no hay ninguna
funcionalidad del producto que suba archivos (no hay SDK ni ruta de upload).
Las variables son opcionales hasta que esa funcionalidad exista. Supabase
almacena usuarios, sesiones, motos, citas, pagos y reportes.
`CLOUDINARY_API_SECRET` nunca se expone en variables `VITE_*`, código cliente
ni respuestas HTTP.

## Verificación post-deploy

```bash
curl https://dracing-backend.onrender.com/health/live
curl https://dracing-backend.onrender.com/health/ready
curl https://d-racing-pro-frontend.vercel.app/health/ready
```

Los tres deben responder `200` y `{"status":"ok"}`. Después se verifican los
dos métodos de login y una reserva con pago sandbox.

## Limitaciones

- El web service gratuito de Render se duerme después de 15 minutos sin
  tráfico; el primer request puede tardar cerca de un minuto.
- Los timers de reconciliación de Flow y expiración de holds no corren mientras
  Render está dormido. Al despertar, el backend ejecuta ambas tareas de
  mantenimiento inmediatamente y después retoma sus intervalos normales.
- No usar pings artificiales para impedir el spin-down: evadir las restricciones
  del plan gratuito puede provocar la suspensión de la cuenta según la
  [Acceptable Use Policy de Render](https://render.com/acceptable-use). Para
  latencia continua se necesita una instancia que no haga spin-down.
- Revisar los límites, pausado y backups del plan de Supabase elegido antes de
  tratarlo como producción definitiva.
- Detrás de Vercel y Render hay dos proxies. El default conservador de
  `TRUSTED_PROXY=1` protege contra IPs falseadas, aunque puede agrupar usuarios
  bajo la IP de salida de Vercel para el rate limit.
