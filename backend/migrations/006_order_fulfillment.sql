-- Fulfillment: admins enter the account credentials per order item, and the
-- order moves to 'fulfilled' once every item has them.
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS email    TEXT,
  ADD COLUMN IF NOT EXISTS password TEXT,
  ADD COLUMN IF NOT EXISTS psn_pass TEXT;

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_status_check,
  ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'paid', 'failed', 'fulfilled'));
