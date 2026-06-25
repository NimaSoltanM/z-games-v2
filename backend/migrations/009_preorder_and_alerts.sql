-- Pre-order lifecycle + per-game admin alerts.
--
-- release_status: a game is 'released' (normal storefront) or 'pre_order' (we buy
-- the pre-order on the customer's behalf; credentials are withheld until launch).
-- release_date is the expected launch (nullable while a date isn't known yet);
-- pre-order sales auto-close shortly before it and the game behaves as released
-- once it passes. Phase logic lives in internal/shared/release.
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS release_status TEXT NOT NULL DEFAULT 'released'
    CHECK (release_status IN ('released', 'pre_order')),
  ADD COLUMN IF NOT EXISTS release_date TIMESTAMP WITHOUT TIME ZONE,
  ADD COLUMN IF NOT EXISTS alert_message TEXT,
  ADD COLUMN IF NOT EXISTS alert_variant TEXT
    CHECK (alert_variant IS NULL OR alert_variant IN ('info', 'warning'));

-- Snapshot whether a purchased line was bought during the game's pre-order phase,
-- so the customer's order page can explain that credentials arrive after launch
-- even after the game itself later flips to released.
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS pre_order BOOLEAN NOT NULL DEFAULT false;
