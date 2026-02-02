# 20260201223140 - Fix Chat Title Showing "New Chat" on Page Reload

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-01 22:31:40 EST |
| **Last Modified**  | 2026-02-01 22:40:37 EST |
| **Status**         | completed |
| **Agent**          | slim-newt |
| **Blocked-By**     | none |
| **Touches**        | src/app/(app)/w/[workspaceId]/chat/[chatId]/page.tsx, src/components/chat/chat-header.tsx |
| **References**     | [Design Doc](../../design-claude.md) |

## Description

When reloading a chat page, the header shows "New Chat" instead of the actual session title. The sidebar correctly displays the title because `useChatSessions` fetches all sessions upfront. The chat page only fetches the title after streaming ends (post-message polling), so on a fresh page load with no streaming activity, the title remains `null`.

## Acceptance Criteria

- [x] Chat header displays the correct title on page reload (not "New Chat")
- [x] Title polling after streaming still works for newly generated titles
- [x] No duplicate fetches or race conditions between initial fetch and post-streaming poll

## Implementation Steps

- [x] Add a useEffect that fetches the session title on mount
- [x] Initialize title state from the fetched value

## Progress Log

### 2026-02-01 22:31:40 EST
Initial creation. User reported chat title shows "New Chat" on reload despite sidebar showing correct title. Root cause: title state initialized as null with no mount-time fetch.

### 2026-02-01 22:31:40 EST
Starting implementation.

### 2026-02-01 22:32:35 EST
Completed. Added a useEffect that fetches the session title from Supabase on mount. The existing post-streaming poll is unaffected — it only runs after `wasStreamingRef` is set, and the `title` guard prevents redundant fetches. Build passes.

### 2026-02-01 22:40:37 EST
Refined fix: introduced three-state title (undefined=loading, null=no title, string=has title) to eliminate brief flash of "New Chat" before the actual title loads. Updated both page.tsx and chat-header.tsx. Build passes.
