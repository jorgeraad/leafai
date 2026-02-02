# 20260201194623 - Fix Chat Title Not Updating in UI

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-01 19:46:23 EST |
| **Last Modified**  | 2026-02-01 20:30:34 EST |
| **Status**         | completed |
| **Agent**          | swift-eagle |
| **Blocked-By**     | none |
| **Touches**        | src/hooks/use-chat-sessions.ts, src/app/(app)/w/[workspaceId]/chat/[chatId]/page.tsx, src/components/chat/chat-header.tsx, src/app/api/chat/route.ts, src/lib/ai/title.ts, src/components/sidebar/session-list.tsx, src/app/(app)/w/[workspaceId]/workspace-context.ts, src/app/(app)/w/[workspaceId]/workspace-shell.tsx |
| **References**     | [Auto-Generate Chat Title task](../completed/20260201180135-auto-generate-chat-title.md), [Design Doc](../../design-claude.md) |

## Description

The server-side title generation (fire-and-forget in `src/app/api/chat/route.ts:32-36`) writes the generated title to the database, but the client UI never reflects it. Users always see "New Chat" in the sidebar and "New Chat" in the chat header. Three issues contribute:

1. **No re-fetch or subscription:** `useChatSessions` fetches sessions once on mount but never re-fetches or subscribes to Supabase realtime changes, so the title update in the DB is never picked up.
2. **Local state is stale:** When a session is created via `addSession`, it's added to state with `title: null` and nothing ever updates that entry.
3. **Chat header hardcoded:** `<ChatHeader title={null} />` in the chat page never passes the actual session title.

## Acceptance Criteria

- [x] After sending the first message in a new chat, the sidebar session entry updates to show the generated title (within a few seconds, without requiring a page refresh)
- [x] The chat header displays the session's actual title (not hardcoded null)
- [x] Title updates are reflected without a full page reload (either via polling, Supabase realtime subscription, or the API response signaling the title back)

## Implementation Steps

1. Added `updateSessionTitle` to `useChatSessions` hook and wired through workspace context
2. Changed title generation to use `after()` from `next/server` (non-blocking, runs after response)
3. Title generation now awaits workflow completion then uses full conversation history
4. Changed `generateTitle` to accept message array, concatenated as transcript for OpenRouter compatibility
5. Removed fallback title — returns null if LLM fails, retries on next message
6. Client polls DB after streaming ends to pick up generated title
7. Added fade-in/out animation for title changes in both header and sidebar

## Progress Log

### 2026-02-01 19:46:23 EST
Initial creation. User reported titles never appear — always "New Chat" / "New Chat". Root cause: server generates titles correctly but client never re-fetches or subscribes to the updated data.

### 2026-02-01 20:30:34 EST
Completed. Title generation uses `after()` for non-blocking background execution, awaits workflow completion for full conversation context, and client polls + animates title updates in both sidebar and header.
