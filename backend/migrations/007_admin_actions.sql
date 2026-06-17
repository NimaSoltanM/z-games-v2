-- Audit log of admin actions. Every privileged action (fulfilling an order,
-- and future ones like accepting a withdrawal) writes one row here recording
-- who did it, on what, and when. Append-only by convention.
CREATE TABLE IF NOT EXISTS admin_actions (
  id          UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    CHARACTER VARYING           NOT NULL REFERENCES users(id),
  action      TEXT                        NOT NULL,            -- e.g. 'order.fulfill'
  target_type TEXT,                                            -- e.g. 'order'
  target_id   TEXT,                                            -- affected entity id
  metadata    JSONB,                                           -- action-specific details
  created_at  TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_actions_admin_id_idx   ON admin_actions (admin_id);
CREATE INDEX IF NOT EXISTS admin_actions_target_idx     ON admin_actions (target_type, target_id);
CREATE INDEX IF NOT EXISTS admin_actions_created_at_idx ON admin_actions (created_at DESC);
