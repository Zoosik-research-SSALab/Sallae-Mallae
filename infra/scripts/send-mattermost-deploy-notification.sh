#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${MATTERMOST_WEBHOOK_URL:-}" ]]; then
  echo "MATTERMOST_WEBHOOK_URL is not set; skipping Mattermost notification."
  exit 0
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
  python3 - <<'PY'
import json
import os

lines = [
    os.environ["TITLE"],
    "",
    f"- project: `{os.environ['PROJECT_PATH']}`",
    f"- branch: `{os.environ['BRANCH_NAME']}`",
    f"- commit: `{os.environ['COMMIT_SHA']}`",
    f"- author: `{os.environ['COMMIT_AUTHOR']}`",
    f"- commit message: {os.environ['COMMIT_MESSAGE']}",
]

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
