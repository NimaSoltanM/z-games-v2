CREATE TABLE IF NOT EXISTS cart_items (
  id          UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     CHARACTER VARYING           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id     CHARACTER VARYING           NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  platform    TEXT                        NOT NULL CHECK (platform IN ('ps4', 'ps5')),
  zarfiat     TEXT                        NOT NULL CHECK (zarfiat IN ('z1', 'z2', 'z3')),
  quantity    INT                         NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at  TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, game_id, platform, zarfiat)
);
