#!/usr/bin/env bash
set -euo pipefail

TARGET="master"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_deploy_resources
sync_source
require_dir "$SOURCE_DIR/services/backend"
require_dir "$SOURCE_DIR/services/frontend"
require_dir "$SOURCE_DIR/services/ai/3_ai_server"
require_dir "$SOURCE_DIR/services/ai/1_data_pipeline/stock"
sync_runtime_nginx_conf "$SOURCE_DIR/infra/nginx/nginx.full.conf" "$TARGET"

compose_up \
  "$ROOT_DIR/env/master.env" \
  "$SOURCE_DIR/infra/apps/docker-compose.full.yml" \
  "sallae-master"

reload_nginx \
  "$ROOT_DIR/env/master.env" \
  "$SOURCE_DIR/infra/apps/docker-compose.full.yml" \
  "sallae-master"
