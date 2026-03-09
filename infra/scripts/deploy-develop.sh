#!/usr/bin/env bash
set -euo pipefail

TARGET="develop"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

sync_source
require_dir "$SOURCE_DIR/services/backend"
require_dir "$SOURCE_DIR/services/frontend"
require_dir "$SOURCE_DIR/services/ai/3_ai_server"
require_dir "$SOURCE_DIR/services/ai/1_data_pipeline/stock"

compose_up \
  "$ROOT_DIR/env/develop.env" \
  "$SOURCE_DIR/infra/apps/docker-compose.full.yml" \
  "sallae-develop"
