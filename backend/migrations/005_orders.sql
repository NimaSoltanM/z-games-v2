-- Orders + line items. Line items snapshot the game NAME (so order history stays
-- readable if a game is later removed) but NOT the price — prices are dynamic and
-- an order only records the amount actually charged (orders.amount).
CREATE TABLE IF NOT EXISTS orders (
  id            UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       CHARACTER VARYING           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount        INTEGER                     NOT NULL CHECK (amount > 0),
  status        TEXT                        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  authority     TEXT                        UNIQUE,
  ref_id        BIGINT,
  referral_code TEXT,
  created_at    TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders (user_id);

CREATE TABLE IF NOT EXISTS order_items (
  id        UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id  UUID              NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  game_id   CHARACTER VARYING NOT NULL,
  game_name TEXT              NOT NULL,
  platform  TEXT              NOT NULL CHECK (platform IN ('ps4', 'ps5')),
  zarfiat   TEXT              NOT NULL CHECK (zarfiat IN ('z1', 'z2', 'z3')),
  quantity  INTEGER           NOT NULL CHECK (quantity BETWEEN 1 AND 10)
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items (order_id);

-- The referrer who introduced this customer (set once at signup, never overwritten).
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by TEXT;
