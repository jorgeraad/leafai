# 20260201142850 - Next.js Middleware

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-01 14:28:48 EST |
| **Last Modified**  | 2026-02-01 14:28:48 EST |
| **Status**         | todo |
| **Blocked-By**     | 20260201142848 |
| **Touches**        | `src/middleware.ts`, `src/lib/supabase/middleware.ts` |
| **References**     | [Design Doc](../../design-claude.md) |

## Description

Implement Next.js middleware that refreshes Supabase sessions on every request and protects authenticated routes.

## Acceptance Criteria

- [ ] `/w/*` routes require authentication — redirect to `/login` if no session
- [ ] Public routes (`/`, `/login`, `/auth/*`, `/api/*`) are not blocked
- [ ] Authenticated users hitting `/login` redirect to `/w/:workspaceId`
- [ ] `updateSession(request)` refreshes Supabase session cookies
- [ ] All middleware tests pass
- [ ] `bun run build` succeeds

## Progress Log

### 2026-02-01 14:28:48 EST
Initial creation. Task extracted from design doc Section 7.6.3.
