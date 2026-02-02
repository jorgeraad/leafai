# 20260201225125 - Add Sign Out Button to Settings Sidebar

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-01 22:51:25 EST |
| **Last Modified**  | 2026-02-01 22:52:42 EST |
| **Status**         | completed |
| **Agent**          | swift-kestrel |
| **Blocked-By**     | none |
| **Touches**        | src/components/settings/settings-nav.tsx |
| **References**     | [Design Doc](../../design-claude.md) |

## Description

Add a "Sign out" button to the settings page sidebar, below the Integrations nav item. Clicking it signs the user out via the existing `signOut` server action and redirects to the homepage.

## Acceptance Criteria

- [x] Sign out button appears in the settings sidebar below Integrations
- [x] Clicking it calls the signOut server action
- [x] User is redirected to the homepage after sign out

## Implementation Steps

- [x] Add sign out button to SettingsNav component

## Progress Log

### 2026-02-01 22:51:25 EST
Initial creation. Starting work immediately.

### 2026-02-01 22:52:42 EST
Completed. Added sign out button to SettingsNav using existing signOut server action. Button is pushed to the bottom of the sidebar via `mt-auto`. Build passes.
