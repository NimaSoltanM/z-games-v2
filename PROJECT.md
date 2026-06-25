# z-games — Project Context

## What this is

A Persian-language e-commerce website for selling PS4/PS5 game access to Iranian customers. The site sells **account capacity slots** (zarfiat/ظرفیت), not physical copies or digital keys. Prices are set in IRR (Iranian Rial) to be affordable compared to buying directly from PlayStation Store at USD prices.

---

## The core business model

Sony allows one PSN account to be activated as **primary** on a console, and the games on that account become available to all users on that console. Additionally, the account owner can play their games on any second console while online. This creates two sellable slots per account beyond the owner:

| Tier | Persian | How it works | Guarantee |
|------|---------|--------------|-----------|
| **Z2** | ظرفیت دوم | Customer receives email + password + PSN pass. They activate the account as **primary** on their own console. Game is permanently accessible even offline. Can also play on their own PSN account. | Lifetime |
| **Z3** | ظرفیت سوم | Same credentials, but customer does **not** set as primary. They play directly on the provided account. Must stay online (or keep network open) to pass the license check. | Lifetime |
| Z1 | ظرفیت اول | Direct game injection hack — no guarantee, risky, not sold on this platform. |  |

One purchased game account yields: 1× Z2 slot + 2× Z3 slots (theoretical max; in practice managed manually).

**Lifetime guarantee** means: if an account dies or gets banned, the business replaces it with an equivalent slot at no charge.

---

## Credential delivery — why it's mostly manual

PSN passes (the secondary password used to access PSN) have an expiry and must be fetched fresh through the PlayStation app. This makes pre-pooling credentials impractical for most games. The real flow is:

1. Customer orders and pays
2. Order lands in admin panel as **awaiting fulfillment**
3. Admin manually retrieves the current PSN pass, then enters email + password + PSN pass into the order
4. Customer sees credentials on their order page

For high-demand games (e.g. GTA 6), the admin may pre-buy accounts in advance, but credentials are still entered per order at fulfillment time.

---

## V1 scope

- Admin creates game listings manually (name, cover image, platform, price per tier)
- Users browse games, select a zarfiat tier (Z2 or Z3), and pay via ZarinPal
- Orders sit in an admin queue until credentials are manually entered
- Users view their fulfilled orders and credentials on their account page
- No scraping, no account trading, no auto-pooling — all V1+

---

## Planned future features (not in V1)

- **PS Store URL scraping**: paste a PSN Store link, auto-fill game name and price
- **Account trade-in**: customer films their TV logging out of the account, returns it, gets store credit for a new game
- **Account pooling**: pre-stocked inventory for predictable titles

---

## Pre-orders

PSN sells some games as pre-orders before launch, often with publisher rewards for early buyers. We mirror this: a customer can pre-order, we buy the real pre-order version on their behalf (so they get the pre-order rewards), but we **do not hand over credentials until the game officially releases**.

### What ships today (backend + storefront)

- **Data model** (`migration 009`): `games.release_status` (`released` | `pre_order`), `games.release_date` (nullable expected launch), `games.alert_message` + `games.alert_variant` (`info` | `warning`) for a free-form per-game admin notice, and `order_items.pre_order` (snapshotted at checkout).
- **Phase logic** — single source of truth in `internal/shared/release`:
  - `released` — normal storefront. A pre-order game flips here **automatically** once `release_date` passes, or when an admin sets status to `released`.
  - `pre_order` — taking pre-orders; purchasable, credentials withheld until launch.
  - `closing_soon` — within `CloseBuffer` (currently **24h**) of the release date: pre-order sales are closed and normal sales haven't started, so there is **no purchase option** (checkout also rejects these items server-side). Tune `CloseBuffer` if a title needs a wider window.
- **Storefront**: the game detail page renders the automatic pre-order alert + day countdown, the custom admin alert, the closing-window message, and relabels the buy button "پیش‌خرید"; the orders/dashboard pages explain that pre-order credentials arrive after launch.
- **Admin API** (admin-guarded, audited as `game.preorder` / `game.alert`), already live and what a future UI should call:
  - `PATCH /games/admin/:id/preorder` → `{ release_status, release_date? }`. `release_date` is a **partial field**: omit it to keep the stored date, send a string (ISO timestamp or `YYYY-MM-DD`) to set it, or `null`/`""` to clear it. Because a status-only change never touches the date, flipping `pre_order → released → pre_order` is a **lossless pause** — the countdown and auto-close resume exactly as before. Postpone a launch by sending a new date.
  - `PATCH /games/admin/:id/alert` → `{ message, variant }`; an empty `message` clears the alert.
  - Frontend client fns already exist: `setGamePreorder` / `setGameAlert` in `features/games/api.ts`.

### To build later (admin UI — deferred with the create-game page)

There is **no admin game-management page yet**. When the create-game/edit-game screens are built, add:

- A **pre-order toggle** + **expected release date** picker (date editable later to postpone).
- A **custom alert editor** (message + `info`/`warning` variant) per game.
- Both should call the admin endpoints above. Pre-orders use the same 3-capacity (Z1/Z2/Z3) purchase system — no changes there.

---

## Payment

ZarinPal (Iranian payment gateway). Flow:
1. Backend calls ZarinPal API → gets Authority code → redirects user to ZarinPal payment page
2. User pays → ZarinPal redirects to `/payment/callback?Authority=...&Status=OK`
3. Backend verifies with ZarinPal → marks order `paid`
4. Admin fulfills manually

---

## Users

- **Regular users**: phone-based OTP login, browse games, place orders, view credentials
- **Admins**: same auth, elevated role — manage game listings, fulfill orders

---

## Language & locale

- UI language: **Persian (Farsi)**
- Layout direction: **RTL**
- User-facing error messages: **Persian**
- Developer-facing errors / logs / thrown exceptions: **English**
