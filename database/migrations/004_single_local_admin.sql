BEGIN;

-- Existing administrators came from the former Google/dev role promotion.
-- They cannot authenticate with a local password, so reset them before the
-- owner provisions the one local administrator explicitly.
UPDATE users
SET role = 'customer',
    updated_at = now()
WHERE role = 'admin';

ALTER TABLE users
  ADD COLUMN password_hash text;

ALTER TABLE users
  ADD CONSTRAINT users_admin_authentication_valid CHECK (
    (role = 'admin' AND password_hash IS NOT NULL AND btrim(password_hash) <> '')
    OR (role = 'customer' AND password_hash IS NULL)
  );

CREATE UNIQUE INDEX users_single_admin_idx
  ON users (role)
  WHERE role = 'admin';

COMMENT ON COLUMN users.password_hash IS
  'Scrypt password hash for the single local administrator; Google users never have one.';

COMMIT;
