#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

TARGET="${1:-}"
if [[ -z "$TARGET" ]]; then
  echo "usage: $0 <base|dev-frontend|dev-backend|dev-ai|develop|master>" >&2
  exit 1
fi

case "$TARGET" in
  base)
    ;;
  dev-frontend)
    nginx_port="8081"
    spring_profile="dev"
    java_tool_options="-Xms256m -Xmx1024m"
    app_db_name="app_dev"
    app_db_user="app_dev_user"
    app_db_password="${DEV_DB_PASSWORD}"
    worker_db_name="app_dev"
    worker_db_user="app_dev_user"
    worker_db_password="${DEV_DB_PASSWORD}"
    ;;
  dev-backend)
    nginx_port="8082"
    spring_profile="dev"
    java_tool_options="-Xms256m -Xmx1024m"
    app_db_name="app_dev"
    app_db_user="app_dev_user"
    app_db_password="${DEV_DB_PASSWORD}"
    worker_db_name="app_dev"
    worker_db_user="app_dev_user"
    worker_db_password="${DEV_DB_PASSWORD}"
    ;;
  dev-ai)
    nginx_port="8083"
    spring_profile="dev"
    java_tool_options="-Xms256m -Xmx1024m"
    app_db_name="app_dev"
    app_db_user="app_dev_user"
    app_db_password="${DEV_DB_PASSWORD}"
    worker_db_name="app_dev"
    worker_db_user="app_dev_user"
    worker_db_password="${DEV_DB_PASSWORD}"
    ;;
  develop)
    nginx_port="8084"
    spring_profile="dev"
    java_tool_options="-Xms256m -Xmx1024m"
    app_db_name="app_dev"
    app_db_user="app_dev_user"
    app_db_password="${DEV_DB_PASSWORD}"
    worker_db_name="app_dev"
    worker_db_user="app_dev_user"
    worker_db_password="${DEV_DB_PASSWORD}"
    ;;
  master)
    nginx_port="8085"
    spring_profile="prod"
    java_tool_options="-Xms512m -Xmx1536m"
    app_db_name="app_prod"
    app_db_user="app_prod_user"
    app_db_password="${PROD_DB_PASSWORD}"
    worker_db_name="app_prod"
    worker_db_user="app_prod_user"
    worker_db_password="${PROD_DB_PASSWORD}"
    ;;
  *)
    echo "unsupported target: $TARGET" >&2
    exit 1
    ;;
esac

mkdir -p "$ROOT_DIR/env"

cat > "$ROOT_DIR/env/base.env" <<EOF
POSTGRES_SUPERUSER=postgres
POSTGRES_SUPERPASSWORD=${POSTGRES_SUPERPASSWORD}
DEV_DB_NAME=app_dev
DEV_DB_USER=app_dev_user
DEV_DB_PASSWORD=${DEV_DB_PASSWORD}
PROD_DB_NAME=app_prod
PROD_DB_USER=app_prod_user
PROD_DB_PASSWORD=${PROD_DB_PASSWORD}
EOF

if [[ "$TARGET" == "base" ]]; then
  echo "generated:"
  echo "  $ROOT_DIR/env/base.env"
  exit 0
fi

cat > "$ROOT_DIR/env/${TARGET}.env" <<EOF
DEPLOY_ENV=${TARGET}
COMPOSE_PROJECT_NAME=sallae-${TARGET}
APP_NETWORK_NAME=sallae-${TARGET}-net
NGINX_PORT=${nginx_port}
SPRING_PROFILE=${spring_profile}
JAVA_TOOL_OPTIONS=${java_tool_options}

APP_DB_NAME=${app_db_name}
APP_DB_USER=${app_db_user}
APP_DB_PASSWORD=${app_db_password}

WORKER_DB_NAME=${worker_db_name}
WORKER_DB_USER=${worker_db_user}
WORKER_DB_PASSWORD=${worker_db_password}
EOF

echo "generated:"
echo "  $ROOT_DIR/env/base.env"
echo "  $ROOT_DIR/env/${TARGET}.env"
