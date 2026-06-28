-- Per-capacity selling control for dynamic games.
--
-- A dynamic game stores one base USD price per console and previously derived &
-- sold ALL of that console's capacities. This column lists which capacities are
-- actually sold, so an admin can exclude specific ones (e.g. no z1 on ps5, no
-- home on xbox_one). An EMPTY array means "all capacities" (back-compat), so
-- legacy rows and any insert that omits the list keep selling everything.
ALTER TABLE game_base_prices
  ADD COLUMN IF NOT EXISTS capacities TEXT[] NOT NULL DEFAULT '{}';

-- Backfill existing rows to the console's full catalog capacity set, so they are
-- explicit rather than relying on the empty="all" shortcut.
UPDATE game_base_prices gbp
SET capacities = COALESCE(
  (SELECT array_agg(c.code ORDER BY c.sort_order, c.code)
   FROM capacities c WHERE c.console_code = gbp.platform),
  '{}'
)
WHERE cardinality(gbp.capacities) = 0;
