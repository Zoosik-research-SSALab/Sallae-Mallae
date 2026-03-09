#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

BRANCH="develop"

sync_branch "$BRANCH"
require_dir "$REPO_DIR/services/backend"
require_dir "$REPO_DIR/services/frontend"
require_dir "$REPO_DIR/services/ai/3_ai_server"
require_dir "$REPO_DIR/services/ai/1_data_pipeline/stock"

compose_up \
  "$ROOT_DIR/env/develop.env" \
  "$REPO_DIR/infra/apps/docker-compose.full.yml" \
  "sallae-develop"
