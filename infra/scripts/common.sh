#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-/srv/sallaemallae}"
CHECKOUT_DIR="${CHECKOUT_DIR:-$(cd "${SCRIPT_DIR}/../.." && pwd)}"
INFRA_TEMPLATE_DIR="${INFRA_TEMPLATE_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
TARGET_NAME="${TARGET_NAME:-${TARGET:-}}"
if [[ -z "${TARGET_NAME}" ]]; then
  TARGET_NAME="shared"
fi
SOURCE_DIR="${SOURCE_DIR:-$ROOT_DIR/source/$TARGET_NAME}"
DEPLOY_PRECHECK_ENV_FILE="${DEPLOY_PRECHECK_ENV_FILE:-${INFRA_TMP_DIR:-$ROOT_DIR/tmp}/deploy-precheck.env}"
DEPLOY_PRECHECK_DETAILS_FILE="${DEPLOY_PRECHECK_DETAILS_FILE:-${INFRA_TMP_DIR:-$ROOT_DIR/tmp}/deploy-precheck-details.txt}"

require_file() {
  local target="$1"
  if [[ ! -f "$target" ]]; then
    echo "required file not found: $target" >&2
    exit 1
  fi
}

require_dir() {
  local target="$1"
  if [[ ! -d "$target" ]]; then
    echo "required directory not found: $target" >&2
    exit 1
  fi
}

init_deploy_precheck_context() {
  mkdir -p "$(dirname "$DEPLOY_PRECHECK_ENV_FILE")"
  rm -f "$DEPLOY_PRECHECK_ENV_FILE" "$DEPLOY_PRECHECK_DETAILS_FILE"
}

write_deploy_precheck_context() {
  local status="$1"
  local summary="$2"

  mkdir -p "$(dirname "$DEPLOY_PRECHECK_ENV_FILE")"

  {
    printf 'DEPLOY_PRECHECK_STATUS=%q\n' "$status"
    printf 'DEPLOY_PRECHECK_SUMMARY=%q\n' "$summary"
  } >"$DEPLOY_PRECHECK_ENV_FILE"
}

write_deploy_precheck_details() {
  mkdir -p "$(dirname "$DEPLOY_PRECHECK_DETAILS_FILE")"
  cat >"$DEPLOY_PRECHECK_DETAILS_FILE"
}

check_deploy_resources() {
  init_deploy_precheck_context

  local min_mem_available_mb="${DEPLOY_MIN_MEM_AVAILABLE_MB:-1536}"
  local max_swap_used_mb="${DEPLOY_MAX_SWAP_USED_MB:-256}"
  local max_disk_used_percent="${DEPLOY_MAX_DISK_USED_PERCENT:-85}"
  local max_load_per_cpu="${DEPLOY_MAX_LOAD_PER_CPU:-1.5}"
  local root_check_path="${DEPLOY_ROOT_CHECK_PATH:-$ROOT_DIR}"
  local docker_root_dir="${DOCKER_ROOT_DIR_OVERRIDE:-}"

  local cpu_count
  cpu_count="$(nproc 2>/dev/null || echo 1)"

  local load1
  load1="$(awk '{print $1}' /proc/loadavg)"

  local mem_available_kb swap_total_kb swap_free_kb
  mem_available_kb="$(awk '/MemAvailable:/ {print $2}' /proc/meminfo)"
  swap_total_kb="$(awk '/SwapTotal:/ {print $2}' /proc/meminfo)"
  swap_free_kb="$(awk '/SwapFree:/ {print $2}' /proc/meminfo)"

  local mem_available_mb swap_used_mb
  mem_available_mb=$((mem_available_kb / 1024))
  swap_used_mb=$(((swap_total_kb - swap_free_kb) / 1024))

  local root_disk_used_percent="unknown"
  if [[ -e "$root_check_path" ]]; then
    root_disk_used_percent="$(df -P "$root_check_path" | awk 'NR==2 {gsub("%","",$5); print $5}')"
  fi

  if [[ -z "$docker_root_dir" ]]; then
    docker_root_dir="$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || true)"
  fi
  if [[ -z "$docker_root_dir" && -d /var/lib/docker ]]; then
    docker_root_dir="/var/lib/docker"
  fi

  local docker_disk_used_percent="unknown"
  if [[ -n "$docker_root_dir" && -e "$docker_root_dir" ]]; then
    docker_disk_used_percent="$(df -P "$docker_root_dir" | awk 'NR==2 {gsub("%","",$5); print $5}')"
  fi

  local max_load
  max_load="$(awk -v cpu="$cpu_count" -v ratio="$max_load_per_cpu" 'BEGIN { printf "%.2f", cpu * ratio }')"

  local reasons=()

  if (( mem_available_mb < min_mem_available_mb )); then
    reasons+=("available memory ${mem_available_mb}MB < threshold ${min_mem_available_mb}MB")
  fi

  if (( swap_used_mb > max_swap_used_mb )); then
    reasons+=("swap used ${swap_used_mb}MB > threshold ${max_swap_used_mb}MB")
  fi

  if [[ "$root_disk_used_percent" != "unknown" ]] && (( root_disk_used_percent >= max_disk_used_percent )); then
    reasons+=("root disk usage ${root_disk_used_percent}% >= threshold ${max_disk_used_percent}% (path: ${root_check_path})")
  fi

  if [[ "$docker_disk_used_percent" != "unknown" ]] && (( docker_disk_used_percent >= max_disk_used_percent )); then
    reasons+=("docker disk usage ${docker_disk_used_percent}% >= threshold ${max_disk_used_percent}% (path: ${docker_root_dir})")
  fi

  if ! awk -v current_load="$load1" -v max_allowed="$max_load" 'BEGIN { exit !(current_load <= max_allowed) }'; then
    reasons+=("load1 ${load1} > threshold ${max_load} (cpu: ${cpu_count}, per-cpu limit: ${max_load_per_cpu})")
  fi

  if [[ "${#reasons[@]}" -eq 0 ]]; then
    return 0
  fi

  local summary="서버 자원 사용량이 높아 배포를 중단했습니다."
  write_deploy_precheck_context "blocked" "$summary"

  {
    printf '배포 전 자원 점검에서 임계치를 초과했습니다.\n\n'
    printf '초과 항목:\n'
    printf '  - %s\n' "${reasons[@]}"
    printf '\n현재 스냅샷:\n'
    printf '  - mem_available_mb: %s\n' "$mem_available_mb"
    printf '  - swap_used_mb: %s\n' "$swap_used_mb"
    printf '  - load1: %s\n' "$load1"
    printf '  - cpu_count: %s\n' "$cpu_count"
    printf '  - root_disk_used_percent: %s\n' "$root_disk_used_percent"
    printf '  - root_check_path: %s\n' "$root_check_path"
    printf '  - docker_disk_used_percent: %s\n' "$docker_disk_used_percent"
    printf '  - docker_root_dir: %s\n' "${docker_root_dir:-unknown}"
    printf '\n기준값:\n'
    printf '  - min_mem_available_mb: %s\n' "$min_mem_available_mb"
    printf '  - max_swap_used_mb: %s\n' "$max_swap_used_mb"
    printf '  - max_disk_used_percent: %s\n' "$max_disk_used_percent"
    printf '  - max_load_per_cpu: %s\n' "$max_load_per_cpu"
  } | write_deploy_precheck_details

  echo "$summary" >&2
  printf '  - %s\n' "${reasons[@]}" >&2
  return 1
}

sync_source() {
  require_dir "$CHECKOUT_DIR"
  require_dir "$INFRA_TEMPLATE_DIR"
  mkdir -p "$ROOT_DIR/source"

  local tmp_dir="$ROOT_DIR/source/.tmp-$TARGET_NAME"
  rm -rf "$tmp_dir"
  mkdir -p "$tmp_dir"

  tar \
    --exclude=.git \
    --exclude=.idea \
    --exclude=.vscode \
    --exclude=.codex \
    --exclude=node_modules \
    --exclude=target \
    -cf - -C "$CHECKOUT_DIR" . | tar -xf - -C "$tmp_dir"

  rm -rf "$tmp_dir/infra"
  cp -a "$INFRA_TEMPLATE_DIR" "$tmp_dir/infra"

  rm -rf "$SOURCE_DIR"
  mkdir -p "$(dirname "$SOURCE_DIR")"
  mv "$tmp_dir" "$SOURCE_DIR"
}

compose_up() {
  local env_file="$1"
  local compose_file="$2"
  local project_name="$3"
  shift 3

  require_file "$env_file"
  require_file "$compose_file"

  docker compose \
    --env-file "$env_file" \
    -f "$compose_file" \
    -p "$project_name" \
    up -d --build "$@"
}

reload_nginx() {
  local env_file="$1"
  local compose_file="$2"
  local project_name="$3"

  require_file "$env_file"
  require_file "$compose_file"

  docker compose \
    --env-file "$env_file" \
    -f "$compose_file" \
    -p "$project_name" \
    exec -T nginx nginx -s reload
}

sync_runtime_nginx_conf() {
  local source_conf="$1"
  local target_name="$2"

  require_file "$source_conf"

  local runtime_dir="$ROOT_DIR/env/nginx/$target_name"
  local runtime_conf="$runtime_dir/default.conf"
  local tmp_conf="$runtime_conf.tmp.$$"

  mkdir -p "$runtime_dir"
  cp "$source_conf" "$tmp_conf"

  # Keep the same inode when possible so an already-mounted bind source keeps
  # seeing updated contents after nginx reloads.
  if [[ -f "$runtime_conf" ]]; then
    cat "$tmp_conf" > "$runtime_conf"
    rm -f "$tmp_conf"
  else
    mv "$tmp_conf" "$runtime_conf"
  fi

  export NGINX_CONFIG_PATH="$runtime_conf"
}
