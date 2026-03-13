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

docker compose \
  --env-file "$ROOT_DIR/env/base.env" \
  -f "$SOURCE_DIR/infra/base/docker-compose.base.yml" \
  -p "sallae-base" \
  exec -T postgres \
  sh -lc 'until pg_isready -U "$POSTGRES_USER" -d postgres; do sleep 1; done; psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$APP_DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS timescaledb; CREATE EXTENSION IF NOT EXISTS vector;"'
