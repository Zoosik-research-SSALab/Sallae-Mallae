#!/usr/bin/env bash
set -euo pipefail

TARGET="dev-ai"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_deploy_resources
sync_source
require_dir "$SOURCE_DIR/services/ai/3_ai_server"
require_dir "$SOURCE_DIR/services/ai/1_data_pipeline/stock"

compose_up \
  "$ROOT_DIR/env/dev-ai.env" \
  "$SOURCE_DIR/infra/apps/docker-compose.ai.yml" \
  "sallae-dev-ai"
