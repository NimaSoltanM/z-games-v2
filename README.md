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

Verify that the configured database matches the schema required by the current
backend before starting it:

```powershell
Set-Location backend
go run ./cmd/schema-check
```

The API performs this same check at startup and exits with the missing schema
objects and latest required migration instead of serving broken endpoints.

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

Production authentication sends OTPs through Payamak Panel's shared service-line
template endpoint. Set `PAYAMAK_PANEL_USERNAME`, `PAYAMAK_PANEL_API_KEY`, and the
approved `PAYAMAK_PANEL_BODY_ID`, then allowlist the deployment's outgoing IP in
the panel. The API returns `503` and removes the undelivered code when the
provider rejects or cannot complete a request.

Set `VITE_SITE_URL` to the final canonical HTTPS frontend origin. Set
`VITE_ALLOW_INDEXING=true` only in the production deployment after that domain is
live; staging and local builds intentionally emit `noindex` and block crawlers.
The production sitemap reads the active catalog from `VITE_API_URL`, so the
frontend server must be able to reach that API origin.
