# Informe de seguridad — Flujo de pago con Flow

Análisis con doble enfoque: **ingeniero de ciberseguridad** (defensa) y
**hacker** (superficie de ataque). Cubre el flujo cita → pago → confirmación.

## Modelo de confianza del pago (lo más importante)

El estado del pago **nunca** se determina desde el navegador del cliente:

1. El backend crea la orden en Flow firmando con `FLOW_SECRET_KEY`
   (`flow-client.ts`). El frontend solo recibe `redirectUrl`.
2. Flow notifica vía **webhook** (`POST /v1/payments/flow/confirm`). Ese request
   **no se confía**: el servidor vuelve a consultar `getStatus` a Flow con su
   secreto y solo marca la cita `confirmed` si Flow reporta pagado.
3. El `urlReturn` que ve el usuario es solo cosmético: redirige al SPA, que
   consulta el estado autenticado. No cambia datos.

## Hallazgos y mitigaciones aplicadas

| #   | Riesgo (vector de ataque)                                               | Severidad | Estado                                                                                                                 |
| --- | ----------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | Secretos por defecto aceptados en producción (`SESSION_SECRET`, cookie) | Crítico   | **Corregido**: `env.ts` rechaza defaults y exige `COOKIE_SECURE=true` en prod                                          |
| 2   | Manipulación del monto desde el frontend                                | Crítico   | **Mitigado**: el monto se calcula server-side desde `appointment_services` + `payment_settings` (`payment-service.ts`) |
| 3   | Falsificación del webhook (inyección de "pago" falso)                   | Crítico   | **Mitigado**: verificación vía `getStatus` con secreto; el body no se confía                                           |
| 4   | Replay del webhook (doble boleta / doble confirmación)                  | Alto      | **Mitigado**: idempotencia por `flow_token` único + early-return si ya está `paid`                                     |
| 5   | Doble cobro al crear la orden (doble clic)                              | Medio     | **Mitigado**: reutiliza el pago `pending` vigente del appointment                                                      |
| 6   | IDOR en pago/boleta de otro usuario                                     | Alto      | **Mitigado**: `findFirst` filtrado por `customer_user_id`; PDF ya filtra por dueño                                     |
| 7   | Secreto de Flow expuesto al frontend                                    | Crítico   | **Evitado**: todas las llamadas a Flow ocurren en backend                                                              |
| 8   | Abuso de "holds" para bloquear el calendario (DoS de disponibilidad)    | Medio     | **Mitigado**: expiración por `hold_minutes` + job que libera cupos                                                     |
| 9   | Fuerza bruta / abuso de endpoints sensibles                             | Medio     | **Mitigado**: rate-limit por ruta (creación de pago 10/min, webhook 60/min) + global 200/min                           |
| 10  | CSRF en mutaciones                                                      | Medio     | **Mantenido**: `hasTrustedOrigin` en endpoints con estado (excepto webhook, que es server-to-server)                   |
| 11  | Trazabilidad de pagos                                                   | Bajo      | **Cubierto**: `audit_logs` registra `payment.confirmed`                                                                |

## Endurecimiento aplicado (junio 2026)

- **Verificación de monto en el webhook** (`payment-service.ts`): tras `getStatus`,
  si `status.amount !== payment.amount_cents` la cita **no** se confirma; el pago se
  marca `failed` y se registra `payment.amount_mismatch` en `audit_logs`.
- **Reconciliación** (`reconcilePendingPayments`, timer en `server.ts` cada 3 min):
  reconsulta `getStatus` de pagos `created`/`pending` recientes y confirma los que
  Flow reporta pagados, reusando `confirmFromWebhook` (idempotente). Cubre webhooks
  perdidos.
- **Expiración defensiva** (`expireStaleHolds`): antes de liberar un cupo, reconcilia
  con Flow y re-lee el estado dentro de la transacción; nunca cancela un cupo ya
  pagado.
- **`trustProxy` configurable** (`TRUSTED_PROXY`, `env.ts`): default seguro (1 salto
  nginx en prod, sin confianza en dev). Evita falsear `X-Forwarded-For` para saltar
  el rate-limit por IP o envenenar `audit_logs`.
- **Escaneo de dependencias en CI** (`.github/workflows/ci.yml`): `pnpm audit
--audit-level=high` bloquea el build ante CVE alto/crítico. `.github/dependabot.yml`
  abre PRs semanales de actualización (npm + GitHub Actions).
- **Cabeceras de seguridad en el frontend** (`infra/nginx/default.conf`):
  `Content-Security-Policy` (script-src 'self', sin inline-JS), `Strict-Transport-Security`
  y `Permissions-Policy`, además de las ya presentes.
- **Redacción de logs** (`app.ts`, `resolveLoggerOptions`): pino elimina `cookie`,
  `authorization` y `set-cookie` de cualquier objeto registrado, evitando filtrar el
  token de sesión a los logs.

### Firma de respuesta de Flow (P2): por qué NO se implementa

La doc oficial de Flow ([developers.flow.cl](https://developers.flow.cl/en/api))
confirma que **Flow no firma sus respuestas JSON**: el parámetro `s` (HMAC-SHA256)
es solo para las peticiones _hacia_ Flow. Las respuestas de `payment/create` y
`payment/getStatus` traen únicamente `url`/`token`/`flowOrder`/`status`, sin firma.
Verificar una "firma de respuesta" sería validar un campo inexistente. La integridad
de la respuesta está cubierta por **TLS** + el hecho de que **nosotros** iniciamos
la re-consulta a `getStatus`. En su lugar se aplicó hardening real al módulo:

- **HTTPS obligatorio en `FLOW_API_BASE`** (`flow-client.ts`, `assertSecureApiBase`):
  como el modelo de confianza depende de TLS, un `apiBase` `http://` se rechaza
  (excepto `localhost` para pruebas); evita un MITM que falsifique un "pagado".
- **Verificación de `commerceOrder`** (`payment-service.ts`): además del monto, se
  comprueba que el `commerceOrder` reportado por Flow coincida con el de nuestra
  orden; un mismatch marca el pago `failed` + `audit_logs` y nunca confirma la cita.

## Recomendaciones pendientes / operativas

- **Webhook alcanzable**: en producción, exponer `/v1/payments/flow/confirm` por
  HTTPS público; en dev usar un túnel. Considerar lista blanca de IPs de Flow si
  está disponible.
- **Boleta tributaria (SII)**: hoy el comprobante es interno (`document_kind =
comprobante_interno`); los campos `net_cents`/`iva_cents`/`sii_*` quedan
  preparados pero la emisión tributaria real es un trabajo aparte.
- **Monitoreo**: alertar sobre tasa de pagos `failed`/`expired` anómala
  (posible fraude o problemas de UX).
- **Pruebas de seguridad**: ejecutar `/security-review` sobre la rama antes de
  mergear y en cada cambio del módulo `payments`.

## Verificación de seguridad reproducible

- Webhook con firma/estado inválido → la cita NO se confirma.
- Reenvío del mismo `token` ya pagado → sin doble boleta (idempotente).
- Alterar el monto en el cliente → se ignora; se cobra el valor server-side.
- Acceder a `/v1/invoices/:id/pdf` o `/v1/payments/:id/status` de otro usuario → 403/404.
