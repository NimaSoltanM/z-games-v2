-- Customer-requested fresh login verification codes.
--
-- The account credentials on order_items remain the permanent delivered account
-- record. A support request has its own lifecycle: pending until an admin sends a
-- fresh code, delivered for 24 hours, then expired. Expired secret values are
-- erased while the code-free row remains as support and audit history.
CREATE TABLE verification_code_requests (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_item_id  UUID      NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  user_id        VARCHAR   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status         TEXT      NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'delivered', 'expired')),
  code           TEXT,
  requested_at   TIMESTAMP NOT NULL DEFAULT now(),
  delivered_at   TIMESTAMP,
  expires_at     TIMESTAMP,
  delivered_by   VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  updated_at     TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT verification_code_delivery_fields_check CHECK (
    (status = 'pending' AND code IS NULL AND delivered_at IS NULL AND expires_at IS NULL AND delivered_by IS NULL)
    OR (status = 'delivered' AND code IS NOT NULL AND delivered_at IS NOT NULL AND expires_at IS NOT NULL AND delivered_by IS NOT NULL)
    OR (status = 'expired' AND code IS NULL AND delivered_at IS NOT NULL AND expires_at IS NOT NULL)
  )
);

-- A customer may have only one request awaiting an admin at a time. The service
-- also serializes creation and checks the rolling 24-hour rule transactionally.
CREATE UNIQUE INDEX verification_code_requests_one_pending_user_idx
  ON verification_code_requests (user_id)
  WHERE status = 'pending';

CREATE INDEX verification_code_requests_user_time_idx
  ON verification_code_requests (user_id, requested_at DESC);

CREATE INDEX verification_code_requests_admin_queue_idx
  ON verification_code_requests (status, requested_at DESC);

CREATE INDEX verification_code_requests_expiry_idx
  ON verification_code_requests (expires_at)
  WHERE status = 'delivered';
