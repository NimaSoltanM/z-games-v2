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
