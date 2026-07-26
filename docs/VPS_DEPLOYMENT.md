# Z-Games VPS deployment

Production runs on Ubuntu 26.04:

- Nginx terminates HTTP/TLS and proxies only to loopback services.
- The TanStack Start frontend runs under Bun on `127.0.0.1:3000`.
- The Go/Fiber API runs under systemd on `127.0.0.1:3002`.
- PostgreSQL runs locally and authenticates the `zgames` Unix user with peer
  authentication, so the application does not need a local database password.
- Uploads, return videos, and backups live outside release directories.

The current production VPS is `109.122.247.5`. The canonical domains are
`z-games.store`, `www.z-games.store`, and `api.z-games.store`.

## One-time server bootstrap

SSH must use a trusted host key and a dedicated local private key. Password SSH
is disabled after key access is verified.

Upload the repository once, then run:

```bash
bash ops/scripts/bootstrap-server.sh
```

The bootstrap is idempotent. It configures ParsPack's Ubuntu mirror, installs
the production packages, pins Bun 1.3.14 from the normal npm registry, creates a
2 GiB swap file, creates the unprivileged `zgames` service account, initializes
the local database, installs systemd/Nginx configuration, and enables UFW.

The Go build uses ParsPack's module mirror:

```text
GOPROXY=https://mirror.abrha.net/repository/go/,direct
GOSUMDB=off
```

APT uses `https://repo.abrha.net/ubuntu`. npm intentionally remains
`https://registry.npmjs.org/`.

## Secrets and build configuration

Edit these root-owned files on the server:

```text
/etc/z-games/api.env
/etc/z-games/frontend-build.env
```

Keep `/etc/z-games/api.env` mode `0640`, owner `root`, group `zgames`. Never
commit it. Preserve the existing production `CREDENTIALS_KEY` when migrating a
database; changing it makes existing fulfilled credentials unreadable.

During payment/SMS provider review, use:

```text
PROVIDER_APPROVAL_MODE=true
ZARINPAL_SANDBOX=true
VITE_ALLOW_INDEXING=true
```

Indexing is enabled because `https://z-games.store` is the final public canonical
domain. Provider approval mode and payment sandboxing remain independent safety
switches. After both providers issue production credentials, configure them, set
`PROVIDER_APPROVAL_MODE=false` and `ZARINPAL_SANDBOX=false`, then deploy again.

## Database migration

For an empty database only, apply every migration exactly once:

```bash
bash ops/scripts/apply-migrations.sh --new-database \
  /opt/z-games/current/backend/migrations
```

For an existing production database, do not replay migrations. Export it in
custom format, copy it to the VPS, and restore without source-environment
ownership metadata:

```bash
runuser -u zgames -- pg_restore --clean --if-exists --no-owner \
  --dbname=z_games /path/to/database.dump
```

Take a backup before any restore or schema change. Validate the restored schema
with the release's `backend/schema-check` binary before switching traffic.

Persistent uploads must be copied to `/var/lib/z-games/uploads`; private return
videos go to `/var/lib/z-games/returns`. Both directories are owned by `zgames`
and are never served directly by Nginx.

## Deploying an update

From the repository root on the authorized Windows workstation:

```powershell
.\ops\deploy.ps1
```

That command packages the current working tree without `.env`, build output, or
dependencies; uploads it over verified key-only SSH; builds with the pinned
production URLs; checks the database schema; atomically switches the release;
restarts both services; and rolls back the symlink if either health check fails.

The deployment does not run database migrations. Apply a reviewed migration
explicitly before deploying code that requires it.

Useful operations:

```bash
systemctl status z-games-api z-games-frontend nginx postgresql
journalctl -u z-games-api -u z-games-frontend --since today
curl --fail http://127.0.0.1:3002/readyz
curl --fail http://127.0.0.1:3000/robots.txt
nginx -t
```

## DNS and TLS

Create these DNS records at the authoritative DNS provider:

| Name | Type | Value |
| --- | --- | --- |
| `@` | `A` | `109.122.247.5` |
| `www` | `A` | `109.122.247.5` |
| `api` | `A` | `109.122.247.5` |

After all three resolve publicly to the VPS and HTTP health checks pass:

```bash
certbot --nginx \
  -d z-games.store -d www.z-games.store -d api.z-games.store \
  --redirect
certbot renew --dry-run
```

Do not request certificates before DNS resolves to this server.

## Backups and rollback

`z-games-backup.timer` creates a nightly root-only archive under
`/var/backups/z-games` containing a PostgreSQL custom dump, persistent files,
and the API environment needed to decrypt existing credentials. Local archives
older than 14 days are removed.

A same-server backup is not disaster recovery. Copy backups regularly to an
off-server encrypted destination and test a restore. Before every release,
confirm browsing, login, admin, upload, payment callback, and backup/restore
checks on the final domain.
