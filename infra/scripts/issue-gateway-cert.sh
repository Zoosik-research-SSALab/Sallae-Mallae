#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

ENV_FILE="${GATEWAY_ENV_FILE:-$ROOT_DIR/env/gateway.env}"
HTTP_TEMPLATE="../nginx/nginx.gateway.conf.template"
HTTPS_TEMPLATE="../nginx/nginx.gateway.https.conf.template"

upsert_env() {
  local key="$1"
  local value="$2"
  local escaped_value
  escaped_value="${value//\\/\\\\}"
  escaped_value="${escaped_value//&/\\&}"
  escaped_value="${escaped_value//|/\\|}"

  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${escaped_value}|" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

require_file "$ENV_FILE"
set -a
source "$ENV_FILE"
set +a

if ! command -v certbot >/dev/null 2>&1; then
  echo "certbot is required but not installed" >&2
  exit 1
fi

if [[ -z "${ROOT_HOST:-}" ]]; then
  echo "ROOT_HOST must be set in $ENV_FILE" >&2
  exit 1
fi

certbot_webroot="${CERTBOT_WEBROOT:-/var/www/certbot}"
letsencrypt_dir="${LETSENCRYPT_DIR:-/etc/letsencrypt}"

sudo mkdir -p "$certbot_webroot" "$letsencrypt_dir"

upsert_env "GATEWAY_NGINX_TEMPLATE" "$HTTP_TEMPLATE"

bash "$SCRIPT_DIR/deploy-gateway.sh"

certbot_args=(
  certbot certonly
  --non-interactive
  --agree-tos
  --webroot
  -w "$certbot_webroot"
  -d "$ROOT_HOST"
)

if [[ -n "${CERTBOT_EMAIL:-}" ]]; then
  certbot_args+=(--email "$CERTBOT_EMAIL")
else
  certbot_args+=(--register-unsafely-without-email)
fi

if [[ "${CERTBOT_STAGING:-0}" == "1" ]]; then
  certbot_args+=(--staging)
fi

sudo "${certbot_args[@]}"

if [[ ! -f "$letsencrypt_dir/live/$ROOT_HOST/fullchain.pem" ]]; then
  echo "certificate issuance did not produce $letsencrypt_dir/live/$ROOT_HOST/fullchain.pem" >&2
  exit 1
fi

upsert_env "GATEWAY_NGINX_TEMPLATE" "$HTTPS_TEMPLATE"

bash "$SCRIPT_DIR/deploy-gateway.sh"

echo "HTTPS is enabled for $ROOT_HOST"
