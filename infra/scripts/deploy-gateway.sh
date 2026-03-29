#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

compose_up \
  "$ROOT_DIR/env/gateway.env" \
  "$INFRA_TEMPLATE_DIR/gateway/docker-compose.gateway.yml" \
  "sallae-gateway"
