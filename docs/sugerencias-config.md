# Sugerencias de configuración (admin y cliente)

## Configuración del administrador

### Cobro (tabla `payment_settings`, endpoint `/v1/admin/payment-settings`)
- **Modo de cobro** (`mode`): `total` (cobra el total de los servicios),
  `deposit_fixed` (abono fijo) o `deposit_pct` (porcentaje del total).
- **Abono fijo** (`deposit_fixed_cents`): monto en pesos cuando el modo es `deposit_fixed`.
- **Porcentaje de abono** (`deposit_percent`): 1–100, usado en `deposit_pct`.
- **Ventana de retención** (`hold_minutes`, default 30): minutos que se mantiene
  el cupo reservado esperando el pago antes de liberarlo automáticamente.
- Recomendación inicial para un taller de motos: `deposit_pct` 30% con
  `hold_minutes` 30. El precio final muchas veces depende del diagnóstico, por lo
  que cobrar un abono reduce no-shows sin comprometer al cliente al total.

### Operación de la agenda
- Usar las secciones **Pendientes / En proceso / Completadas / Canceladas** para
  no mezclar lo activo con lo cerrado.
- Mantener el teléfono del cliente cargado para habilitar el botón de WhatsApp.
- Revisar diariamente la sección **Pendientes** para confirmar y coordinar.

### Seguridad y credenciales
- Definir `SESSION_SECRET` fuerte y `COOKIE_SECURE=true` en producción (validado
  por `env.ts`).
- Cargar `FLOW_API_KEY` / `FLOW_SECRET_KEY` solo por variables de entorno.
- En desarrollo, exponer el webhook con un túnel (ngrok) y setear
  `FLOW_CONFIRM_URL` / `FLOW_RETURN_URL`.

## Configuración del cliente
- **Perfil**: nombre y teléfono de WhatsApp (se solicita obligatoriamente al
  agendar y se guarda en el perfil para futuras coordinaciones).
- **Boletas**: descarga del comprobante en PDF desde la sección "Boletas".
- **Reintento de pago**: si el pago no se completa, la cita queda "Pendiente de
  pago" y se puede reintentar desde la página de retorno o desde "Citas".
- **Notificaciones** (futuro): preferencia de canal (WhatsApp / correo) para
  avisos de avance de la moto.
