BEGIN;

CREATE TYPE service_report_item_kind AS ENUM (
  'performed',
  'pending',
  'recommendation'
);

CREATE TYPE recommendation_severity AS ENUM (
  'info',
  'warning',
  'critical'
);

CREATE TYPE invoice_payment_status AS ENUM (
  'pending',
  'paid'
);

CREATE TABLE service_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  technical_summary TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE service_report_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES service_reports(id) ON DELETE CASCADE,
  kind service_report_item_kind NOT NULL,
  title VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  severity recommendation_severity,
  due_at TIMESTAMPTZ,
  due_odometer_km INTEGER,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT service_report_items_due_odometer_check
    CHECK (due_odometer_km IS NULL OR due_odometer_km >= 0),
  CONSTRAINT service_report_items_recommendation_fields_check
    CHECK (
      kind = 'recommendation'
      OR (severity IS NULL AND due_at IS NULL AND due_odometer_km IS NULL)
    )
);

CREATE INDEX service_report_items_report_kind_idx
  ON service_report_items (report_id, kind, sort_order);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE RESTRICT,
  document_number VARCHAR(40) NOT NULL UNIQUE,
  amount_cents INTEGER NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'CLP',
  payment_status invoice_payment_status NOT NULL DEFAULT 'pending',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT invoices_amount_check CHECK (amount_cents >= 0),
  CONSTRAINT invoices_paid_at_check CHECK (
    (payment_status = 'paid' AND paid_at IS NOT NULL)
    OR (payment_status = 'pending' AND paid_at IS NULL)
  )
);

CREATE INDEX invoices_status_issued_idx
  ON invoices (payment_status, issued_at DESC);

COMMIT;
