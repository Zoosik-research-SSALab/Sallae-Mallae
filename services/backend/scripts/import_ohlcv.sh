#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./services/backend/scripts/import_ohlcv.sh \
    --csv-dir /path/to/ohlcv \
    --host 127.0.0.1 \
    --port 5432 \
    --db app_dev \
    --user app_dev_user \
    --password 'secret' \
    [--schema public] \
    [--dry-run]

Description:
  Imports *_day.csv, *_week.csv, *_month.csv, *_year.csv files into:
    - stock_prices_daily
    - stock_prices_weekly
    - stock_prices_monthly
    - stock_prices_yearly

  The script assumes:
    - CSV header is:
      timestamp,symbol,dataset,interval,open,high,low,close,volume,amount,change
    - symbol matches stocks.ticker, optionally with zero-padding to 6 digits
    - change is treated as price difference, and fluctuation_rate is recalculated
      from the previous close price for each ticker/interval

  The script aborts if any ticker in the CSV files does not exist in stocks.ticker.
  Imports are done with UPSERT semantics via each table's unique key.

Examples:
  ./services/backend/scripts/import_ohlcv.sh \
    --csv-dir /srv/data/ohlcv \
    --host 127.0.0.1 \
    --port 5432 \
    --db app_dev \
    --user app_dev_user \
    --password 'change_me'

  ./services/backend/scripts/import_ohlcv.sh \
    --csv-dir /srv/data/ohlcv \
    --host 127.0.0.1 \
    --port 5432 \
    --db app_dev \
    --user app_dev_user \
    --password 'change_me' \
    --dry-run
EOF
}

CSV_DIR=""
DB_HOST=""
DB_PORT=""
DB_NAME=""
DB_USER=""
DB_PASSWORD=""
DB_SCHEMA="public"
DRY_RUN="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --csv-dir)
      CSV_DIR="$2"
      shift 2
      ;;
    --host)
      DB_HOST="$2"
      shift 2
      ;;
    --port)
      DB_PORT="$2"
      shift 2
      ;;
    --db)
      DB_NAME="$2"
      shift 2
      ;;
    --user)
      DB_USER="$2"
      shift 2
      ;;
    --password)
      DB_PASSWORD="$2"
      shift 2
      ;;
    --schema)
      DB_SCHEMA="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$CSV_DIR" || -z "$DB_HOST" || -z "$DB_PORT" || -z "$DB_NAME" || -z "$DB_USER" || -z "$DB_PASSWORD" ]]; then
  echo "Missing required arguments." >&2
  usage
  exit 1
fi

if [[ ! -d "$CSV_DIR" ]]; then
  echo "CSV directory does not exist: $CSV_DIR" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is not installed or not in PATH." >&2
  exit 1
fi

export PGPASSWORD="$DB_PASSWORD"

PSQL_BASE=(
  psql
  --host "$DB_HOST"
  --port "$DB_PORT"
  --username "$DB_USER"
  --dbname "$DB_NAME"
  --set ON_ERROR_STOP=1
  --quiet
)

escaped_path() {
  printf "%s" "$1" | sed "s/'/''/g"
}

append_interval_sql() {
  local sql_file="$1"
  local suffix="$2"
  local table_name="$3"
  local date_column="$4"
  local date_expr="$5"

  local stage_table="tmp_ohlcv_${suffix}_stage"
  local lower_suffix
  lower_suffix="$(printf "%s" "$suffix" | tr '[:upper:]' '[:lower:]')"

  cat <<SQL >> "$sql_file"
BEGIN;

CREATE TEMP TABLE ${stage_table} (
  raw_timestamp TEXT,
  symbol TEXT,
  dataset TEXT,
  interval_name TEXT,
  open NUMERIC,
  high NUMERIC,
  low NUMERIC,
  close NUMERIC,
  volume NUMERIC,
  amount NUMERIC,
  change_value NUMERIC
);

SQL

  shopt -s nullglob
  local files=("$CSV_DIR"/*_"$suffix".csv)
  shopt -u nullglob

  if [[ ${#files[@]} -eq 0 ]]; then
    echo "No files found for suffix *_${suffix}.csv under $CSV_DIR" >&2
    exit 1
  fi

  for file in "${files[@]}"; do
    local escaped
    escaped="$(escaped_path "$file")"
    printf "\\copy %s (raw_timestamp, symbol, dataset, interval_name, open, high, low, close, volume, amount, change_value) FROM '%s' WITH (FORMAT csv, HEADER true)\n" \
      "$stage_table" "$escaped" >> "$sql_file"
  done

  cat <<SQL >> "$sql_file"

DO \$\$
DECLARE
  unmatched_count INTEGER;
BEGIN
  SELECT COUNT(*)
    INTO unmatched_count
  FROM (
    SELECT DISTINCT LPAD(TRIM(symbol), 6, '0') AS ticker
    FROM ${stage_table}
    WHERE LOWER(TRIM(interval_name)) = '${lower_suffix}'
    EXCEPT
    SELECT ticker
    FROM ${DB_SCHEMA}.stocks
  ) unmatched;

  IF unmatched_count > 0 THEN
    RAISE EXCEPTION 'Found % unmatched tickers in % import', unmatched_count, '${suffix}';
  END IF;
END
\$\$;

WITH normalized AS (
  SELECT
    st.id AS stock_id,
    ${date_expr} AS period_value,
    ROUND(src.open)::INT AS open_price,
    ROUND(src.high)::INT AS high_price,
    ROUND(src.low)::INT AS low_price,
    ROUND(src.close)::INT AS close_price,
    ROUND(src.volume)::BIGINT AS volume,
    LAG(ROUND(src.close)::INT) OVER (
      PARTITION BY st.id
      ORDER BY ${date_expr}
    ) AS previous_close
  FROM ${stage_table} src
  JOIN ${DB_SCHEMA}.stocks st
    ON st.ticker = LPAD(TRIM(src.symbol), 6, '0')
  WHERE LOWER(TRIM(src.interval_name)) = '${lower_suffix}'
    AND src.close IS NOT NULL
)
INSERT INTO ${DB_SCHEMA}.${table_name} (
  stock_id,
  ${date_column},
  open_price,
  high_price,
  low_price,
  close_price,
  volume,
  fluctuation_rate,
  created_at
)
SELECT
  stock_id,
  period_value,
  open_price,
  high_price,
  low_price,
  close_price,
  volume,
  CASE
    WHEN previous_close IS NULL OR previous_close = 0 THEN 0::REAL
    ELSE ROUND((((close_price - previous_close)::NUMERIC / previous_close::NUMERIC) * 100), 4)::REAL
  END,
  NOW()
FROM normalized
ON CONFLICT (stock_id, ${date_column})
DO UPDATE SET
  open_price = EXCLUDED.open_price,
  high_price = EXCLUDED.high_price,
  low_price = EXCLUDED.low_price,
  close_price = EXCLUDED.close_price,
  volume = EXCLUDED.volume,
  fluctuation_rate = EXCLUDED.fluctuation_rate;

DROP TABLE ${stage_table};

SQL

  if [[ "$DRY_RUN" == "true" ]]; then
    cat <<'SQL' >> "$sql_file"
ROLLBACK;

SQL
  else
    cat <<'SQL' >> "$sql_file"
COMMIT;

SQL
  fi
}

tmp_sql="$(mktemp)"
trap 'rm -f "$tmp_sql"' EXIT

append_interval_sql "$tmp_sql" "day" "stock_prices_daily" "trade_date" "LEFT(TRIM(src.raw_timestamp), 10)::DATE"
append_interval_sql "$tmp_sql" "week" "stock_prices_weekly" "trade_week" "LEFT(TRIM(src.raw_timestamp), 10)::DATE"
append_interval_sql "$tmp_sql" "month" "stock_prices_monthly" "trade_month" "DATE_TRUNC('month', LEFT(TRIM(src.raw_timestamp), 10)::TIMESTAMP)::DATE"
append_interval_sql "$tmp_sql" "year" "stock_prices_yearly" "trade_year" "EXTRACT(YEAR FROM LEFT(TRIM(src.raw_timestamp), 10)::DATE)::INT"

echo "Starting OHLCV import from $CSV_DIR"
if [[ "$DRY_RUN" == "true" ]]; then
  echo "Running in dry-run mode. All changes will be rolled back."
fi

"${PSQL_BASE[@]}" --file "$tmp_sql"

echo "OHLCV import finished successfully."
