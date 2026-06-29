-- Generic console + capacity catalog.
--
-- Replaces the PlayStation-only model (the `platform` enum, the global z1/z2/z3
-- split on exchange_rate, and the hardcoded platform/zarfiat CHECK lists) with a
-- data-driven catalog so a new console (Xbox today, Steam tomorrow) is a row, not
-- a code change.
--
-- Core ideas:
--   * `consoles`   — one row per device (ps4, ps5, xbox_one, xbox_series). Carries
--                    its UI family and its own default profit margin.
--   * `capacities` — the sellable slots, keyed by (console_code, code). Each holds
--                    its split percentage. Splits sum to 100 per console (enforced
--                    in the admin save path, not as a row constraint).
--   * `game_consoles` — which consoles a game lists on. Kills the ps4_ps5 combined
--                    enum: a game simply has many rows here.
--
-- The `platform` / `zarfiat` columns on the price/cart/order tables KEEP their
-- names (now meaning console_code / capacity_code) to avoid renaming churn across
-- the codebase; only their domain changes from enum to FK.

-- 1. Reference tables --------------------------------------------------------
CREATE TABLE IF NOT EXISTS consoles (
  code               TEXT PRIMARY KEY,                 -- ps4, ps5, xbox_one, xbox_series, (steam…)
  family             TEXT    NOT NULL,                 -- playstation | xbox  (UI grouping/badge)
  label_fa           TEXT    NOT NULL,
  default_margin_pct INTEGER NOT NULL DEFAULT 10 CHECK (default_margin_pct >= 0),
  active             BOOLEAN NOT NULL DEFAULT true,
  sort_order         INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS capacities (
  console_code TEXT    NOT NULL REFERENCES consoles(code) ON DELETE CASCADE,
  code         TEXT    NOT NULL,                       -- z1, z2, z3, home, switch
  label_fa     TEXT    NOT NULL,
  split_pct    INTEGER NOT NULL CHECK (split_pct >= 0),
  sort_order   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (console_code, code)
);

CREATE TABLE IF NOT EXISTS game_consoles (
  game_id      VARCHAR NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  console_code TEXT    NOT NULL REFERENCES consoles(code),
  PRIMARY KEY (game_id, console_code)
);

-- 2. Seed PlayStation (carrying over any admin-tuned split/margin from the old
--    singleton) + Xbox. usd_to_toman stays on exchange_rate; it is currency, not
--    per-console, so it is untouched here.
INSERT INTO consoles (code, family, label_fa, default_margin_pct, sort_order) VALUES
  ('ps4',         'playstation', 'پلی‌استیشن ۴',
     COALESCE((SELECT default_margin_pct FROM exchange_rate WHERE id = 1), 10), 1),
  ('ps5',         'playstation', 'پلی‌استیشن ۵',
     COALESCE((SELECT default_margin_pct FROM exchange_rate WHERE id = 1), 10), 2),
  ('xbox_one',    'xbox',        'ایکس‌باکس وان',    20, 3),
  ('xbox_series', 'xbox',        'ایکس‌باکس سری X|S', 20, 4)
ON CONFLICT (code) DO NOTHING;

INSERT INTO capacities (console_code, code, label_fa, split_pct, sort_order) VALUES
  ('ps4', 'z1', 'ظرفیت ۱', COALESCE((SELECT z1_pct FROM exchange_rate WHERE id = 1), 15), 1),
  ('ps4', 'z2', 'ظرفیت ۲', COALESCE((SELECT z2_pct FROM exchange_rate WHERE id = 1), 60), 2),
  ('ps4', 'z3', 'ظرفیت ۳', COALESCE((SELECT z3_pct FROM exchange_rate WHERE id = 1), 25), 3),
  ('ps5', 'z1', 'ظرفیت ۱', COALESCE((SELECT z1_pct FROM exchange_rate WHERE id = 1), 15), 1),
  ('ps5', 'z2', 'ظرفیت ۲', COALESCE((SELECT z2_pct FROM exchange_rate WHERE id = 1), 60), 2),
  ('ps5', 'z3', 'ظرفیت ۳', COALESCE((SELECT z3_pct FROM exchange_rate WHERE id = 1), 25), 3),
  ('xbox_one',    'home',   'Home',   60, 1),
  ('xbox_one',    'switch', 'Switch', 40, 2),
  ('xbox_series', 'home',   'Home',   60, 1),
  ('xbox_series', 'switch', 'Switch', 40, 2)
ON CONFLICT (console_code, code) DO NOTHING;

-- 3. Backfill game_consoles from the retiring enum (ps4_ps5 → two rows).
INSERT INTO game_consoles (game_id, console_code)
SELECT id, 'ps4' FROM games WHERE platform IN ('ps4', 'ps4_ps5')
UNION ALL
SELECT id, 'ps5' FROM games WHERE platform IN ('ps5', 'ps4_ps5')
ON CONFLICT (game_id, console_code) DO NOTHING;

-- 4. Widen the price columns (VARCHAR(4)/(2) cannot hold xbox_series / switch) and
--    swap the hardcoded CHECK lists for composite FKs into the catalog.
ALTER TABLE game_prices
  ALTER COLUMN platform TYPE TEXT,
  ALTER COLUMN zarfiat  TYPE TEXT,
  DROP CONSTRAINT IF EXISTS game_prices_platform_check,
  DROP CONSTRAINT IF EXISTS game_prices_zarfiat_check;

ALTER TABLE game_base_prices
  ALTER COLUMN platform TYPE TEXT,
  DROP CONSTRAINT IF EXISTS game_base_prices_platform_check;

ALTER TABLE cart_items
  DROP CONSTRAINT IF EXISTS cart_items_platform_check,
  DROP CONSTRAINT IF EXISTS cart_items_zarfiat_check;

ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_platform_check,
  DROP CONSTRAINT IF EXISTS order_items_zarfiat_check;

ALTER TABLE game_prices
  ADD CONSTRAINT game_prices_capacity_fkey
    FOREIGN KEY (platform, zarfiat) REFERENCES capacities (console_code, code);
ALTER TABLE cart_items
  ADD CONSTRAINT cart_items_capacity_fkey
    FOREIGN KEY (platform, zarfiat) REFERENCES capacities (console_code, code);
ALTER TABLE game_base_prices
  ADD CONSTRAINT game_base_prices_console_fkey
    FOREIGN KEY (platform) REFERENCES consoles (code);
-- order_items stays a soft snapshot (NO FK): a delivered line must survive a
-- console or game being deleted later, exactly like its game_name snapshot does.

-- 5. Generalize the third credential slot. PSN pass for PlayStation, two-step
--    verification code for Xbox — one neutral column, labeled per console in the UI.
ALTER TABLE order_items RENAME COLUMN psn_pass TO passcode;

-- 6. Retire the global split/margin (now per-console) and the single-platform
--    model. Done last, after the data above no longer needs them.
ALTER TABLE exchange_rate
  DROP COLUMN IF EXISTS z1_pct,
  DROP COLUMN IF EXISTS z2_pct,
  DROP COLUMN IF EXISTS z3_pct,
  DROP COLUMN IF EXISTS default_margin_pct;

ALTER TABLE games DROP COLUMN IF EXISTS platform;
DROP TYPE IF EXISTS platform;
