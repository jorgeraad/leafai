# Public Chat Sharing — Design Document

| Field             | Value |
|-------------------|-------|
| **Created**       | 2026-02-01 22:51:10 EST |
| **Last Modified** | 2026-02-01 23:05:20 EST |
| **Status**        | approved |
| **Author**        | pure-lynx |

## Overview

Allow users to share chat sessions via a public link. Clicking "Share" in the chat header clones the entire session (with all messages) into a new publicly-flagged chat session, and produces a short URL (`/shared/<nanoid>`). Visitors see a read-only view of the chat — no sidebar, no input box. The owner can update the clone (re-snapshot), or revoke sharing entirely (deletes the clone).

---

## Goals & Non-Goals

### Goals
- Any workspace member can generate a public link for a chat session.
- The public link renders a read-only chat view using the same message rendering components.
- Users can update the shared snapshot after the conversation continues.
- Users can revoke sharing, which deletes the cloned session and invalidates the link.
- The shared view works for unauthenticated visitors.

### Non-Goals
- Real-time sync between the original chat and the shared clone (it's a point-in-time snapshot).
- Shared chat editing or commenting by visitors.
- Password-protected or link-expiry sharing.
- Analytics on shared link views.

---

## Architecture / Design

### Data Model

Shared chats reuse the existing `chat_sessions` and `messages` tables. A shared chat is just a regular chat session with extra metadata indicating it's a public clone.

New columns on `chat_sessions`:

| Column | Type | Description |
|--------|------|-------------|
| `share_token` | `VARCHAR(16)` | NanoID, unique, nullable. Present only on **clone** sessions. This is the short ID in the URL. |
| `shared_from_session_id` | `UUID` (FK → `chat_sessions`, ON DELETE CASCADE) | Nullable. Points the clone back to the original session. Deleting the original cascades to the clone. |
| `shared_at` | `TIMESTAMPTZ` | Nullable. When the clone was created/last refreshed. |

A session is "shared" if another session exists that references it via `shared_from_session_id`. The clone session is the one with `share_token` set.

**Key invariants:**
- Only clone sessions have `share_token` set.
- An original session has at most one active clone (enforced by unique constraint on `shared_from_session_id`).
- Deleting the clone (revoke) removes the session + all its messages via CASCADE.
- The clone has no `chat_participants` — it's not owned by anyone in the traditional sense. It's accessed exclusively via the `share_token`.

### Share Flow

```
User clicks "Share" in chat header
  → POST /api/share  { chatSessionId }
  → Backend:
      1. Generate NanoID (10 chars)
      2. Create new chat_session with share_token, shared_from_session_id, shared_at
      3. Copy workspace_id and title from original
      4. Bulk-copy all messages (new UUIDs, same parts/role/status/created_at order)
      5. Return { shareToken, sharedAt }
  → Frontend shows link: {domain}/shared/{shareToken}
```

### Update Flow

```
User clicks "Update link" in share dialog
  → POST /api/share  { chatSessionId }  (same endpoint, idempotent)
  → Backend:
      1. Find existing clone via shared_from_session_id = chatSessionId
      2. Delete all messages belonging to the clone
      3. Re-copy all messages from original session (new UUIDs, same content/order)
      4. Update clone's shared_at and title to match current original
      5. Return { shareToken, sharedAt }  (same token as before)
  → Frontend updates displayed link (URL unchanged)
```

### Revoke Flow

```
User clicks "Stop sharing" in share dialog
  → DELETE /api/share  { chatSessionId }
  → Backend:
      1. Find clone via shared_from_session_id = chatSessionId
      2. Delete the clone session (CASCADE deletes messages)
  → Frontend resets dialog to "not shared" state
```

### Public View

Route: `/shared/[token]` — a Next.js page outside the `(app)` layout group.

```
GET /shared/{token}
  → Server component
  → Query: SELECT chat_session WHERE share_token = token
  → Query: SELECT messages WHERE chat_session_id = clone.id ORDER BY created_at
  → Render read-only view
```

**Layout:**
- No sidebar, no chat input.
- Header: Leaf logo + wordmark (links to `/`), right side: "Sign in" button (links to `/login`) if unauthenticated, nothing if authenticated.
- Body: MessageList component (same as regular chat, read-only).

### Component Structure

```
src/app/shared/[token]/
  page.tsx              — Server component, fetches clone session + messages
  layout.tsx            — Minimal layout (no sidebar, no workspace shell)

src/components/chat/
  share-dialog.tsx      — Dialog triggered from chat header share button
  (existing)
    chat-header.tsx     — Add share icon button
    message-list.tsx    — Already works read-only (no changes needed)
    message-bubble.tsx  — No changes needed
```

### Detecting "Stale" Shares

The share dialog needs to know if the original chat has been updated since the last snapshot. Compare:

- `original_session.updated_at` vs `clone_session.shared_at`

If `updated_at > shared_at`, show the "Chat has been updated since last shared" notice with an "Update link" button.

---

## Tech Stack & Dependencies

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Short IDs | `nanoid` | Lightweight, URL-safe, configurable length. Already common in the JS ecosystem. |

Single new dependency: `nanoid`. Everything else uses existing stack.

---

## Interface Contracts

### Database Functions (DAL)

```typescript
// src/lib/db/sharing.ts

/** Get the active share clone for a session, if one exists */
export async function getShareForSession(
  chatSessionId: string
): Promise<{ shareToken: string; sharedAt: Date } | null>

/** Create or replace a shared clone of a session. Returns the new share info. */
export async function createOrReplaceShare(
  chatSessionId: string
): Promise<{ shareToken: string; sharedAt: Date }>

/** Delete the shared clone of a session (revoke sharing). */
export async function deleteShare(
  chatSessionId: string
): Promise<void>

/** Get a shared session by its public token (for the public view). */
export async function getSharedSession(
  shareToken: string
): Promise<{ session: ChatSession; messages: Message[] } | null>
```

### API Routes

```typescript
// POST /api/share
// Request:  { chatSessionId: string }
// Response: { shareToken: string, sharedAt: string }

// DELETE /api/share
// Request:  { chatSessionId: string }
// Response: 204 No Content

// GET /shared/[token] — Server-rendered page, no API needed
```

### Share Dialog Props

```typescript
interface ShareDialogProps {
  chatSessionId: string
  /** Current share state, null if not shared */
  share: {
    shareToken: string
    sharedAt: Date
  } | null
  /** Whether the original chat has been updated since last share */
  isStale: boolean
  onShare: () => Promise<void>
  onUpdate: () => Promise<void>
  onRevoke: () => Promise<void>
}
```

---

## Implementation Plan

### Task Breakdown

#### Task 1: Database Migration
- **Overview**: Add `share_token`, `shared_from_session_id`, `shared_at` columns to `chat_sessions`. Add unique indexes.
- **File Ownership**: `supabase/migrations/XXXXXXX_add_sharing_columns.sql`
- **Dependencies**: None.
- **Done When**: Migration applies cleanly. Columns exist with correct types, constraints, and indexes.

#### Task 2: RLS Policy for Public Access
- **Overview**: Add RLS policy allowing `SELECT` on `chat_sessions` and `messages` where the session has a non-null `share_token`. This enables unauthenticated reads of shared content.
- **File Ownership**: Same migration file as Task 1 (or a follow-up migration).
- **Dependencies**: Task 1.
- **Done When**: Unauthenticated Supabase client can read shared sessions/messages but not private ones.

#### Task 3: DAL Functions (`src/lib/db/sharing.ts`)
- **Overview**: Implement `getShareForSession`, `createOrReplaceShare`, `deleteShare`, `getSharedSession`.
- **File Ownership**: `src/lib/db/sharing.ts`, update `src/lib/db/index.ts` exports.
- **Dependencies**: Task 1.
- **Done When**: All four functions work against local Supabase. Tests pass.

#### Task 4: API Routes (`/api/share`)
- **Overview**: `POST` and `DELETE` handlers for creating/revoking shares. Auth-protected.
- **File Ownership**: `src/app/api/share/route.ts`
- **Dependencies**: Task 3.
- **Done When**: API creates clones, returns tokens, handles revoke. Auth enforced.

#### Task 5: Share Dialog Component
- **Overview**: Build `ShareDialog` with share/update/revoke states. Add share icon to `ChatHeader`.
- **File Ownership**: `src/components/chat/share-dialog.tsx`, edit `src/components/chat/chat-header.tsx`.
- **Dependencies**: Task 4 (needs API to call).
- **Done When**: Dialog opens from header, generates link, shows stale warning, supports update and revoke.

#### Task 6: Public Shared View (`/shared/[token]`)
- **Overview**: Server component page that fetches shared session and renders read-only MessageList. Minimal layout with Leaf branding header and sign-in button.
- **File Ownership**: `src/app/shared/[token]/page.tsx`, `src/app/shared/[token]/layout.tsx`.
- **Dependencies**: Task 3 (needs `getSharedSession`).
- **Done When**: Visiting `/shared/<token>` renders the chat read-only. Invalid tokens show 404. No sidebar, no input. Header has logo + sign-in.

#### Task 7: Middleware Update
- **Overview**: Add `/shared` to `PUBLIC_PATHS` so unauthenticated users can access shared chat views.
- **File Ownership**: `src/middleware.ts`
- **Dependencies**: None.
- **Done When**: `/shared/*` routes accessible without auth.

### Dependency Graph

```
Task 1 (migration)
  ├── Task 2 (RLS) ──┐
  └── Task 3 (DAL) ──┼── Task 4 (API) ── Task 5 (dialog)
                      └── Task 6 (public view)
Task 7 (middleware) — independent
```

### Execution Waves

| Wave | Tasks | Notes |
|------|-------|-------|
| 1 | 1, 7 | Migration + middleware (independent) |
| 2 | 2, 3 | RLS + DAL (both depend on migration) |
| 3 | 4, 6 | API route + public view (both depend on DAL) |
| 4 | 5 | Share dialog (depends on API) |

---

## Security Considerations

- **No auth on shared view**: The `/shared/[token]` route is intentionally public. The NanoID token (10 chars, 64-char alphabet) provides ~60 bits of entropy — not guessable, but not a secret either. This is the same model as Google Docs "anyone with the link" sharing.
- **RLS bypass for shared content**: The new RLS policy allows `SELECT` on sessions/messages where `share_token IS NOT NULL`. This is scoped — only clone sessions (which contain no sensitive metadata beyond the chat content the user chose to share) are exposed.
- **Clone isolation**: The clone is a separate session. Deleting or modifying the original does not affect the clone, and vice versa. Revoking deletes the clone entirely.
- **Authorization for share actions**: `POST /api/share` and `DELETE /api/share` require the user to be a member of the workspace that owns the original session. Enforced via Supabase RLS on the original session read.
- **No participant leakage**: Clone sessions have no `chat_participants` rows, so no user IDs are associated with the public clone.

---

## Future Considerations

- **Expiring links**: Add optional TTL for shared links.
- **Password-protected shares**: Require a password to view.
- **View analytics**: Track how many times a shared link is viewed.
- **Partial sharing**: Share only a subset of messages (e.g., up to a certain point).
- **OG meta tags**: Add Open Graph tags to `/shared/[token]` for nice link previews (title, description, maybe first message excerpt).

---

## Appendix A: Should the Share Token Change on Update?

### The Question

When a user clicks "Update link" to re-snapshot a chat, should the URL change (new NanoID) or stay the same?

### Options Considered

#### Option 1: New Token Every Time
- Delete old clone, create new clone with new NanoID.
- **Pros**: Simpler implementation — just delete and recreate. No stale cached versions.
- **Cons**: Anyone who previously received the link now has a dead link. User must re-share the new URL.

#### Option 2: Preserve Token
- Delete old clone's messages, create new clone session reusing the same `share_token`.
- **Pros**: URL is stable. Recipients always see the latest version.
- **Cons**: Slightly more complex — need to preserve the token across delete/recreate. Could reuse the session row and just replace messages instead of deleting the whole session.

### Verdict: Option 2 — Preserve Token

The whole point of "Update" is that the URL stays the same. Implementation: keep the clone session row, delete its messages, re-copy from original, update `shared_at`.

### Impact on Design

The Update Flow section uses message-replacement instead of full session delete/recreate. The `createOrReplaceShare` DAL function preserves the existing clone session and its `share_token`.

---

## Appendix B: Cloning Strategy — Same Table vs Separate Table

### The Question

Should shared chat clones live in the same `chat_sessions`/`messages` tables or in dedicated `shared_sessions`/`shared_messages` tables?

### Options Considered

#### Option 1: Same Tables
- Clone sessions are regular `chat_sessions` rows with `share_token` set.
- **Pros**: No schema duplication. Reuse existing DAL, types, and UI components directly. Schema changes automatically apply to shared content.
- **Cons**: Public content mixed with private content in same tables. RLS policies become more complex. Need to exclude clones from workspace session listings.

#### Option 2: Separate Tables
- Dedicated `shared_sessions` and `shared_messages` tables.
- **Pros**: Clean separation. Simple RLS (shared tables are public-read). No risk of leaking private sessions.
- **Cons**: Schema duplication. Must keep schemas in sync. Can't reuse DAL functions directly.

### Verdict: Option 1 — Same Tables

Per user preference. The benefits of schema reuse and component reuse outweigh the RLS complexity. We'll filter clones out of workspace listings by checking `shared_from_session_id IS NULL`.

### Impact on Design

- `listChatSessions` DAL function needs a `WHERE shared_from_session_id IS NULL` filter to exclude clones from the sidebar.
- New RLS policy needed for public SELECT on sessions with `share_token IS NOT NULL`.
