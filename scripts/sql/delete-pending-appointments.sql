-- ============================================================================
-- Eliminar todas las citas pendientes
--   (status = 'pending_payment'  ó  status = 'requested')
-- ============================================================================
--
-- Qué hace:
--   Borra de la tabla `appointments` todas las filas cuyo estado sea:
--     - `pending_payment` : cita creada que quedó esperando que se complete
--                           el pago y nunca avanzó.
--     - `requested`       : cita solicitada, pendiente de aprobación del
--                           taller. Se incluye para que el cliente pueda
--                           reagendar desde cero sin citas colgadas.
--   NO toca citas ya activas o finalizadas (`confirmed`, `checked_in`,
--   `in_service`, `ready`, `completed`, `cancelled`, `no_show`).
--
-- Borrado en cascada (automático por las FK del esquema):
--   Al borrar una cita se eliminan también sus filas hijas marcadas con
--   ON DELETE CASCADE:
--     - appointment_services           (servicios de la cita)
--     - appointment_status_history     (historial de estados)
--     - payments                       (transacciones de pago Flow)
--     - motorcycle_status_updates      (avances de la moto)
--     - service_reports (+ items)      (informe técnico, si existiera)
--
--   La FK de `invoices` NO es cascade (ON DELETE NO ACTION). En la práctica
--   una cita `pending_payment` / `requested` no tiene factura emitida, así
--   que esto no debería bloquear el borrado. Si alguna la tuviera, el DELETE
--   fallará adrede (es una protección): revisa ese caso a mano antes de seguir.
--
-- ⚠️  El borrado es IRREVERSIBLE. Ejecuta primero el bloque de PREVIEW para
--     ver exactamente qué se va a eliminar, y corre el DELETE dentro de una
--     transacción para poder hacer ROLLBACK si el conteo no cuadra.
--
-- Cómo ejecutar (entorno de desarrollo local, puerto 55432):
--   psql "postgresql://dracing:dracing@localhost:55432/dracing" \
--        -f scripts/sql/delete-pending-payment-appointments.sql
--
--   O pegando los bloques de abajo en una sesión psql interactiva.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) PREVIEW — cuántas y cuáles citas se eliminarían (no modifica nada)
-- ----------------------------------------------------------------------------
SELECT id, status, customer_user_id, motorcycle_id, starts_at, created_at
FROM appointments
WHERE status IN ('pending_payment', 'requested')
ORDER BY created_at;

SELECT status, count(*) AS total
FROM appointments
WHERE status IN ('pending_payment', 'requested')
GROUP BY status;


-- ----------------------------------------------------------------------------
-- 2) DELETE — dentro de una transacción para poder revertir
-- ----------------------------------------------------------------------------
-- Quita los comentarios de COMMIT (o usa ROLLBACK) tras revisar el conteo.

BEGIN;

DELETE FROM appointments
WHERE status IN ('pending_payment', 'requested');

-- Verifica el número de filas borradas que reporta psql (DELETE N).
-- Si todo está OK:
-- COMMIT;
-- Si algo no cuadra:
-- ROLLBACK;
