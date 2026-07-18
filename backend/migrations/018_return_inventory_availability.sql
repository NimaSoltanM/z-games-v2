-- Non-destructive manual availability for approved returned-account inventory.
--
-- Automatic reuse continues to be represented by reused_at/reused_for_item_id.
-- These columns are only for an admin explicitly taking an otherwise available
-- account out of inventory (for example, because it was sold outside the reuse
-- button). Keeping the two states separate preserves immutable reuse history.
ALTER TABLE game_returns
  ADD COLUMN inventory_disabled_at TIMESTAMP,
  ADD COLUMN inventory_disabled_by VARCHAR REFERENCES users(id) ON DELETE SET NULL;

DROP INDEX IF EXISTS game_returns_available_idx;
CREATE INDEX game_returns_available_idx
  ON game_returns (order_item_id)
  WHERE status = 'approved'
    AND reused_at IS NULL
    AND inventory_disabled_at IS NULL;
