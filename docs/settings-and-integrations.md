# Settings & Integrations — Design Doc

## Current State

### What Exists

**Settings page** — A functional integrations settings page exists at `/w/:workspaceId/settings/integrations` with:
- Server component (`page.tsx`) that fetches Google Drive integration status
- Client component (`client.tsx`) with connect/disconnect handlers
- `IntegrationCard` component showing status badge, connected email, and action buttons

**Google Drive integration** — Fully implemented end-to-end:
- OAuth initiation route (`/auth/integrations/google-drive`) that redirects to Google with `drive.readonly` scope
- OAuth callback route that exchanges code for tokens, stores encrypted refresh token
- Disconnect API route (`/api/integrations/[provider]`) that revokes token and deletes row
- DAL functions (`getIntegration`, `upsertIntegration`, `deleteIntegration`, `updateRefreshToken`)
- Google Drive client library (`getDriveClient`, `listFolder`, `readFile`, `searchFiles`)
- Token encryption via AES-256-GCM (`src/lib/crypto`)
- Database schema: `integrations` table with `provider` enum (`google_drive`), `status` enum (`active`/`error`/`revoked`), `encrypted_refresh_token`, unique constraint on `(user_id, workspace_id, provider)`

**Sidebar** — Renders only:
- New Chat button
- Chat session list (via `SessionList`)
- Collapse/expand toggle

### What's Missing

1. **No way to navigate to settings.** The sidebar has no settings link. The only way to reach `/w/:workspaceId/settings/integrations` is by typing the URL manually.
2. **No settings layout or index page.** There is no `/w/:workspaceId/settings` route or shared settings layout with a sub-navigation sidebar.
3. **No user menu.** There is no user avatar, account dropdown, or sign-out button anywhere in the UI.

---

## Proposed Changes

### 1. Add Settings Icon to Sidebar Bottom

Add a settings gear icon at the very bottom of the sidebar that links to the settings page. This is the primary ask.

**File:** `src/components/sidebar/sidebar.tsx`

**Change:** Add a footer section pinned to the bottom of the sidebar containing a `Settings` icon (from `lucide-react`) wrapped in a `Link` to `/w/${workspaceId}/settings/integrations`. When collapsed, show just the icon; when expanded, show "Settings" label alongside the icon.

```
┌──────────────────────┐
│ [+] New Chat    [◀]  │
├──────────────────────┤
│                      │
│  Chat session list   │
│  (scrollable)        │
│                      │
├──────────────────────┤
│ ⚙ Settings           │  ← NEW
└──────────────────────┘
```

The sidebar already accepts `workspaceId` as a prop, so the link can be constructed directly.

### 2. Settings Layout with Sub-Navigation

Create a settings layout that wraps all settings sub-pages and provides consistent navigation between settings sections.

**New files:**
- `src/app/(app)/w/[workspaceId]/settings/layout.tsx` — Server component layout
- `src/components/settings/settings-nav.tsx` — Client component for settings sub-navigation

**Layout structure:**
```
┌─────────────────────────────────────────┐
│ ← Back to chat         Settings         │
├────────────┬────────────────────────────┤
│            │                            │
│ Integra-   │   [Active settings page    │
│ tions      │    content renders here]   │
│            │                            │
│ (future:   │                            │
│  Account,  │                            │
│  etc.)     │                            │
│            │                            │
└────────────┴────────────────────────────┘
```

The layout renders:
- A header with a back link (to `/w/:workspaceId`) and "Settings" title
- A sidebar nav listing settings sections (just "Integrations" for now)
- A `{children}` slot for the active settings page

The nav items are data-driven from a simple array so adding future sections (Account, Preferences, etc.) requires only adding an entry.

### 3. Settings Index Page (Redirect)

**New file:** `src/app/(app)/w/[workspaceId]/settings/page.tsx`

This page simply redirects to `/w/:workspaceId/settings/integrations` (the only section for now). This ensures navigating to `/settings` doesn't show a blank page.

### 4. No Other Changes

The existing integrations page, Google Drive OAuth flow, DAL, and database schema are all complete and working. No modifications needed.

---

## Implementation Plan

### Phase 1 — Sidebar Settings Link

1. Edit `src/components/sidebar/sidebar.tsx`:
   - Import `Settings` icon from `lucide-react` and `Link` from `next/link`
   - Add a `<div>` after the `ScrollArea` (but inside the `<aside>`) pinned to the bottom with `mt-auto border-t p-2`
   - Render a `Link` to `/w/${workspaceId}/settings/integrations` with the gear icon
   - When `collapsed`, render just the icon; when expanded, render icon + "Settings" label
2. Update `src/components/sidebar/sidebar.test.tsx` with a test that the settings link renders and points to the correct URL.

### Phase 2 — Settings Layout

1. Create `src/components/settings/settings-nav.tsx`:
   - Client component (`'use client'`)
   - Accepts `workspaceId: string` prop
   - Renders a vertical nav with links. Items defined as `{ label: string; href: string; segment: string }[]`
   - Uses `useSelectedLayoutSegment()` from `next/navigation` to highlight the active item
   - Initial items: `[{ label: 'Integrations', href: `/w/${workspaceId}/settings/integrations`, segment: 'integrations' }]`

2. Create `src/app/(app)/w/[workspaceId]/settings/layout.tsx`:
   - Server component
   - Renders header with back link (`Link` to `/w/${workspaceId}`) and "Settings" heading
   - Renders `<SettingsNav workspaceId={workspaceId} />` in a sidebar column
   - Renders `{children}` in the main content area
   - Uses flex layout: nav column (w-48) + content column (flex-1)

3. Create `src/app/(app)/w/[workspaceId]/settings/page.tsx`:
   - Calls `redirect('/w/${workspaceId}/settings/integrations')` (server-side redirect)

4. Remove the heading `<h1>Integrations</h1>` from the integrations `page.tsx` since the layout will provide context, or keep it as a section-level heading — either works.

### Phase 3 — Tests

- Test sidebar renders settings link
- Test settings layout renders nav and highlights active section
- Test settings index redirects to integrations

---

## File Touches Summary

| File | Action |
|------|--------|
| `src/components/sidebar/sidebar.tsx` | Edit — add settings link at bottom |
| `src/components/sidebar/sidebar.test.tsx` | Edit — add settings link test |
| `src/components/settings/settings-nav.tsx` | **Create** — settings sub-navigation |
| `src/app/(app)/w/[workspaceId]/settings/layout.tsx` | **Create** — settings layout with nav |
| `src/app/(app)/w/[workspaceId]/settings/page.tsx` | **Create** — redirect to integrations |
| `src/app/(app)/w/[workspaceId]/settings/integrations/page.tsx` | Possibly edit — adjust heading |

No database changes. No new dependencies.
