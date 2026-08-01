#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "deploy-release.sh must run as root" >&2
  exit 1
fi

release_id=${1:-}
if [[ ! ${release_id} =~ ^[0-9]{14}$ ]]; then
  echo "Release ID must be a 14-digit UTC timestamp" >&2
  exit 1
fi

incoming_dir="/opt/z-games/incoming/${release_id}/source"
release_dir="/opt/z-games/releases/${release_id}"
current_link=/opt/z-games/current
api_env=/etc/z-games/api.env
frontend_env=/etc/z-games/frontend-build.env

for required in \
  "${incoming_dir}/backend/go.mod" \
  "${incoming_dir}/frontend/package.json" \
  "${incoming_dir}/frontend/bun.lock" \
  "${api_env}" \
  "${frontend_env}"; do
  if [[ ! -e ${required} ]]; then
    echo "Required deployment input is missing: ${required}" >&2
    exit 1
  fi
done
if [[ -e ${release_dir} ]]; then
  echo "Release already exists: ${release_dir}" >&2
  exit 1
fi

export GOPROXY=https://mirror.abrha.net/repository/go/,direct
export GOSUMDB=off
export GOTOOLCHAIN=local

pushd "${incoming_dir}/backend" >/dev/null
go mod download
go build -trimpath -ldflags='-s -w' -o api ./cmd/api
go build -trimpath -ldflags='-s -w' -o schema-check ./cmd/schema-check
popd >/dev/null

set -a
# This file is root-owned and contains only build-time Vite variables.
source "${frontend_env}"
set +a
pushd "${incoming_dir}/frontend" >/dev/null
bun install --frozen-lockfile
# Static image variants are generated with Sharp during local/CI asset work and
# committed to the release. The production host only compiles those assets; this
# also keeps deployment compatible with older x86-64 CPUs unsupported by Sharp's
# current prebuilt Linux binary.
bun run build:app
popd >/dev/null

install -d -m 0750 -o root -g zgames "$(dirname -- "${release_dir}")"
mv "${incoming_dir}" "${release_dir}"
chown -R root:zgames "${release_dir}"
find "${release_dir}" -type d -exec chmod g+rX,o-rwx {} +
find "${release_dir}" -type f -exec chmod g+r,o-rwx {} +
chmod 0550 "${release_dir}/backend/api" "${release_dir}/backend/schema-check"

set -a
source "${api_env}"
set +a
pushd "${release_dir}/backend" >/dev/null
runuser -u zgames -- env DATABASE_URL="${DATABASE_URL}" \
  ./schema-check
popd >/dev/null

install -m 0644 "${release_dir}/ops/systemd/z-games-api.service" \
  /etc/systemd/system/z-games-api.service
install -m 0644 "${release_dir}/ops/systemd/z-games-frontend.service" \
  /etc/systemd/system/z-games-frontend.service
nginx_template="${release_dir}/ops/nginx/z-games.conf"
if [[ -f /etc/letsencrypt/live/z-games.store/fullchain.pem ]]; then
  nginx_template="${release_dir}/ops/nginx/z-games-tls.conf"
fi
nginx_config=/etc/nginx/sites-available/z-games.conf
nginx_backup="${nginx_config}.deploy-backup"
nginx_had_previous=false
rm -f -- "${nginx_backup}"
if [[ -f ${nginx_config} ]]; then
  cp -a -- "${nginx_config}" "${nginx_backup}"
  nginx_had_previous=true
fi
install -m 0644 "${nginx_template}" "${nginx_config}"
if ! nginx -t; then
  if [[ ${nginx_had_previous} == true ]]; then
    mv -f -- "${nginx_backup}" "${nginx_config}"
  else
    rm -f -- "${nginx_config}"
  fi
  exit 1
fi
systemctl daemon-reload

previous_release=
if [[ -L ${current_link} ]]; then
  previous_release=$(readlink -f "${current_link}")
fi
ln -sfn "${release_dir}" "${current_link}.next"
mv -Tf "${current_link}.next" "${current_link}"

rollback() {
  echo "Release health check failed; restoring the previous release" >&2
  if [[ ${nginx_had_previous} == true && -f ${nginx_backup} ]]; then
    mv -f -- "${nginx_backup}" "${nginx_config}"
  elif [[ ${nginx_had_previous} == false ]]; then
    rm -f -- "${nginx_config}"
  fi
  if [[ -n ${previous_release} && -d ${previous_release} ]]; then
    ln -sfn "${previous_release}" "${current_link}.rollback"
    mv -Tf "${current_link}.rollback" "${current_link}"
    systemctl restart z-games-api.service z-games-frontend.service || true
  else
    systemctl stop z-games-api.service z-games-frontend.service || true
  fi
}

systemctl restart z-games-api.service z-games-frontend.service

api_ok=false
frontend_ok=false
for _ in {1..30}; do
  if curl --fail --silent --show-error http://127.0.0.1:3002/readyz \
    >/dev/null; then
    api_ok=true
    break
  fi
  sleep 1
done
for _ in {1..30}; do
  if curl --fail --silent --show-error http://127.0.0.1:3000/robots.txt \
    >/dev/null; then
    frontend_ok=true
    break
  fi
  sleep 1
done
if [[ ${api_ok} != true || ${frontend_ok} != true ]]; then
  rollback
  exit 1
fi

systemctl reload nginx
rm -f -- "${nginx_backup}"
rm -f -- "/tmp/z-games-${release_id}.tar.gz"
rmdir --ignore-fail-on-non-empty "/opt/z-games/incoming/${release_id}" || true

echo "Release ${release_id} is healthy and active."
