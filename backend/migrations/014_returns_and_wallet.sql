-- Game returns (account buy-back) + in-website wallet.
--
-- A customer who owns a delivered game account can return it: they film logging
-- out / removing the account, send the video, and once an admin confirms, get
-- store credit equal to the game's CURRENT store price minus a fee (default 25%).
-- Credit lands in an in-website wallet (never paid to bank) and is auto-applied
-- to future orders. See PROJECT.md "Account trade-in" and the returns module.

-- 1. Per-game return controls -------------------------------------------------
-- returnable: an admin can switch a specific game off so its accounts can't be
-- returned (default true: all current and future games are returnable).
-- return_fee_*: an OPTIONAL time-boxed reduced fee for one game, modeled exactly
-- like the discount window (games.discount_*). When live it replaces the global
-- 25% (pricing.DefaultReturnFeePct) to encourage returning that title. All three
-- fields are all-or-nothing; the percent is bounded so credit can't invert.
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS returnable           BOOLEAN  NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS return_fee_pct       SMALLINT,
  ADD COLUMN IF NOT EXISTS return_fee_starts_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS return_fee_ends_at   TIMESTAMP;

ALTER TABLE games
  ADD CONSTRAINT games_return_fee_pct_check
    CHECK (return_fee_pct IS NULL OR (return_fee_pct BETWEEN 0 AND 99)),
  ADD CONSTRAINT games_return_fee_window_check
    CHECK (
      (return_fee_pct IS NULL AND return_fee_starts_at IS NULL AND return_fee_ends_at IS NULL)
      OR (return_fee_pct IS NOT NULL AND return_fee_starts_at IS NOT NULL
          AND return_fee_ends_at IS NOT NULL AND return_fee_ends_at > return_fee_starts_at)
    );

-- 2. Wallet -------------------------------------------------------------------
-- The ledger (wallet_transactions) is the audit source of truth; wallet_balance
-- is a denormalized, non-negative running total updated in the same transaction
-- as each ledger row, so checkout can deduct with a single guarded UPDATE.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS wallet_balance INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT users_wallet_balance_check CHECK (wallet_balance >= 0);

CREATE TABLE wallet_transactions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount     INTEGER NOT NULL,            -- signed Toman: + credit / - spend
  reason     TEXT    NOT NULL,            -- return_credit | order_payment | order_refund
  ref_type   TEXT,                        -- return | order
  ref_id     TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX wallet_transactions_user_idx ON wallet_transactions (user_id, created_at DESC);

-- 3. Wallet reservation on orders ---------------------------------------------
-- orders.amount stays the full order value (display/history). wallet_applied is
-- how much of it was paid from the wallet at checkout; the rest (amount -
-- wallet_applied) is what ZarinPal charges and verifies against. A fully
-- wallet-covered order has wallet_applied = amount and never touches ZarinPal.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS wallet_applied INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT orders_wallet_applied_check CHECK (wallet_applied >= 0 AND wallet_applied <= amount);

-- 4. Return requests ----------------------------------------------------------
-- One row per delivered account (order_item) ever: a resubmit after a fixable
-- rejection reuses the row (rejected -> pending), so order_item_id is UNIQUE.
-- status: pending (awaiting review) | approved (credited, account returned) |
-- rejected (fixable, user can re-upload) | refused (terminal, no credit, account
-- forfeited). reason is the Persian admin note shown to the user on reject/refuse.
CREATE TABLE game_returns (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_item_id UUID    NOT NULL UNIQUE REFERENCES order_items(id) ON DELETE CASCADE,
  user_id       VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        TEXT    NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected', 'refused')),
  video_filename TEXT,
  agreed_terms  BOOLEAN NOT NULL DEFAULT false,
  reason        TEXT,
  credit_amount INTEGER CHECK (credit_amount IS NULL OR credit_amount >= 0),
  reviewed_by   VARCHAR REFERENCES users(id),
  reviewed_at   TIMESTAMP,
  created_at    TIMESTAMP NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX game_returns_user_idx   ON game_returns (user_id, created_at DESC);
CREATE INDEX game_returns_status_idx ON game_returns (status);
