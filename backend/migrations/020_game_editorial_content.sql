-- Admin-managed editorial and search metadata for public game pages.
-- Empty/NULL values keep the storefront's safe generated defaults, so this is
-- backward-compatible with every existing game.
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS description_markdown TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_title VARCHAR(120),
  ADD COLUMN IF NOT EXISTS seo_description VARCHAR(320);
