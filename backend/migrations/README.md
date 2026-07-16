# Database migrations

These files are ordered, handwritten PostgreSQL migrations used directly by the
pgx backend. There is deliberately no ORM or second schema authority.

Before any migration, take a verified database backup. Run files exactly once in
numeric filename order with `psql -v ON_ERROR_STOP=1` so execution stops on the
first error.

## New database

Apply `001_initial.sql` through the highest-numbered migration. The PowerShell
loop in the repository `README.md` does this deterministically.

## Existing database

`001_initial.sql` restores the baseline that was missing from version control. A
database that already contains Z-Games tables must **not** apply `001`. Continue
from the first migration that has not already been deployed. In particular,
apply `016_super_admin_role.sql` even if the value was added manually; it is
idempotent. Migration `017` removes only pricing columns ignored by the current
application; current prices remain in `game_base_prices` and `game_prices`.

Until deployment infrastructure is chosen, record the highest applied migration
in the deployment log for each environment. Do not infer migration state from
the source tree or replay old files against production.

Example for one explicitly selected file:

```powershell
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f backend/migrations/016_super_admin_role.sql
```
