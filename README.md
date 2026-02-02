# Leaf AI

An AI chat application that connects to your Google Drive and lets you have conversations grounded in your own documents. Built with Next.js 16, Supabase, and the Vercel AI SDK.

The AI agent can search, list, and read files from your Drive on-demand — citing sources with links back to the original documents. Conversations run on durable workflows that survive disconnects, deployments, and serverless cold starts.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
  - [Chat Workflow](#chat-workflow)
  - [Security Model](#security-model)
- [Design Decisions](#design-decisions)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Commands](#commands)
- [AI-Driven Development](#ai-driven-development)

---

## Features

- **Google Drive as context** — the AI agent has tools to search, browse, and read your Drive files during a conversation, citing documents inline
- **Durable chat workflows** — powered by Vercel Workflow Dev Kit; streams survive disconnects and resume from the last token
- **Dual auth** — Google OAuth and email/password via Supabase Auth
- **Per-user workspaces** — auto-created on first login, workspace-scoped sessions and integrations
- **Public chat sharing** — share a read-only snapshot of any conversation via a short link
- **Mobile-first responsive UI** — full-screen menu overlay on mobile, adaptive layout for chat and settings across all screen sizes
- **Streaming SSE** — real-time token-by-token rendering with thinking indicators
- **Auto-generated titles** — LLM generates a concise session title after the first exchange
- **Encrypted tokens** — Google refresh tokens encrypted at rest with AES-256-GCM
- **Row-Level Security** — every table has RLS policies; the database enforces access control independent of application code

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Browser (React 19)                         │
│                                                                 │
│   Login/Signup ──── Sidebar ──── Chat View ──── Settings        │
│   (OAuth+email)    (sessions)   (streaming)   (integrations)    │
└────────┬──────────────┬──────────────┬──────────────┬───────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Next.js 16 App Router (Bun)                    │
│                                                                 │
│  /auth/callback     /api/chat      /api/runs/[runId]            │
│  /auth/actions      POST→workflow  GET→reconnect                │
│                                                                 │
│  /api/integrations/[provider]      /shared/[token]              │
│  connect / disconnect              public read-only view        │
└────────┬──────────────┬──────────────┬──────────────┬───────────┘
         │              │              │              │
    ┌────▼────┐   ┌─────▼──────┐  ┌───▼────┐  ┌─────▼──────┐
    │Supabase │   │  Durable   │  │Google  │  │ OpenRouter │
    │  Auth   │   │  Workflow  │  │Drive   │  │    LLM     │
    │         │   │  Engine    │  │API v3  │  │            │
    │Google   │   │            │  │        │  │Claude      │
    │OAuth +  │   │loadHistory │  │search  │  │Sonnet 4    │
    │email/pw │   │getToken    │  │list    │  │            │
    │         │   │streamAgent │  │read    │  │(via Vercel │
    └────┬────┘   │saveResponse│  │        │  │ AI SDK)    │
         │        └─────┬──────┘  └────────┘  └────────────┘
    ┌────▼──────────────▼─────┐
    │   Supabase PostgreSQL   │
    │                         │
    │  workspaces             │
    │  workspace_members      │
    │  integrations (AES enc) │
    │  chat_sessions          │
    │  chat_participants      │
    │  messages (JSONB parts) │
    │                         │
    │  RLS on every table     │
    └─────────────────────────┘
```

### Chat Workflow

The core of the application is the durable chat workflow. When a user sends a message:

```
User sends message
       │
       ▼
POST /api/chat
  ├─ authenticate user
  ├─ save user message to DB
  ├─ start durable workflow ──────────────────────────┐
  ├─ create pending assistant message                 │
  ├─ schedule title generation (after response)       │
  └─ return SSE stream ◄─────────────────────────┐    │
                                                  │    │
                              Workflow Engine      │    │
                              ┌───────────────────┤    │
                              │ loadHistory        │    │
                              │ getRefreshToken    │    │
                              │ markStreaming       │    │
                              │ runAgent ──────────┘    │
                              │  ├─ streamText()        │
                              │  ├─ tool calls ◄────────┤
                              │  │  (Drive search/      │
                              │  │   list/read)         │
                              │  └─ stream chunks ──► SSE
                              │ saveResponse            │
                              └─────────────────────────┘
```

Each step is durable — if the serverless function cold-starts or the connection drops, the workflow resumes from the last completed step. The client can reconnect via `GET /api/runs/:runId` and pick up where it left off.

### Security Model

```
                    ┌──────────────────────────┐
                    │      Security Layers      │
                    ├──────────────────────────┤
  Request enters ──►│ 1. Middleware             │ Session refresh on every request
                    │ 2. Route auth             │ supabase.auth.getUser() (server-side)
                    │ 3. RLS policies           │ DB enforces row-level access
                    │ 4. App-layer encryption   │ AES-256-GCM on refresh tokens
                    │ 5. Scope separation       │ Login OAuth ≠ Drive OAuth
                    └──────────────────────────┘
```

**Why separate OAuth flows?** Login uses minimal scopes (`openid`, `email`, `profile`) through Supabase Auth. Google Drive access uses a separate OAuth consent with `drive.readonly` scope, initiated from Settings. This means users who never connect Drive never grant API access, and token revocation for Drive doesn't affect their login session.

**Why application-layer encryption?** Even though Supabase provides RLS, refresh tokens are encrypted with AES-256-GCM before storage. If the database is compromised, tokens are useless without the encryption key. Only the refresh token is stored — access tokens are fetched on-demand and never persisted.

---

## Design Decisions

| Decision | Rationale |
|---|---|
| **Durable workflows** over plain streaming | Serverless functions timeout; workflows survive cold starts, deploys, and disconnects without losing progress |
| **JSONB message parts** over normalized tables | Messages store AI SDK-native `parts` (text, tool-call, tool-result) as JSONB — no ORM mapping, direct serialization from the SDK |
| **OpenRouter** as LLM gateway | Single integration point for multiple model providers; easy to swap models without code changes |
| **Workspace-scoped resources** | Sessions, integrations, and members are scoped to workspaces, preparing for future team/shared workspace support without schema changes |
| **DAL pattern** over raw Supabase queries | All DB access goes through `src/lib/db/` modules that handle snake_case→camelCase mapping, encryption, and type safety |
| **Clone-based sharing** | Shared chats are immutable snapshots (cloned sessions), not live links — the original session stays private and editable |
| **Server Components by default** | Only `'use client'` where interactivity is needed; maximizes server rendering and minimizes client JS |

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | Server Components, `after()` callbacks |
| Runtime | Bun | Package manager + runtime |
| Language | TypeScript 5 (strict) | |
| Auth | Supabase Auth | Google OAuth + email/password |
| Database | Supabase PostgreSQL | RLS on every table |
| AI | Vercel AI SDK + OpenRouter | `streamText`, `generateText`, tool calling |
| Durable Workflows | Vercel Workflow Dev Kit | `'use workflow'` / `'use step'` directives |
| Google Integration | `googleapis` | Drive API v3 (search, list, read) |
| UI | Radix UI + Tailwind CSS v4 | |
| Testing | Vitest | |
| Deployment | Vercel | |

---

## Project Structure

```
src/
  app/
    (app)/                          # Protected routes (workspace)
      w/[workspaceId]/              #   Chat, settings
        chat/[chatId]/              #   Individual chat view
        settings/integrations/      #   Google Drive connection
    (auth)/                         # Integration OAuth callbacks
    api/
      chat/                         # POST → start durable workflow
        route.ts                    #   Auth, save message, start workflow, SSE
        workflow.ts                 #   5-step durable workflow
      runs/[runId]/                 # GET → reconnect to in-progress stream
      integrations/[provider]/      # Connect/disconnect integrations
    auth/                           # Supabase callback + server actions
    shared/[token]/                 # Public shared chat view
    login/ signup/                  # Auth pages
  components/
    ui/                             # Radix primitives (button, input, card, ...)
    chat/                           # Message list, bubbles, input, header
    sidebar/                        # Session list, context menus
    integrations/                   # Integration cards
  hooks/
    useChatSessions.ts              # Session CRUD + sidebar state
    useChatStream.ts                # SSE streaming + reconnection
  lib/
    ai/
      agent.ts                      # streamText with Drive tools
      tools.ts                      # list_drive_folder, read_drive_file, search_drive
      prompts.ts                    # System prompts (with/without Drive)
      title.ts                      # Auto-generate session titles
    db/                             # Data Access Layer
      workspaces.ts                 #   get-or-create workspace
      chat-sessions.ts              #   CRUD, sharing, clone
      messages.ts                   #   create, update status, list
      integrations.ts               #   CRUD with transparent encryption
      sharing.ts                    #   Clone-based public sharing
    google/                         # OAuth client, Drive API helpers
    supabase/                       # Client (browser), server, admin, middleware
    crypto.ts                       # AES-256-GCM token encryption
    types.ts                        # Shared TypeScript types (discriminated unions)
  middleware.ts                     # Session refresh + route protection
supabase/
  migrations/                       # SQL: schema, RLS policies, triggers
scripts/
  setup-env.sh                      # Generate .env.local from supabase status
```

---

## Getting Started

### Prerequisites

| Requirement | Install |
|---|---|
| **Bun** | [bun.sh](https://bun.sh) |
| **Docker** | [Docker Desktop](https://www.docker.com/products/docker-desktop/), [OrbStack](https://orbstack.dev/), or colima |
| **Supabase CLI** | `bun add -g supabase` |

### Quick Start (email/password auth, no Google credentials needed)

```bash
bun install
supabase start                  # requires Docker
scripts/setup-env.sh            # generates .env.local
echo 'OPENROUTER_API_KEY=sk-...' >> .env.local   # https://openrouter.ai/keys
supabase db reset               # apply migrations
bun run dev
```

Open `http://localhost:3000`, navigate to `/signup`, and create an account. No email confirmation needed locally.

### Full Setup (with Google OAuth + Drive)

1. In [Google Cloud Console](https://console.cloud.google.com), create OAuth credentials:
   - Authorized JS origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://127.0.0.1:54321/auth/v1/callback` and `http://localhost:3000/auth/integrations/google-drive/callback`
   - Enable the Google Drive API
2. Copy credentials to `.env`:
   ```bash
   cp .env.example .env
   # Edit .env with your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
   ```
3. Start everything:
   ```bash
   bun install
   supabase start        # reads .env for Google config
   scripts/setup-env.sh
   supabase db reset
   bun run dev
   ```

### Environment Files

| File | Committed | Purpose |
|---|---|---|
| `.env.example` | Yes | Template for Google OAuth secrets |
| `.env` | No | Actual Google OAuth secrets (read by `supabase start`) |
| `.env.local` | No | Next.js runtime vars — auto-generated by `scripts/setup-env.sh`, add `OPENROUTER_API_KEY` manually |

---

## Commands

```bash
bun install              # Install dependencies
bun run dev              # Start dev server
bun run build            # Production build
bun run lint             # ESLint
bun test                 # Vitest

supabase start           # Start local Supabase (Docker)
supabase stop            # Stop local Supabase
supabase db reset        # Reset DB + replay migrations
supabase status          # Show local URLs and keys
```

---

## AI-Driven Development

This project was built almost entirely through AI agents, coordinated by a custom task management system designed to maximize parallelism and maintain a clear audit trail.

### How it works

The codebase includes a lightweight, file-based task system that lets multiple AI agents work on the same project concurrently — each in its own git worktree, on its own branch, with its own dev server.

```
docs/tasks/
  todo/                  # Planned tasks waiting to start
  in-progress/           # Currently being worked on
  completed/             # Finished (35 tasks total)
  current-progress.md    # Single-page snapshot of project state
```

Each task is a markdown file (e.g., `20260201142859-chat-api-workflow.md`) containing structured metadata:

```markdown
| Field        | Value                                    |
|--------------|------------------------------------------|
| Status       | in-progress                              |
| Agent        | calm-cedar                               |
| Blocked-By   | 20260201142851, 20260201142853            |
| Touches      | src/app/api/chat/, src/lib/ai/agent.ts   |
```

- **Blocked-By** declares dependencies — a task can't start until its dependencies are in `completed/`
- **Touches** declares which files the task will modify — agents check for overlaps before starting to avoid conflicts
- **Progress Log** is append-only with timestamps, creating a full audit trail of decisions and work

### Agent coordination

Each agent session generates a unique identity (`scripts/agent-name.sh` → `calm-cedar`, `swift-falcon`, etc.) and claims tasks under that name. `scripts/create-worktree.sh` creates isolated git worktrees so multiple agents can run simultaneously without filesystem conflicts — each gets its own branch, env files, and dev server port.

### Why this approach

The entire initial feature set (14 foundation tasks) was decomposed into a dependency graph and executed in parallel waves:

```
Phase 1 (serial):   Define shared TypeScript interfaces
Phase 2 (parallel): DB migrations, API routes, UI components, AI agent — all built simultaneously
Phase 3 (serial):   Integration wiring
```

Subsequent work (21 additional tasks — bug fixes, UX improvements, new features) followed the same pattern. The system enforces discipline that makes AI agents productive: explicit interfaces before implementation, dependency tracking to prevent blocked work, and file ownership to prevent merge conflicts.

### Where to look

| Resource | Path |
|---|---|
| Task management spec | [`docs/task-management.md`](docs/task-management.md) |
| All completed tasks (35) | [`docs/tasks/completed/`](docs/tasks/completed/) |
| Project status snapshot | [`docs/tasks/current-progress.md`](docs/tasks/current-progress.md) |
| Original design doc | [`docs/design-docs/design-claw.md`](docs/design-docs/design-claw.md) |
| Agent name generator | [`scripts/agent-name.sh`](scripts/agent-name.sh) |
| Worktree creator | [`scripts/create-worktree.sh`](scripts/create-worktree.sh) |

