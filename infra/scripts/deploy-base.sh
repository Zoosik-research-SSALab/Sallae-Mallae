#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

require_dir "$REPO_DIR/infra/postgres/init"
compose_up \
  "$ROOT_DIR/env/base.env" \
  "$REPO_DIR/infra/base/docker-compose.base.yml" \
  "sallae-base"
