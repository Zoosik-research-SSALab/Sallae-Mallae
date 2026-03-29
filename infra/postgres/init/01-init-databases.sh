#!/usr/bin/env bash
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" --dbname "postgres" <<SQL
DO
\$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${APP_DB_USER}') THEN
        EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', '${APP_DB_USER}', '${APP_DB_PASSWORD}');
    END IF;
END
\$\$;

SELECT format('CREATE DATABASE %I OWNER %I', '${APP_DB_NAME}', '${APP_DB_USER}')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '${APP_DB_NAME}')
\gexec

REVOKE ALL ON DATABASE ${APP_DB_NAME} FROM PUBLIC;
GRANT CONNECT ON DATABASE ${APP_DB_NAME} TO ${APP_DB_USER};
SQL
