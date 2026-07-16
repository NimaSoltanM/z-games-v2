-- Pricing is stored in game_base_prices and game_prices. These columns belonged
-- to the retired single-platform model and are no longer read by the application.
ALTER TABLE games
  DROP COLUMN IF EXISTS z1_price_usd,
  DROP COLUMN IF EXISTS z1_price_toman,
  DROP COLUMN IF EXISTS z1_slots,
  DROP COLUMN IF EXISTS z2_price_usd,
  DROP COLUMN IF EXISTS z2_price_toman,
  DROP COLUMN IF EXISTS z2_slots,
  DROP COLUMN IF EXISTS z3_price_usd,
  DROP COLUMN IF EXISTS z3_price_toman,
  DROP COLUMN IF EXISTS z3_slots;
