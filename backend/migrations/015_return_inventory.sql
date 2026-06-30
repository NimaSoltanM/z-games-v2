-- Returned-account inventory: reuse an approved return to fulfill a new order.
--
-- When a customer returns a game account and an admin approves it, that account
-- (its credentials live on the original order_item) becomes reusable stock: a
-- later buyer of the SAME game + console + capacity can be fulfilled with it
-- instead of the admin sourcing a brand-new account. These columns track that
-- consumption on the approved return row, so "available inventory" is simply an
-- approved return that hasn't been reused yet — no duplicate account table.
ALTER TABLE game_returns
  ADD COLUMN reused_at          TIMESTAMP,
  ADD COLUMN reused_for_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL;

-- Fast lookup of available stock (the partial index holds only reusable rows).
CREATE INDEX game_returns_available_idx
  ON game_returns (order_item_id)
  WHERE status = 'approved' AND reused_at IS NULL;
