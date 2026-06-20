BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE user_role AS ENUM ('customer', 'admin');
CREATE TYPE appointment_status AS ENUM (
  'requested',
  'confirmed',
  'checked_in',
  'in_service',
  'ready',
  'completed',
  'cancelled',
  'no_show'
);
CREATE TYPE motorcycle_progress_status AS ENUM (
  'received',
  'diagnosing',
  'waiting_approval',
  'repairing',
  'quality_check',
  'ready_for_pickup',
  'delivered'
);
CREATE TYPE schedule_exception_kind AS ENUM ('closed', 'availability_override');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  display_name varchar(120) NOT NULL,
  avatar_url text,
  phone varchar(32),
  role user_role NOT NULL DEFAULT 'customer',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_not_blank CHECK (btrim(email::text) <> ''),
  CONSTRAINT users_display_name_not_blank CHECK (btrim(display_name) <> '')
);

CREATE TABLE oauth_accounts (
  provider varchar(32) NOT NULL,
  provider_subject varchar(255) NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, provider_subject),
  UNIQUE (user_id, provider),
  CONSTRAINT oauth_provider_supported CHECK (provider IN ('google')),
  CONSTRAINT oauth_subject_not_blank CHECK (btrim(provider_subject) <> '')
);

CREATE TABLE auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash bytea NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  user_agent varchar(512),
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_sessions_expiry_after_creation CHECK (expires_at > created_at)
);

CREATE INDEX auth_sessions_active_user_idx
  ON auth_sessions (user_id, expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE motorcycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  nickname varchar(80),
  make varchar(40) NOT NULL DEFAULT 'Honda',
  model varchar(80) NOT NULL DEFAULT 'NAVI',
  model_year smallint,
  color varchar(60),
  license_plate citext,
  vin citext,
  odometer_km integer,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, owner_user_id),
  CONSTRAINT motorcycles_make_not_blank CHECK (btrim(make) <> ''),
  CONSTRAINT motorcycles_model_not_blank CHECK (btrim(model) <> ''),
  CONSTRAINT motorcycles_model_year_valid CHECK (
    model_year IS NULL OR model_year BETWEEN 2016 AND 2100
  ),
  CONSTRAINT motorcycles_odometer_nonnegative CHECK (
    odometer_km IS NULL OR odometer_km >= 0
  )
);

CREATE UNIQUE INDEX motorcycles_license_plate_unique_idx
  ON motorcycles (license_plate)
  WHERE license_plate IS NOT NULL;

CREATE UNIQUE INDEX motorcycles_vin_unique_idx
  ON motorcycles (vin)
  WHERE vin IS NOT NULL;

CREATE INDEX motorcycles_owner_idx ON motorcycles (owner_user_id, is_active);

CREATE TABLE services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code citext NOT NULL UNIQUE,
  name varchar(120) NOT NULL,
  description text,
  duration_minutes integer NOT NULL,
  price_cents integer NOT NULL,
  currency char(3) NOT NULL DEFAULT 'CLP',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT services_code_not_blank CHECK (btrim(code::text) <> ''),
  CONSTRAINT services_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT services_duration_positive CHECK (duration_minutes > 0),
  CONSTRAINT services_price_nonnegative CHECK (price_cents >= 0),
  CONSTRAINT services_currency_uppercase CHECK (currency = upper(currency))
);

COMMENT ON COLUMN services.price_cents IS
  'Unidad monetaria mínima. Para CLP el valor equivale a pesos enteros.';

CREATE TABLE service_bays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(80) NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_bays_name_not_blank CHECK (btrim(name) <> '')
);

CREATE TABLE business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekday smallint NOT NULL,
  opens_at time NOT NULL,
  closes_at time NOT NULL,
  slot_minutes smallint NOT NULL DEFAULT 30,
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (weekday, opens_at, valid_from),
  CONSTRAINT business_hours_weekday_valid CHECK (weekday BETWEEN 0 AND 6),
  CONSTRAINT business_hours_interval_valid CHECK (opens_at < closes_at),
  CONSTRAINT business_hours_slot_valid CHECK (slot_minutes BETWEEN 5 AND 240),
  CONSTRAINT business_hours_validity_valid CHECK (
    valid_until IS NULL OR valid_until >= valid_from
  )
);

COMMENT ON COLUMN business_hours.weekday IS
  'Día ISO simplificado usado por la app: 0=domingo, 6=sábado.';

CREATE TABLE schedule_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  kind schedule_exception_kind NOT NULL,
  capacity_override smallint,
  reason varchar(255),
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT schedule_exceptions_interval_valid CHECK (starts_at < ends_at),
  CONSTRAINT schedule_exceptions_capacity_valid CHECK (
    (kind = 'closed' AND capacity_override IS NULL)
    OR
    (kind = 'availability_override' AND capacity_override > 0)
  )
);

CREATE INDEX schedule_exceptions_range_idx
  ON schedule_exceptions USING gist (tstzrange(starts_at, ends_at, '[)'));

CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  motorcycle_id uuid NOT NULL,
  service_bay_id uuid NOT NULL REFERENCES service_bays(id) ON DELETE RESTRICT,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status appointment_status NOT NULL DEFAULT 'requested',
  customer_notes text,
  internal_notes text,
  cancellation_reason varchar(500),
  cancelled_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointments_motorcycle_owner_fk
    FOREIGN KEY (motorcycle_id, customer_user_id)
    REFERENCES motorcycles(id, owner_user_id)
    ON DELETE RESTRICT,
  CONSTRAINT appointments_interval_valid CHECK (starts_at < ends_at),
  CONSTRAINT appointments_version_positive CHECK (version > 0),
  CONSTRAINT appointments_cancellation_consistent CHECK (
    (status = 'cancelled' AND cancelled_at IS NOT NULL)
    OR
    (status <> 'cancelled' AND cancelled_at IS NULL)
  )
);

ALTER TABLE appointments
  ADD CONSTRAINT appointments_bay_no_overlap
  EXCLUDE USING gist (
    service_bay_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  )
  WHERE (status IN (
    'requested', 'confirmed', 'checked_in', 'in_service', 'ready'
  ));

ALTER TABLE appointments
  ADD CONSTRAINT appointments_motorcycle_no_overlap
  EXCLUDE USING gist (
    motorcycle_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  )
  WHERE (status IN (
    'requested', 'confirmed', 'checked_in', 'in_service', 'ready'
  ));

CREATE INDEX appointments_customer_starts_idx
  ON appointments (customer_user_id, starts_at DESC);
CREATE INDEX appointments_status_starts_idx
  ON appointments (status, starts_at);
CREATE INDEX appointments_motorcycle_idx
  ON appointments (motorcycle_id, starts_at DESC);

CREATE TABLE appointment_services (
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  service_name_snapshot varchar(120) NOT NULL,
  unit_price_cents integer NOT NULL,
  currency char(3) NOT NULL,
  duration_minutes integer NOT NULL,
  quantity smallint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (appointment_id, service_id),
  CONSTRAINT appointment_services_name_not_blank CHECK (
    btrim(service_name_snapshot) <> ''
  ),
  CONSTRAINT appointment_services_price_nonnegative CHECK (unit_price_cents >= 0),
  CONSTRAINT appointment_services_duration_positive CHECK (duration_minutes > 0),
  CONSTRAINT appointment_services_quantity_positive CHECK (quantity > 0),
  CONSTRAINT appointment_services_currency_uppercase CHECK (currency = upper(currency))
);

CREATE TABLE appointment_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  from_status appointment_status,
  to_status appointment_status NOT NULL,
  changed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  reason varchar(500),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointment_status_history_changed CHECK (
    from_status IS NULL OR from_status <> to_status
  )
);

CREATE INDEX appointment_status_history_timeline_idx
  ON appointment_status_history (appointment_id, created_at);

CREATE TABLE motorcycle_status_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  progress_status motorcycle_progress_status NOT NULL,
  message text,
  customer_visible boolean NOT NULL DEFAULT true,
  odometer_km integer,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT motorcycle_status_updates_odometer_nonnegative CHECK (
    odometer_km IS NULL OR odometer_km >= 0
  )
);

CREATE INDEX motorcycle_status_updates_timeline_idx
  ON motorcycle_status_updates (appointment_id, created_at);

CREATE TABLE audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action varchar(120) NOT NULL,
  entity_type varchar(80) NOT NULL,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_id uuid,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_action_not_blank CHECK (btrim(action) <> ''),
  CONSTRAINT audit_logs_entity_type_not_blank CHECK (btrim(entity_type) <> '')
);

CREATE INDEX audit_logs_actor_created_idx
  ON audit_logs (actor_user_id, created_at DESC);
CREATE INDEX audit_logs_entity_idx
  ON audit_logs (entity_type, entity_id, created_at DESC);

CREATE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER motorcycles_set_updated_at
BEFORE UPDATE ON motorcycles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER services_set_updated_at
BEFORE UPDATE ON services
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER service_bays_set_updated_at
BEFORE UPDATE ON service_bays
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER business_hours_set_updated_at
BEFORE UPDATE ON business_hours
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER schedule_exceptions_set_updated_at
BEFORE UPDATE ON schedule_exceptions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER appointments_set_updated_at
BEFORE UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
