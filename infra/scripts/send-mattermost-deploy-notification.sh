#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${MATTERMOST_WEBHOOK_URL:-}" ]]; then
  echo "MATTERMOST_WEBHOOK_URL is not set; skipping Mattermost notification."
  exit 0
fi

deploy_precheck_env_file="${DEPLOY_PRECHECK_ENV_FILE:-${INFRA_TMP_DIR:-}/deploy-precheck.env}"
deploy_precheck_details_file="${DEPLOY_PRECHECK_DETAILS_FILE:-${INFRA_TMP_DIR:-}/deploy-precheck-details.txt}"

deploy_precheck_status=""
deploy_precheck_summary=""
if [[ -n "$deploy_precheck_env_file" && -f "$deploy_precheck_env_file" ]]; then
  # shellcheck disable=SC1090
  source "$deploy_precheck_env_file"
  deploy_precheck_status="${DEPLOY_PRECHECK_STATUS:-}"
  deploy_precheck_summary="${DEPLOY_PRECHECK_SUMMARY:-}"
fi

job_status="${CI_JOB_STATUS:-unknown}"
case "$job_status" in
  success)
    title="✅ **배포 성공**"
    guidance=""
    ;;
  failed)
    title="❌ **배포 실패**"
    guidance="> 조치 필요: 잡 로그를 확인해주세요."
    ;;
  *)
    echo "CI_JOB_STATUS=$job_status is not a deploy success/failure notification target; skipping."
    exit 0
    ;;
esac

payload="$(
  TITLE="$title" \
  PROJECT_PATH="${CI_PROJECT_PATH:-unknown}" \
  BRANCH_NAME="${CI_COMMIT_REF_NAME:-unknown}" \
  COMMIT_SHA="${CI_COMMIT_SHORT_SHA:-unknown}" \
  COMMIT_AUTHOR="${CI_COMMIT_AUTHOR:-unknown}" \
  COMMIT_MESSAGE="${CI_COMMIT_TITLE:-unknown}" \
  PIPELINE_URL="${CI_PIPELINE_URL:-unknown}" \
  JOB_URL="${CI_JOB_URL:-unknown}" \
  GUIDANCE="$guidance" \
  DEPLOY_PRECHECK_STATUS="$deploy_precheck_status" \
  DEPLOY_PRECHECK_SUMMARY="$deploy_precheck_summary" \
  DEPLOY_PRECHECK_DETAILS_FILE="$deploy_precheck_details_file" \
  python3 - <<'PY'
import json
import os
from pathlib import Path

lines = [
    os.environ["TITLE"],
    "",
    f"- project: `{os.environ['PROJECT_PATH']}`",
    f"- branch: `{os.environ['BRANCH_NAME']}`",
    f"- commit: `{os.environ['COMMIT_SHA']}`",
    f"- author: `{os.environ['COMMIT_AUTHOR']}`",
    f"- commit message: {os.environ['COMMIT_MESSAGE']}",
]

if os.environ.get("DEPLOY_PRECHECK_STATUS") == "blocked":
    lines.extend(
        [
            "",
            f"> 배포 사전 점검 차단: {os.environ.get('DEPLOY_PRECHECK_SUMMARY') or '자원 사용량 임계치 초과'}",
        ]
    )

    details_file = os.environ.get("DEPLOY_PRECHECK_DETAILS_FILE", "")
    if details_file and Path(details_file).is_file():
        details = Path(details_file).read_text(encoding="utf-8").strip()
        if details:
            lines.extend(["", "```text", details, "```"])

if os.environ["GUIDANCE"]:
    lines.extend(["", os.environ["GUIDANCE"]])

lines.extend(
    [
        "",
        f"[Pipeline 링크]({os.environ['PIPELINE_URL']}) | [Job 로그 링크]({os.environ['JOB_URL']})",
    ]
)

text = "\n".join(lines)

print(json.dumps({"text": text}, ensure_ascii=False))
PY
)"

curl -fsS \
  -X POST \
  -H "Content-Type: application/json" \
  --data "$payload" \
  "$MATTERMOST_WEBHOOK_URL" >/dev/null
