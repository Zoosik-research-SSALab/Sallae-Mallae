---
name: gitlab-ssafy
description: Use when working with the SSAFY GitLab project at lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208 for merge requests, code review, branches, commits, pipelines, issues, repository metadata, and other GitLab workflows that may require repository-specific authentication or conventions.
---

# GitLab SSAFY

Use this skill when the user wants GitLab work for the SSAFY project repository:

- create, update, inspect, or summarize merge requests
- review code or respond to review comments
- inspect branches, commits, tags, pipelines, or issues
- prepare links, titles, descriptions, and review summaries for GitLab
- perform repository actions against `https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208`

This skill is project-specific. Prefer this repository's actual Git remote and current branch state over assumptions.

## First checks

1. Confirm the current repository is the target project by checking `git remote -v`.
2. Inspect working tree state before taking Git actions:
   - `git status --short`
   - `git branch --show-current`
   - `git log --oneline -n 10`
3. If the task depends on GitLab server data, verify whether authentication is already available before asking the user.

## Authentication

GitLab actions that go beyond local git state usually need credentials.

Check for available auth in this order:

1. Existing Git credential manager or stored credentials already working with `git fetch`, `git push`, or `glab auth status`
2. Environment variables such as `GITLAB_TOKEN`, `GITLAB_PRIVATE_TOKEN`, `GLAB_TOKEN`, or `CI_JOB_TOKEN`
3. A user-provided personal access token

If credentials are missing, ask the user for the minimum required auth data. Prefer a personal access token with API scope sufficient for:

- reading merge requests, discussions, pipelines, and issues
- creating or editing merge requests
- posting review comments when requested

Do not print secrets back to the user. If a token must be stored for the session, prefer environment variables over writing plaintext files. In this repository, prefer reading `GITLAB_TOKEN` from `.env.local` or the current process environment.

## Preferred tools

Use the most direct available option:

1. Local git for branch, commit, diff, and push-related work
2. GitLab REST API if server state is required and a token is available
3. `glab` CLI only if explicitly requested by the user or already configured and clearly simpler

When using the API, derive the project from the remote URL and use the encoded project path:

- `s14-bigdata-recom-sub1%2FS14P21D208`

Typical API areas:

- merge requests: `/api/v4/projects/{project}/merge_requests`
- discussions: `/api/v4/projects/{project}/merge_requests/{iid}/discussions`
- pipelines: `/api/v4/projects/{project}/pipelines`
- issues: `/api/v4/projects/{project}/issues`
- repository branches: `/api/v4/projects/{project}/repository/branches`

## Merge request workflow

For MR work, follow this sequence:

1. Verify source branch, target branch, and local diff
2. Summarize the change in user-facing language from commits and changed files
3. Draft or update:
   - MR title
   - MR description
   - test or verification notes
   - review focus areas
4. If the user wants the MR created or edited, use the GitLab REST API first and `glab` only when explicitly requested
5. After creation, return the MR link, title, target branch, and a concise summary

Default MR description structure:

- Summary
- Changes
- Testing
- Risks
- Review Points

## Code review workflow

When reviewing an MR:

1. Fetch the MR diff or compare the source and target branches locally
2. Prioritize findings over summary
3. Report:
   - correctness bugs
   - regressions
   - missing tests
   - risky assumptions
   - merge or deployment concerns
4. Include file references and concrete reasoning
5. If no findings are discovered, state that clearly and mention any residual risk

If the user asks to post review comments to GitLab, prepare the exact comments first, then publish only after the user intent is clear and auth is confirmed.

## Safety rules

- Never push, merge, close, reopen, or comment on GitLab unless the user asked for that action
- Never expose tokens, cookies, or headers in outputs
- Do not overwrite unrelated local changes
- If server state and local state disagree, surface the mismatch with exact branch or MR identifiers
- Prefer absolute dates when clarifying pipeline runs, review timing, or MR activity

## Local command patterns

Useful local commands:

```powershell
git remote -v
git status --short
git branch --show-current
git log --oneline --decorate -n 15
git diff --stat origin/main...HEAD
git fetch origin
```

If `glab` is available and explicitly requested:

```powershell
glab auth status
glab mr view <iid>
glab mr create --source-branch <branch> --target-branch <branch>
glab mr note <iid> --message "<comment>"
glab ci status
```

If API access is needed, read [references/gitlab-api-notes.md](references/gitlab-api-notes.md).

## Expected outputs

Prefer concise, execution-oriented deliverables:

- MR titles and descriptions ready to paste or submit
- review findings with file references
- branch and pipeline status summaries
- exact next commands when an action depends on missing auth or missing tooling

When blocked by authentication, say exactly which credential is needed and for which operation.
