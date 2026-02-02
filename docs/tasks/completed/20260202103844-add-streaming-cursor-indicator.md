# 20260202103844 - Add Blinking Cursor During Streaming

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-02 10:38:44 EST |
| **Last Modified**  | 2026-02-02 10:40:09 EST |
| **Status**         | completed |
| **Agent**          | clear-newt |
| **Blocked-By**     | none |
| **Touches**        | src/components/chat/message-bubble.tsx |
| **References**     | [Citation Task](../../tasks/completed/20260202100504-improve-citation-style-in-agent-prompt.md) |

## Description

Add a blinking cursor indicator at the end of assistant messages while streaming. This provides visual feedback that the stream is still active during pauses (e.g., when the sources block is streaming but not yet visible). The cursor should disappear when streaming ends.

## Acceptance Criteria

- [x] A blinking cursor appears after the last visible text content in assistant messages while streaming
- [x] The cursor disappears when the message status is no longer "streaming"
- [x] The cursor does not appear for user messages or completed assistant messages

## Implementation Steps

- [x] Add a `StreamingCursor` component with a blinking animation
- [x] Render it at the end of the last text part when `message.status === "streaming"`

## Progress Log

### 2026-02-02 10:38:44 EST
Initial creation and start. User requested a blinking cursor indicator during streaming to signal activity during visual pauses (e.g., while citation sources block streams invisibly).

### 2026-02-02 10:40:09 EST
Completed. Added `StreamingCursor` component (2px wide pulsing bar) rendered after the last text part's Markdown content when `message.status === "streaming"`. Uses `lastTextIndex` tracking to only show on the final text part. Cursor is not shown for user messages or completed messages. All 131 tests pass.
