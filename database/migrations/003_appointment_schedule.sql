BEGIN;

-- Replace the original reference schedule with two 45-minute booking windows.
-- Keeping separate intervals prevents any service from crossing the lunch break.
DELETE FROM business_hours
WHERE weekday BETWEEN 1 AND 6
  AND valid_from = '2026-01-01'::date;

INSERT INTO business_hours (
  weekday,
  opens_at,
  closes_at,
  slot_minutes,
  valid_from
)
SELECT
  weekday,
  schedule.opens_at,
  schedule.closes_at,
  45,
  '2026-01-01'::date
FROM generate_series(1, 6) AS weekday
CROSS JOIN (
  VALUES
    ('09:30'::time, '14:00'::time),
    ('15:00'::time, '18:00'::time)
) AS schedule(opens_at, closes_at)
ON CONFLICT (weekday, opens_at, valid_from) DO UPDATE
SET closes_at = EXCLUDED.closes_at,
    slot_minutes = EXCLUDED.slot_minutes,
    valid_until = NULL;

COMMIT;
