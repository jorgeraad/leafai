# Leaf AI

A Next.js web app that lets users sign in with Google, connect a Google Drive folder, and chat with an AI agent that uses the folder contents as context. The AI agent runs in a durable workflow so it survives disconnects, deployments, and serverless timeouts.

See `docs/design-claude.md` for the full design document.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Browser (React 19)                           │
│                                                                      │
│  ┌──────────┐  ┌────────────┐  ┌───────────────┐  ┌──────────────┐  │
│  │ Login /  │  │  Sidebar   │  │   Chat View   │  │  Settings /  │  │
│  │ Signup   │  │  Sessions  │  │  (streaming)  │  │ Integrations │  │
│  └────┬─────┘  └─────┬──────┘  └───────┬───────┘  └──────┬───────┘  │
└───────┼──────────────┼─────────────────┼─────────────────┼───────────┘
        │              │                 │                  │
        ▼              ▼                 ▼                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     Next.js 16 API Routes (Bun)                      │
│                                                                      │
│  /auth/callback    /api/chat    /api/runs/[runId]    /api/integrations│
│  /auth/actions     (POST→wf)   (GET→reconnect)      /[provider]     │
└───────┬──────────────┬──────────────┬───────────────────┬────────────┘
        │              │              │                    │
   ┌────▼────┐   ┌─────▼──────────────▼──────┐    ┌──────▼───────┐
   │Supabase │   │  Vercel Workflow Engine    │    │   Google     │
   │  Auth   │   │                            │    │   Drive      │
   │(Google  │   │  chatWorkflow              │    │   API v3     │
   │ OAuth + │   │   ├─ fetchDriveContext     │    │              │
   │ email)  │   │   ├─ loadHistory           │    │(googleapis)  │
   │         │   │   ├─ runAgent (stream LLM) │    └──────────────┘
   └────┬────┘   │   └─ saveResponse          │
        │        └──────────────┬─────────────┘
   ┌────▼────┐                  │
   │Supabase │                  ▼
   │Postgres │          ┌───────────────┐
   │         │          │  LLM Provider │
   │workspaces│         │  (OpenRouter → │
   │members  │          │   Anthropic /  │
   │integra- │          │   OpenAI)      │
   │ tions   │          └───────────────┘
   │sessions │
   │messages │
   └─────────┘
```

### Key Data Flow

1. **Auth** — Google OAuth or email/password via Supabase Auth. Middleware refreshes sessions on every request.
2. **Chat** — `POST /api/chat` saves the user message, starts a durable workflow, and returns an SSE stream.
3. **Workflow** — Fetches Drive context (if connected), loads history, streams LLM response via AI SDK + OpenRouter, persists the result.
4. **Reconnection** — If the user disconnects mid-stream, `GET /api/runs/[runId]` resumes from the last received token.
5. **Integrations** — Google Drive is connected from Settings via a separate OAuth flow; tokens are encrypted at rest.

---

## Prerequisites

| Requirement | Why |
|---|---|
| **Bun** | Package manager and runtime. Install from [bun.sh](https://bun.sh). |
| **Docker** | Supabase local stack runs in containers. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/), [OrbStack](https://orbstack.dev/), or colima. |
| **Supabase CLI** | Manages the local Supabase stack. Install via `bun add -g supabase`. |

---

## Quick Start (No Google Credentials Needed)

This is the recommended path for **AI agents** and contributors who don't have Google OAuth credentials. It starts the full local stack (Supabase + Next.js) and uses email/password authentication — no Google OAuth setup required.

```bash
# 1. Install dependencies
bun install

# 2. Install Supabase CLI (if not already installed)
bun add -g supabase

# 3. Make sure Docker is running, then start the local Supabase stack
supabase start

# 4. Generate .env.local from supabase status output
scripts/setup-env.sh

# 5. Add your OpenRouter API key to .env.local (get one at https://openrouter.ai/keys)
echo 'OPENROUTER_API_KEY=your-key-here' >> .env.local

# 6. Apply database migrations
supabase db reset

# 7. Start the dev server
bun run dev
```

The app will be running at `http://localhost:3000`.

### Creating a Test Account

The app supports email/password registration. Navigate to `/signup` and create an account — no email confirmation is required in local dev. A personal workspace is created automatically on first sign-up.

For programmatic/test usage, you can also use the Supabase client directly:

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'testpassword123',
});
```

Or create a pre-confirmed user via the Supabase Admin API:

```bash
SERVICE_ROLE_KEY=$(supabase status --output json | jq -r '.SERVICE_ROLE_KEY // .service_role_key')

curl -X POST 'http://127.0.0.1:54321/auth/v1/admin/users' \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "email_confirm": true,
    "user_metadata": { "full_name": "Test User" }
  }'
```

Supabase Studio is available at `http://localhost:54323` for inspecting users and data.

---

## Full Setup (With Google OAuth)

Use this path when you need to test the real Google sign-in flow.

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com).
2. Create a project (or select an existing one).
3. Navigate to **APIs & Services > OAuth consent screen** — choose External, fill in app name and emails, add scopes: `openid`, `email`, `profile`.
4. Navigate to **APIs & Services > Credentials > Create Credentials > OAuth Client ID**.
   - Application type: **Web application**
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://127.0.0.1:54321/auth/v1/callback`
5. Copy the **Client ID** and **Client Secret**.

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your-client-id
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET=your-client-secret
```

### 3. Start Everything

```bash
bun install
bun add -g supabase        # if not already installed
supabase start             # reads .env for Google OAuth config
scripts/setup-env.sh       # writes .env.local
supabase db reset          # applies migrations
bun run dev
```

### Passing Google Credentials to AI Agents

To let agents test the full Google OAuth flow, pass credentials as environment variables when spawning the agent:

```bash
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=... \
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET=... \
  <agent-launch-command>
```

The agent writes these to `.env` before running `supabase start`.

---

## Environment Files

| File | Committed | Purpose |
|---|---|---|
| `.env.example` | Yes | Template for Supabase auth provider secrets |
| `.env` | No | Actual Supabase auth provider secrets (Google OAuth). Read by `supabase start`. |
| `.env.local` | No | Next.js env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `OPENROUTER_API_KEY`). Auto-generated by `scripts/setup-env.sh` — add `OPENROUTER_API_KEY` manually. |

---

## Common Commands

```bash
bun install              # Install dependencies
bun run dev              # Start dev server (http://localhost:3000)
bun run build            # Production build
bun run lint             # Run ESLint
bun test                 # Run tests

supabase start           # Start local Supabase stack (requires Docker)
supabase stop            # Stop local Supabase stack
supabase db reset        # Reset local DB and replay all migrations
supabase status          # Show local Supabase service URLs and keys
```

---

## Project Structure

```
src/
  app/
    (app)/                        # Protected workspace routes
      w/[workspaceId]/            # Workspace root, chat, settings
        chat/[chatId]/            # Individual chat view
        settings/integrations/    # Google Drive connection
    (auth)/                       # Integration OAuth callbacks
    api/
      chat/                       # POST → start chat workflow
      runs/[runId]/               # GET → reconnect to workflow stream
      integrations/[provider]/    # Connect/disconnect integrations
    auth/                         # Supabase auth callback + server actions
    login/                        # Login page (Google OAuth + email)
    signup/                       # Registration page
  components/
    ui/                           # Radix UI primitives (button, input, card, …)
    chat/                         # Chat header, input, message list, bubbles
    sidebar/                      # Session list, navigation
    integrations/                 # Integration cards
    icons/                        # Leaf logo, Google icon
  hooks/                          # useChatSessions, useChatStream
  lib/
    ai/                           # Agent, tools, prompts, title generation
    db/                           # DAL: workspaces, integrations, messages, sessions
    google/                       # OAuth client, Drive API helpers
    supabase/                     # Client, server, admin, middleware helpers
    crypto.ts                     # AES-256-GCM encryption for tokens
    types.ts                      # Shared TypeScript types
  middleware.ts                   # Session refresh on every request
docs/                             # Design docs, task management
supabase/
  config.toml                     # Local Supabase configuration
  migrations/                     # SQL migration files (schema + RLS)
scripts/
  setup-env.sh                    # Generates .env.local from supabase status
  create-worktree.sh              # Git worktrees for parallel agent work
  agent-name.sh                   # Random agent name generator
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Runtime | Bun |
| Language | TypeScript 5 (strict) |
| Auth | Supabase Auth (Google OAuth + email/password) |
| Database | Supabase PostgreSQL (with RLS) |
| AI | Vercel AI SDK (`ai` + `@ai-sdk/react`) via OpenRouter |
| Durable Workflows | Vercel Workflow Dev Kit |
| Google Integration | `googleapis` (Drive API v3) |
| UI Components | Radix UI + shadcn/ui |
| Styling | Tailwind CSS v4 |
| Testing | Vitest + React Testing Library |
| Deployment | Vercel |
