# 20260201234013 - Redirect Home to Workspace When Signed In

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-01 23:40:13 EST |
| **Last Modified**  | 2026-02-01 23:44:32 EST |
| **Status**         | completed |
| **Agent**          | slim-marten |
| **Blocked-By**     | none |
| **Touches**        | src/middleware.ts |
| **References**     | [Design Doc](../../design-claude.md) |

## Description

When a signed-in user navigates to the home page (`/`), they currently see the marketing landing page. Instead, they should be redirected to their workspace chat page, since the landing page is only useful for unauthenticated visitors.

## Acceptance Criteria

- [x] Authenticated users visiting `/` are redirected to `/w/<workspaceId>`
- [x] Unauthenticated users visiting `/` still see the landing page

## Implementation Steps

_To be filled in when the task is started._

## Progress Log

### 2026-02-01 23:40:13 EST
Initial creation. User request to skip landing page for signed-in users.

### 2026-02-01 23:41:07 EST
Completed. Extended the existing `/login` redirect condition in `src/middleware.ts` to also match `/`, `/login`, and `/signup`. One-line change: `pathname === "/login"` → `(pathname === "/" || pathname === "/login" || pathname === "/signup")`. Build passes.
