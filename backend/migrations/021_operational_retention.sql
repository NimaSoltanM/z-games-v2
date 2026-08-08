-- Bound transient authentication data and add the indexes/keys used by the
-- production cleanup and checkout-abuse guards.

BEGIN;

-- OTP codes are secrets, not audit records. Active rows need the code for at
-- most five minutes; consumed/expired rows retain only timing metadata until the
-- short hard-delete window passes.
ALTER TABLE otp_codes
  ALTER COLUMN code DROP NOT NULL;

UPDATE otp_codes
SET used_at = COALESCE(used_at, expires_at),
    code = NULL
WHERE used_at IS NOT NULL OR expires_at <= NOW();

DELETE FROM otp_codes
WHERE created_at <= NOW() - INTERVAL '24 hours';

ALTER TABLE otp_codes
  ADD CONSTRAINT otp_codes_secret_lifecycle_check
  CHECK (
    (used_at IS NULL AND code IS NOT NULL)
    OR (used_at IS NOT NULL AND code IS NULL)
  );

DROP INDEX IF EXISTS otp_codes_phone_idx;
CREATE INDEX otp_codes_phone_created_idx
  ON otp_codes (phone, created_at DESC);
CREATE INDEX otp_codes_cleanup_idx
  ON otp_codes (created_at)
  WHERE used_at IS NOT NULL;

-- A deterministic cart fingerprint lets repeated checkout submissions reuse the
-- same pending gateway session instead of creating another order and line items.
ALTER TABLE orders
  ADD COLUMN checkout_fingerprint TEXT;

CREATE UNIQUE INDEX orders_one_pending_checkout_idx
  ON orders (user_id)
  WHERE status = 'pending' AND checkout_fingerprint IS NOT NULL;

CREATE INDEX orders_user_created_idx
  ON orders (user_id, created_at DESC);

-- Used by the five-minute reconciler; without this partial index its oldest-
-- pending scan degrades toward a full orders-table scan as history grows.
CREATE INDEX orders_pending_reconcile_idx
  ON orders (created_at)
  WHERE status = 'pending';

COMMIT;
