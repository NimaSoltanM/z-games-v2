# Z-Games

Production storefront and administration application for Z-Games. Read
[`PROJECT.md`](./PROJECT.md) for the business rules and [`AGENTS.md`](./AGENTS.md)
before changing code.

## Repository layout

```text
backend/
  cmd/api/                  application entry point and environment validation
  internal/modules/         feature modules: auth, games, cart, orders, returns
  internal/shared/          shared middleware and business helpers
  internal/testdb/          PostgreSQL integration-test harness and schema
  migrations/               ordered PostgreSQL migrations
frontend/
  src/routes/               TanStack file routes and route boundaries
  src/features/             feature-owned API, state, types, and components
  src/components/ui/        shared shadcn/ui primitives
  src/lib/                  cross-feature frontend utilities
  public/                   static and PWA assets
docs/                       pinned local Fiber and TanStack documentation
```

Keep business logic inside the owning backend module or frontend feature.
Routes should compose feature code rather than become a second feature layer.
Shared code belongs in a shared directory only when multiple features genuinely
use it.

## Prerequisites

- Go 1.26.4 or the version declared in `backend/go.mod`
- Bun
- PostgreSQL with `pgcrypto`/`gen_random_uuid()` available
- `psql` for applying migrations

## Local setup

Create local environment files from the committed examples:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Replace the example secrets. `CREDENTIALS_KEY` must decode to exactly 32 bytes.
Generate one with a secure secret manager or cryptographic random-byte tool and
keep a separate backup.

Create the database, then apply every migration in filename order:

```powershell
Get-ChildItem backend/migrations/*.sql | Sort-Object Name | ForEach-Object {
  & psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f $_.FullName
  if ($LASTEXITCODE -ne 0) { throw "Migration failed: $($_.Name)" }
}
```

See [`backend/migrations/README.md`](./backend/migrations/README.md) before
running this against an existing environment.

Start each application in its own terminal:

```powershell
Set-Location backend
go run ./cmd/api
```

```powershell
Set-Location frontend
bun install
bun run dev
```

The defaults are frontend `http://localhost:3000` and backend
`http://localhost:3002`.

## Verification

```powershell
Set-Location backend
go test ./...
```

Database integration tests self-skip unless `TEST_DATABASE_URL` is set. The
database name must contain `test`; the harness deletes and recreates its public
schema.

```powershell
Set-Location frontend
bun run test
bun run typecheck
bun run lint
bun run check
bun run build
```

## Production requirements

Set `APP_ENV=production` explicitly. The backend refuses to start without the
required production URLs and storage paths, a valid encryption key, and
`ZARINPAL_SANDBOX=false`. If traffic reaches Fiber through a reverse proxy, set
`TRUSTED_PROXIES` to only the proxy IPs or CIDRs that may supply
`X-Forwarded-For`; otherwise leave it empty.

Production authentication remains unavailable until an SMS provider is
integrated. The API deliberately returns `503` for OTP requests in production so
it can never report a code as sent when no delivery occurred.
