#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "backup.sh must run as root" >&2
  exit 1
fi

backup_root=/var/backups/z-games
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
archive="${backup_root}/z-games-${timestamp}.tar.gz"
partial_archive="${archive}.partial"
work_dir=$(mktemp -d "${backup_root}/.partial-${timestamp}-XXXXXX")

cleanup() {
  if [[ ${partial_archive} == "${backup_root}"/z-games-*.tar.gz.partial ]]; then
    rm -f -- "${partial_archive}"
  fi
  if [[ ${work_dir} == "${backup_root}"/.partial-* && -d ${work_dir} ]]; then
    rm -rf -- "${work_dir}"
  fi
}
trap cleanup EXIT

# A killed backup from an earlier run must not leave unbounded partial files.
find "${backup_root}" -maxdepth 1 -type f -name 'z-games-*.tar.gz.partial' \
  -mtime +1 -delete

runuser -u zgames -- pg_dump --format=custom --dbname=z_games \
  > "${work_dir}/database.dump"
pg_restore --list "${work_dir}/database.dump" >/dev/null

tar -C /var/lib/z-games -czf "${work_dir}/persistent-files.tar.gz" \
  uploads returns
backup_members=(database.dump persistent-files.tar.gz api.env)
if [[ -e /var/www/z-games/guides ]]; then
  tar --dereference -C /var/www/z-games -czf "${work_dir}/guide-videos.tar.gz" guides
  backup_members+=(guide-videos.tar.gz)
fi
install -m 0600 /etc/z-games/api.env "${work_dir}/api.env"
tar -C "${work_dir}" -czf "${partial_archive}" "${backup_members[@]}"
tar -tzf "${partial_archive}" >/dev/null
mv "${partial_archive}" "${archive}"
chmod 0600 "${archive}"

find "${backup_root}" -maxdepth 1 -type f -name 'z-games-*.tar.gz' \
  -mtime +14 -delete

echo "Created ${archive}"
