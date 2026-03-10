#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

TARGET="${1:-}"
if [[ -z "$TARGET" ]]; then
  echo "usage: $0 <base|dev-frontend|dev-backend|dev-ai|develop|master>" >&2
  exit 1
fi

app_db_name="app"
app_db_user="app_user"
app_db_password="${APP_DB_PASSWORD:-}"

if [[ -z "$app_db_password" ]]; then
  echo "APP_DB_PASSWORD is required" >&2
  exit 1
fi

normalize_target_prefix() {
  echo "$1" | tr '[:lower:]-' '[:upper:]_'
}

append_prefixed_env() {
  local prefix="$1"
  local out_file="$2"
  local reserved_csv="$3"

  while IFS= read -r var_name; do
    [[ "$var_name" == ${prefix}* ]] || continue

    local key="${var_name#${prefix}}"
    [[ "$key" =~ ^[A-Z][A-Z0-9_]*$ ]] || continue

    if [[ ",$reserved_csv," == *",$key,"* ]]; then
      continue
    fi

    local value="${!var_name}"
    if [[ "$value" == *$'\n'* ]]; then
      echo "multiline env is not supported: $var_name" >&2
      exit 1
    fi

    printf '%s=%s\n' "$key" "$value" >> "$out_file"
  done < <(compgen -A variable | sort)
}

case "$TARGET" in
  base)
    ;;
  dev-frontend)
    nginx_port="8081"
    spring_profile="dev"
    java_tool_options="-Xms256m -Xmx1024m"
    ;;
  dev-backend)
    nginx_port="8082"
    spring_profile="dev"
    java_tool_options="-Xms256m -Xmx1024m"
    ;;
  dev-ai)
    nginx_port="8083"
    spring_profile="dev"
    java_tool_options="-Xms256m -Xmx1024m"
    ;;
  develop)
    nginx_port="8084"
    spring_profile="dev"
    java_tool_options="-Xms256m -Xmx1024m"
    ;;
  master)
    nginx_port="8085"
    spring_profile="prod"
    java_tool_options="-Xms512m -Xmx1536m"
    ;;
  *)
    echo "unsupported target: $TARGET" >&2
    exit 1
    ;;
esac

mkdir -p "$ROOT_DIR/env"

base_file="$ROOT_DIR/env/base.env"
: > "$base_file"

append_prefixed_env \
  "ENV_BASE_" \
  "$base_file" \
  "POSTGRES_SUPERUSER,POSTGRES_SUPERPASSWORD,APP_DB_NAME,APP_DB_USER,APP_DB_PASSWORD"

cat >> "$base_file" <<EOF
POSTGRES_SUPERUSER=postgres
POSTGRES_SUPERPASSWORD=${POSTGRES_SUPERPASSWORD}
APP_DB_NAME=${app_db_name}
APP_DB_USER=${app_db_user}
APP_DB_PASSWORD=${app_db_password}
EOF

if [[ "$TARGET" == "base" ]]; then
  echo "generated:"
  echo "  $ROOT_DIR/env/base.env"
  exit 0
fi

target_file="$ROOT_DIR/env/${TARGET}.env"
target_prefix="ENV_$(normalize_target_prefix "$TARGET")_"
: > "$target_file"

append_prefixed_env \
  "$target_prefix" \
  "$target_file" \
  "DEPLOY_ENV,COMPOSE_PROJECT_NAME,APP_NETWORK_NAME,NGINX_PORT,SPRING_PROFILE,JAVA_TOOL_OPTIONS,APP_DB_NAME,APP_DB_USER,APP_DB_PASSWORD"

cat >> "$target_file" <<EOF
DEPLOY_ENV=${TARGET}
COMPOSE_PROJECT_NAME=sallae-${TARGET}
APP_NETWORK_NAME=sallae-${TARGET}-net
NGINX_PORT=${nginx_port}
SPRING_PROFILE=${spring_profile}
JAVA_TOOL_OPTIONS=${java_tool_options}

APP_DB_NAME=${app_db_name}
APP_DB_USER=${app_db_user}
APP_DB_PASSWORD=${app_db_password}
EOF

echo "generated:"
echo "  $ROOT_DIR/env/base.env"
echo "  $ROOT_DIR/env/${TARGET}.env"
