# 20260202080611 - Add Max-Width Constraint to Workspace Chat Message Container

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-02 08:06:11 EST |
| **Last Modified**  | 2026-02-02 08:07:05 EST |
| **Status**         | completed |
| **Agent**          | warm-newt |
| **Blocked-By**     | none |
| **Touches**        | src/app/(app)/w/[workspaceId]/chat/[chatId]/page.tsx |
| **References**     | [Shared Chat Page](../../../src/app/shared/[token]/page.tsx) |

## Description

Apply the same max-width and horizontal padding styling used in the shared chat view's message container to the workspace chat view's message list. The shared chat uses `contentClassName="mx-auto max-w-4xl px-8 sm:px-12 md:px-16"` on MessageList — the workspace chat should use the same pattern so messages don't stretch full-width on large screens.

## Acceptance Criteria

- [x] Workspace chat MessageList has the same max-width and centering as the shared chat view
- [x] Header and chat input remain full-width (only the message bubble container is constrained)

## Implementation Steps

- [x] Add `contentClassName` prop to MessageList in workspace chat page

## Progress Log

### 2026-02-02 08:06:11 EST
Initial creation. User request to match shared chat max-width styling in workspace chat. Starting implementation immediately.

### 2026-02-02 08:07:05 EST
Completed. Added `contentClassName="mx-auto max-w-4xl px-8 sm:px-12 md:px-16"` to the workspace chat MessageList, matching the shared chat view exactly.
