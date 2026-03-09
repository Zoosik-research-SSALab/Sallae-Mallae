#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-/srv/sallaemallae}"
REPO_DIR="$ROOT_DIR/repo"

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

sync_branch() {
  local branch="$1"
  require_dir "$REPO_DIR/.git"

  cd "$REPO_DIR"
  git fetch origin
  git checkout "$branch"
  git pull origin "$branch"
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
