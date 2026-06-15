-- Enforce quantity cap at DB level (handler already checks this, DB is the backstop)
ALTER TABLE cart_items
  DROP CONSTRAINT IF EXISTS cart_items_quantity_check,
  ADD CONSTRAINT cart_items_quantity_check CHECK (quantity BETWEEN 1 AND 10);
