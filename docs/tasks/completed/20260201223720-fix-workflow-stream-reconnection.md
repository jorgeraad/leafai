# 20260201223720 - Fix Workflow Stream Reconnection on Page Refresh

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-01 22:37:20 EST |
| **Last Modified**  | 2026-02-01 22:39:41 EST |
| **Status**         | completed |
| **Agent**          | bold-bobcat |
| **Blocked-By**     | none |
| **Touches**        | src/hooks/use-chat-stream.ts, src/lib/db/messages.ts, src/app/api/chat/workflow.ts |
| **References**     | [Design Doc](../../design-claude.md), [Chat API + Workflow + Reconnection Task](completed/20260201142859-chat-api-workflow-reconnection.md) |

## Description

When a user refreshes the page mid-stream, the running workflow continues in the background but the frontend never reconnects to it. The assistant message only appears after the workflow completes and the user refreshes again (loading from DB). The reconnection mechanism exists in code but is broken due to a status mismatch: the workflow creates messages with `status: 'pending'`, no code ever transitions them to `'streaming'`, and the frontend checks for `status === 'streaming'` to trigger reconnection. Additionally, pending messages are filtered out on mount, making them invisible.

## Acceptance Criteria

- [x] Workflow updates message status from `pending` to `streaming` when the first chunk is written
- [x] Frontend reconnection check triggers for messages with `status === 'streaming'`
- [x] Messages with `status === 'streaming'` are NOT filtered out on mount
- [x] On page refresh mid-stream, the assistant message is visible and tokens stream in real-time
- [x] After reconnected stream completes, message shows as completed
- [x] Normal (non-refresh) chat flow still works correctly

## Implementation Steps

- [x] Add `markMessageStreaming()` function to `src/lib/db/messages.ts`
- [x] Call `markMessageStreaming()` in the workflow before streaming begins (`src/app/api/chat/workflow.ts`)
- [x] Frontend filter already allows `streaming` status through (only excludes `error` and `pending`)
- [x] Build compiles successfully

## Progress Log

### 2026-02-01 22:37:20 EST
Initial creation.

### 2026-02-01 22:37:44 EST
Starting implementation. Agent: bold-bobcat.

### 2026-02-01 22:39:41 EST
Completed. Three files changed: (1) Added `markMessageStreaming()` to messages.ts, (2) Added `markStreaming` workflow step in workflow.ts called before `runAgentStep`, (3) Exported from db/index.ts. The frontend filter already correctly passes `streaming` status messages through — only `error` and `pending` are excluded. The existing reconnection logic in use-chat-stream.ts:57 will now trigger correctly. User reported that page refresh mid-stream loses the assistant message until workflow completes. Root cause: message status never transitions from 'pending' to 'streaming', so frontend reconnection logic at use-chat-stream.ts:57 never triggers.
