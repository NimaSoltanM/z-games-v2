# Z-Games — project context

## What this is

Z-Games is a production Persian-language store for selling console game-account
capacities to customers in Iran. It sells access slots on managed accounts, not
physical discs or activation keys.

The application currently supports both console families represented in the
catalog:

- PlayStation 4 and PlayStation 5: capacities Z1, Z2, and Z3.
- Xbox One and Xbox Series X|S: capacities Home and Switch.

Consoles and capacities are data-driven database records. Prices, capacity
availability, labels, margins, and split percentages can differ by console; do
not reintroduce PlayStation-only enums or hardcoded capacity lists.

## Customer flow

1. A customer browses active games and selects a console and capacity.
2. They add the selection to the cart and authenticate by phone OTP.
3. Wallet credit is applied first; any remainder is paid through ZarinPal.
4. The paid order enters the admin fulfillment queue.
5. An admin supplies the account email, password, and console-specific passcode.
6. The customer sees the delivered credentials in their dashboard.

The third credential is intentionally generic in the data model: it is shown as
a PSN pass for PlayStation and a two-step verification code for Xbox.

## Capacity and pricing model

Each console has its own capacity catalog. A game may be listed on any subset of
consoles and, for dynamic prices, any subset of that console's capacities.

Games use one of two pricing modes:

- `dynamic`: a base USD price per console is converted with the current exchange
  rate, console margin, and capacity split percentage.
- `fixed`: the admin enters a Toman price for each console/capacity combination.

Games can also have scheduled discounts, tags, featured placement, pre-order
status and release dates, custom alerts, return eligibility, and temporary
reduced return fees.

## Fulfillment and credentials

Fulfillment is deliberately manual. Account credentials and passcodes can be
time-sensitive and the business must verify the exact account assigned to each
buyer. Credentials are encrypted at rest with AES-256 using `CREDENTIALS_KEY`.
Changing or losing that key makes existing credentials unreadable, so it must be
backed up separately from the database.

Pre-orders can be sold before release, but credentials remain unavailable until
the release phase permits fulfillment. A configurable closing window currently
stops purchases during the last 24 hours before release.

## Returns and wallet

Delivered accounts can be marked returnable. The customer submits one unedited
video showing account removal and accepts the public return rules. An admin then
approves, rejects as fixable, or permanently refuses the request.

Approved credit is the game's current price minus the applicable return fee. It
is added to the in-site wallet, never paid to a bank account. Wallet credit is
reserved and reconciled transactionally during checkout. Approved returned
accounts become reusable inventory for the same game, console, and capacity.

Return videos are private evidence. `RETURN_DIR` must point to a persistent,
backed-up, non-public volume in production.

## Administration

The current admin interface includes:

- game creation, editing, activation, featuring, discounts, alerts, pre-orders,
  return settings, console/capacity selection, and pricing configuration;
- paid-order review and credential fulfillment, including returned inventory;
- return-request review and private proof-video access;
- an append-only audit log for privileged actions.

## Authentication

Customers and admins authenticate by Iranian mobile number and a five-digit OTP.
`SUPER_ADMIN_PHONE` promotes the matching user on successful verification.

Development and test environments return `dev_code` for local use. Production
OTP delivery uses Payamak Panel's shared service-line template endpoint. It
requires `PAYAMAK_PANEL_USERNAME`, `PAYAMAK_PANEL_API_KEY`, and the approved
`PAYAMAK_PANEL_BODY_ID`; delivery failures return a Persian `503` and remove the
undelivered code. Never expose `dev_code` in production.

## Technology and architecture

- Backend: Go, Fiber v3, pgx, PostgreSQL, and ordered handwritten SQL migrations.
- Frontend: React 19, TanStack Start/Router/Query/Store, shadcn/ui, and Tailwind
  CSS v4.
- Language: Persian UI with RTL layout. User-facing errors are Persian;
  developer-facing errors and logs are English.

See `README.md` for local setup, migration, testing, and folder conventions.
