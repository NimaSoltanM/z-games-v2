-- Baseline schema for a new Z-Games database. Apply once, then apply every later
-- migration in numeric order. Existing databases created before this file was
-- restored must not replay it; see migrations/README.md.

CREATE TYPE user_role AS ENUM ('user', 'admin', 'super_admin');
CREATE TYPE platform AS ENUM ('ps4', 'ps5', 'ps4_ps5');
CREATE TYPE price_mode AS ENUM ('dynamic', 'fixed');

CREATE TABLE users (
  id         VARCHAR     PRIMARY KEY,
  phone      VARCHAR(15) NOT NULL UNIQUE,
  first_name VARCHAR(50),
  last_name  VARCHAR(50),
  created_at TIMESTAMP   NOT NULL DEFAULT NOW(),
  role       user_role   NOT NULL DEFAULT 'user'
);

CREATE TABLE otp_codes (
  id         VARCHAR    PRIMARY KEY,
  phone      VARCHAR(15) NOT NULL,
  code       VARCHAR(5) NOT NULL,
  expires_at TIMESTAMP  NOT NULL,
  used_at    TIMESTAMP,
  attempts   INTEGER    NOT NULL DEFAULT 0,
  created_at TIMESTAMP  NOT NULL DEFAULT NOW()
);
CREATE INDEX otp_codes_phone_idx ON otp_codes (phone);

CREATE TABLE games (
  id              VARCHAR      PRIMARY KEY,
  name            VARCHAR(200) NOT NULL,
  cover_image     VARCHAR(500),
  platform        platform     NOT NULL,
  price_mode      price_mode   NOT NULL DEFAULT 'dynamic',
  z2_price_usd    NUMERIC(10,2),
  z2_price_toman  INTEGER,
  z2_slots        INTEGER,
  z3_price_usd    NUMERIC(10,2),
  z3_price_toman  INTEGER,
  z3_slots        INTEGER,
  active          BOOLEAN      NOT NULL DEFAULT false,
  created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE game_links (
  id         VARCHAR      PRIMARY KEY,
  game_id    VARCHAR      NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  url        VARCHAR(500) NOT NULL UNIQUE,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE exchange_rate (
  id           INTEGER   PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  usd_to_toman INTEGER   NOT NULL CHECK (usd_to_toman > 0),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Fixed per-capacity prices. This table existed in the operational pgx schema
-- but was omitted when the original baseline was deleted.
CREATE TABLE game_prices (
  id          VARCHAR(36) PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  game_id     VARCHAR     NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  platform    VARCHAR(4)  NOT NULL,
  zarfiat     VARCHAR(2)  NOT NULL,
  price_usd   NUMERIC(10,2),
  price_toman INTEGER,
  slots       INTEGER,
  CONSTRAINT game_prices_platform_check CHECK (platform IN ('ps4', 'ps5')),
  CONSTRAINT game_prices_zarfiat_check CHECK (zarfiat IN ('z1', 'z2', 'z3')),
  UNIQUE (game_id, platform, zarfiat)
);
