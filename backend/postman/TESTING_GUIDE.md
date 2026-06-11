# API Testing Guide

## Setup

1. Open Postman → Import → select `collection.json`
2. In the imported collection, open **Variables** and confirm:
   - `baseUrl` = `http://localhost:3001`
   - `phone` = your super_admin phone (e.g. `09019697619`)
3. Make sure **cookie management** is on: Postman → Settings → General → "Automatically follow redirects" ON. Cookies are handled automatically since auth_token is httpOnly.
4. Start the backend: `cd backend && bun run dev`

---

## Step-by-step flow

### Phase 1 — Server sanity

**Step 1 · Health Check**
- Run: `Health / Health Check`
- Expect: `200 { "status": "ok" }`
- If it fails: server isn't running or wrong port.

---

### Phase 2 — Auth as super_admin

**Step 2 · Request OTP**
- Run: `Auth / 1. Request OTP`
- Expect: `200 { message: "کد تأیید ارسال شد", dev_code: "XXXXX" }`
- The test script auto-saves `dev_code` into the `otp_code` variable.
- If no `dev_code`: you're running in production mode (`NODE_ENV=production`). Check `.env`.

**Step 3 · Verify OTP (existing user)**
- Run: `Auth / 2a. Verify OTP — existing user`
- Expect: `200 { status: "existing" }`
- The server sets `auth_token` cookie automatically. Postman stores it.
- If you get `{ status: "new" }` → run **2b + 3** instead (see Phase 2b below).

**Step 4 · Confirm you're logged in as super_admin**
- Run: `Auth / 4. Get Me`
- Expect: `200 { userId, phone, firstName, lastName, role: "super_admin" }`
- If `role` is `"user"`: the `SUPER_ADMIN_PHONE` in `.env` doesn't match the phone. Fix it and update your DB row: `UPDATE users SET role = 'super_admin' WHERE phone = '09...'`

---

### Phase 2b — Auth for a NEW user (first time only)

Only do this if your account doesn't exist yet.

**Step 3b · Verify OTP (new user)**
- Run: `Auth / 2b. Verify OTP — new user`
- Expect: `200 { status: "new", registration_token: "..." }`
- Token is auto-saved to `registration_token` variable.

**Step 3c · Register**
- Run: `Auth / 3. Register`
- Expect: `200 { message: "ثبت‌نام موفق" }`
- Now you have an `auth_token` cookie and are logged in.

---

### Phase 3 — Exchange rate

**Step 5 · Set exchange rate**
- Run: `Games — Admin / Set Exchange Rate`
- Body: `{ "usd_to_toman": 95000 }` (adjust to real rate)
- Expect: `200 { id: 1, usd_to_toman: 95000, updated_at: "..." }`

**Step 6 · Verify rate was saved**
- Run: `Games — Admin / Get Exchange Rate`
- Expect: `200 { usd_to_toman: 95000 }`

---

### Phase 4 — Create games

**Step 7 · Create a dynamic-priced game**
- Run: `Games — Admin / Create Game — dynamic pricing`
- Default body creates "Bloodborne" (PS4, Z2=$4.99, Z3=$2.99, active=true)
- Expect: `200 { id: "...", name: "Bloodborne", ... }`
- `game_id` is auto-saved to variable.

**Step 8 · Create a fixed-price game**
- Run: `Games — Admin / Create Game — fixed pricing`
- Default body creates "God of War Ragnarok" (PS5, Z2=450000T, Z3=250000T, slots set)
- Expect: `200 { id: "...", price_mode: "fixed", ... }`

**Step 9 · Create a game with cover image**
- Run: `Games — Admin / Create Game — dynamic pricing`
- In the body, find the `cover_image` row, change type to **File**, pick any `.jpg` from your machine.
- Expect: `200 { cover_image: "/uploads/timestamp-random.jpg" }`
- Then open `http://localhost:3001/uploads/timestamp-random.jpg` in browser — image should load.

---

### Phase 5 — Admin game list

**Step 10 · List all games (admin)**
- Run: `Games — Admin / List All Games (admin)`
- Expect: array containing your newly created games (including inactive ones if any)

---

### Phase 6 — Public catalog

**Step 11 · List active games (public)**
- Run: `Games — Public / List Active Games`
- Expect: only games with `active: true` are returned
- If you set a game to `active: false`, it must NOT appear here

**Step 12 · Get single game**
- Run: `Games — Public / Get Game by ID`
- Uses `game_id` variable set by previous tests
- Expect: `200 { game: {...}, exchange_rate: { usd_to_toman: 95000 } }`

**Step 13 · Confirm dynamic price math**
- In the response, find a game with `price_mode: "dynamic"` and `z2_price_usd: "4.99"`
- Expected Z2 price in Toman = `4.99 × 95000 = 474050`
- The frontend does this math — the API just returns raw values.

**Step 14 · Not found**
- Run: `Games — Public / Get Game — not found`
- Expect: `404 { message: "بازی مورد نظر یافت نشد" }` (Persian)

---

### Phase 7 — Update & delete

**Step 15 · Update a game**
- Run: `Games — Admin / Update Game`
- Default body changes name to "Bloodborne — Updated" and sets `active: false`
- Expect: `200 { name: "Bloodborne — Updated", active: false }`

**Step 16 · Confirm deactivated game disappears from public list**
- Run: `Games — Public / List Active Games`
- "Bloodborne — Updated" must NOT be in the response

**Step 17 · Delete a game**
- Run: `Games — Admin / Delete Game`
- Expect: `200 { message: "بازی حذف شد" }`

**Step 18 · Confirm game is gone**
- Run: `Games — Public / Get Game by ID` (same `game_id`)
- Expect: `404`

---

### Phase 8 — Auth protection checks

**Step 19 · Logout**
- Run: `Auth / 5. Logout`
- Expect: `200`

**Step 20 · Me after logout**
- Run: `Auth / 4b. Get Me — unauthenticated`
- Expect: `401`

**Step 21 · Admin route after logout**
- Run: `Games — Admin / Admin route — unauthenticated`
- Expect: `401`

**Step 22 · Regular user blocked from admin**
- Log in with a different phone number (a regular user account)
- Run: `Games — Admin / Admin route — user role blocked`
- Expect: `403 { message: "دسترسی مجاز نیست" }`

---

### Phase 9 — Edge cases

**Step 23 · Rate limiting**
- Log out, then hit `Auth / 1b. Request OTP — rate limit check` 4 times quickly
- 4th request must return `429`

**Step 24 · Wrong OTP burned after 3 attempts**
- Request a fresh OTP
- Run `Auth / 2c. Verify OTP — wrong code` 3 times
- 3rd attempt must return `400` with "این کد غیرفعال شده است" (burned)
- Requesting a new OTP and using the correct code must work again

---

## What each status means

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 400 | Bad input (wrong OTP, validation failed) |
| 401 | Not logged in |
| 403 | Logged in but wrong role |
| 404 | Resource not found |
| 409 | Conflict (phone already registered) |
| 429 | Rate limited |
| 500 | Server error — check backend logs |

## Updating this collection

`collection.json` is the source of truth. To add a new endpoint:
1. Add an item object under the correct folder in `collection.json`
2. Include `request`, `response: []`, and `event` (test script)
3. Re-import in Postman (or use Postman's built-in sync if you've set up a workspace)
