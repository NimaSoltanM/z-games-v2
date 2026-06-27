-- Game merchandising: SEO slugs, an editorial "featured" flag, view tracking,
-- free-form tags (which double as genres), and time-boxed percentage discounts.
-- Trending and best-seller are derived from orders/views at query time, so they
-- are intentionally not stored as columns here.

-- 1. Slug --------------------------------------------------------------------
-- Public, human-readable identifier used in /games/:slug instead of the raw id.
ALTER TABLE games ADD COLUMN IF NOT EXISTS slug VARCHAR(120);

-- Backfill from the existing name: lowercase, drop apostrophes (so "Demon's Souls"
-- becomes "demons-souls"), collapse any run of remaining non-alphanumeric characters
-- to a single hyphen, then trim leading/trailing hyphens. A name with no latin
-- alphanumerics collapses to empty and is handled by the fallback below.
UPDATE games
SET slug = trim(BOTH '-' FROM lower(regexp_replace(
            regexp_replace(name, '[''’ʼ]', '', 'g'),
            '[^a-zA-Z0-9]+', '-', 'g')))
WHERE slug IS NULL;

-- Any row still without a usable slug falls back to a stable id-based one.
UPDATE games SET slug = 'game-' || left(id, 8) WHERE slug IS NULL OR slug = '';

-- De-duplicate: keep the oldest row's slug, suffix the rest with a short id slice
-- so the unique index below can be created without collisions.
WITH dupes AS (
  SELECT id, row_number() OVER (PARTITION BY slug ORDER BY created_at, id) AS rn
  FROM games
)
UPDATE games g
SET slug = g.slug || '-' || left(g.id, 6)
FROM dupes d
WHERE d.id = g.id AND d.rn > 1;

ALTER TABLE games ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS games_slug_key ON games (slug);

-- 2. Merchandising fields ----------------------------------------------------
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS featured           BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS view_count         INTEGER   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags               TEXT[]    NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS discount_pct       SMALLINT,
  ADD COLUMN IF NOT EXISTS discount_starts_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS discount_ends_at   TIMESTAMP;

-- A discount is either fully present (percent + window) or fully absent. The
-- percent is bounded so a discount can never zero out or invert a price.
ALTER TABLE games
  ADD CONSTRAINT games_discount_pct_check
    CHECK (discount_pct IS NULL OR (discount_pct BETWEEN 1 AND 99)),
  ADD CONSTRAINT games_discount_window_check
    CHECK (
      (discount_pct IS NULL AND discount_starts_at IS NULL AND discount_ends_at IS NULL)
      OR (discount_pct IS NOT NULL AND discount_starts_at IS NOT NULL
          AND discount_ends_at IS NOT NULL AND discount_ends_at > discount_starts_at)
    );

-- Featured-rail lookups and tag filtering.
CREATE INDEX IF NOT EXISTS games_featured_idx ON games (featured) WHERE featured;
CREATE INDEX IF NOT EXISTS games_tags_idx ON games USING GIN (tags);
