#!/bin/sh
set -eu

# Render Free no ofrece shell ni pre-deploy commands. Las migraciones deben
# ejecutarse antes de abrir el puerto para que el health check de readiness no
# exponga una API conectada a un esquema incompleto.
node packages/database/scripts/migrate.mjs

# El administrador inicial se crea una sola vez. En arranques posteriores el
# script detecta que ya existe y continúa sin cambiar sus credenciales.
if [ -n "${ADMIN_EMAIL:-}" ] || [ -n "${ADMIN_PASSWORD:-}" ]; then
  if [ -z "${ADMIN_EMAIL:-}" ] || [ -z "${ADMIN_PASSWORD:-}" ]; then
    echo 'ADMIN_EMAIL and ADMIN_PASSWORD must be set together' >&2
    exit 1
  fi

  ADMIN_SKIP_IF_EXISTS=true node apps/backend/dist/scripts/create-admin.js
fi

exec node apps/backend/dist/server.js
