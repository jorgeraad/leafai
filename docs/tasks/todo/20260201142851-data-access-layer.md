# 20260201142851 - Data Access Layer

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-01 14:28:48 EST |
| **Last Modified**  | 2026-02-01 14:28:48 EST |
| **Status**         | todo |
| **Blocked-By**     | 20260201142848 |
| **Touches**        | `src/lib/db/workspaces.ts`, `src/lib/db/chat-sessions.ts`, `src/lib/db/messages.ts`, `src/lib/db/integrations.ts`, `src/lib/db/index.ts` |
| **References**     | [Design Doc](../../design-claude.md) |

## Description

Implement all database query functions. Each function creates its own Supabase server client internally. Functions follow signatures from Section 7.4.

## Acceptance Criteria

- [ ] `getOrCreateWorkspace` works correctly
- [ ] `getWorkspaceForUser` returns `Workspace | null`
- [ ] `createChatSession` inserts session + participant
- [ ] `listChatSessions` returns ordered sessions
- [ ] `createUserMessage` and `createPendingAssistantMessage` work correctly
- [ ] `completeAssistantMessage` and `failAssistantMessage` update status
- [ ] `listMessages` returns ordered messages
- [ ] `getIntegration` decrypts refresh token
- [ ] `upsertIntegration` encrypts refresh token
- [ ] `deleteIntegration` and `updateRefreshToken` work correctly
- [ ] All unit tests pass with mocked Supabase client

## Progress Log

### 2026-02-01 14:28:48 EST
Initial creation. Task extracted from design doc Section 7.6.3.
