BEGIN;

INSERT INTO service_bays (name, description)
VALUES
  ('Bahía 1', 'Bahía principal de mantenimiento'),
  ('Bahía 2', 'Bahía secundaria de diagnóstico y servicio')
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description,
    is_active = true;

INSERT INTO services (
  code,
  name,
  description,
  duration_minutes,
  price_cents,
  currency
)
VALUES
  ('MANTENCION_BASICA', 'Mantención básica', 'Inspección general y ajustes preventivos.', 60, 25000, 'CLP'),
  ('CAMBIO_ACEITE', 'Cambio de aceite', 'Cambio de aceite y revisión de niveles.', 30, 15000, 'CLP'),
  ('TRANSMISION', 'Servicio de transmisión', 'Inspección, limpieza y ajuste de la transmisión.', 90, 35000, 'CLP'),
  ('FRENOS', 'Revisión de frenos', 'Inspección y ajuste del sistema de frenos.', 60, 25000, 'CLP'),
  ('DIAGNOSTICO', 'Diagnóstico general', 'Diagnóstico inicial y presupuesto de reparación.', 45, 15000, 'CLP')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    duration_minutes = EXCLUDED.duration_minutes,
    price_cents = EXCLUDED.price_cents,
    currency = EXCLUDED.currency,
    is_active = true;

INSERT INTO business_hours (
  weekday,
  opens_at,
  closes_at,
  slot_minutes,
  valid_from
)
SELECT weekday, '09:00'::time, '18:00'::time, 30, '2026-01-01'::date
FROM generate_series(1, 5) AS weekday
ON CONFLICT (weekday, opens_at, valid_from) DO UPDATE
SET closes_at = EXCLUDED.closes_at,
    slot_minutes = EXCLUDED.slot_minutes;

INSERT INTO business_hours (
  weekday,
  opens_at,
  closes_at,
  slot_minutes,
  valid_from
)
VALUES (6, '09:00', '14:00', 30, '2026-01-01')
ON CONFLICT (weekday, opens_at, valid_from) DO UPDATE
SET closes_at = EXCLUDED.closes_at,
    slot_minutes = EXCLUDED.slot_minutes;

COMMIT;
