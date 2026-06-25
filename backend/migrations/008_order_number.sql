-- Human-readable order number. The UUID id stays the canonical key, but it's far
-- too long for a customer to read to support over the phone or recognize on the
-- payment result page. order_number is a short sequential code shown to humans.
--
-- A dedicated sequence (not the row count) backs it: nextval is atomic and
-- concurrency-safe, so two simultaneous checkouts can never collide — and a
-- BIGINT sequence has ~9.2e18 values, so it can't realistically be exhausted.
-- Starting at 100000 keeps every number a uniform 6+ digits from day one.
CREATE SEQUENCE IF NOT EXISTS orders_order_number_seq AS BIGINT START WITH 100000;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number BIGINT;

-- Backfill existing orders in chronological order so the oldest gets the lowest
-- number, matching how they were actually placed.
WITH numbered AS (
  SELECT id, (99999 + ROW_NUMBER() OVER (ORDER BY created_at, id))::bigint AS num
  FROM orders
  WHERE order_number IS NULL
)
UPDATE orders o SET order_number = numbered.num
FROM numbered WHERE o.id = numbered.id;

-- Advance the sequence past whatever we just assigned so new orders continue cleanly.
SELECT setval('orders_order_number_seq', GREATEST((SELECT MAX(order_number) FROM orders), 99999));

ALTER TABLE orders ALTER COLUMN order_number SET DEFAULT nextval('orders_order_number_seq');
ALTER TABLE orders ALTER COLUMN order_number SET NOT NULL;
ALTER TABLE orders ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);
