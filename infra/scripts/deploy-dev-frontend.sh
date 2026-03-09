#!/usr/bin/env bash
set -euo pipefail

TARGET="dev-frontend"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

sync_source
require_dir "$SOURCE_DIR/services/frontend"

compose_up \
  "$ROOT_DIR/env/dev-frontend.env" \
  "$SOURCE_DIR/infra/apps/docker-compose.frontend.yml" \
  "sallae-dev-frontend"
