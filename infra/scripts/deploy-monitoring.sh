#!/usr/bin/env bash
set -euo pipefail

TARGET="monitoring"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

sync_source
require_dir "$SOURCE_DIR/infra/monitoring"

compose_up \
  "$ROOT_DIR/env/monitoring.env" \
  "$SOURCE_DIR/infra/monitoring/docker-compose.monitoring.yml" \
  "sallae-monitoring"
