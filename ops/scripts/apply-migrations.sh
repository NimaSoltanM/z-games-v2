#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "apply-migrations.sh must run as root" >&2
  exit 1
fi
if [[ ${1:-} != --new-database ]]; then
  echo "Refusing to guess migration state. Use --new-database only for an empty database." >&2
  exit 1
fi

migrations_dir=${2:-/opt/z-games/current/backend/migrations}
if [[ ! -d ${migrations_dir} ]]; then
  echo "Migration directory not found: ${migrations_dir}" >&2
  exit 1
fi

table_count=$(runuser -u zgames -- psql -d z_games -Atc \
  "SELECT count(*) FROM pg_tables WHERE schemaname='public'")
if [[ ${table_count} != 0 ]]; then
  echo "Database is not empty; refusing to replay migrations" >&2
  exit 1
fi

for migration in "${migrations_dir}"/[0-9][0-9][0-9]_*.sql; do
  echo "Applying $(basename -- "${migration}")"
  runuser -u zgames -- psql -d z_games -v ON_ERROR_STOP=1 -f "${migration}"
done

echo "All migrations applied successfully."
