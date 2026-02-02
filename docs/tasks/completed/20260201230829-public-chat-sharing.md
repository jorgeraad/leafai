# Public Chat Sharing

| Field             | Value |
|-------------------|-------|
| **Created**       | 2026-02-01 23:08:29 EST |
| **Last Modified** | 2026-02-01 23:36:04 EST |
| **Status**        | completed |
| **Agent**         | pure-lynx |
| **Blocked-By**    | none |
| **Touches**       | `supabase/migrations/`, `src/lib/db/sharing.ts`, `src/lib/db/index.ts`, `src/lib/db/chat-sessions.ts`, `src/app/api/share/route.ts`, `src/app/shared/[token]/page.tsx`, `src/app/shared/[token]/layout.tsx`, `src/components/chat/share-dialog.tsx`, `src/components/chat/chat-header.tsx`, `src/middleware.ts`, `src/components/ui/dialog.tsx`, `src/components/chat/message-list.tsx` |
| **References**    | `docs/design-docs/20260201225109-public-chat-sharing.md` |

## Description

Implement public chat sharing as described in the design doc. Users can share a chat session via a public link. Clicking "Share" in the chat header clones the session into a new publicly-flagged `chat_sessions` row with a NanoID `share_token`. The clone's messages are copies. Visitors see a read-only view at `/shared/<token>`. Users can update the snapshot (stable URL) or revoke sharing.

## Acceptance Criteria

- [x] DB migration adds `share_token`, `shared_from_session_id` (CASCADE), `shared_at` columns to `chat_sessions`
- [x] RLS policy allows unauthenticated SELECT on sessions/messages where `share_token IS NOT NULL`
- [x] DAL functions: `getShareForSession`, `createOrReplaceShare`, `deleteShare`, `getSharedSession`
- [x] `listChatSessions` filters out clones (`shared_from_session_id IS NULL`)
- [x] POST `/api/share` creates/updates a share clone; DELETE `/api/share` revokes
- [x] Share dialog component with share/update/revoke states, stale detection
- [x] Chat header has share icon that opens the dialog
- [x] `/shared/[token]` renders read-only chat view (no sidebar, no input)
- [x] Shared view header: Leaf logo linking to `/`, sign-in button linking to `/login` if unauthenticated
- [x] `/shared` added to middleware public paths
- [x] `nanoid` dependency added

## Implementation Steps

1. DB migration + RLS policies
2. Install `nanoid`, add DAL functions
3. Update `listChatSessions` to filter clones
4. API routes for share/revoke
5. Share dialog component
6. Update chat header with share button
7. Public shared view page + layout
8. Middleware update

## Progress Log

- 2026-02-01 23:36:04 EST — Completed all acceptance criteria. Migration, DAL, API routes, share dialog, public view, and middleware all implemented and verified with successful build.
