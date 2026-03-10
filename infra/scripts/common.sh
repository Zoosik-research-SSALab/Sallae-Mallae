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

  require_file "$env_file"
  require_file "$compose_file"

  docker compose \
    --env-file "$env_file" \
    -f "$compose_file" \
    -p "$project_name" \
    up -d --build
}
