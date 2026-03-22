#!/usr/bin/env bash
set -euo pipefail

TARGET="dev-backend"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_deploy_resources
sync_source
require_dir "$SOURCE_DIR/services/backend"
sync_runtime_nginx_conf "$SOURCE_DIR/infra/nginx/nginx.backend.conf" "$TARGET"

compose_up \
  "$ROOT_DIR/env/dev-backend.env" \
  "$SOURCE_DIR/infra/apps/docker-compose.backend.yml" \
  "sallae-dev-backend"

reload_nginx \
  "$ROOT_DIR/env/dev-backend.env" \
  "$SOURCE_DIR/infra/apps/docker-compose.backend.yml" \
  "sallae-dev-backend"
