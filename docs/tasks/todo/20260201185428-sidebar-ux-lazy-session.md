# Task: Sidebar UX Improvements + Lazy Session Creation

**Created:** 2026-02-01 18:54:28 EST
**Status:** todo
**Blocked-By:** none

## Touches
- src/components/sidebar/sidebar.tsx
- src/app/(app)/w/[workspaceId]/page.tsx
- src/app/(app)/w/[workspaceId]/workspace-shell.tsx
- src/hooks/use-chat-sessions.ts

## Description

Three related changes to the sidebar and chat session creation flow:

1. **Sidebar collapsed state hover-to-expand**: When collapsed, show the LeafLogo. On hover, swap it for the expand (PanelLeft) icon. Clicking expands the sidebar (not new chat).

2. **Sidebar header layout**: Remove the "New Chat" plus button from the header row. Expanded header: LeafLogo + "Leaf" on left, collapse button on right. Add a "New Chat" button *below* the header, styled to match session list item dimensions (`px-3 py-2 text-sm rounded-md`) but with inverted colors (`bg-foreground text-background`).

3. **Lazy session creation**: Don't create a DB session when "New Chat" is clicked. Instead, navigate to the workspace home page (`/w/{workspaceId}`) which shows an empty chat view with ChatInput. The session is only created when the user sends the first message, at which point: create session → send message to `/api/chat` → navigate to the new chat URL. This prevents wasteful empty sessions.

## Acceptance Criteria

- [ ] Collapsed sidebar shows leaf logo; hovering swaps to expand icon; clicking expands sidebar
- [ ] Expanded sidebar header: leaf logo + "Leaf" left, collapse button right (no plus button in header)
- [ ] "New Chat" button below header, same dimensions as session items, inverted colors
- [ ] Clicking "New Chat" or leaf logo navigates to workspace home (no DB row created)
- [ ] Workspace home shows empty chat UI with input box
- [ ] Sending first message creates session, navigates to chat page, streams response
- [ ] Sidebar updates to show the new session after creation

## References
- Plan: .claude/plans/splendid-churning-popcorn.md
