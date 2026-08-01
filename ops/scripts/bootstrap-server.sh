#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "bootstrap-server.sh must run as root" >&2
  exit 1
fi

repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
source /etc/os-release
if [[ ${ID:-} != ubuntu || ${VERSION_CODENAME:-} != resolute ]]; then
  echo "Expected Ubuntu 26.04 (resolute), found ${PRETTY_NAME:-unknown}" >&2
  exit 1
fi

backup_suffix=$(date -u +%Y%m%dT%H%M%SZ)
if [[ -f /etc/apt/sources.list && ! -f /etc/apt/sources.list.pre-z-games ]]; then
  cp -a /etc/apt/sources.list /etc/apt/sources.list.pre-z-games
fi
if [[ -f /etc/apt/sources.list.d/ubuntu.sources ]]; then
  mv /etc/apt/sources.list.d/ubuntu.sources \
    "/etc/apt/sources.list.d/ubuntu.sources.disabled.${backup_suffix}"
fi

cat > /etc/apt/sources.list <<'EOF'
deb https://repo.abrha.net/ubuntu resolute main restricted universe multiverse
deb https://repo.abrha.net/ubuntu resolute-updates main restricted universe multiverse
deb https://repo.abrha.net/ubuntu resolute-backports main restricted universe multiverse
deb https://repo.abrha.net/ubuntu resolute-security main restricted universe multiverse
EOF

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends \
  build-essential ca-certificates certbot curl fail2ban git golang-go jq nginx \
  nodejs npm postgresql postgresql-contrib python3-certbot-nginx rsync ufw unzip

# npm intentionally uses the normal public registry. Bun is pinned to the
# version used to build the current frontend release.
npm install --global bun@1.3.14

timedatectl set-timezone Asia/Tehran

if ! getent passwd zgames >/dev/null; then
  useradd --system --user-group --home-dir /opt/z-games \
    --shell /usr/sbin/nologin zgames
fi

install -d -m 0750 -o root -g zgames \
  /etc/z-games /opt/z-games /opt/z-games/incoming /opt/z-games/releases
install -d -m 0750 -o zgames -g zgames \
  /var/lib/z-games /var/lib/z-games/uploads /var/lib/z-games/returns
install -d -m 0700 -o root -g root /var/backups/z-games

if [[ ! -f /swapfile ]]; then
  fallocate -l 2G /swapfile
  chmod 0600 /swapfile
  mkswap /swapfile
fi
swapon --show=NAME --noheadings | grep -qx /swapfile || swapon /swapfile
grep -qE '^/swapfile[[:space:]]' /etc/fstab || \
  printf '%s\n' '/swapfile none swap sw 0 0' >> /etc/fstab

if ! runuser -u postgres -- psql -tAc \
  "SELECT 1 FROM pg_roles WHERE rolname='zgames'" | grep -qx 1; then
  runuser -u postgres -- createuser --no-createdb --no-createrole \
    --no-superuser zgames
fi
if ! runuser -u postgres -- psql -tAc \
  "SELECT 1 FROM pg_database WHERE datname='z_games'" | grep -qx 1; then
  runuser -u postgres -- createdb --owner=zgames z_games
fi

if [[ ! -f /etc/z-games/api.env ]]; then
  install -m 0640 -o root -g zgames \
    "${repo_root}/ops/env/api.env.example" /etc/z-games/api.env
fi
if [[ ! -f /etc/z-games/frontend-build.env ]]; then
  install -m 0640 -o root -g zgames \
    "${repo_root}/ops/env/frontend-build.env.example" \
    /etc/z-games/frontend-build.env
fi

install -m 0644 "${repo_root}/ops/systemd/z-games-api.service" \
  /etc/systemd/system/z-games-api.service
install -m 0644 "${repo_root}/ops/systemd/z-games-frontend.service" \
  /etc/systemd/system/z-games-frontend.service
install -m 0644 "${repo_root}/ops/systemd/z-games-backup.service" \
  /etc/systemd/system/z-games-backup.service
install -m 0644 "${repo_root}/ops/systemd/z-games-backup.timer" \
  /etc/systemd/system/z-games-backup.timer
install -m 0750 -o root -g root "${repo_root}/ops/scripts/backup.sh" \
  /usr/local/sbin/z-games-backup
install -m 0644 "${repo_root}/ops/nginx/z-games.conf" \
  /etc/nginx/sites-available/z-games.conf
ln -sfn /etc/nginx/sites-available/z-games.conf \
  /etc/nginx/sites-enabled/z-games.conf
if [[ -L /etc/nginx/sites-enabled/default ]]; then
  unlink /etc/nginx/sites-enabled/default
fi

cat > /etc/fail2ban/jail.d/z-games-sshd.local <<'EOF'
[sshd]
enabled = true
backend = systemd
maxretry = 5
findtime = 10m
bantime = 1h
EOF

nginx -t
systemctl daemon-reload
systemctl enable nginx postgresql fail2ban z-games-api.service \
  z-games-frontend.service z-games-backup.timer
systemctl restart nginx postgresql fail2ban
systemctl start z-games-backup.timer

ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "Bootstrap complete. Configure /etc/z-games/*.env before deployment."
