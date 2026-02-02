# 20260201230746 - Session Context Menu with Delete Option

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-01 23:07:46 EST |
| **Last Modified**  | 2026-02-01 23:10:14 EST |
| **Status**         | completed |
| **Agent**          | bright-lynx |
| **Blocked-By**     | none |
| **Touches**        | src/components/sidebar/session-list.tsx, src/components/ui/dropdown-menu.tsx, src/components/ui/alert-dialog.tsx, src/hooks/use-chat-sessions.ts, src/lib/db/chat-sessions.ts, src/app/(app)/w/[workspaceId]/workspace-context.ts, src/app/(app)/w/[workspaceId]/workspace-shell.tsx |
| **References**     | [Design Doc](../../design-claude.md) |

## Description

Add a context menu (dropdown) to sidebar session items that appears on hover. Shows a horizontal ellipsis (⋯) button on the right side of each session item. Clicking it opens a dropdown with a "Delete" option. Selecting "Delete" shows a confirmation dialog warning that shared links will also be removed. Confirming deletes the session and all associated data (messages, participants, shared links/clones).

## Acceptance Criteria

- [x] Ellipsis button appears on hover over session items in sidebar
- [x] Clicking ellipsis opens a dropdown menu
- [x] Dropdown has a "Delete" option styled in red/destructive
- [x] Clicking "Delete" opens a confirmation dialog
- [x] Dialog warns that shared links will also be removed
- [x] Confirming deletion removes the session from DB and UI
- [x] If the deleted session is the active chat, user is redirected to workspace root
- [x] Dropdown menu UI primitive (Radix) is added
- [x] Alert dialog UI primitive (Radix) is added

## Implementation Steps

- [x] Add @radix-ui/react-dropdown-menu and @radix-ui/react-alert-dialog
- [x] Create dropdown-menu.tsx UI primitive
- [x] Create alert-dialog.tsx UI primitive
- [x] Add deleteChatSession to DAL (src/lib/db/chat-sessions.ts)
- [x] Add deleteSession to useChatSessions hook
- [x] Add deleteSession to WorkspaceContext
- [x] Update session-list.tsx with hover menu + delete flow

## Progress Log

### 2026-02-01 23:07:46 EST
Initial creation. Starting work immediately.

### 2026-02-01 23:10:14 EST
Completed. All implementation done — installed Radix primitives, created dropdown-menu and alert-dialog UI components, added delete DAL function, threaded deleteSession through hook → context → shell, rewrote session-list with hover ellipsis menu and confirmation dialog. Build passes.
