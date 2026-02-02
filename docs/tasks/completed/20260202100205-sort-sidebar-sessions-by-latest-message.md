# 20260202100205 - Sort Sidebar Sessions by Latest Message

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-02 10:02:05 EST |
| **Last Modified**  | 2026-02-02 10:15:10 EST |
| **Status**         | completed |
| **Agent**          | sharp-cedar |
| **Blocked-By**     | none |
| **Touches**        | supabase/migrations/, src/hooks/use-chat-sessions.ts, src/app/(app)/w/[workspaceId]/workspace-context.ts, src/app/(app)/w/[workspaceId]/workspace-shell.tsx, src/app/(app)/w/[workspaceId]/chat/[chatId]/page.tsx |
| **References**     | [Design Doc](../../design-docs/design-claw.md) |

## Description

Sidebar sessions should be sorted by which session has the most recent message, not by when the session row was last updated. Currently `chat_sessions.updated_at` is only bumped when the session row itself is modified (e.g., title change), not when a new message is inserted. Add a database trigger on the `messages` table that touches the parent `chat_sessions` row on insert, so the existing `ORDER BY updated_at DESC` query naturally produces the correct order.

## Acceptance Criteria

- [x] New migration adds a trigger on `messages` INSERT that updates the parent `chat_sessions.updated_at` to `now()`
- [x] Sidebar sessions appear in order of most recent message (newest conversation at top)
- [x] Existing sort queries in `src/lib/db/chat-sessions.ts` and `src/hooks/use-chat-sessions.ts` continue to work without changes

## Implementation Steps

- [x] Create migration with trigger function and trigger on `messages` INSERT
- [x] Apply migration locally with `supabase migration up --local`
- [x] Verify existing queries unchanged (no app code changes needed)

## Progress Log

### 2026-02-02 10:02:05 EST
Initial creation. User request to sort sidebar sessions by most recent message.

### 2026-02-02 10:02:21 EST
Starting implementation. The `chat_sessions.updated_at` trigger only fires on row UPDATE, not on child message INSERT. Will add a trigger on `messages` AFTER INSERT to touch the parent session.

### 2026-02-02 10:04:33 EST
Completed DB trigger. Added migration `20260202150247_touch_session_on_message_insert.sql` with `touch_session_on_message()` trigger function and `messages_touch_session` AFTER INSERT trigger.

### 2026-02-02 10:15:10 EST
Added real-time client-side reordering. Added `bumpSession(sessionId)` to `useChatSessions` hook, exposed it through `WorkspaceContext`, and called it from the chat page's `handleSend` wrapper so the active session moves to the top of the sidebar immediately when a message is sent.
