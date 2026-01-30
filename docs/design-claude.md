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
| Styling | Tailwind CSS |

---

## 1. Authentication & OAuth Flow

Authentication and third-party integrations are **separate concerns**. Login only requires basic identity scopes. Google Drive (and future integrations) are connected later from a Settings page.

### 1.1 Login (Identity Only)

Supabase Auth handles sign-in. Initially Google is the only provider, but the design supports adding others (GitHub, email/password, etc.) without changes.

```
User clicks "Sign in with Google"
  → supabase.auth.signInWithOAuth({ provider: 'google' })
  → Google consent screen (profile + email only)
  → Redirect to /auth/callback
  → exchangeCodeForSession()
  → Ensure personal workspace exists (see below)
  → Redirect to /dashboard
```

**Login scopes (minimal):**
```
openid
email
profile
```

No Drive scopes are requested at login. No provider tokens need to be stored at this stage — Supabase handles session management.

**Auto-workspace creation:** On every login callback, check if the user already has a workspace. If not, create one:
1. Create a `workspaces` row with `name = "{firstName}'s Workspace"` (parsed from the Google profile).
2. Create a `workspace_members` row.

This can be implemented as a Supabase Database Function trigger on `auth.users` insert, or in the `/auth/callback` route handler. The trigger approach is simpler and guarantees the workspace exists before any application code runs.

**Key implementation details:**
- Use `@supabase/ssr` for server-side client creation (not the deprecated `auth-helpers`).
- Middleware refreshes Supabase sessions on every request.
- Always use `supabase.auth.getUser()` (not `getSession()`) on the server for security.
- The login flow is provider-agnostic — adding a new identity provider is just a new button + Supabase config.
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
- Tokens are stored in the `integrations` table (see schema below).
- The `googleapis` library auto-refreshes access tokens when we set credentials with a refresh token. We listen for the `tokens` event and update the `integrations` table.

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
-- Workspaces
-- ============================================================
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

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
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, workspace_id, provider)
);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_integrations" ON integrations
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Chat Sessions (renamed from conversations)
-- ============================================================
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  title VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_chat_sessions_workspace ON chat_sessions(workspace_id, updated_at DESC);

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
  parts JSONB NOT NULL DEFAULT '[]'::jsonb,   -- AI SDK UIMessage.parts (see Appendix F)
  status message_status NOT NULL DEFAULT 'completed',
  workflow_run_id TEXT,                        -- Vercel Workflow run ID (for reconnection)
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_messages_session ON messages(chat_session_id, created_at);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants_see_messages" ON messages
  USING (
    chat_session_id IN (
      SELECT chat_session_id FROM chat_participants WHERE user_id = auth.uid()
    )
  );
```

### Schema Notes

- **`workspaces`**: Auto-created on first login as "{firstName}'s Workspace". For v1, 1:1 with users. All resources (integrations, chat sessions) belong to a workspace, so the model is ready for team workspaces without schema changes.
- **`workspace_members`**: Junction table. No roles for now — all members are treated as admins. A `role` column can be added later when permission tiers are needed.
- **`integrations`**: Per-user, scoped to a workspace. Each user connects their own external account. API calls use the requesting user's token, so permissions are correct. See Appendix G for the analysis of this choice vs. workspace-level tokens.
- **`chat_sessions`**: Belongs to a workspace. `created_by` tracks who started it.
- **`chat_participants`**: Tracks which users are part of a chat session. The creator is automatically added. Enables future multi-user chat and scoped RLS.
- **`messages.parts`**: JSONB column storing the AI SDK `UIMessage.parts` array directly. See Appendix F for the detailed analysis of this choice vs. normalized parts tables.
- **`messages.workflow_run_id`**: Links an assistant message to its durable workflow run, enabling reconnection. The workflow's Redis-backed stream handles token buffering — no per-token DB writes needed (see Appendix E).
- **`messages.status`**: Allows the frontend to distinguish between messages that are still being generated vs. completed.

---

## 6. Key User Flows

### 6.1 First-Time Login

1. User visits `/` → sees landing page with "Sign in with Google" button.
2. Click triggers `supabase.auth.signInWithOAuth({ provider: 'google' })` — identity scopes only.
3. Google consent screen → user grants profile + email access.
4. Redirect to `/auth/callback` → exchange code for session.
5. If first login: auto-create personal workspace ("{firstName}'s Workspace") and add user as `owner`.
6. Redirect to `/dashboard` (showing the user's workspace).

### 6.2 Connect Google Drive

1. User navigates to `/settings/integrations`.
2. Clicks "Connect" on the Google Drive card.
3. Separate Google OAuth flow → consent screen requests `drive.readonly` scope.
4. Redirect to `/auth/integrations/google-drive/callback` → extract & store tokens in `integrations` table.
5. Redirect back to `/settings/integrations` — card now shows "Connected".

### 6.3 Start a New Chat

1. User clicks "New Chat".
2. Create `chat_sessions` row in the user's active workspace, add user as participant.
3. Navigate to `/chat/:chatSessionId`.
4. User can chat freely. If they ask about Drive content and Drive is not connected, the agent tool fails gracefully and prompts the user to connect via Settings.

### 6.4 Send a Message

1. User types message → POST to `/api/chat` with `{ chatSessionId, content }`.
2. API saves user message to DB, starts workflow, returns stream.
3. Frontend renders streaming tokens in real-time.
4. Workflow: fetch Drive docs → build context → call LLM → stream tokens → save final message.
5. On completion, workflow updates `messages.status` to `completed` and writes final `content`.

### 6.5 Reconnection

1. User navigates to `/chat/:chatSessionId`.
2. Frontend fetches messages from DB.
3. If latest assistant message has `status = 'streaming'`:
   - Connect to `/api/runs/:runId?startIndex=:streamIndex`.
   - Resume rendering from where the stream left off.
4. If `status = 'completed'`: render normally.
5. If `status = 'error'`: show error with retry button.

---

## 7. Project Structure

```
app/
├── (auth)/
│   ├── login/page.tsx                          # Login page
│   ├── auth/callback/route.ts                  # Supabase OAuth callback (identity)
│   └── auth/integrations/
│       └── google-drive/
│           ├── route.ts                        # GET: initiate Drive OAuth flow
│           └── callback/route.ts               # GET: handle Drive OAuth callback
├── (app)/
│   ├── layout.tsx                              # Authenticated layout with sidebar
│   ├── dashboard/page.tsx                      # Chat session list
│   ├── chat/[id]/page.tsx                      # Chat interface
│   └── settings/
│       └── integrations/page.tsx               # Integration management (connect/disconnect)
├── api/
│   ├── chat/
│   │   ├── route.ts                            # POST: send message + start workflow
│   │   └── workflow.ts                         # Durable chat workflow definition
│   ├── runs/
│   │   └── [runId]/route.ts                    # GET: reconnect to workflow stream
│   ├── integrations/
│   │   └── [provider]/route.ts                 # DELETE: disconnect integration
│   └── drive/
│       ├── folders/route.ts                    # GET: validate & list folder contents
│       └── files/[fileId]/route.ts             # GET: fetch file content
├── globals.css
└── layout.tsx                                  # Root layout
lib/
├── supabase/
│   ├── client.ts                               # Browser client
│   ├── server.ts                               # Server client
│   └── middleware.ts                            # Session refresh
├── google/
│   ├── auth.ts                                 # OAuth2 client factory (Drive-specific)
│   └── drive.ts                                # Drive API helpers
├── ai/
│   ├── tools.ts                                # Agent tool definitions
│   └── context.ts                              # Document context builder
└── types.ts                                    # Shared types
middleware.ts                                   # Next.js middleware (Supabase session refresh)
```

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
const lastAssistant = messages.findLast(m => m.role === 'assistant');

if (lastAssistant.status === 'streaming') {
  // Reconnect to live stream
  connectToStream(lastAssistant.workflow_run_id);
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
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, workspace_id, provider)
);
```

The `workspace_id` column still scopes the integration to a workspace (so if a user is in two workspaces, they might have different integrations in each). But the token belongs to the user, and API calls use *their* permissions.

### Impact on Agent Tools

The Drive tools (Appendix C) already receive a `userId` parameter. The only change is how `getDriveClient(userId)` resolves the token:

```typescript
async function getDriveClient(userId: string, workspaceId: string) {
  const integration = await supabase
    .from('integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .eq('provider', 'google_drive')
    .eq('status', 'active')
    .single();

  if (!integration.data) {
    throw new Error('Google Drive not connected. Connect it in Settings > Integrations.');
  }

  const oauth2Client = new google.auth.OAuth2(...);
  oauth2Client.setCredentials({
    access_token: integration.data.access_token,
    refresh_token: integration.data.refresh_token,
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}
```

### Future: Adding Workspace-Level Shared Drives

When needed, add a separate `workspace_integrations` table for shared resources (e.g., a Google Workspace service account). The agent tool fallback chain becomes: user token → workspace token → error. This is the hybrid approach (Option 3), built on top of per-user tokens — no migration needed.
