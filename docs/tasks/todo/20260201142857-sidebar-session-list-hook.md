# 20260201142857 - Sidebar + Session List Hook

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-01 14:28:48 EST |
| **Last Modified**  | 2026-02-01 14:28:48 EST |
| **Status**         | todo |
| **Blocked-By**     | 20260201142848, 20260201142854 |
| **Touches**        | `src/components/sidebar/sidebar.tsx`, `src/components/sidebar/session-list.tsx`, `src/components/sidebar/index.ts`, `src/hooks/use-chat-sessions.ts` |
| **References**     | [Design Doc](../../design-claude.md) |

## Description

Build sidebar navigation, session list, and `useChatSessions` hook.

## Acceptance Criteria

- [ ] `useChatSessions` fetches sessions on mount, returns sorted list
- [ ] `createSession` inserts session and navigates
- [ ] `SessionList` renders titles, highlights active session
- [ ] `Sidebar` renders "New Chat" button
- [ ] `Sidebar` is collapsible
- [ ] All tests pass

## Progress Log

### 2026-02-01 14:28:48 EST
Initial creation. Task extracted from design doc Section 7.6.3.
