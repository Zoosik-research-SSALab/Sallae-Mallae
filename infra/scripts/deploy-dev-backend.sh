#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

BRANCH="dev-backend"

sync_branch "$BRANCH"
require_dir "$REPO_DIR/services/backend"

compose_up \
  "$ROOT_DIR/env/dev-backend.env" \
  "$REPO_DIR/infra/apps/docker-compose.backend.yml" \
  "sallae-dev-backend"
