# 20260201142850 - Next.js Middleware

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-01 14:28:48 EST |
| **Last Modified**  | 2026-02-01 15:57:46 EST |
| **Status**         | completed |
| **Agent**          | bold-badger |
| **Blocked-By**     | 20260201142848 |
| **Touches**        | `src/middleware.ts`, `src/lib/supabase/middleware.ts` |
| **References**     | [Design Doc](../../design-claude.md) |

## Description

Implement Next.js middleware that refreshes Supabase sessions on every request and protects authenticated routes.

## Acceptance Criteria

- [x] `/w/*` routes require authentication — redirect to `/login` if no session
- [x] Public routes (`/`, `/login`, `/auth/*`, `/api/*`) are not blocked
- [x] Authenticated users hitting `/login` redirect to `/w/:workspaceId`
- [x] `updateSession(request)` refreshes Supabase session cookies
- [x] All middleware tests pass
- [x] `bun run build` succeeds

## Progress Log

### 2026-02-01 14:28:48 EST
Initial creation. Task extracted from design doc Section 7.6.3.

### 2026-02-01 15:57:46 EST
Completed. Created `src/lib/supabase/middleware.ts` with `updateSession()` that creates a Supabase server client, refreshes session cookies, and returns `{ supabase, user, response }`. Rewrote `src/middleware.ts` to: redirect unauthenticated users on `/w/*` to `/login`, redirect authenticated users on `/login` to `/w/:workspaceId` (queries `workspace_members` table), and pass through all public routes. Added 6 tests in `src/middleware.test.ts` — all pass. Build succeeds.
