-- Dynamic pricing reworked: instead of a per-tier USD price, a dynamic game has a
-- single base USD price per console, and the three capacity tiers derive from it:
--   tier_toman = base_usd * usd_to_toman * (1 + margin%) * split%
-- The split percentages and the default margin are global config; the margin can
-- be overridden per game. Fixed (Toman) games are unchanged (manual per-tier).

-- Global pricing config lives on the exchange_rate singleton (id = 1).
ALTER TABLE exchange_rate
  ADD COLUMN IF NOT EXISTS z1_pct             INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS z2_pct             INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS z3_pct             INTEGER NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS default_margin_pct INTEGER NOT NULL DEFAULT 10;

-- Per-game profit margin override; NULL means "use default_margin_pct".
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS profit_margin_pct INTEGER
    CHECK (profit_margin_pct IS NULL OR profit_margin_pct >= 0);

-- One base USD price per console for dynamic games. Tiers are derived, not stored.
CREATE TABLE IF NOT EXISTS game_base_prices (
  id       CHARACTER VARYING(36) PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  game_id  CHARACTER VARYING     NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  platform CHARACTER VARYING(4)  NOT NULL CHECK (platform IN ('ps4', 'ps5')),
  base_usd NUMERIC(10,2)         NOT NULL CHECK (base_usd > 0),
  UNIQUE (game_id, platform)
);
