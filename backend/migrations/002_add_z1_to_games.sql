-- Add Z1 (ظرفیت ۱) tier columns to games table
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS z1_price_usd  NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS z1_price_toman INTEGER,
  ADD COLUMN IF NOT EXISTS z1_slots       INTEGER;
