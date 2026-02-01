# 20260201142856 - Chat UI + Stream Hook

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-01 14:28:48 EST |
| **Last Modified**  | 2026-02-01 14:28:48 EST |
| **Status**         | todo |
| **Blocked-By**     | 20260201142848, 20260201142854 |
| **Touches**        | `src/components/chat/message-list.tsx`, `src/components/chat/message-bubble.tsx`, `src/components/chat/tool-call-card.tsx`, `src/components/chat/chat-input.tsx`, `src/components/chat/chat-header.tsx`, `src/components/chat/index.ts`, `src/hooks/use-chat-stream.ts` |
| **References**     | [Design Doc](../../design-claude.md) |

## Description

Build chat interface components and the `useChatStream` hook for SSE streaming, message state, and reconnection.

## Acceptance Criteria

- [ ] `useChatStream` fetches messages on mount
- [ ] `sendMessage` POSTs and updates optimistically
- [ ] Reconnection works for streaming messages
- [ ] `MessageBubble` renders text and tool-call parts
- [ ] `ToolCallCard` shows tool name, toggles details
- [ ] `ChatInput` calls onSend, disabled when streaming
- [ ] `MessageList` auto-scrolls on new messages
- [ ] All tests pass

## Progress Log

### 2026-02-01 14:28:48 EST
Initial creation. Task extracted from design doc Section 7.6.3.
