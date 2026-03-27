# GitLab API Notes

Use these notes only when a GitLab server action requires API access and `glab` is unavailable or unsuitable.

## Project

- Base host: `https://lab.ssafy.com`
- Project path: `s14-bigdata-recom-sub1/S14P21D208`
- URL-encoded project id for many endpoints: `s14-bigdata-recom-sub1%2FS14P21D208`

## Auth header

Prefer one of:

```text
PRIVATE-TOKEN: <token>
```

or:

```text
Authorization: Bearer <token>
```

## Common endpoints

```text
GET    /api/v4/projects/{project}
GET    /api/v4/projects/{project}/merge_requests
POST   /api/v4/projects/{project}/merge_requests
GET    /api/v4/projects/{project}/merge_requests/{iid}
PUT    /api/v4/projects/{project}/merge_requests/{iid}
GET    /api/v4/projects/{project}/merge_requests/{iid}/changes
GET    /api/v4/projects/{project}/merge_requests/{iid}/discussions
POST   /api/v4/projects/{project}/merge_requests/{iid}/notes
GET    /api/v4/projects/{project}/pipelines
GET    /api/v4/projects/{project}/repository/branches
GET    /api/v4/projects/{project}/issues
```

## PowerShell example

```powershell
$headers = @{ "PRIVATE-TOKEN" = $env:GITLAB_TOKEN }
Invoke-RestMethod `
  -Headers $headers `
  -Uri "https://lab.ssafy.com/api/v4/projects/s14-bigdata-recom-sub1%2FS14P21D208/merge_requests"
```

## MR creation fields

Common request body fields:

- `source_branch`
- `target_branch`
- `title`
- `description`
- `remove_source_branch`
- `squash`
- `draft`

## Review note guidance

Before posting notes:

1. Confirm the user wants comments published
2. Keep each note specific and actionable
3. Prefer one comment per distinct issue
4. Avoid posting speculative comments without evidence
