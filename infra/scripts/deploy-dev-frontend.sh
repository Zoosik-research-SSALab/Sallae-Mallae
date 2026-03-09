#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

BRANCH="dev-frontend"

sync_branch "$BRANCH"
require_dir "$REPO_DIR/services/frontend"

compose_up \
  "$ROOT_DIR/env/dev-frontend.env" \
  "$REPO_DIR/infra/apps/docker-compose.frontend.yml" \
  "sallae-dev-frontend"
