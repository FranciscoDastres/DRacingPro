BEGIN;

-- New appointment status: the slot is held while the customer completes the
-- Flow payment. On confirmed payment it transitions to 'confirmed'; if the
-- payment is not completed before the hold expires it is moved to 'cancelled'.
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'pending_payment' BEFORE 'requested';

-- How much is charged when a customer books a slot.
CREATE TYPE payment_mode AS ENUM ('total', 'deposit_fixed', 'deposit_pct');

-- Lifecycle of a Flow payment transaction.
CREATE TYPE payment_transaction_status AS ENUM (
  'created',
  'pending',
  'paid',
  'failed',
  'expired',
  'cancelled'
);

-- Single-row, admin-editable payment configuration. The boolean primary key
-- with a CHECK keeps it a singleton.
CREATE TABLE payment_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true,
  mode payment_mode NOT NULL DEFAULT 'total',
  deposit_fixed_cents INTEGER NOT NULL DEFAULT 0,
  deposit_percent SMALLINT NOT NULL DEFAULT 30,
  hold_minutes SMALLINT NOT NULL DEFAULT 30,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payment_settings_singleton CHECK (id),
  CONSTRAINT payment_settings_deposit_fixed_check CHECK (deposit_fixed_cents >= 0),
  CONSTRAINT payment_settings_deposit_percent_check CHECK (deposit_percent BETWEEN 1 AND 100),
  CONSTRAINT payment_settings_hold_minutes_check CHECK (hold_minutes BETWEEN 1 AND 1440)
);

INSERT INTO payment_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

-- Flow payment transactions. The amount is always computed server-side; the
-- frontend never supplies it. flow_token / flow_commerce_order are unique to
-- keep webhook processing idempotent.
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'CLP',
  mode payment_mode NOT NULL,
  flow_token VARCHAR(120) UNIQUE,
  flow_commerce_order VARCHAR(60) NOT NULL UNIQUE,
  flow_order VARCHAR(40),
  status payment_transaction_status NOT NULL DEFAULT 'created',
  raw_response JSONB,
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payments_amount_check CHECK (amount_cents >= 0),
  CONSTRAINT payments_paid_at_check CHECK (
    status <> 'paid' OR paid_at IS NOT NULL
  )
);

CREATE INDEX payments_appointment_idx ON payments (appointment_id, created_at DESC);
CREATE INDEX payments_status_expiry_idx ON payments (status, expires_at);

-- Coordination phone (WhatsApp) captured at booking time, and the moment the
-- held slot stops being reserved if the payment is not completed.
ALTER TABLE appointments
  ADD COLUMN whatsapp_phone VARCHAR(20),
  ADD COLUMN payment_hold_expires_at TIMESTAMPTZ;

-- Link invoices to the payment that settled them, plus fields prepared for a
-- future SII (tax authority) integration. They stay nullable so existing
-- invoices are unaffected; document_kind defaults to a non-tax receipt.
ALTER TABLE invoices
  ADD COLUMN payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  ADD COLUMN net_cents INTEGER,
  ADD COLUMN iva_cents INTEGER,
  ADD COLUMN total_cents INTEGER,
  ADD COLUMN emisor_rut VARCHAR(12),
  ADD COLUMN receptor_rut VARCHAR(12),
  ADD COLUMN document_kind VARCHAR(40) NOT NULL DEFAULT 'comprobante_interno',
  ADD COLUMN sii_status VARCHAR(20) NOT NULL DEFAULT 'not_applicable',
  ADD COLUMN sii_folio VARCHAR(40),
  ADD CONSTRAINT invoices_net_check CHECK (net_cents IS NULL OR net_cents >= 0),
  ADD CONSTRAINT invoices_iva_check CHECK (iva_cents IS NULL OR iva_cents >= 0);

CREATE INDEX invoices_payment_idx ON invoices (payment_id);

COMMIT;
