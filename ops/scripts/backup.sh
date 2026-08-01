#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "backup.sh must run as root" >&2
  exit 1
fi

backup_root=/var/backups/z-games
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
archive="${backup_root}/z-games-${timestamp}.tar.gz"
work_dir=$(mktemp -d "${backup_root}/.partial-${timestamp}-XXXXXX")

cleanup() {
  if [[ ${work_dir} == "${backup_root}"/.partial-* && -d ${work_dir} ]]; then
    rm -rf -- "${work_dir}"
  fi
}
trap cleanup EXIT

runuser -u zgames -- pg_dump --format=custom --dbname=z_games \
  > "${work_dir}/database.dump"
pg_restore --list "${work_dir}/database.dump" >/dev/null

tar -C /var/lib/z-games -czf "${work_dir}/persistent-files.tar.gz" \
  uploads returns
install -m 0600 /etc/z-games/api.env "${work_dir}/api.env"
tar -C "${work_dir}" -czf "${archive}.partial" \
  database.dump persistent-files.tar.gz api.env
tar -tzf "${archive}.partial" >/dev/null
mv "${archive}.partial" "${archive}"
chmod 0600 "${archive}"

find "${backup_root}" -maxdepth 1 -type f -name 'z-games-*.tar.gz' \
  -mtime +14 -delete

echo "Created ${archive}"
