# 20260201142900 - App Shell + Assembled Pages

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-01 14:28:48 EST |
| **Last Modified**  | 2026-02-01 17:24:45 EST |
| **Status**         | todo |
| **Agent**          | — |
| **Blocked-By**     | 20260201142850, 20260201142855, 20260201142856, 20260201142857, 20260201142859 |
| **Touches**        | `src/app/(app)/w/[workspaceId]/layout.tsx`, `src/app/(app)/w/[workspaceId]/page.tsx`, `src/app/(app)/w/[workspaceId]/chat/[chatId]/page.tsx` |
| **References**     | [Design Doc](../../design-claude.md) |

## Description

Create authenticated layout and assemble final pages. Wires together components, hooks, and layout. Final assembly task.

## Acceptance Criteria

- [ ] Layout redirects to `/login` when unauthenticated
- [ ] Layout redirects when user not member of URL workspace
- [ ] Layout renders sidebar + children when authenticated
- [ ] Workspace home page renders session list
- [ ] "New Chat" button calls `createSession`
- [ ] Chat page renders chat components with hooks wired
- [ ] `bun run build` succeeds
- [ ] All tests pass

## Implementation Steps

- [ ] (To be decomposed when task is started)

## Progress Log

### 2026-02-01 14:28:48 EST
Initial creation. Task extracted from design doc Section 7.6.3.
