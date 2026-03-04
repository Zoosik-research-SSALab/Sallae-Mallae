#!/usr/bin/env bash
set -euo pipefail

URL="${1:-http://localhost/api/health}"
RETRIES="${RETRIES:-30}"
SLEEP_SEC="${SLEEP_SEC:-2}"

out_file="/tmp/smoke_body.txt"
status_code="000"
: > "${out_file}"

echo "[smoke] checking ${URL} (retries=${RETRIES}, sleep=${SLEEP_SEC}s)"

for attempt in $(seq 1 "${RETRIES}"); do
  status_code="$(curl -sS -o "${out_file}" -w "%{http_code}" "${URL}" || true)"
  if [[ "${status_code}" == "200" ]]; then
    echo "[smoke] OK: HTTP 200 (attempt ${attempt}/${RETRIES})"
    cat "${out_file}"
    exit 0
  fi

  echo "[smoke] waiting... attempt ${attempt}/${RETRIES} (last HTTP ${status_code})"
  sleep "${SLEEP_SEC}"
done

echo "[smoke] FAILED: HTTP ${status_code}"
echo "[smoke] body:"
if [[ -s "${out_file}" ]]; then
  cat "${out_file}"
else
  echo "(no response body captured)"
fi
exit 1
