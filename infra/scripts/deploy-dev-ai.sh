#!/usr/bin/env bash
set -euo pipefail

TARGET="dev-ai"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_deploy_resources

readonly DIFF_EXCLUDES=(
  --exclude=.git
  --exclude=.venv
  --exclude=__pycache__
  --exclude=.pytest_cache
  --exclude=.mypy_cache
  --exclude=.ruff_cache
  --exclude=.ipynb_checkpoints
  --exclude=README.md
  --exclude=docs
  --exclude=notebooks
  --exclude=tests
)

dir_changed() {
  local current_dir="$1"
  local deployed_dir="$2"

  if [[ ! -d "$current_dir" || ! -d "$deployed_dir" ]]; then
    return 0
  fi

  if diff -qr \
    "${DIFF_EXCLUDES[@]}" \
    "$current_dir" \
    "$deployed_dir" >/dev/null 2>&1; then
    return 1
  fi

  return 0
}

file_changed() {
  local current_file="$1"
  local deployed_file="$2"

  if [[ ! -f "$current_file" || ! -f "$deployed_file" ]]; then
    return 0
  fi

  ! cmp -s "$current_file" "$deployed_file"
}

compose_file_changed=false
if file_changed "$INFRA_TEMPLATE_DIR/apps/docker-compose.ai.yml" "$SOURCE_DIR/infra/apps/docker-compose.ai.yml"; then
  compose_file_changed=true
fi

nginx_config_changed=false
if file_changed "$INFRA_TEMPLATE_DIR/nginx/nginx.ai.conf" "$SOURCE_DIR/infra/nginx/nginx.ai.conf"; then
  nginx_config_changed=true
fi

ml_server_changed=false
if dir_changed "$CHECKOUT_DIR/services/ai/3_ai_server" "$SOURCE_DIR/services/ai/3_ai_server"; then
  ml_server_changed=true
fi

stock_scheduler_changed=false
if dir_changed "$CHECKOUT_DIR/services/ai/1_data_pipeline/stock" "$SOURCE_DIR/services/ai/1_data_pipeline/stock"; then
  stock_scheduler_changed=true
fi

news_scheduler_changed=false
if dir_changed "$CHECKOUT_DIR/services/ai/1_data_pipeline/news" "$SOURCE_DIR/services/ai/1_data_pipeline/news"; then
  news_scheduler_changed=true
fi
sync_source
require_dir "$SOURCE_DIR/services/ai/3_ai_server"
require_dir "$SOURCE_DIR/services/ai/1_data_pipeline/stock"
require_dir "$SOURCE_DIR/services/ai/1_data_pipeline/news"
sync_runtime_nginx_conf "$SOURCE_DIR/infra/nginx/nginx.ai.conf" "$TARGET"

runtime_nginx_path="${NGINX_CONFIG_PATH}"
current_nginx_mount_source="$(container_mount_source "sallae-dev-ai-nginx-1" "/etc/nginx/conf.d/default.conf" || true)"
nginx_mount_changed=false
if [[ -n "$current_nginx_mount_source" && "$current_nginx_mount_source" != "$runtime_nginx_path" ]]; then
  nginx_mount_changed=true
fi

services_to_up=()

if [[ "$compose_file_changed" == true || "$ml_server_changed" == true || "$nginx_config_changed" == true || "$nginx_mount_changed" == true ]]; then
  services_to_up+=("ml-server" "nginx")
fi

if [[ "$compose_file_changed" == true || "$stock_scheduler_changed" == true ]]; then
  services_to_up+=("stock-scheduler")
fi

if [[ "$compose_file_changed" == true || "$news_scheduler_changed" == true ]]; then
  services_to_up+=("news-scheduler")
fi

if [[ ${#services_to_up[@]} -eq 0 ]]; then
  echo "[INFO] No dev-ai deploy changes detected - skipping deploy."
  exit 0
fi

compose_up \
  "$ROOT_DIR/env/dev-ai.env" \
  "$SOURCE_DIR/infra/apps/docker-compose.ai.yml" \
  "sallae-dev-ai" \
  "${services_to_up[@]}"

if [[ "$nginx_config_changed" == true ]]; then
  reload_nginx \
    "$ROOT_DIR/env/dev-ai.env" \
    "$SOURCE_DIR/infra/apps/docker-compose.ai.yml" \
    "sallae-dev-ai"
fi
