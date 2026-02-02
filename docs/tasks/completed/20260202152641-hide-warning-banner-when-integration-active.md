# 20260202152641 - Hide Warning Banner When Integration Active

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-02 15:26:41 EST |
| **Last Modified**  | 2026-02-02 15:27:03 EST |
| **Status**         | completed |
| **Agent**          | gentle-gecko |
| **Blocked-By**     | none |
| **Touches**        | src/app/(app)/w/[workspaceId]/settings/integrations/page.tsx |
| **References**     | [Design Doc](../../design-docs/design-claw.md) |

## Description

The Google verification warning banner on the integration settings page is always displayed, even when the user already has an active Google Drive integration. The banner should only appear when there is no active integration (status is `not_connected` or `error`), since users who are already connected don't need to see the OAuth warning.

## Acceptance Criteria

- [x] Warning banner is hidden when integration status is `active`
- [x] Warning banner is visible when integration status is `not_connected` or `error`

## Implementation Steps

- [x] Add conditional rendering around the warning banner div based on `status`

## Progress Log

### 2026-02-02 15:26:41 EST
Initial creation. Starting work immediately — simple conditional rendering fix.

### 2026-02-02 15:27:03 EST
Completed. Wrapped the warning banner in `{status !== 'active' && (...)}` so it only renders when the integration is not connected or in error state.
