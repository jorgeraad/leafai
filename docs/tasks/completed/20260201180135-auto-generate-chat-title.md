# 20260201180135 - Auto-Generate Chat Session Title

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-01 18:01:45 EST |
| **Last Modified**  | 2026-02-01 18:11:00 EST |
| **Status**         | completed |
| **Agent**          | swift-eagle |
| **Blocked-By**     | 20260201174004 |
| **Touches**        | src/app/api/chat/route.ts, src/app/api/chat/workflow.ts, src/lib/ai/, src/lib/db/sessions.ts |
| **References**     | [Design Doc](../../design-claude.md) |

## Description

When a user sends a message in a chat, the backend should check whether the chat session already has a title. If it doesn't, make a server-side call to an LLM (via the AI SDK) to generate a concise 2–5 word title based on the message content. This must happen entirely on the server — never in the browser.

## Acceptance Criteria

- [x] On every incoming message, the server checks if the session has a title
- [x] If no title exists, an LLM call generates a short title (2–5 words)
- [x] Title is validated: max 6 words, max 60 characters; if validation fails, a sensible fallback is used or the LLM is re-prompted
- [x] Title is persisted to the session record in the database
- [x] Title generation happens server-side only (API route or workflow), never in the browser
- [x] Title generation does not block the chat response stream
- [x] Tests cover the title generation and validation logic

## Implementation Steps

- [x] Add a `generateTitle` function in `src/lib/ai/` that calls the LLM with a prompt to produce a 2–5 word title
- [x] Add validation logic: reject titles > 6 words or > 60 characters; truncate or fallback as needed
- [x] Add a DB helper to check if a session has a title and to update it
- [x] Integrate the title check + generation into the chat message handling path (route or workflow), ensuring it runs asynchronously / does not block the response stream
- [x] Write unit tests for `generateTitle` and the validation logic
- [ ] ~~Write integration test for the end-to-end flow~~ (descoped — unit tests sufficient)

## Progress Log

### 2026-02-01 18:01:45 EST
Initial creation. New feature: auto-generate chat session titles server-side when a user sends the first message.

### 2026-02-01 18:07:36 EST
Implementation complete. Created `src/lib/ai/title.ts` with `generateTitle()` and `validateTitle()`. Added `updateChatSessionTitle()` to `src/lib/db/chat-sessions.ts`. Integrated fire-and-forget title generation in the API route (`src/app/api/chat/route.ts`) — checks `session.title` is null, then generates asynchronously without blocking the SSE stream. 10 unit tests pass (7 for validation, 3 for generation with mocked LLM). Build clean.

### 2026-02-01 18:11:00 EST
Task completed. All acceptance criteria met. Integration test descoped (unit tests provide sufficient coverage). Files created: `src/lib/ai/title.ts`, `src/lib/ai/title.test.ts`. Files modified: `src/app/api/chat/route.ts`, `src/lib/db/chat-sessions.ts`, `src/lib/db/index.ts`, `src/lib/ai/index.ts`.
