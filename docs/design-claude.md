# Leaf AI — Design Document

## Overview

Leaf AI is a Next.js web application that allows users to sign in with Google, connect a Google Drive folder, and chat with an AI agent that answers questions using the folder's contents as context. The system uses durable, async workflows so that AI agent execution persists even if the user disconnects.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                   │
│                                                             │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────┐ │
│  │  Login    │  │  Settings /  │  │  Chat    │  │  New     │ │
│  │  (Google) │  │  Integrations│  │  UI      │  │  Chat    │ │
│  └────┬─────┘  └──────┬───────┘  └────┬─────┘  └────┬─────┘ │
└───────┼────────────────┼──────────────────────┼─────────────┘
        │                │                      │
        ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Next.js API Routes                        │
│                                                             │
│  /auth/callback   /api/drive/*    /api/chat    /api/runs/*  │
└───────┬──────────────┬────────────────┬───────────┬─────────┘
        │              │                │           │
        ▼              ▼                ▼           ▼
┌──────────────┐ ┌───────────┐ ┌────────────────────────────┐
│  Supabase    │ │  Google   │ │  Vercel Workflow Engine     │
│  Auth        │ │  Drive    │ │                             │
│  (Google     │ │  API v3   │ │  ┌──────────────────────┐  │
│   OAuth)     │ │           │ │  │ chatWorkflow          │  │
│              │ │           │ │  │  step: fetchDocs      │  │
│  Supabase    │ │           │ │  │  step: buildContext   │  │
│  PostgreSQL  │ │           │ │  │  step: streamLLM      │  │
│  (data +     │ │           │ │  │  step: saveResponse   │  │
│   tokens)    │ │           │ │  └──────────────────────┘  │
│              │ │           │ │                             │
└──────────────┘ └───────────┘ │  Streams ──► /api/runs/:id │
                               │                             │
                               └────────────────────────────┘
                                        │
                                        ▼
                               ┌─────────────────┐
                               │  LLM Provider    │
                               │  (Anthropic /    │
                               │   OpenAI via     │
                               │   AI SDK)        │
                               └─────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Runtime | Bun |
| Auth | Supabase Auth (Google OAuth provider) |
| Database | Supabase PostgreSQL |
| AI | Vercel AI SDK (`ai` + `@ai-sdk/react`) |
| Durable Workflows | Vercel Workflow Dev Kit (`workflow`) |
| Google Integration | `googleapis` (Drive API v3) |
| Deployment | Vercel |
| UI Components | shadcn/ui (latest) |
| Styling | Tailwind CSS |

---

## 1. Authentication & OAuth Flow

Authentication and third-party integrations are **separate concerns**. Login only requires basic identity scopes. Google Drive (and future integrations) are connected later from a Settings page.

### 1.1 Login (Identity Only)

Supabase Auth handles sign-in. Two login methods are supported: Google OAuth and email/password. Both produce a Supabase session and follow the same post-login workspace creation flow.

#### 1.1.1 Google OAuth Login

```
User clicks "Sign in with Google"
  → supabase.auth.signInWithOAuth({ provider: 'google' })
  → Google consent screen (profile + email only)
  → Redirect to /auth/callback
  → exchangeCodeForSession()
  → Ensure personal workspace exists (see below)
  → Redirect to /w/:workspaceId
```

**Login scopes (minimal):**
```
openid
email
profile
```

No Drive scopes are requested at login. No provider tokens need to be stored at this stage — Supabase handles session management.

#### 1.1.2 Email/Password Login

Email/password authentication uses Supabase's built-in email provider. This is the primary method for AI coding agents to create and use test accounts without needing Google credentials.

**Sign-up flow:**
```
User visits /signup
  → Fills email + password + confirm password
  → Form submits to signUpWithEmail server action
  → supabase.auth.signUp({ email, password })
  → Session created immediately (no email confirmation — see config below)
  → Ensure personal workspace exists
  → Redirect to /w/:workspaceId
```

**Sign-in flow:**
```
User visits /login
  → Fills email + password
  → Form submits to signInWithEmail server action
  → supabase.auth.signInWithPassword({ email, password })
  → Ensure personal workspace exists
  → Redirect to /w/:workspaceId
```

**Password requirements:** Minimum 6 characters (Supabase default, enforced server-side by Supabase). No additional client-side password rules beyond confirm-password matching.

**Supabase dashboard configuration (required):**
- Auth > Providers > Email: **Enable Email provider** = ON
- Auth > Providers > Email: **Confirm email** = OFF (for dev/agent testing — agents can sign up and immediately use accounts without email verification)

Email confirmation can be re-enabled for production by turning this setting ON and adding a `/auth/confirm` route to handle the token exchange flow.

#### 1.1.3 Auto-Workspace Creation

On every login (regardless of method), check if the user already has a workspace. If not, create one:
1. Create a `workspaces` row with `name = "{displayName}'s Workspace"` (parsed from the Google profile for OAuth users, or derived from the email address for email/password users).
2. Create a `workspace_members` row.

For Google OAuth, this happens in the `/auth/callback` route handler. For email/password, this happens in the `signUpWithEmail` / `signInWithEmail` server actions. Alternatively, a Supabase Database Function trigger on `auth.users` insert can handle this for all auth methods — the trigger approach is simpler and guarantees the workspace exists before any application code runs.

**Key implementation details:**
- Use `@supabase/ssr` for server-side client creation (not the deprecated `auth-helpers`).
- Middleware refreshes Supabase sessions on every request.
- Always use `supabase.auth.getUser()` (not `getSession()`) on the server for security.
- The login flow supports multiple auth methods — the login page renders an email/password form above a "or continue with" divider, followed by the Google OAuth button.
- Email/password auth uses Next.js server actions (`signUpWithEmail`, `signInWithEmail`). No OAuth callback route is needed for this method.
- For v1, workspaces are 1:1 with users. Every user has exactly one personal workspace, and they are its sole member and owner.

### 1.2 Google Drive Connection (Settings > Integrations)

Google Drive access is a **separate OAuth flow** initiated from the workspace Settings page, not at login. Integrations are **workspace-scoped** — they belong to the workspace, not the individual user. For v1 (1:1 user-to-workspace), this distinction is invisible, but it means the schema is ready for shared team workspaces.

```
User navigates to /settings/integrations
  → Sees "Google Drive" card with "Connect" button
  → Click initiates a separate Google OAuth flow with Drive scopes
  → Google consent screen (drive.readonly)
  → Redirect to /auth/integrations/google-drive/callback
  → Extract & store tokens in integrations table (linked to the user's active workspace)
  → Redirect back to /settings/integrations (now shows "Connected")
```

**Drive-specific scopes (requested only during integration connection):**
```
https://www.googleapis.com/auth/drive.readonly
```

We use `drive.readonly` rather than the narrower `drive.file` because the user needs to read arbitrary files from existing folders — not just files opened through our app.

**Connection flow details:**
- We use the `googleapis` OAuth2 client directly (not Supabase Auth) for this flow, since it's a separate consent for API access, not identity.
- Request `access_type: 'offline'` and `prompt: 'consent'` to receive a refresh token.
- Only the **refresh token** is persisted — it is **encrypted at rest** using AES-256-GCM before being written to the `integrations` table (see Section 5 schema and Appendix H for the encryption approach). Access tokens are short-lived (~1 hour) and are fetched on-demand from Google using the refresh token — they are never stored in the database.
- The `googleapis` library auto-refreshes access tokens when we set credentials with a refresh token.

### 1.3 Settings > Integrations Page (Workspace-Scoped)

The `/settings/integrations` page manages external service connections **for the active workspace**. All integrations on this page belong to the workspace, and in the future, all workspace members will be able to use them.

| Integration | Status | Actions |
|------------|--------|---------|
| Google Drive | Connected / Not connected | Connect / Disconnect |
| *(future: Notion)* | — | — |
| *(future: Confluence)* | — | — |

**Disconnect flow:**
1. User clicks "Disconnect" on the Google Drive card.
2. We revoke the Google OAuth token via `https://oauth2.googleapis.com/revoke`.
3. Delete the row from the `integrations` table.
4. Any conversations using Drive folders show a "Drive disconnected" banner — existing messages are preserved, but new context fetches will fail until reconnected.

**UI states for the integration card:**
- **Not connected**: "Connect" button, brief description of what it enables.
- **Connected**: Shows connected Google account email, "Disconnect" button.
- **Error** (e.g., token revoked externally): "Reconnect" button with explanation.

---

## 2. Google Drive Integration

### 2.1 Connecting a Folder

The user provides a Google Drive folder URL (e.g., `https://drive.google.com/drive/folders/<folderId>`) in the chat. The AI agent parses the folder ID and uses its Drive tools to access the contents on-demand (see Appendix C).

### 2.2 Fetching Folder Contents

```typescript
// List files in folder
const res = await drive.files.list({
  q: `'${folderId}' in parents and trashed = false`,
  fields: 'files(id, name, mimeType, modifiedTime)',
  pageSize: 100,
});

// For Google Docs — export as plain text
await drive.files.export({ fileId, mimeType: 'text/plain' });

// For other files (PDF, txt, etc.) — download content
await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
```

### 2.3 Supported File Types (v1)

| MIME Type | Strategy |
|-----------|----------|
| `application/vnd.google-apps.document` | Export as `text/plain` |
| `application/vnd.google-apps.spreadsheet` | Export as `text/csv` |
| `text/plain`, `text/markdown`, `text/csv` | Download directly |
| `application/pdf` | Download, extract text (future: use PDF parsing lib) |

---

## 3. Durable AI Agent Workflow

This is the core of the system. We use **Vercel Workflow Dev Kit** to ensure that agent execution is durable — it survives disconnects, deployments, and serverless timeouts.

### 3.1 Why Workflows?

- Standard Vercel serverless functions time out (10s hobby / 60s pro).
- AI agent tool-calling loops can take minutes.
- If the user closes their browser, the workflow must continue.
- When the user reconnects, they should see the current state (streaming or finished).

### 3.2 Workflow Definition

```typescript
// app/api/chat/workflow.ts
import { sleep } from 'workflow';

export async function chatWorkflow(
  chatSessionId: string,
  userMessageId: string,
  userId: string
) {
  'use workflow';

  // Step 1: Load context from Google Drive
  const context = await fetchDriveContext(chatSessionId, userId);

  // Step 2: Load conversation history from DB
  const history = await loadConversationHistory(chatSessionId);

  // Step 3: Run LLM with tool-calling loop, stream tokens
  const response = await runAgent(chatSessionId, userMessageId, history, context);

  // Step 4: Persist final response to DB
  await saveAssistantMessage(chatSessionId, response);

  return { messageId: response.id };
}

async function fetchDriveContext(chatSessionId: string, userId: string) {
  'use step';
  // Fetch folder contents using stored tokens + folder ID
  // Return concatenated text content
}

async function loadConversationHistory(chatSessionId: string) {
  'use step';
  // Query messages table ordered by created_at
}

async function runAgent(
  chatSessionId: string,
  userMessageId: string,
  history: Message[],
  context: string
) {
  'use step';

  const writable = getWritable();

  // Use AI SDK streamText with tools
  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: `Answer based on the following documents:\n\n${context}`,
    messages: history,
    tools: { /* document search, citation, etc. */ },
    stopWhen: stepCountIs(10),
    onChunk: (chunk) => {
      // Write each token to the workflow stream
      writable.write(chunk);
    },
  });

  await result.text; // Wait for completion
  writable.releaseLock();

  return { id: generateId(), text: await result.text };
}

async function saveAssistantMessage(chatSessionId: string, response: any) {
  'use step';
  // Insert into messages table
}
```

### 3.3 Starting a Workflow (API Route)

```typescript
// app/api/chat/route.ts
import { start } from 'workflow/api';
import { chatWorkflow } from './workflow';

export async function POST(req: Request) {
  const { chatSessionId, content } = await req.json();
  const user = await getAuthenticatedUser(req);

  // Save user message to DB
  const userMessage = await saveUserMessage(chatSessionId, user.id, content);

  // Start durable workflow
  const run = await start(chatWorkflow, [chatSessionId, userMessage.id, user.id]);

  // Save run ID to the assistant message record (for reconnection)
  await createPendingAssistantMessage(chatSessionId, run.id);

  // Return stream for immediate consumption
  return new Response(run.readable, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}
```

### 3.4 Reconnection (Resumable Streams)

```typescript
// app/api/runs/[runId]/route.ts
import { getRun } from 'workflow/api';

export async function GET(req: Request, { params }: { params: { runId: string } }) {
  const { searchParams } = new URL(req.url);
  const startIndex = parseInt(searchParams.get('startIndex') || '0');

  const run = getRun(params.runId);
  const stream = run.getReadable({ startIndex });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}
```

### 3.5 Frontend Reconnection Logic

```typescript
// On mount, check if the latest assistant message has a run_id and status !== 'completed'
// If so, reconnect to /api/runs/:runId?startIndex=<lastReceivedIndex>
// If status === 'completed', just render the stored message content
```

---

## 4. Chat Interface

### 4.1 Frontend Approach

We use the AI SDK `useChat` hook with SSE streaming from Vercel Workflows:

- **Sending messages + streaming**: POST to `/api/chat`, consume the returned SSE stream for real-time token display.
- **Reconnection**: On page load, query messages from Supabase. If the latest assistant message is still `streaming`, reconnect to the workflow stream via `/api/runs/:runId`.
- **Page load**: Fetch all messages from the database and render. No WebSocket/Realtime subscription needed — SSE handles live updates during streaming, and DB queries handle everything else.

### 4.2 Message Rendering

Messages use a `parts` model (from AI SDK):
- `text` — rendered as markdown
- `tool-call` — rendered as a collapsible "thinking" step (e.g., "Searching documents...")
- `tool-result` — rendered inline with citations

### 4.3 Conversation Management

- Users can create multiple freeform chat sessions (no required Drive folder link).
- Sidebar lists chat sessions for the active workspace, sorted by `updated_at`.
- The AI agent accesses Drive on-demand via tools when the user's question requires it (see Appendix C).

---

## 5. Database Schema (Supabase PostgreSQL)

```sql
-- ============================================================
-- Automatic updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Workspaces
-- ============================================================
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Workspace Members
-- ============================================================
CREATE TABLE workspace_members (
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (workspace_id, user_id)
);

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_see_own_workspaces" ON workspace_members
  USING (auth.uid() = user_id);

CREATE POLICY "members_see_workspace" ON workspaces
  USING (
    id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- ============================================================
-- Integrations (external service connections)
-- ============================================================
CREATE TYPE integration_provider AS ENUM ('google_drive');
CREATE TYPE integration_status AS ENUM ('active', 'error', 'revoked');

CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  provider integration_provider NOT NULL,
  status integration_status NOT NULL DEFAULT 'active',
  provider_account_email TEXT,
  encrypted_refresh_token TEXT NOT NULL,         -- AES-256-GCM encrypted, base64-encoded (see Appendix H)
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, workspace_id, provider)
);

CREATE TRIGGER integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_integrations" ON integrations
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Chat Sessions
-- ============================================================
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_chat_sessions_workspace ON chat_sessions(workspace_id, updated_at DESC);

CREATE TRIGGER chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_members_see_sessions" ON chat_sessions
  USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- ============================================================
-- Chat Participants
-- ============================================================
CREATE TABLE chat_participants (
  chat_session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (chat_session_id, user_id)
);

ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants_see_own" ON chat_participants
  USING (auth.uid() = user_id);

-- ============================================================
-- Messages
-- ============================================================
CREATE TYPE message_role AS ENUM ('user', 'assistant');
CREATE TYPE message_status AS ENUM ('pending', 'streaming', 'completed', 'error');

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role message_role NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  parts JSONB NOT NULL DEFAULT '[]'::jsonb,   -- AI SDK UIMessage.parts (see Appendix F)
  status message_status NOT NULL DEFAULT 'completed',
  workflow_run_id TEXT,                        -- Vercel Workflow run ID (for reconnection)
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT user_messages_have_sender CHECK (role != 'user' OR sender_id IS NOT NULL)
);

CREATE INDEX idx_messages_session ON messages(chat_session_id, created_at);

CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants_see_messages" ON messages
  USING (
    chat_session_id IN (
      SELECT chat_session_id FROM chat_participants WHERE user_id = auth.uid()
    )
  );
```

### Schema Notes

- **Timestamps**: `created_at` is set automatically by `DEFAULT now()`. `updated_at` is maintained by a `BEFORE UPDATE` trigger — the application layer must never set either field.
- **`workspaces`**: Auto-created on first login as "{firstName}'s Workspace". For v1, 1:1 with users. All resources (integrations, chat sessions) belong to a workspace, so the model is ready for team workspaces without schema changes.
- **`workspace_members`**: Junction table. No roles for now — all members are treated as admins. A `role` column can be added later when permission tiers are needed.
- **`integrations`**: Per-user, scoped to a workspace. Each user connects their own external account. API calls use the requesting user's token, so permissions are correct. Only the refresh token is stored — encrypted at rest with AES-256-GCM at the application layer before being written to the DB (see Appendix H). Access tokens are short-lived (~1 hour) and are fetched on-demand using the refresh token — never persisted. See Appendix G for per-user vs. workspace-level token analysis.
- **`chat_sessions`**: Belongs to a workspace. The creator is tracked via `chat_participants` (the first participant added). No `created_by` column — participant membership is the source of truth, which avoids redundancy and supports future multi-user sessions.
- **`chat_participants`**: Tracks which users are part of a chat session. The creator is automatically added. Enables future multi-user chat and scoped RLS.
- **`messages.sender_id`**: Nullable foreign key to `auth.users`. The `CHECK` constraint enforces that `sender_id IS NOT NULL` when `role = 'user'`, and allows `NULL` when `role = 'assistant'`. The TypeScript `Message` type is a discriminated union on `role` that mirrors these constraints — `UserMessage` has `senderId: string` (non-nullable) and `AssistantMessage` omits `senderId` entirely. This supports future multi-user chat sessions where multiple users can send messages in the same conversation.
- **`messages.parts`**: JSONB column storing the AI SDK `UIMessage.parts` array directly. See Appendix F for the detailed analysis of this choice vs. normalized parts tables.
- **`messages.workflow_run_id`**: Links an assistant message to its durable workflow run, enabling reconnection. Every assistant message has a `workflow_run_id` — it is set at creation time when the workflow is started (the Vercel Workflow `start()` function auto-generates the run ID). User messages have `workflow_run_id = NULL`. The TypeScript discriminated union reflects this: `AssistantMessage` has `workflowRunId: string` (non-nullable), while `UserMessage` omits the field. The workflow's Redis-backed stream handles token buffering — no per-token DB writes needed (see Appendix E).
- **`messages.status`**: Allows the frontend to distinguish between messages that are still being generated vs. completed.

---

## 6. Key User Flows

### 6.1 First-Time Login

**Via Google OAuth:**
1. User visits `/login` → sees email/password form and "Continue with Google" button.
2. Click triggers `supabase.auth.signInWithOAuth({ provider: 'google' })` — identity scopes only.
3. Google consent screen → user grants profile + email access.
4. Redirect to `/auth/callback` → exchange code for session.
5. If first login: auto-create personal workspace ("{firstName}'s Workspace") and add user as `owner`.
6. Redirect to `/w/:workspaceId` (the user's workspace home).

**Via Email/Password (Sign Up):**
1. User visits `/signup` → fills email, password, confirm password.
2. Form submits `signUpWithEmail` server action → calls `supabase.auth.signUp({ email, password })`.
3. Session created immediately (email confirmation disabled in dev).
4. Server action calls `getOrCreateWorkspace()` to auto-create personal workspace.
5. Redirect to `/w/:workspaceId`.

**Via Email/Password (Returning User):**
1. User visits `/login` → fills email and password.
2. Form submits `signInWithEmail` server action → calls `supabase.auth.signInWithPassword({ email, password })`.
3. Server action calls `getOrCreateWorkspace()` (ensures workspace exists).
4. Redirect to `/w/:workspaceId`.

### 6.2 Connect Google Drive

1. User navigates to `/settings/integrations`.
2. Clicks "Connect" on the Google Drive card.
3. Separate Google OAuth flow → consent screen requests `drive.readonly` scope.
4. Redirect to `/auth/integrations/google-drive/callback` → extract & store tokens in `integrations` table.
5. Redirect back to `/settings/integrations` — card now shows "Connected".

### 6.3 Start a New Chat

1. User clicks "New Chat".
2. Create `chat_sessions` row in the user's active workspace, add user as participant.
3. Navigate to `/w/:workspaceId/chat/:chatSessionId`.
4. User can chat freely. If they ask about Drive content and Drive is not connected, the agent tool fails gracefully and prompts the user to connect via Settings.

### 6.4 Send a Message

1. User types message → POST to `/api/chat` with `{ chatSessionId, content }`.
2. API saves user message to DB, starts workflow, returns stream.
3. Frontend renders streaming tokens in real-time.
4. Workflow: fetch Drive docs → build context → call LLM → stream tokens → save final message.
5. On completion, workflow updates `messages.status` to `completed` and writes final `content`.

### 6.5 Reconnection

1. User navigates to `/w/:workspaceId/chat/:chatSessionId`.
2. Frontend fetches messages from DB.
3. If latest assistant message has `status = 'streaming'`:
   - Connect to `/api/runs/:runId?startIndex=:streamIndex`.
   - Resume rendering from where the stream left off.
4. If `status = 'completed'`: render normally.
5. If `status = 'error'`: show error with retry button.

---

## 7. Project Structure

### 7.1 URL Scheme

All authenticated routes are scoped under `/w/:workspaceId`. After login, the callback resolves the user's workspace and redirects to `/w/:workspaceId`. This makes workspace context explicit in the URL, which means deep links, bookmarks, and browser history all work correctly — and the scheme extends naturally to team workspaces without any URL migration.

```
/login                                         # Public — email/password sign-in + Google OAuth
/signup                                        # Public — email/password registration
/auth/callback                                 # Supabase OAuth callback
/auth/integrations/google-drive                # Initiate Drive OAuth
/auth/integrations/google-drive/callback       # Drive OAuth callback

/w/:workspaceId                                # Workspace home (chat session list)
/w/:workspaceId/chat/:chatId                   # Chat interface
/w/:workspaceId/settings/integrations          # Connect/disconnect integrations
```

For v1 (1:1 user-to-workspace), the workspace segment is technically redundant, but it costs nothing and prevents a URL migration when team workspaces ship.

### 7.2 Directory Structure

```
src/
├── app/                                        # Next.js App Router (routes only — thin)
│   ├── (auth)/                                 # Public routes (no auth required)
│   │   ├── login/page.tsx                              # Email/password sign-in + Google OAuth button
│   │   ├── signup/page.tsx                             # Email/password registration
│   │   └── auth/
│   │       ├── callback/route.ts                        # Supabase identity OAuth callback
│   │       └── integrations/
│   │           └── google-drive/
│   │               ├── route.ts                         # GET: initiate Drive OAuth
│   │               └── callback/route.ts                # GET: handle Drive OAuth callback
│   ├── (app)/                                  # Authenticated routes (layout enforces auth)
│   │   └── w/[workspaceId]/
│   │       ├── layout.tsx                               # Auth guard + workspace validation + sidebar
│   │       ├── page.tsx                                 # Workspace home (chat session list)
│   │       ├── chat/[chatId]/page.tsx                   # Chat UI
│   │       └── settings/
│   │           └── integrations/page.tsx                # Connect/disconnect integrations
│   ├── api/
│   │   ├── chat/
│   │   │   ├── route.ts                                # POST: send message, start workflow
│   │   │   └── workflow.ts                             # Durable workflow definition
│   │   ├── runs/
│   │   │   └── [runId]/route.ts                        # GET: reconnect to stream
│   │   └── integrations/
│   │       └── [provider]/route.ts                     # DELETE: disconnect
│   ├── globals.css
│   └── layout.tsx                              # Root layout
│
├── components/                                 # Shared UI components
│   ├── ui/                                     # Generic primitives (button, input, card, etc.)
│   │   ├── button.tsx
│   │   └── ...
│   ├── chat/                                   # Chat-specific components
│   │   ├── message-list.tsx
│   │   ├── message-bubble.tsx
│   │   ├── tool-call-card.tsx
│   │   ├── chat-input.tsx
│   │   └── chat-header.tsx
│   ├── sidebar/
│   │   ├── sidebar.tsx
│   │   └── session-list.tsx
│   └── integrations/
│       └── integration-card.tsx
│
├── lib/                                        # Core business logic (no React, no Next.js)
│   ├── supabase/
│   │   ├── client.ts                                   # Browser Supabase client
│   │   ├── server.ts                                   # Server Supabase client (cookies-based)
│   │   └── middleware.ts                               # Session refresh logic
│   ├── google/
│   │   ├── auth.ts                                     # OAuth2 client factory for Drive
│   │   └── drive.ts                                    # Drive API helpers (list, read, search)
│   ├── ai/
│   │   ├── tools.ts                                    # Agent tool definitions
│   │   ├── agent.ts                                    # runAgent() — streamText + tool loop
│   │   └── prompts.ts                                  # System prompts
│   ├── db/                                     # Data access layer (DAL)
│   │   ├── chat-sessions.ts                            # CRUD for chat_sessions + participants
│   │   ├── messages.ts                                 # CRUD for messages
│   │   ├── integrations.ts                             # CRUD for integrations (encrypts/decrypts tokens)
│   │   └── workspaces.ts                               # CRUD for workspaces + members
│   ├── crypto.ts                               # AES-256-GCM encrypt/decrypt (see Appendix H)
│   └── types.ts                                # Shared TypeScript types & interfaces
│
├── hooks/                                      # React hooks
│   ├── use-chat-stream.ts                              # SSE stream consumption + reconnection
│   └── use-chat-sessions.ts                            # Sidebar session list
│
└── middleware.ts                                # Next.js middleware (Supabase session refresh)
```

### 7.3 Structural Principles

- **`app/` routes are thin.** Each route handler does three things: authenticate, call into `lib/`, return a response. No business logic lives in route files.
- **`lib/` has zero React/Next.js imports.** Everything in `lib/` is pure TypeScript — testable without a browser or request context, callable from route handlers or workflow steps.
- **`lib/db/` is the data access layer (DAL).** Routes and workflows never call `supabase.from(...)` directly — they go through `lib/db/`. This gives a single place to enforce business rules and keeps Supabase-specific queries out of application logic.
- **DAL functions create their own Supabase client internally** using `createServerClient()` from `@supabase/ssr`. This is the idiomatic Next.js/Supabase pattern — the client reads from the request's cookies and is already scoped to the current user. No need to pass the client as a parameter. For testing, mock the `createServerClient` module with `vi.mock`.
- **`components/` is split by domain**, not by type. `components/chat/` owns everything related to rendering chat. `components/ui/` is the generic design system.

### 7.4 Interface Contracts

These function signatures define the boundaries between subsystems. Each workstream can develop against these contracts independently, mocking other subsystems as needed.

#### Data Access Layer (`lib/db/`)

```typescript
// lib/db/workspaces.ts
export async function getOrCreateWorkspace(userId: string, displayName: string): Promise<Workspace>
export async function getWorkspaceForUser(userId: string): Promise<Workspace | null>

// lib/db/chat-sessions.ts
export async function createChatSession(workspaceId: string, userId: string): Promise<ChatSession>
export async function listChatSessions(workspaceId: string): Promise<ChatSession[]>
export async function getChatSession(id: string): Promise<ChatSession | null>

// lib/db/messages.ts
export async function createUserMessage(chatSessionId: string, userId: string, content: string): Promise<UserMessage>
export async function createPendingAssistantMessage(chatSessionId: string, workflowRunId: string): Promise<AssistantMessage>
export async function completeAssistantMessage(messageId: string, parts: MessagePart[]): Promise<void>
export async function failAssistantMessage(messageId: string): Promise<void>
export async function listMessages(chatSessionId: string): Promise<Message[]>

// lib/db/integrations.ts
export async function getIntegration(userId: string, workspaceId: string, provider: IntegrationProvider): Promise<Integration | null>
export async function upsertIntegration(params: UpsertIntegrationParams): Promise<Integration>
export async function deleteIntegration(id: string): Promise<void>
export async function updateRefreshToken(integrationId: string, refreshToken: string): Promise<void>
```

#### Google Drive (`lib/google/`)

```typescript
// lib/google/auth.ts
export function createOAuth2Client(): OAuth2Client
export function getAuthUrl(state: string): string
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens>
export async function revokeToken(token: string): Promise<void>

// lib/google/drive.ts
export function getDriveClient(refreshToken: string): drive_v3.Drive
export async function listFolder(drive: drive_v3.Drive, folderId: string): Promise<DriveFile[]>
export async function readFile(drive: drive_v3.Drive, fileId: string, mimeType: string): Promise<string>
export async function searchFiles(drive: drive_v3.Drive, query: string): Promise<DriveFile[]>
```

#### AI Agent (`lib/ai/`)

```typescript
// lib/ai/tools.ts
export function createDriveTools(drive: drive_v3.Drive): Record<string, CoreTool>

// lib/ai/agent.ts
export async function runAgent(params: {
  messages: Message[]
  tools: Record<string, Tool>
  systemPrompt: string
  onChunk: (chunk: string) => void
}): Promise<AgentResult>

// lib/ai/prompts.ts
export function buildSystemPrompt(context?: string): string
```

#### Workflow (`app/api/chat/workflow.ts`)

```typescript
export async function chatWorkflow(
  chatSessionId: string,
  userMessageId: string,
  userId: string,
  workspaceId: string
): Promise<{ messageId: string }>
```

The workflow is the orchestrator — it calls into `lib/db/`, `lib/google/`, and `lib/ai/` but contains no business logic itself. It's the sequence: load history → build tools → run agent → save result.

#### React Hooks (`hooks/`)

```typescript
// hooks/use-chat-stream.ts
export function useChatStream(chatSessionId: string): {
  messages: Message[]
  sendMessage: (content: string) => Promise<void>
  isStreaming: boolean
  error: Error | null
}

// hooks/use-chat-sessions.ts
export function useChatSessions(workspaceId: string): {
  sessions: ChatSession[]
  createSession: () => Promise<ChatSession>
}
```

### 7.5 Shared Types (`lib/types.ts`)

```typescript
export type IntegrationProvider = 'google_drive'
export type IntegrationStatus = 'active' | 'error' | 'revoked'
export type MessageStatus = 'pending' | 'streaming' | 'completed' | 'error'

export interface Workspace {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export interface ChatSession {
  id: string
  workspaceId: string
  title: string | null
  createdAt: Date
  updatedAt: Date
}

// Message is a discriminated union on `role`. This encodes the DB-level constraints
// (sender_id NOT NULL for user messages, workflow_run_id only on assistant messages)
// directly in the type system, so narrowing on `msg.role` gives the correct field types
// without casts or null checks. The Vercel Workflow `start()` function auto-generates
// the run ID (custom IDs are not supported), so workflowRunId is set at assistant
// message creation time and is always present. User messages have no associated workflow.

interface BaseMessage {
  id: string
  chatSessionId: string
  parts: MessagePart[]
  createdAt: Date
}

export interface UserMessage extends BaseMessage {
  role: 'user'
  senderId: string                  // always present — the user who sent the message
  status: 'completed'               // user messages are immediately complete
}

export interface AssistantMessage extends BaseMessage {
  role: 'assistant'
  workflowRunId: string             // always present — set when workflow is started
  status: MessageStatus             // pending → streaming → completed | error
}

export type Message = UserMessage | AssistantMessage

export type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'tool-call'; toolCallId: string; toolName: string; args: Record<string, unknown> }
  | { type: 'tool-result'; toolCallId: string; result: unknown }

export interface Integration {
  id: string
  userId: string
  workspaceId: string
  provider: IntegrationProvider
  status: IntegrationStatus
  providerAccountEmail: string | null
  // refreshToken is decrypted at the DAL layer — callers receive plaintext
  refreshToken: string
}

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
}

export interface GoogleTokens {
  accessToken: string             // Short-lived, not persisted
  refreshToken: string            // Long-lived, encrypted before storage
}

export interface AgentResult {
  id: string
  parts: MessagePart[]
}

export interface UpsertIntegrationParams {
  userId: string
  workspaceId: string
  provider: IntegrationProvider
  refreshToken: string              // Plaintext — the DAL encrypts before writing
  providerAccountEmail: string | null
}

export interface SendMessageRequest {
  chatSessionId: string
  content: string
}

export interface RunReconnectParams {
  runId: string
  startIndex?: number
}

export interface AuthFormState {
  error: string | null
  success: string | null
}
```

### 7.6 Parallelization Plan

This section defines the full implementation as 13 tasks with explicit file ownership, interface dependencies, and test plans. Each task is designed to be handed off to an independent agent. No two tasks modify the same file.

#### 7.6.1 Dependency Graph

```
                    ┌──────┐   ┌──────┐
                    │  T1  │   │  T2  │
                    │Found-│   │ DB   │
                    │ation │   │Migra-│
                    └──┬───┘   │tions │
           ┌───┬───┬──┼───┬───└──────┘
           │   │   │  │   │      │
           ▼   │   ▼  │   ▼      │  (T2 needed for
        ┌──────┤┌──────┤┌──────┐  │   integration
        │  T3  ││  T5  ││  T6  │  │   tests of T4)
        │Middle││Google││  AI  │  │
        │ware  ││Drive ││Agent │  │
        └──┬───┘└──┬───┘└──┬───┘  │
           │       │       │      │
           │   ┌───┴───────┘      │
           │   │   │              │
           │   │   ▼       ┌──────┤ ┌──────┐
           │   │┌──────┐   │  T4  │ │  T7  │
           │   ││  T12 │   │ DAL  │ │  UI  │
           │   ││Work- │   │      │ │Prims │
           │   ││flow  │   └──┬───┘ └──┬───┘
           │   │└──────┘      │   ┌────┼────┐
           │   │              │   │    │    │
           ▼   ▼              ▼   ▼    ▼    ▼
        ┌──────┐          ┌──────┐┌──────┐┌──────┐
        │  T8  │          │  T11 ││  T9  ││  T10 │
        │ Auth │          │Integ-││Chat  ││Side- │
        │Routes│          │ation ││  UI  ││ bar  │
        └──┬───┘          │Sett- │└──┬───┘└──┬───┘
           │              │ings  │   │       │
           │              └──┬───┘   │       │
           │                 │       │       │
           └────────┬────────┴───────┴───────┘
                    │
                    ▼
                ┌──────┐
                │  T13 │
                │ App  │
                │Shell │
                │+Pages│
                └──────┘
```

**Dependency edges (A → B means "A must complete before B can start"):**

| Task | Depends On | Reason |
|------|-----------|--------|
| T1 | — | No dependencies |
| T2 | — | No dependencies (parallel with T1) |
| T3 | T1 | Needs `lib/supabase/server.ts` |
| T4 | T1 | Needs types + supabase client. T2 needed for integration tests only. |
| T5 | T1 | Needs types only. Drive helpers are pure googleapis wrappers — no DAL calls. |
| T6 | T1 | Needs types only. Tools accept a `drive` client param — no direct Drive import. |
| T7 | — | Pure UI, no backend dependencies. Can start immediately. |
| T8 | T1, T3, T4 | Callback route needs middleware + `getOrCreateWorkspace()` |
| T9 | T1, T7 | Chat components use UI primitives + shared types |
| T10 | T1, T7 | Sidebar components use UI primitives + shared types |
| T11 | T1, T4, T5, T7 | Settings page uses DAL (integrations), Google auth, UI primitives |
| T12 | T1, T4, T5, T6 | Workflow orchestrates DAL + Drive + Agent |
| T13 | T3, T8, T9, T10, T12 | Assembles all components into pages with auth layout |

**Key decoupling decisions that maximize parallelism:**

1. **`getDriveClient(refreshToken)` accepts a decrypted refresh token directly** instead of looking it up from the DB. This eliminates T5's runtime dependency on T4. The *caller* (workflow in T12) fetches the integration via the DAL (which handles decryption) and passes the plaintext refresh token.

2. **`createDriveTools(drive)` accepts a Drive client as a parameter** instead of constructing one internally. This eliminates T6's runtime dependency on T5. The workflow (T12) constructs the drive client and passes it in.

3. **All DAL functions create their own Supabase client internally.** No task needs to pass a client through, and each DAL function can be mocked at the module level with `vi.mock`.

#### 7.6.2 Execution Waves

```
Wave 1 (no dependencies):     T1, T2, T7          ← start immediately
Wave 2 (after T1):            T3, T4, T5, T6      ← all parallel
Wave 3 (after T1+T7):         T9, T10             ← parallel
Wave 3 (after T3+T4):         T8                  ← parallel with T9/T10
Wave 3 (after T4+T5+T7):      T11                 ← parallel with T8/T9/T10
Wave 4 (after T4+T5+T6):      T12                 ← can overlap with Wave 3
Wave 5 (after T3+T8+T9+T10+T12): T13              ← final assembly
```

**Critical path: T1 → T4 → T12 → T13** (4 sequential steps). All other work happens in parallel alongside this path.

#### 7.6.3 Task Specifications

---

##### T1: Foundation

**Overview:** Establish the project skeleton — shared types, Supabase client factories, test infrastructure, all npm dependencies, and environment variable template. Every other task depends on this, so it must be completed first and must be stable.

**File Ownership:**
| File | Action |
|------|--------|
| `src/lib/types.ts` | Create (Section 7.5 types + `UpsertIntegrationParams`, `SendMessageRequest`, `RunReconnectParams`) |
| `src/lib/crypto.ts` | Create (AES-256-GCM `encrypt`/`decrypt` utilities — see Appendix H) |
| `src/lib/supabase/client.ts` | Create (browser client via `createBrowserClient` from `@supabase/ssr`) |
| `src/lib/supabase/server.ts` | Create (server client via `createServerClient` from `@supabase/ssr`, reads cookies) |
| `vitest.config.ts` | Create |
| `.env.local.example` | Create (all env var keys with placeholder values and comments) |
| `package.json` | Modify (install ALL project dependencies — see below) |
| `tsconfig.json` | Modify if needed (path aliases) |
| `next.config.ts` | Modify if needed (`serverExternalPackages: ['googleapis']`) |
| `src/app/layout.tsx` | Owned by T1 (already exists — root HTML wrapper, not a page) |
| `src/app/globals.css` | Owned by T1 (already exists — theme tokens) |

**Dependencies to install:**
```
@supabase/ssr @supabase/supabase-js
googleapis
ai @ai-sdk/anthropic @ai-sdk/react
workflow
zod
vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Environment variables (`.env.local.example`):**
```bash
NEXT_PUBLIC_SUPABASE_URL=           # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY=          # Supabase service role key (server only)
GOOGLE_CLIENT_ID=                   # Google OAuth client ID
GOOGLE_CLIENT_SECRET=               # Google OAuth client secret
GOOGLE_REDIRECT_URI=                # e.g. http://localhost:3000/auth/integrations/google-drive/callback
ANTHROPIC_API_KEY=                  # Anthropic API key for Claude
TOKEN_ENCRYPTION_KEY=               # 32-byte hex key for AES-256-GCM token encryption (see Appendix H)
```

**Supabase dashboard configuration (required for email/password auth):**
- Auth > Providers > Email: **Enable Email provider** = ON
- Auth > Providers > Email: **Confirm email** = OFF (for dev/agent testing)

**Interface contract:** `lib/types.ts` is the contract. Every type from Section 7.5 must be present and exported.

**Tests:**
- `lib/types.ts` compiles without errors (TypeScript compilation check)
- `createBrowserClient()` returns a `SupabaseClient` instance
- `createServerClient()` can be called with mocked `cookies()` and returns a client
- `encrypt(plaintext)` returns a base64 string; `decrypt(ciphertext)` returns the original plaintext
- `decrypt` throws on tampered ciphertext (GCM authentication check)
- `encrypt` produces different ciphertext for the same plaintext (unique IV per call)
- Vitest config runs a trivial `expect(true).toBe(true)` test
- `bun install` succeeds with no peer dependency errors

**Done when:** All tests pass, `bun run build` succeeds, every type from Section 7.5 is exported from `lib/types.ts`.

---

##### T2: Database Migrations

**Overview:** Create all Supabase migration SQL files implementing the schema from Section 5. This task produces only SQL files — no TypeScript.

**File Ownership:**
| File | Action |
|------|--------|
| `supabase/migrations/<timestamp>_create_tables.sql` | Create |
| `supabase/config.toml` | Modify if needed |

**Interface contract:** The migration must create exactly the tables, columns, types, indexes, and RLS policies defined in Section 5 of the design doc. Column names use `snake_case`. The `integrations` table uses `UNIQUE(user_id, workspace_id, provider)` (per-user tokens, per Appendix G).

**Tests:**
- `supabase db reset` runs without errors (applies all migrations to a fresh local DB)
- All 6 tables exist: `workspaces`, `workspace_members`, `integrations`, `chat_sessions`, `chat_participants`, `messages`
- All 4 enum types exist: `integration_provider`, `integration_status`, `message_role`, `message_status`
- RLS is enabled on all tables and all policies are created
- Foreign key cascades work: `DELETE FROM workspaces WHERE id = X` cascades to `workspace_members`, `integrations`, `chat_sessions`
- `DELETE FROM chat_sessions WHERE id = X` cascades to `chat_participants`, `messages`
- Unique constraints: `(workspace_id, user_id)` on `workspace_members`, `(user_id, workspace_id, provider)` on `integrations`, `(chat_session_id, user_id)` on `chat_participants`
- Indexes exist on `chat_sessions(workspace_id, updated_at DESC)` and `messages(chat_session_id, created_at)`
- `updated_at` triggers fire on UPDATE for `workspaces`, `integrations`, `chat_sessions`, `messages` (verify by updating a row and checking `updated_at` changed)
- CHECK constraint: inserting a message with `role='user'` and `sender_id=NULL` fails
- CHECK constraint: inserting a message with `role='assistant'` and `sender_id=NULL` succeeds

**Done when:** `supabase db reset` succeeds and all constraint/index/trigger checks pass.

---

##### T3: Next.js Middleware

**Overview:** Implement the Next.js middleware that refreshes Supabase sessions on every request and protects authenticated routes.

**File Ownership:**
| File | Action |
|------|--------|
| `src/middleware.ts` | Create |
| `src/lib/supabase/middleware.ts` | Create (session refresh helper) |

**Depends on:** T1 (`lib/supabase/server.ts`)

**Interface contract:**
- `middleware.ts` exports a `middleware` function and a `config` with route matcher
- Protected routes: `/w/*` require authentication — redirect to `/login` if no session
- Public routes: `/`, `/login`, `/auth/*`, `/api/*` are not blocked
- Authenticated users hitting `/login` are redirected to `/w/:workspaceId`
- `updateSession(request)` from `lib/supabase/middleware.ts` refreshes the Supabase session cookies on every request

**Tests:**
- Request to `/w/123` without auth cookie → redirect to `/login`
- Request to `/w/123` with valid auth cookie → passes through, cookies refreshed
- Request to `/login` without auth → passes through
- Request to `/login` with auth → redirect to `/w/:workspaceId` (mock `getWorkspaceForUser`)
- Request to `/api/chat` → passes through (API routes handle their own auth)
- Request to `/auth/callback` → passes through (public)

**Done when:** All middleware tests pass. `bun run build` succeeds.

---

##### T4: Data Access Layer (DAL)

**Overview:** Implement all database query functions. Each function creates its own Supabase server client internally via `createServerClient()`. Functions follow the signatures defined in Section 7.4.

**File Ownership:**
| File | Action |
|------|--------|
| `src/lib/db/workspaces.ts` | Create |
| `src/lib/db/chat-sessions.ts` | Create |
| `src/lib/db/messages.ts` | Create |
| `src/lib/db/integrations.ts` | Create |
| `src/lib/db/index.ts` | Create (barrel export) |

**Depends on:** T1 (`lib/types.ts`, `lib/supabase/server.ts`). T2 needed only for integration tests against a real DB.

**Interface contract:** Exactly the function signatures from Section 7.4. Additional conventions:
- Functions that find a single record return `T | null` (not throw) when not found
- Functions that create a record throw on constraint violations
- All functions map `snake_case` DB columns to `camelCase` TypeScript properties
- Row-to-type mapping helpers are private to each file
- DAL functions must never set `created_at` or `updated_at` — these are managed by database defaults and triggers

**Tests (unit, with mocked Supabase client):**
- `getOrCreateWorkspace`: first call inserts workspace + member, returns `Workspace`. Second call with same userId returns existing workspace (no insert).
- `getWorkspaceForUser`: returns `Workspace` if member exists, `null` if not.
- `createChatSession`: inserts `chat_sessions` row + `chat_participants` row. Returns `ChatSession`.
- `listChatSessions`: returns `ChatSession[]` ordered by `updatedAt` descending.
- `getChatSession`: returns `ChatSession | null`.
- `createUserMessage`: inserts message with `role='user'`, `sender_id=userId`, `status='completed'`, parts containing the text. Returns `UserMessage` (with `senderId: string`, no `workflowRunId`).
- `createPendingAssistantMessage`: inserts message with `role='assistant'`, `sender_id=NULL`, `status='pending'`, `workflow_run_id` set. Returns `AssistantMessage` (with `workflowRunId: string`, no `senderId`).
- `completeAssistantMessage`: updates status to `'completed'` and sets `parts`.
- `failAssistantMessage`: updates status to `'error'`.
- `listMessages`: returns `Message[]` ordered by `createdAt` ascending.
- `getIntegration`: returns `Integration | null` for given user/workspace/provider.
- `upsertIntegration`: encrypts the refresh token via `lib/crypto.ts` before writing. Inserts on first call, updates on conflict (same user/workspace/provider).
- `getIntegration`: decrypts the refresh token via `lib/crypto.ts` before returning the `Integration` object. Callers receive plaintext.
- `deleteIntegration`: deletes the row.
- `updateRefreshToken`: encrypts the new refresh token and updates `encrypted_refresh_token` on the integration row.

**Done when:** All unit tests pass. Each exported function matches its Section 7.4 signature.

---

##### T5: Google OAuth + Drive Helpers

**Overview:** Implement the Google OAuth2 client factory and Drive API helper functions. These are pure `googleapis` wrappers with no database calls. `getDriveClient` accepts credentials as a parameter — the caller is responsible for looking up the integration record.

**File Ownership:**
| File | Action |
|------|--------|
| `src/lib/google/auth.ts` | Create |
| `src/lib/google/drive.ts` | Create |
| `src/lib/google/index.ts` | Create (barrel export) |

**Depends on:** T1 (`lib/types.ts` for `GoogleTokens`, `DriveFile`)

**Interface contract:** Exactly the function signatures from Section 7.4. Key details:
- `createOAuth2Client()`: creates a `google.auth.OAuth2` instance using `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` env vars.
- `getAuthUrl(state)`: returns a Google OAuth consent URL requesting `drive.readonly` scope, `access_type: 'offline'`, `prompt: 'consent'`. The `state` param is passed through for CSRF protection.
- `exchangeCodeForTokens(code)`: calls `oauth2Client.getToken(code)` and returns `GoogleTokens` (containing both the short-lived access token and the long-lived refresh token — the caller is responsible for persisting the refresh token via the DAL, which encrypts it).
- `revokeToken(token)`: POSTs to `https://oauth2.googleapis.com/revoke`.
- `getDriveClient(refreshToken)`: creates an OAuth2 client, sets the refresh token as credentials, and returns `google.drive({ version: 'v3', auth })`. The `googleapis` library automatically fetches a fresh access token from Google using the refresh token on the first API call. Registers a `tokens` event listener that calls an optional `onTokenRefresh` callback (for callers that want to persist a rotated refresh token).
- `listFolder(drive, folderId)`: queries `'${folderId}' in parents and trashed = false`, returns `DriveFile[]`.
- `readFile(drive, fileId, mimeType)`: for `application/vnd.google-apps.*` types, exports as `text/plain` (or `text/csv` for spreadsheets). For other types, downloads via `alt: 'media'`. Returns `string`.
- `searchFiles(drive, query)`: full-text search via `fullText contains '${query}'`, returns `DriveFile[]`.

**Tests (unit, with mocked googleapis):**
- `createOAuth2Client` returns an OAuth2Client with correct credentials
- `getAuthUrl` returns a URL containing `scope=...drive.readonly`, `access_type=offline`, `state=<value>`
- `exchangeCodeForTokens` returns `GoogleTokens` with accessToken and refreshToken (mock `getToken`). Note: the caller (T11 OAuth callback) encrypts and stores the refreshToken via the DAL.
- `revokeToken` calls the revocation endpoint (mock fetch/HTTP)
- `getDriveClient` returns a `drive_v3.Drive` instance
- `listFolder` passes correct query to `drive.files.list` and maps response to `DriveFile[]`
- `readFile` with Google Docs mimeType calls `drive.files.export`
- `readFile` with `text/plain` mimeType calls `drive.files.get` with `alt: 'media'`
- `searchFiles` passes correct `fullText contains` query

**Done when:** All tests pass. No imports from `lib/db/`.

---

##### T6: AI Agent Core

**Overview:** Implement the AI agent — tool definitions, the `runAgent` orchestrator, and system prompts. Tools accept a Drive client as a parameter (dependency injection), making this task independent of T5 at build time.

**File Ownership:**
| File | Action |
|------|--------|
| `src/lib/ai/tools.ts` | Create |
| `src/lib/ai/agent.ts` | Create |
| `src/lib/ai/prompts.ts` | Create |
| `src/lib/ai/index.ts` | Create (barrel export) |

**Depends on:** T1 (`lib/types.ts`). Uses `drive_v3.Drive` type from `googleapis` (installed by T1).

**Interface contract:**
- `createDriveTools(drive: drive_v3.Drive)`: returns `Record<string, CoreTool>` containing `list_drive_folder`, `read_drive_file`, `search_drive` tools. Each tool has a zod input schema and an `execute` function that calls the provided `drive` client. Tool definitions follow the Vercel AI SDK `tool()` pattern.
- `runAgent(params)`: calls `streamText` from the `ai` package with the provided messages, tools, and system prompt. Calls `params.onChunk` for each text delta. Returns `AgentResult` with `id` (generated via `generateId()`) and `parts` (the final `UIMessage.parts` array). Respects `maxSteps` (default 10).
- `buildSystemPrompt(context?)`: returns the system prompt string. If `context` is provided, appends document context instructions.

**Tests (unit, with mocked AI SDK):**
- `createDriveTools` returns an object with keys `list_drive_folder`, `read_drive_file`, `search_drive`
- Each tool has a valid zod schema (test by parsing sample input)
- `list_drive_folder` execute calls `drive.files.list` with correct query
- `read_drive_file` execute calls `drive.files.export` for Google Docs types
- `runAgent` calls `streamText` with correct model, messages, tools, system prompt
- `runAgent` invokes `onChunk` callback for each text delta (mock streamText to emit chunks)
- `runAgent` returns `AgentResult` with id and parts
- `runAgent` respects maxSteps (mock streamText with tool calls to verify step limit)
- `buildSystemPrompt()` returns a base prompt without context section
- `buildSystemPrompt('doc content')` returns a prompt containing the document context

**Done when:** All tests pass. No imports from `lib/db/` or `lib/google/` (only the `drive_v3.Drive` type).

---

##### T7: UI Primitives

**Overview:** Install and configure [shadcn/ui](https://ui.shadcn.com/) (latest version) and add the required component primitives. shadcn/ui generates components into `src/components/ui/` using Tailwind CSS and Radix UI primitives. No backend imports, no hooks, no data fetching.

**File Ownership:**
| File | Action |
|------|--------|
| `components.json` | Create (shadcn/ui config) |
| `src/components/ui/button.tsx` | Create (via `bunx shadcn@latest add button`) |
| `src/components/ui/input.tsx` | Create (via `bunx shadcn@latest add input`) |
| `src/components/ui/card.tsx` | Create (via `bunx shadcn@latest add card`) |
| `src/components/ui/avatar.tsx` | Create (via `bunx shadcn@latest add avatar`) |
| `src/components/ui/badge.tsx` | Create (via `bunx shadcn@latest add badge`) |
| `src/components/ui/scroll-area.tsx` | Create (via `bunx shadcn@latest add scroll-area`) |
| `src/components/ui/skeleton.tsx` | Create (via `bunx shadcn@latest add skeleton`) |
| `src/components/ui/collapsible.tsx` | Create (via `bunx shadcn@latest add collapsible`) |
| `src/lib/utils.ts` | Create (shadcn/ui `cn` utility — generated by init) |

Note: existing components at `src/components/button.tsx`, `logo.tsx`, `fade-in.tsx`, `google-icon.tsx` are **frozen** — they belong to the existing landing/login pages and must not be modified by any task. T7 creates new components under `components/ui/`.

**Depends on:** Nothing. Can start immediately. Run `bunx shadcn@latest init` first to set up the config, then add individual components.

**Interface contract:** Components are generated by shadcn/ui and follow its conventions — typed props, `forwardRef` where appropriate, `className` prop for Tailwind overrides via the `cn()` utility. No component imports from `lib/` (except `lib/utils.ts` for `cn`), `hooks/`, or `app/`.

**Tests (with React Testing Library):**
- Each component renders without crashing (smoke test)
- Button renders children, handles click, supports `disabled` state
- Input forwards ref, calls `onChange`
- Card renders header, content, footer slots
- Skeleton renders with correct Tailwind animation class
- Collapsible toggles content visibility

**Done when:** All component tests pass. No imports from `lib/` or `hooks/`. `bun run build` succeeds.

---

##### T8: Auth Routes + Login Page + Signup Page

**Overview:** Implement all authentication flows — the login page (email/password + Google OAuth), the signup page (email/password registration), the server actions for email/password auth, and the OAuth callback route handler. The callback and server actions ensure the user's workspace exists and redirect to `/w/:workspaceId`.

**File Ownership:**
| File | Action |
|------|--------|
| `src/app/(auth)/login/page.tsx` | Modify (already exists at `src/app/login/page.tsx` — move to route group, add email/password form) |
| `src/app/(auth)/signup/page.tsx` | Create (email/password registration page) |
| `src/app/auth/actions.ts` | Modify (add `signUpWithEmail`, `signInWithEmail` server actions alongside existing `signInWithGoogle`) |
| `src/app/(auth)/auth/callback/route.ts` | Create (Supabase OAuth callback — unchanged from original design) |

**Depends on:** T1 (Supabase client, types including `AuthFormState`), T3 (middleware protects routes), T4 (`getOrCreateWorkspace`, `getWorkspaceForUser`)

**Interface contract:**

*Login page (`/login`):*
- Renders an email/password form (email input, password input, submit button) at the top.
- Below the form, a divider ("or continue with") separates the email form from the Google OAuth button.
- The email form submits to the `signInWithEmail` server action.
- Displays error messages from `AuthFormState` returned by the server action.
- Links to `/signup` ("Don't have an account? Sign up").
- The Google button calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '/auth/callback' } })`.

*Signup page (`/signup`):*
- Renders a registration form with email, password, and confirm password inputs.
- Form submits to the `signUpWithEmail` server action.
- Displays error messages from `AuthFormState`.
- Links to `/login` ("Already have an account? Sign in").
- Mirrors the styling of the login page.

*Server actions (`src/app/auth/actions.ts`):*
- `signInWithEmail(formData: FormData)`: extracts email/password from FormData, calls `supabase.auth.signInWithPassword({ email, password })`. On success, calls `getOrCreateWorkspace(userId, displayName)` and redirects to `/w/:workspaceId`. On failure, returns `AuthFormState` with error message.
- `signUpWithEmail(formData: FormData)`: extracts email/password/confirmPassword from FormData. Validates passwords match (returns error if not). Calls `supabase.auth.signUp({ email, password })`. On success, calls `getOrCreateWorkspace(userId, displayName)` and redirects to `/w/:workspaceId`. On failure, returns `AuthFormState` with error message. Display name is derived from the email prefix (e.g., `alice@example.com` → `"alice"`).
- Both forms are server-rendered using `<form action={serverAction}>` — no client components needed for the basic flow.

*OAuth callback (`GET /auth/callback`):*
- Reads `code` from search params, calls `supabase.auth.exchangeCodeForSession(code)`, calls `getOrCreateWorkspace(userId, displayName)`, redirects to `/w/:workspaceId`.
- On error (missing code, exchange failure): redirects to `/login?error=auth_failed`.

**Tests:**
- Login page renders email input, password input, and submit button
- Login page renders the Google sign-in button
- Login page renders "Don't have an account? Sign up" link to `/signup`
- Signup page renders email, password, and confirm password inputs
- Signup page renders "Already have an account? Sign in" link to `/login`
- `signInWithEmail`: with valid credentials, calls `signInWithPassword`, calls `getOrCreateWorkspace`, redirects to `/w/:workspaceId` (mock Supabase + DAL)
- `signInWithEmail`: with invalid credentials, returns `AuthFormState` with error (mock Supabase to reject)
- `signUpWithEmail`: with valid input, calls `signUp`, calls `getOrCreateWorkspace`, redirects to `/w/:workspaceId` (mock Supabase + DAL)
- `signUpWithEmail`: with existing email, returns `AuthFormState` with error
- `signUpWithEmail`: with mismatched passwords, returns `AuthFormState` with error (no Supabase call made)
- Callback route with valid code: exchanges session, calls `getOrCreateWorkspace`, redirects to `/w/:workspaceId` (mock Supabase + DAL)
- Callback route with missing code: redirects to `/login?error=auth_failed`
- Callback route with exchange error: redirects to `/login?error=auth_failed`

**Done when:** All tests pass. Login and signup pages build. Email/password and Google OAuth flows both work. Callback route handles happy path and error cases.

---

##### T9: Chat UI Components + Chat Stream Hook

**Overview:** Build the chat interface components and the `useChatStream` hook that manages SSE streaming, message state, and reconnection logic.

**File Ownership:**
| File | Action |
|------|--------|
| `src/components/chat/message-list.tsx` | Create |
| `src/components/chat/message-bubble.tsx` | Create |
| `src/components/chat/tool-call-card.tsx` | Create |
| `src/components/chat/chat-input.tsx` | Create |
| `src/components/chat/chat-header.tsx` | Create |
| `src/components/chat/index.ts` | Create (barrel export) |
| `src/hooks/use-chat-stream.ts` | Create |

**Depends on:** T1 (`lib/types.ts`), T7 (UI primitives for Button, Input, Card, Collapsible, ScrollArea)

**Interface contract:**

`useChatStream(chatSessionId: string)` returns:
```typescript
{
  messages: Message[]           // Full message list (from DB + streaming)
  sendMessage: (content: string) => Promise<void>
  isStreaming: boolean
  error: Error | null
}
```

Behavior:
- On mount: fetches messages from the Supabase client for the given `chatSessionId`.
- If the latest message is an `AssistantMessage` with `status === 'streaming'`: connects to `GET /api/runs/${msg.workflowRunId}?startIndex=0` for reconnection (no null check needed — `workflowRunId` is always present on `AssistantMessage`).
- `sendMessage`: POSTs to `/api/chat` with `{ chatSessionId, content }`. Reads the SSE response stream and appends tokens to a streaming assistant message. On stream end, marks message as completed.
- Optimistic update: immediately adds the user message to `messages` before the POST completes.

Component contracts:
- `MessageList`: receives `messages: Message[]`, `isStreaming: boolean`. Renders a list of `MessageBubble` components. Auto-scrolls to bottom on new messages.
- `MessageBubble`: receives a single `Message`. Renders `text` parts as markdown (use a markdown renderer). Renders tool-call parts as `ToolCallCard`. Styles differ for `user` vs `assistant` roles.
- `ToolCallCard`: renders a collapsible card showing tool name, input params, and output. Shows a loading spinner when `state !== 'output-available'`.
- `ChatInput`: text input + send button. Calls `onSend(content)` on submit. Disabled when `isStreaming` is true.
- `ChatHeader`: displays chat session title or "New Chat". No data fetching — receives title as prop.

**Tests:**
- `useChatStream`: on mount, fetches messages (mock Supabase). Returns `messages` array.
- `useChatStream.sendMessage`: POSTs to `/api/chat`, updates messages optimistically (mock fetch)
- `useChatStream`: reconnects to `/api/runs/:runId` when latest message is streaming (mock EventSource)
- `MessageBubble`: renders text parts as markdown content
- `MessageBubble`: renders tool-call parts as `ToolCallCard`
- `ToolCallCard`: shows tool name, toggles input/output on expand
- `ChatInput`: calls `onSend` on form submit, clears input
- `ChatInput`: disabled when `isStreaming` is true
- `MessageList`: auto-scrolls when new message is added

**Done when:** All tests pass. Components render with mock data. Hook manages state transitions correctly.

---

##### T10: Sidebar + Session List Hook

**Overview:** Build the sidebar navigation, session list, and the `useChatSessions` hook for managing chat session state.

**File Ownership:**
| File | Action |
|------|--------|
| `src/components/sidebar/sidebar.tsx` | Create |
| `src/components/sidebar/session-list.tsx` | Create |
| `src/components/sidebar/index.ts` | Create (barrel export) |
| `src/hooks/use-chat-sessions.ts` | Create |

**Depends on:** T1 (`lib/types.ts`), T7 (UI primitives for Button, ScrollArea)

**Interface contract:**

`useChatSessions(workspaceId: string)` returns:
```typescript
{
  sessions: ChatSession[]
  createSession: () => Promise<ChatSession>
  isLoading: boolean
}
```

Behavior:
- On mount: fetches chat sessions from Supabase for the workspace, sorted by `updatedAt` descending.
- `createSession`: POSTs to create a new session (via Supabase client directly), navigates to `/w/:workspaceId/chat/:chatId`.

Component contracts:
- `Sidebar`: renders the sidebar shell — logo/branding, "New Chat" button, `SessionList`, user menu area. Accepts `workspaceId` as prop. Is collapsible on mobile.
- `SessionList`: receives `sessions: ChatSession[]` and `activeChatId: string | null`. Renders each session as a link. Active session is visually highlighted. Sessions show title or "Untitled Chat".

**Tests:**
- `useChatSessions`: on mount, fetches sessions (mock Supabase). Returns sorted list.
- `useChatSessions.createSession`: inserts a session, returns `ChatSession`, triggers navigation (mock `useRouter`)
- `SessionList`: renders session titles
- `SessionList`: highlights the active session based on `activeChatId`
- `Sidebar`: renders "New Chat" button that calls `createSession`
- `Sidebar`: is collapsible (toggle button hides session list)

**Done when:** All tests pass. Sidebar renders with mock sessions.

---

##### T11: Integration Settings (UI + OAuth Routes + API Route)

**Overview:** Implement the full Google Drive integration flow — the settings page UI, the Drive OAuth initiation/callback routes, and the disconnect API route.

**File Ownership:**
| File | Action |
|------|--------|
| `src/components/integrations/integration-card.tsx` | Create |
| `src/components/integrations/index.ts` | Create (barrel export) |
| `src/app/(app)/w/[workspaceId]/settings/integrations/page.tsx` | Create |
| `src/app/(auth)/auth/integrations/google-drive/route.ts` | Create (GET: initiate OAuth) |
| `src/app/(auth)/auth/integrations/google-drive/callback/route.ts` | Create (GET: handle callback) |
| `src/app/api/integrations/[provider]/route.ts` | Create (DELETE: disconnect) |

**Depends on:** T1 (types + crypto), T4 (`getIntegration`, `upsertIntegration`, `deleteIntegration`, `updateRefreshToken`), T5 (`createOAuth2Client`, `getAuthUrl`, `exchangeCodeForTokens`, `revokeToken`), T7 (UI primitives for Card, Button, Badge)

**Interface contract:**

`IntegrationCard` props:
```typescript
{
  provider: IntegrationProvider
  status: 'not_connected' | 'active' | 'error'
  email?: string              // Connected account email
  onConnect: () => void
  onDisconnect: () => void
}
```

Route behavior:
- `GET /auth/integrations/google-drive`: reads `workspaceId` from query params or cookies, generates a `state` token (containing `workspaceId` for the callback), calls `getAuthUrl(state)`, redirects to Google.
- `GET /auth/integrations/google-drive/callback`: extracts `code` and `state`, verifies state, calls `exchangeCodeForTokens(code)`, extracts email from the ID token or userinfo, calls `upsertIntegration({ ..., refreshToken: tokens.refreshToken })` (the DAL handles encryption), redirects to `/w/:workspaceId/settings/integrations`.
- `DELETE /api/integrations/:provider`: authenticates user, loads integration via `getIntegration` (which decrypts the token), calls `revokeToken(integration.refreshToken)`, calls `deleteIntegration(id)`. Returns `{ success: true }`.

Settings page:
- Fetches the user's integration status for Google Drive (via Supabase client → `integrations` table).
- Renders `IntegrationCard` with the correct state.
- "Connect" navigates to `/auth/integrations/google-drive?workspaceId=...`.
- "Disconnect" calls `DELETE /api/integrations/google_drive`, reloads state on success.

**Tests:**
- `IntegrationCard`: renders "Connect" button when status is `not_connected`
- `IntegrationCard`: renders email + "Disconnect" button when status is `active`
- `IntegrationCard`: renders "Reconnect" button when status is `error`
- OAuth initiation route: redirects to Google with correct scopes and state
- OAuth callback route: exchanges code, upserts integration, redirects to settings (mock T4 + T5)
- OAuth callback route with invalid state: returns error
- Disconnect route: authenticates, revokes token, deletes integration (mock T4 + T5)
- Disconnect route without auth: returns 401
- Settings page: shows correct card state based on integration query

**Done when:** All tests pass. Full connect/disconnect flow works with mocked dependencies.

---

##### T12: Chat API Route + Workflow + Reconnection Route

**Overview:** Implement the core message-sending API, the durable workflow definition, and the stream reconnection endpoint. This is the integration layer — it orchestrates DAL, Drive, and AI Agent functions.

**File Ownership:**
| File | Action |
|------|--------|
| `src/app/api/chat/route.ts` | Create |
| `src/app/api/chat/workflow.ts` | Create |
| `src/app/api/runs/[runId]/route.ts` | Create |

**Depends on:** T1 (types), T4 (all DAL functions), T5 (`getDriveClient`, drive helpers), T6 (`createDriveTools`, `runAgent`, `buildSystemPrompt`)

**Interface contract:**

`POST /api/chat`:
- Request body: `{ chatSessionId: string, content: string }`
- Authenticates user via `supabase.auth.getUser()`
- Looks up the chat session via `getChatSession(chatSessionId)` to get `workspaceId`
- Saves user message via `createUserMessage(chatSessionId, userId, content)`
- Starts the durable workflow via `start(chatWorkflow, [chatSessionId, userMessage.id, userId, workspaceId])`
- Creates pending assistant message via `createPendingAssistantMessage(chatSessionId, run.id)`
- Returns `new Response(run.readable, { headers: { 'Content-Type': 'text/event-stream' } })`
- On error: returns appropriate HTTP status (401 for unauth, 404 for missing session, 500 for internal)

`chatWorkflow(chatSessionId, userMessageId, userId, workspaceId)`:
- Step 1: `loadHistory` — calls `listMessages(chatSessionId)` to get conversation history
- Step 2: `buildTools` — calls `getIntegration(userId, workspaceId, 'google_drive')` (which decrypts the refresh token). If integration exists, creates a drive client via `getDriveClient(integration.refreshToken)` and tools via `createDriveTools(drive)`. If not, tools are empty `{}`.
- Step 3: `runAgentStep` — calls `runAgent({ messages: history, tools, systemPrompt: buildSystemPrompt(), onChunk })`. Writes chunks to the workflow stream via `getWritable()`.
- Step 4: `saveResponse` — calls `completeAssistantMessage(assistantMessageId, result.parts)`.
- On error in any step: calls `failAssistantMessage(assistantMessageId)`, rethrows.

`GET /api/runs/:runId`:
- Reads optional `startIndex` from query params (default `0`)
- Calls `getRun(params.runId)`, gets readable stream via `run.getReadable({ startIndex })`
- Returns SSE response

**Tests:**
- `POST /api/chat`: with valid auth + session, saves user message, starts workflow, returns SSE stream (mock all DAL + workflow)
- `POST /api/chat`: without auth, returns 401
- `POST /api/chat`: with invalid chatSessionId, returns 404
- `chatWorkflow`: loads history, builds tools (with integration), runs agent, saves response (mock all deps)
- `chatWorkflow`: with no Drive integration, runs agent with empty tools
- `chatWorkflow`: on agent error, calls `failAssistantMessage` (mock agent to throw)
- `GET /api/runs/:runId`: returns a readable stream (mock workflow `getRun`)
- `GET /api/runs/:runId?startIndex=5`: passes startIndex to `getReadable`

**Done when:** All tests pass. The workflow correctly orchestrates the full sequence. Error paths are handled.

---

##### T13: App Shell + Assembled Pages

**Overview:** Create the authenticated layout (auth guard + workspace validation + sidebar) and assemble the final pages by composing the components built in earlier tasks. This is the final assembly — it wires together components, hooks, and layout.

**File Ownership:**
| File | Action |
|------|--------|
| `src/app/(app)/w/[workspaceId]/layout.tsx` | Create |
| `src/app/(app)/w/[workspaceId]/page.tsx` | Create (workspace home — chat session list) |
| `src/app/(app)/w/[workspaceId]/chat/[chatId]/page.tsx` | Create |

**Depends on:** T3 (middleware handles initial auth redirect, but layout double-checks), T8 (auth callback creates workspace — needed for redirects), T9 (chat components + `useChatStream`), T10 (sidebar components + `useChatSessions`), T12 (API routes must exist for hooks to call)

**Interface contract:**

`layout.tsx`:
- Server component. Calls `supabase.auth.getUser()` — if no user, redirect to `/login`.
- Validates that the user is a member of the workspace in the URL (`workspaceId` from params). If not, redirect to their actual workspace.
- Fetches workspace data for the sidebar header.
- Renders the sidebar + main content area (`{children}`).

`page.tsx` (workspace home):
- Client component. Uses `useChatSessions(workspaceId)` to list sessions.
- Renders a "New Chat" button + session list. Clicking a session navigates to `/w/:workspaceId/chat/:chatId`.
- Shows a skeleton/loading state while sessions load.

`chat/[chatId]/page.tsx`:
- Client component. Uses `useChatStream(chatId)` for messages + streaming.
- Renders `ChatHeader` + `MessageList` + `ChatInput`.
- Passes `sendMessage` from the hook to `ChatInput.onSend`.
- Passes `messages` and `isStreaming` to `MessageList`.

**Tests:**
- Layout redirects to `/login` when user is not authenticated (mock Supabase)
- Layout redirects to correct workspace when user is not a member of URL workspace (mock Supabase)
- Layout renders sidebar + children when authenticated
- Workspace home page renders session list (mock `useChatSessions`)
- Workspace home page "New Chat" button calls `createSession`
- Chat page renders chat components (mock `useChatStream`)
- Chat page passes `sendMessage` to `ChatInput`
- `bun run build` succeeds with the full application

**Done when:** All tests pass. `bun run build` produces a working build. The full app shell renders with sidebar, session list, and chat interface.

#### 7.6.4 Summary

```
┌─────────┬────────────────────────────────────────────────────────────────────┐
│  Wave   │  Tasks (all tasks within a wave run in parallel)                   │
├─────────┼────────────────────────────────────────────────────────────────────┤
│  1      │  T1 (Foundation), T2 (Migrations), T7 (UI Primitives)             │
│  2      │  T3 (Middleware), T4 (DAL), T5 (Google Drive), T6 (AI Agent)      │
│  3      │  T8 (Auth), T9 (Chat UI), T10 (Sidebar), T11 (Integrations)      │
│  4      │  T12 (Workflow + API)                                             │
│  5      │  T13 (App Shell + Pages)                                          │
└─────────┴────────────────────────────────────────────────────────────────────┘
```

**Critical path:** T1 → T4 → T12 → T13 (4 sequential steps)

**Maximum parallelism:** 4 tasks in Wave 2, 4 tasks in Wave 3

**Total tasks:** 13 | **Parallelizable:** 11 of 13 (only T12 and T13 are strictly sequential)

---

## 8. Future Considerations

- **Embedding & vector search**: For large folders, fetch-and-concatenate won't scale. Add a `document_chunks` table with pgvector embeddings, index on upload, and retrieve relevant chunks via similarity search.
- **Incremental sync**: Watch for Drive changes via the Changes API and re-index only modified files.
- **Multi-model support**: The AI SDK's provider-agnostic `gateway()` makes it easy to swap models (Kimi K2.5 vs Claude Opus 4.5 as noted in learning goals).
- **File type expansion**: Add PDF parsing (e.g., `pdf-parse`), image OCR, and Slides/Sheets support.
- **Collaborative chats**: The schema already supports workspaces and chat participants — extending to multi-user chat sessions is straightforward.
- **Rate limiting & cost controls**: Add per-user token budgets and rate limits on workflow invocations.

---

## Appendix A: Workflow-to-Conversation Mapping

### The Question

Should there be one long-lived workflow per conversation (the workflow waits for each new message via hooks), or one short-lived workflow per message (each user message triggers a new workflow run)?

### Option 1: One Workflow Per Conversation (Long-Lived)

The workflow starts when the conversation is created and loops indefinitely, waiting for user messages via `defineHook`:

```typescript
export async function conversationWorkflow(chatSessionId: string, userId: string) {
  'use workflow';

  const messageHook = defineHook<{ text: string }>();
  const hook = messageHook.create({ token: `conv:${chatSessionId}` });

  let context: Message[] = [];

  for await (const message of hook) {
    context.push({ role: 'user', content: message.text });
    const response = await generateResponse(context);
    context.push({ role: 'assistant', content: response });
    await saveMessages(chatSessionId, context);
  }
}
```

| Pros | Cons |
|------|------|
| State (conversation history) lives inside the workflow — no DB round-trips between turns | **Versioning risk**: if you deploy new code while a conversation is active, the replay mechanism can break because step order changed. All in-flight runs must be manually migrated. |
| Natural modeling of a multi-turn conversation | Replay overhead grows with every turn — the engine replays all cached step results on each resume |
| Zero cost while idle (paused waiting for hook) | Debugging is harder — stack traces come from transformed code |
| | Conversations that span days/weeks amplify versioning risk |

### Option 2: One Workflow Per Message (Short-Lived)

Each user message triggers a new, independent workflow. Conversation history is loaded from the database at the start.

```typescript
export async function messageWorkflow(
  chatSessionId: string,
  userMessageId: string,
  userId: string
) {
  'use workflow';

  const history = await loadHistory(chatSessionId);
  const context = await fetchDriveContext(chatSessionId, userId);
  const response = await runAgent(history, context);
  await saveAssistantMessage(chatSessionId, response);
}
```

| Pros | Cons |
|------|------|
| **Safe deployments** — no long-lived state to migrate | DB round-trip to load history on each message |
| Each workflow is small and self-contained — easy to debug and observe | No built-in cross-turn coordination (handled by DB instead) |
| Standard pattern — matches how the AI SDK examples work | |
| No replay overhead growth — each run is short | |

### Verdict: One Workflow Per Message

**Use short-lived, per-message workflows.** This is the recommended approach for these reasons:

1. **Deployment safety**: This is the strongest argument. Long-lived workflows that span hours or days create a real operational burden — every deploy risks breaking in-flight runs. Per-message workflows are stateless across turns, so deploys are safe.

2. **Idiomatic**: The AI SDK examples and the Vercel AI agent documentation model each request as an independent invocation with history loaded from a database. The per-message pattern aligns with this.

3. **DB round-trips are cheap**: Loading conversation history from Supabase on each turn adds a single indexed query. This is negligible compared to the LLM call that follows.

4. **Workflows still provide value**: Even short-lived, each workflow gives us durability (survives serverless timeouts), automatic retries on step failure, streaming with reconnection, and observability — all the reasons we chose WDK in the first place.

5. **Simpler mental model**: A workflow is "the work required to produce one assistant response." Easy to reason about, easy to monitor, easy to retry.

The long-lived pattern is better suited to cases like approval chains or scheduled reminders where the workflow itself *is* the coordination logic. For a chat app, the database is the natural coordination layer.

---

## Appendix B: Supabase Realtime vs. Direct Streaming

### The Question

The design doc mentions using both the AI SDK (SSE streaming) and Supabase Realtime. Is there overlap? When should each be used?

### What Supabase Realtime Does

Supabase Realtime provides three features over WebSocket connections:

| Feature | What It Does | Example |
|---------|-------------|---------|
| **Broadcast** | Low-latency ephemeral messages between clients | "User is typing..." |
| **Presence** | Shared state sync (who's online, cursor positions) | Online indicators |
| **Postgres Changes** | Subscribe to DB row inserts/updates/deletes | New message notification |

### Where the Overlap Is

For delivering AI-streamed tokens to the client, **SSE from the workflow is the right tool**. Supabase Realtime adds nothing here — it would be an unnecessary extra hop (workflow → DB → Realtime → client) when we already have a direct path (workflow stream → client).

Postgres Changes in particular has a scaling issue: each subscribed client triggers an RLS authorization check per change event. With 100 subscribers and 1 insert, that's 100 authorization reads, processed on a single thread.

### Verdict: SSE Only for v1

Supabase Realtime is out of scope. It would add value for typing indicators (Presence), multi-device sync (Broadcast), and multi-user collaboration — but none of those are v1 requirements.

**v1 approach:**

| Purpose | Technology |
|---------|-----------|
| Streaming AI tokens during generation | SSE (Vercel Workflow stream) |
| Reconnection to in-progress stream | SSE (Workflow `getReadable({ startIndex })`) |
| Loading messages on page open | DB query |

If we need Supabase Realtime later, the schema already supports it (just add `ALTER publication supabase_realtime ADD TABLE messages`). But for now, SSE + DB polling covers all requirements.

---

## Appendix C: Drive Access via Agent Tools

### Design

Chat sessions have no inherent link to a Drive folder. Instead, the AI agent has Drive tools it calls on-demand when the user asks about Drive content. A single chat session can reference zero, one, or many folders.

### Agent Tools

```typescript
const tools = {
  list_drive_folder: tool({
    description: 'List files in a Google Drive folder. Use when the user asks about files in a folder or provides a Drive URL.',
    inputSchema: z.object({
      folder_id: z.string().describe('Google Drive folder ID (from URL or previous context)'),
    }),
    execute: async ({ folder_id }, { userId }) => {
      const drive = await getDriveClient(userId);
      const res = await drive.files.list({
        q: `'${folder_id}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, modifiedTime)',
      });
      return res.data.files;
    },
  }),

  read_drive_file: tool({
    description: 'Read the content of a specific file from Google Drive. Use when the user asks a question that requires reading a document.',
    inputSchema: z.object({
      file_id: z.string().describe('Google Drive file ID'),
      file_name: z.string().describe('File name (for display)'),
      mime_type: z.string().describe('MIME type of the file'),
    }),
    execute: async ({ file_id, mime_type }, { userId }) => {
      const drive = await getDriveClient(userId);
      if (mime_type.startsWith('application/vnd.google-apps.')) {
        const res = await drive.files.export({ fileId: file_id, mimeType: 'text/plain' });
        return { content: res.data };
      }
      const res = await drive.files.get({ fileId: file_id, alt: 'media' });
      return { content: res.data };
    },
  }),

  search_drive: tool({
    description: 'Search for files across Google Drive by name or content. Use when the user asks about a topic but hasn\'t specified a folder.',
    inputSchema: z.object({
      query: z.string().describe('Search query (file name or content keywords)'),
    }),
    execute: async ({ query }, { userId }) => {
      const drive = await getDriveClient(userId);
      const res = await drive.files.list({
        q: `fullText contains '${query}' and trashed = false`,
        fields: 'files(id, name, mimeType, modifiedTime, parents)',
        pageSize: 10,
      });
      return res.data.files;
    },
  }),
};
```

### Context Tracking

When the agent reads files, we want to remember what was read so that:
- The user can see which documents were referenced (citations).
- Follow-up questions can re-use already-fetched content without re-calling the API.
- The conversation can display a "Sources" panel.

Tool calls and their results are stored as parts in the `messages.parts` JSONB column, following the AI SDK `UIMessage.parts` format. The AI SDK automatically includes prior tool results in the conversation context sent to the LLM on subsequent turns.

No separate context table is needed. The `messages.parts` array contains the full record of what the agent did (text, tool calls, tool results) in the order it happened.

### What This Enables

- **Freeform conversations**: Chat without ever touching Drive.
- **Multi-folder access**: "Compare the budget in Folder A with the forecast in Folder B."
- **On-demand retrieval**: The AI decides when to fetch, based on what the user asks.
- **Natural citations**: Tool results link back to source files.
- **Future integrations**: Adding a `search_notion` tool follows the exact same pattern — no schema changes needed.

---

## Appendix D: Integrations Ownership — User vs. Workspace

**Decision**: Workspaces are now part of the main schema (Section 5). Integrations are scoped to workspaces, not individual users.

For v1, every user gets a personal workspace on signup, so the experience is effectively user-level. But the schema is ready for B2B from day one.

### TODO: Revisit permissions model

The current design uses `UNIQUE(workspace_id, provider)` — one Google Drive connection per workspace. Open questions to revisit:

- **Whose Drive?** When an admin connects Google Drive for a workspace, all members use that admin's Drive tokens. This works for Google Workspace orgs with shared drives, but breaks if team members need access to their own personal Drive files.
- **Multiple connections per provider?** A workspace might need multiple Google Drive connections (e.g., different team members' personal drives, or multiple shared drives). This would require dropping the unique constraint and adding a display name or label per integration.
- **Permission to connect/disconnect**: Currently any workspace member can see integrations (via RLS). We should restrict connect/disconnect to `admin` and `owner` roles.
- **Token ownership on member removal**: If the admin who connected Google Drive leaves the workspace, the integration breaks. Need a re-authorization flow or a handoff mechanism.

These are B2B concerns. For v1 (personal workspaces only), the current design works. Flag this for revisit when team workspaces ship.

---

## Appendix E: Reconnection Strategy and Stream Persistence

### The Question

Does reconnection require writing every token to Supabase during streaming? That would be a heavy write load. Can we avoid it?

### How Workflow Streams Actually Work

Vercel Workflow streams are backed by **Redis** (on Vercel) or **filesystem** (local dev). When a step writes to `getWritable()`, the chunks are stored in this Redis-backed buffer — **not** in your database. The workflow engine tracks chunk indices automatically.

Reconnection uses the workflow's own stream buffer:

```typescript
// Client reconnects — workflow engine serves from Redis buffer
const run = getRun(runId);
const stream = run.getReadable({ startIndex: lastReceivedIndex });
```

**This means: you do NOT need to write each token to Supabase during streaming.** The workflow's Redis stream handles reconnection natively.

### What Actually Needs to Be in the Database

Only two things need DB writes during the lifecycle of a message:

| When | What | DB Write |
|------|------|----------|
| User sends message | Insert user message row | 1 INSERT |
| Workflow starts | Insert assistant message row with `status = 'streaming'`, `workflow_run_id = run.id` | 1 INSERT |
| Workflow completes | Update assistant message: `status = 'completed'`, `parts = finalParts` | 1 UPDATE |
| Workflow fails | Update assistant message: `status = 'error'` | 1 UPDATE |

**Total: 2-3 DB writes per message turn.** No per-token writes.

### Reconnection Flow (Revised)

```
User sends message
  → API creates assistant message row (status='streaming', workflow_run_id=X)
  → API starts workflow, returns stream to client
  → Client renders tokens from stream

User disconnects (closes tab, loses network)
  → Workflow continues running server-side
  → Tokens accumulate in Redis stream buffer

User reconnects (opens page again)
  → Frontend loads messages from DB
  → Sees latest assistant message has status='streaming'
  → Calls GET /api/runs/:runId?startIndex=0
  → Workflow engine serves all buffered tokens from Redis, then continues streaming
  → Client renders from the beginning (or from a tracked index)

Workflow completes (whether user is connected or not)
  → Final step writes completed content to DB
  → Updates message status to 'completed'
```

### What About `stream_index`?

The `stream_index` column in the original schema is unnecessary for server-side reconnection — the workflow engine handles that. However, it could be useful if the client wants to track how far it got and resume from that point instead of replaying from the start. In practice, replaying from `startIndex=0` is fine for a chat message (it's just text tokens) and avoids the complexity of client-side index tracking.

**Recommendation: drop `stream_index` from the schema.** Use `startIndex=0` on reconnect and let the client re-render from the beginning. The workflow stream handles the buffering.

### Post-Completion Access

After the workflow completes, the Redis stream may expire (TTL is not documented but is short-lived). At that point, the final parts are in the database (`messages.parts`), so the client reads from DB instead:

```typescript
// Frontend logic on page load
const messages = await supabase.from('messages').select('*').eq('chat_session_id', id);
const lastAssistant = messages.findLast((m): m is AssistantMessage => m.role === 'assistant');

if (lastAssistant?.status === 'streaming') {
  // Reconnect to live stream — workflowRunId is always present on AssistantMessage
  connectToStream(lastAssistant.workflowRunId);
} else {
  // Render from DB — stream is done (or never started)
  renderMessages(messages);
}
```

### Summary

- **No per-token DB writes.** The workflow Redis stream handles buffering and reconnection.
- **3 DB writes total** per message turn (insert user msg, insert assistant msg, update on completion).
- **Drop `stream_index`** — reconnect with `startIndex=0` and replay.
- **After stream expires**, the completed content is already in the DB from the final step.

---

## Appendix F: Message Storage — JSONB Parts vs. Normalized Parts Table

### The Problem

An AI assistant response can interleave text, tool calls, tool results, and more text in a single logical message. For example:

```
"Let me check that for you."          ← text
[tool-call: read_drive_file]           ← tool invocation
[tool-result: { content: "..." }]      ← tool output
"Based on that document, the answer…"  ← more text
```

How should we store this in the database?

### Option A: JSONB `parts` Column (Chosen)

One `messages` row with a `parts JSONB` column that stores the AI SDK `UIMessage.parts` array directly.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  chat_session_id UUID REFERENCES chat_sessions(id),
  role message_role NOT NULL,
  parts JSONB NOT NULL DEFAULT '[]'::jsonb,
  status message_status NOT NULL DEFAULT 'completed',
  workflow_run_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

Example `parts` value:

```json
[
  { "type": "text", "text": "Let me check that for you." },
  {
    "type": "tool-read_drive_file",
    "toolCallId": "call-abc",
    "toolName": "read_drive_file",
    "state": "output-available",
    "input": { "file_id": "abc123", "file_name": "Q4 Report.gdoc", "mime_type": "application/vnd.google-apps.document" },
    "output": { "content": "Revenue increased 15%..." }
  },
  { "type": "text", "text": "Based on that document, revenue increased 15% in Q4." }
]
```

**Pros:**
- 1:1 mapping to AI SDK `UIMessage.parts` — no conversion logic needed for persistence or hydration.
- Simple schema — one table, no joins to load a conversation.
- Adding new part types (reasoning, files, sources) requires zero schema migrations.
- This is the approach used by the [official Vercel AI chatbot](https://github.com/vercel/ai-chatbot).
- Atomic writes — saving a complete message is one INSERT/UPDATE.

**Cons:**
- Can't efficiently query *within* parts (e.g., "find all messages where tool X was called") without JSONB operators and GIN indexes.
- JSONB has ~2x storage overhead vs. normalized columns (keys repeated per row).
- Large parts arrays (>2KB) hit PostgreSQL TOAST compression, adding I/O overhead.
- No DB-level type enforcement on part structure — validation is application-side.

### Option B: Normalized `message_parts` Table

A separate table where each part is its own row, with typed columns per part type.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  chat_session_id UUID REFERENCES chat_sessions(id),
  role message_role NOT NULL,
  status message_status NOT NULL DEFAULT 'completed',
  workflow_run_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE message_parts (
  id UUID PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  position INTEGER NOT NULL,

  -- Text part columns
  text_content TEXT,

  -- Tool part columns
  tool_call_id VARCHAR(100),
  tool_name VARCHAR(100),
  tool_state VARCHAR(30),
  tool_input JSONB,
  tool_output JSONB,
  tool_error TEXT,

  -- File part columns
  file_url TEXT,
  file_media_type VARCHAR(100),

  CONSTRAINT text_required CHECK (type != 'text' OR text_content IS NOT NULL)
);

CREATE INDEX idx_parts_message ON message_parts(message_id, position);
```

**Pros:**
- Efficient queries on part types — `SELECT * FROM message_parts WHERE tool_name = 'read_drive_file'` is fast with a simple index.
- DB-level constraints via CHECK — enforced structure.
- Better query planner statistics on typed columns.
- This is the approach used by Vercel's newer [ai-sdk-persistence-db](https://github.com/vercel-labs/ai-sdk-persistence-db) template.

**Cons:**
- Requires a conversion layer between DB rows and `UIMessage.parts` (mapping code for every part type).
- JOIN required to load a conversation (messages + parts).
- Schema migration needed every time a new tool is added (new columns).
- Saving a message is N+1 writes (1 message + N parts).
- Wide table with many nullable columns (sparse matrix).
- More code to maintain — the mapping functions are non-trivial.

### Option C: Split Messages at Tool Boundaries

Each "chunk" of a response becomes its own `messages` row. A response with text → tool-call → tool-result → text becomes 4 rows.

**Rejected.** This creates a significant impedance mismatch with the AI SDK, which models one assistant turn as one `UIMessage` with multiple `parts`. Reconstructing the original message requires grouping consecutive rows by role, which is fragile and error-prone. It also breaks the `useChat` hook's expectations.

### Verdict: Option A (JSONB Parts)

**Use the JSONB `parts` column.** Rationale:

1. **AI SDK alignment**: `UIMessage.parts` is the source of truth in the AI SDK. Storing it as-is means zero conversion logic — `JSON.parse` on read, `JSON.stringify` on write. The official Vercel AI chatbot uses this approach.

2. **Schema stability**: New tools and part types don't require migrations. This matters because we'll iterate on tools frequently (adding Notion search, file previews, etc.).

3. **Query patterns**: Our primary query is "load all messages for a chat session" — one `SELECT ... ORDER BY created_at`. We rarely need to query within parts. If we do (e.g., analytics on tool usage), we can use JSONB operators or extract to a separate analytics table.

4. **Simplicity**: One table, no joins, no mapping layer. The normalized approach adds real complexity (the Vercel persistence-db template has ~200 lines of mapping code) for benefits we don't need yet.

5. **Migration path**: If query-within-parts becomes a bottleneck later, we can add a `message_parts` materialized view or extract tool calls to a separate analytics table without changing the primary schema.

The normalized approach (Option B) is better for apps that need to query tool usage across conversations, enforce schema at the DB level, or run analytics on part types. For a chat app where the dominant access pattern is "load and render a conversation," JSONB is the right tradeoff.

---

## Appendix G: Integration Token Strategy — Per-User vs. Workspace vs. Hybrid

### The Problem

The current schema has one integration per workspace (`UNIQUE(workspace_id, provider)`). For v1 with 1:1 user-to-workspace mapping, this works. But when multi-user workspaces arrive, a fundamental question emerges: **whose Google Drive does the workspace's integration token access?**

If User A (the admin) connected Google Drive, the workspace has User A's tokens. When User B asks the AI about a file, the agent uses User A's tokens — which means:
- User B can access files User A can see, even if User B shouldn't have access.
- User B *cannot* access their own personal Drive files.

This is the core tension.

### Option 1: Workspace-Level Token (Current Design)

One OAuth connection per workspace. All members use the admin's token.

```
integrations: UNIQUE(workspace_id, provider)
```

**Works well for:** Google Workspace shared drives where all team members already have access to the same files. The token is effectively just an API key to a shared resource.

**Breaks for:** Personal "My Drive" files, or any scenario where different users have different permissions on the external service.

| Pros | Cons |
|------|------|
| Simple — one connection, everyone benefits | All API calls use one person's permissions |
| Minimal OAuth friction | If connector leaves org, integration breaks |
| Good fit for shared drives | Can't access personal Drive files |

### Option 2: Per-User Tokens Within a Workspace

Each user connects their own Google account. The integration row is per-user-per-workspace.

```sql
UNIQUE(user_id, workspace_id, provider)
-- instead of UNIQUE(workspace_id, provider)
```

When the AI agent calls Drive tools, it uses the *requesting user's* token — not a shared workspace token. Each user sees only files they personally have access to.

**Works well for:** Apps where users have different permissions (which is most real-world cases). Notion, Figma, and Asana all use this model.

**Breaks for:** Nothing, really — it's strictly more correct. The downside is UX friction: every user must go through the OAuth flow individually.

| Pros | Cons |
|------|------|
| Correct permissions — each user's token reflects their access | Every user must connect individually |
| Token compromise only affects one user | More tokens to manage (refresh, revoke) |
| User leaving doesn't break other users' integrations | "Integration gaps" — some users may not have connected |
| Natural audit trail | |

### Option 3: Hybrid (Workspace Token + Per-User Override)

Workspace has a default integration (e.g., for shared drives), but individual users can also connect their own account for personal file access.

```sql
-- Workspace-level (for shared resources)
CREATE TABLE integrations (
  ...
  workspace_id UUID REFERENCES workspaces(id),
  connected_by UUID REFERENCES auth.users(id),
  UNIQUE(workspace_id, provider)
);

-- Per-user (for personal resources, optional)
CREATE TABLE user_integrations (
  ...
  user_id UUID REFERENCES auth.users(id),
  workspace_id UUID REFERENCES workspaces(id),
  UNIQUE(user_id, workspace_id, provider)
);
```

The agent tool resolves tokens with a fallback chain: user token → workspace token → error.

| Pros | Cons |
|------|------|
| Most flexible — handles shared and personal use cases | Most complex implementation |
| Graceful degradation | Token selection logic is non-trivial |
| Best UX for mixed scenarios | Two token tables to manage |

### Recommendation: Start with Per-User Tokens (Option 2)

**Change the schema to per-user tokens now.** Here's why:

1. **It's the correct default.** Google Drive permissions are per-user. Using one user's token for another user's queries is a permission violation, even if it works today.

2. **The UX cost is low.** Each user connects once. With 1:1 workspaces in v1, this is identical to the current design. When multi-user workspaces ship, each new member connects during onboarding — it's one click.

3. **It avoids a future schema migration.** Going from `UNIQUE(workspace_id, provider)` to `UNIQUE(user_id, workspace_id, provider)` is a breaking change that requires data migration. Going from per-user to hybrid (adding a workspace-level table on top) is additive.

4. **Real-world precedent.** Notion, Figma, and Asana all use per-user tokens. Slack offers both but defaults to per-user. The industry has converged on this for good reason.

### Schema Change

```sql
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  provider integration_provider NOT NULL,
  status integration_status NOT NULL DEFAULT 'active',
  provider_account_email TEXT,
  encrypted_refresh_token TEXT NOT NULL,         -- AES-256-GCM encrypted, base64-encoded
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, workspace_id, provider)
);
```

The `workspace_id` column still scopes the integration to a workspace (so if a user is in two workspaces, they might have different integrations in each). But the token belongs to the user, and API calls use *their* permissions.

### Impact on Agent Tools

The Drive tools (Appendix C) already receive a `userId` parameter. The change is two-fold: (1) the DAL's `getIntegration` handles decryption of the stored refresh token, and (2) `getDriveClient` accepts a plaintext refresh token directly:

```typescript
// In the workflow (T12) — the orchestration layer
const integration = await getIntegration(userId, workspaceId, 'google_drive');
// integration.refreshToken is already decrypted by the DAL

const drive = getDriveClient(integration.refreshToken);
// googleapis auto-fetches a fresh access token using the refresh token

// getDriveClient implementation (lib/google/drive.ts)
function getDriveClient(refreshToken: string): drive_v3.Drive {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  return google.drive({ version: 'v3', auth: oauth2Client });
}
```

### Future: Adding Workspace-Level Shared Drives

When needed, add a separate `workspace_integrations` table for shared resources (e.g., a Google Workspace service account). The agent tool fallback chain becomes: user token → workspace token → error. This is the hybrid approach (Option 3), built on top of per-user tokens — no migration needed.

---

## Appendix H: Token Encryption Strategy

### The Problem

The `integrations` table stores Google OAuth refresh tokens. These are long-lived credentials that grant read access to a user's Google Drive. Storing them as plaintext in the database is a security anti-pattern — if the database is compromised (SQL injection, leaked backup, insider threat), all tokens are immediately usable.

Google's OAuth best practices explicitly state: *"For server-side applications that store tokens for many users, encrypt them at rest."*

### Options Considered

#### Option 1: Plaintext with RLS

Store tokens as `TEXT` columns, rely on RLS to restrict client access.

- **Pros:** Simplest possible implementation.
- **Cons:** Tokens are plaintext in the DB, backups, logs, and replication streams. RLS is access control, not data protection. Anyone with DB-level read access (admin, service role, backup reader) sees working tokens. Not recommended by OWASP or Google.
- **Verdict:** Rejected. Not acceptable for production.

#### Option 2: pgcrypto Column Encryption + Supabase Vault for Key

Encrypt token columns with PostgreSQL's `pgp_sym_encrypt()` using an AES-256 key stored in Supabase Vault.

- **Pros:** Encrypted at rest in the DB. Key managed by Vault (encrypted by libsodium, key never stored in DB dumps).
- **Cons:** Requires `SECURITY DEFINER` functions or RPC calls to decrypt — cannot use `supabase-js` `.select()` directly. Statement logging can expose plaintext on INSERT. Vault is designed for a small number of infrastructure secrets, not high-throughput per-user data.
- **Verdict:** Viable but adds unnecessary coupling to Supabase-specific APIs and complicates the DAL.

#### Option 3: Application-Level AES-256-GCM Encryption (Chosen)

Encrypt tokens in the Next.js application layer using Node.js `crypto` before writing to the DB. The column stores base64-encoded ciphertext. The encryption key is an environment variable.

- **Pros:** Simple — two utility functions (`encrypt`, `decrypt`). Works with any database. The DAL is the only layer that touches crypto — callers receive plaintext. Encryption key lives in Vercel's environment variable system (not in the DB, not in source control).
- **Cons:** Key rotation requires re-encrypting all rows (mitigated by the small number of integrations). No hardware key management (acceptable at this scale).
- **Verdict:** Chosen. Best balance of security, simplicity, and portability.

### Implementation

#### Encryption Module (`lib/crypto.ts`)

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12    // 96-bit IV recommended for GCM
const TAG_LENGTH = 16   // 128-bit auth tag

function getKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY
  if (!key) throw new Error('TOKEN_ENCRYPTION_KEY is not set')
  return Buffer.from(key, 'hex')  // 32 bytes = 256 bits
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // Format: iv (12 bytes) + tag (16 bytes) + ciphertext
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decrypt(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, 'base64')
  const iv = buf.subarray(0, IV_LENGTH)
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH)
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted) + decipher.final('utf8')
}
```

#### Generating the Encryption Key

```bash
# Generate a 32-byte (256-bit) random key as hex
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Add to .env.local as TOKEN_ENCRYPTION_KEY=<output>
```

#### How It Flows Through the System

```
OAuth callback (T11)
  → exchangeCodeForTokens(code) returns { accessToken, refreshToken }
  → upsertIntegration({ ..., refreshToken })          ← plaintext
     → DAL calls encrypt(refreshToken)                 ← lib/crypto.ts
     → INSERT encrypted_refresh_token = <ciphertext>   ← DB stores ciphertext

Workflow (T12) needs Drive access
  → getIntegration(userId, workspaceId, 'google_drive')
     → DAL SELECTs encrypted_refresh_token
     → DAL calls decrypt(encrypted_refresh_token)      ← lib/crypto.ts
     → Returns Integration { refreshToken: <plaintext> }
  → getDriveClient(integration.refreshToken)           ← googleapis fetches fresh access token

Disconnect (T11)
  → getIntegration(...)                                ← decrypts
  → revokeToken(integration.refreshToken)              ← revokes with Google
  → deleteIntegration(id)                              ← row deleted
```

### What We Don't Store

**Access tokens are not persisted.** Google access tokens expire in ~1 hour. The `googleapis` library automatically fetches a fresh access token from Google using the refresh token on each API call. There is no reason to store a value that expires before the next request. This simplifies the schema (one encrypted column instead of two) and reduces blast radius.

### Security Properties

| Threat | Mitigation |
|--------|-----------|
| DB backup leaked | Attacker gets ciphertext — useless without `TOKEN_ENCRYPTION_KEY` |
| SQL injection (read) | Attacker gets ciphertext — cannot decrypt without the env var |
| Insider with DB access | Sees encrypted bytes, not plaintext tokens |
| Log exposure | DAL writes ciphertext to DB — plaintext never appears in SQL logs |
| Key compromise | Rotate key + re-encrypt all rows (small number of integrations). Revoke all tokens via Google API as a precaution. |
| Tampered ciphertext | GCM authentication tag detects modification — `decrypt` throws |

### Future: Key Rotation

If the encryption key needs to be rotated:

1. Generate a new key.
2. Run a migration script: decrypt all rows with the old key, re-encrypt with the new key.
3. Update the `TOKEN_ENCRYPTION_KEY` environment variable.
4. Deploy.

With per-user integrations (small number of rows), this is a trivial batch operation. If the number of integrations grows large, add a `key_version` column to support gradual rotation (decrypt with the version-appropriate key).
