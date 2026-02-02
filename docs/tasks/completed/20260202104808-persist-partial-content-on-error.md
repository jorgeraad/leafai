# 20260202104808 - Persist Partial Content on Workflow Error

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-02 10:48:08 EST |
| **Last Modified**  | 2026-02-02 10:54:42 EST |
| **Status**         | completed |
| **Agent**          | light-panda |
| **Blocked-By**     | none |
| **Touches**        | src/app/api/chat/workflow.ts, src/lib/db/messages.ts, src/lib/ai/agent.ts, src/hooks/use-chat-stream.ts |
| **References**     | [Design Doc](../../design-docs/design-claw.md) |

## Description

When the chat workflow encounters an error mid-stream, all accumulated content up to that point is lost. The failAssistantMessage function only updates status to 'error' without saving parts, and the client removes the message entirely. Instead, partial content should be persisted to the database and displayed to the user.

## Acceptance Criteria

- [x] When the agent errors mid-stream, all parts accumulated before the error are saved to the database
- [x] Failed messages with partial content are displayed in the UI (not removed)
- [x] The error banner still appears to indicate something went wrong

## Implementation Steps

1. Modified `failAssistantMessage` in `src/lib/db/messages.ts` to accept and save partial content before marking message as failed
2. Updated workflow error handler in `src/app/api/chat/workflow.ts` to collect streamed content and pass it to failAssistantMessage
3. Modified `useChatStream` hook in `src/hooks/use-chat-stream.ts` to preserve messages with partial content instead of removing them on error
4. Updated error handling in `src/lib/ai/agent.ts` to track partial content during streaming
5. Tested end-to-end to ensure partial messages display with error state in UI

## Progress Log

### 2026-02-02 10:48:08 EST
Initial creation. User request to preserve partial AI response content when workflow errors occur.

### 2026-02-02 10:48:08 EST
Moved to in-progress. Agent assigned: light-panda.

### 2026-02-02 10:54:42 EST
Task completed. All partial content now persists to database on workflow error. Messages display in UI with error state while preserving accumulated response text. Error banner appears alongside partial content. All acceptance criteria met.
