#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

ENV_FILE="${GATEWAY_ENV_FILE:-$ROOT_DIR/env/gateway.env}"

require_file "$ENV_FILE"

if ! command -v certbot >/dev/null 2>&1; then
  echo "certbot is required but not installed" >&2
  exit 1
fi

sudo certbot renew --quiet --deploy-hook "bash $SCRIPT_DIR/deploy-gateway.sh"

echo "certbot renew completed"
