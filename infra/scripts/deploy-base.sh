#!/usr/bin/env bash
set -euo pipefail

TARGET="base"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

sync_source
require_dir "$SOURCE_DIR/infra/postgres/init"
compose_up \
  "$ROOT_DIR/env/base.env" \
  "$SOURCE_DIR/infra/base/docker-compose.base.yml" \
  "sallae-base"
