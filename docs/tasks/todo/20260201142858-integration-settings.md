# 20260201142858 - Integration Settings

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-01 14:28:48 EST |
| **Last Modified**  | 2026-02-01 14:28:48 EST |
| **Status**         | todo |
| **Blocked-By**     | 20260201142848, 20260201142851, 20260201142852, 20260201142854 |
| **Touches**        | `src/components/integrations/integration-card.tsx`, `src/components/integrations/index.ts`, `src/app/(app)/w/[workspaceId]/settings/integrations/page.tsx`, `src/app/(auth)/auth/integrations/google-drive/route.ts`, `src/app/(auth)/auth/integrations/google-drive/callback/route.ts`, `src/app/api/integrations/[provider]/route.ts` |
| **References**     | [Design Doc](../../design-claude.md) |

## Description

Implement the full Google Drive integration flow — settings page, OAuth initiation/callback routes, and disconnect API route.

## Acceptance Criteria

- [ ] `IntegrationCard` renders correct state for not_connected, active, error
- [ ] OAuth initiation redirects to Google with correct scopes
- [ ] OAuth callback exchanges code, upserts integration, redirects
- [ ] Disconnect route authenticates, revokes token, deletes integration
- [ ] Settings page shows correct card state
- [ ] All tests pass

## Progress Log

### 2026-02-01 14:28:48 EST
Initial creation. Task extracted from design doc Section 7.6.3.
