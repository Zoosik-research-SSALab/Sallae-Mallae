#!/usr/bin/env bash
set -euo pipefail

TARGET="dev-backend"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

sync_source
require_dir "$SOURCE_DIR/services/backend"

compose_up \
  "$ROOT_DIR/env/dev-backend.env" \
  "$SOURCE_DIR/infra/apps/docker-compose.backend.yml" \
  "sallae-dev-backend"
