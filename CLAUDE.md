# CLAUDE.md — Agent Guidelines for Leaf AI

## Project Overview

Leaf AI is a Next.js 16 (App Router) web app that lets users sign in with Google, connect a Google Drive folder, and chat with an AI agent that uses the folder contents as context. See `docs/design-claude.md` for the full design document.

For setup instructions, prerequisites, and environment configuration, see `README.md`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Runtime | Bun |
| Auth | Supabase Auth (Google OAuth + email/password) |
| Database | Supabase PostgreSQL |
| AI | Vercel AI SDK (`ai` + `@ai-sdk/react`) |
| Durable Workflows | Vercel Workflow Dev Kit |
| Google Integration | `googleapis` (Drive API v3) |
| Styling | Tailwind CSS v4 |
| Deployment | Vercel |

## Project Structure

```
src/
  app/              # Next.js App Router pages and API routes
    auth/           # Auth callback and actions
    login/          # Login page
    signup/         # Registration page
  components/       # Shared UI components
  lib/
    supabase/       # Supabase client (client.ts) and server (server.ts) helpers
  middleware.ts     # Supabase session refresh middleware
docs/               # Design documents
supabase/
  config.toml       # Local Supabase configuration
  migrations/       # SQL migration files
scripts/
  setup-env.sh      # Generates .env.local from local Supabase status
  create-worktree.sh # Creates git worktrees in a sibling leaf-worktrees/ directory
```

## Runtime & Package Manager

- **Always use `bun`** as the package manager and runtime. Never use `npm`, `yarn`, or `pnpm`.
- Install dependencies: `bun install`
- Run dev server: `bun run dev`
- Run scripts: `bun run <script>`
- Add packages: `bun add <package>` (or `bun add -d <package>` for dev dependencies)

## Supabase CLI

**Always use the Supabase CLI** for all database operations. Do not manually create migration files, hand-edit `config.toml` schemas, or bypass the CLI. Examples:

- Create migrations: `supabase migration new <name>` (generates the timestamped file for you)
- Apply migrations locally: `supabase db reset`
- Diff schema changes: `supabase db diff`
- Generate types: `supabase gen types typescript --local`

**CLI resolution order:** Try running `supabase` directly first (the globally installed CLI). If that fails (not installed), fall back to `bunx supabase`. Never install it as a project dependency.

```bash
# Preferred
supabase migration new create_users

# Fallback only if `supabase` is not on PATH
bunx supabase migration new create_users
```

### NEVER target production

**This is non-negotiable.** Never run any Supabase CLI command that targets a remote/production project. This includes but is not limited to:

- `supabase db push` — **NEVER run this**
- `supabase db reset` with `--linked` — **NEVER**
- Any command with `--project-ref` or `--linked` flags — **NEVER**
- `supabase link` — **Do not link to production**

All Supabase CLI commands must target the **local** development instance only. If a command's help text mentions it affects the remote database, do not run it.

## Sub-Agent Usage & Parallelization

If you have access to sub-agents (e.g., the Task tool), **use them aggressively** to divide work and run tasks in parallel. Do not do sequentially what can be done concurrently.

### Planning Phase

When planning any non-trivial feature:

1. **Decompose** the feature into independent units of work (e.g., database schema, API route, UI component, workflow logic).
2. **Define interfaces first** — before any implementation begins, explicitly define the TypeScript types/interfaces that sit between the independent units. This is the contract that allows parallel work to integrate cleanly.
3. **Assign each unit** to a sub-agent as a standalone task with clear inputs, outputs, and acceptance criteria.
4. **Integrate last** — once all parallel sub-agents complete, wire the pieces together.

### Documentation Lookup Before Implementation

Before writing any implementation code, **always look up the relevant documentation** for the libraries and APIs involved. This is non-negotiable — do not rely on memorized knowledge for library APIs, as they change between versions.

How to organize this is a judgment call. Some strategies:

- **Dedicated research sub-agent(s):** Spawn sub-agents to look up documentation for each library/API in parallel, then use their summaries to inform the implementation plan before spawning implementation sub-agents.
- **Research-per-implementation-agent:** Give each implementation sub-agent responsibility for looking up the docs relevant to its own task before coding.
- **Hybrid:** Have a research sub-agent gather docs for shared/cross-cutting concerns (e.g., Supabase auth patterns, Next.js 16 App Router conventions), while individual implementation sub-agents look up docs specific to their narrow task.

Pick whichever approach minimizes total wall-clock time and avoids agents coding against stale or incorrect API assumptions. The key rule is: **no implementation sub-agent should start writing code without first consulting up-to-date documentation for the APIs it will use.**

### Example: Adding a new feature

```
Phase 1 (serial):
  - Define shared types in src/types/feature.ts

Phase 2 (parallel sub-agents):
  - Sub-agent A: Look up Supabase docs → create DB migration + queries
  - Sub-agent B: Look up Next.js 16 route handler docs → build API route
  - Sub-agent C: Look up relevant React/Tailwind docs → build UI component

Phase 3 (serial):
  - Integration + wiring once all sub-agents complete
```

### General Sub-Agent Guidelines

- **Maximize parallelism.** If two tasks don't depend on each other, run them as concurrent sub-agents.
- **Give sub-agents full context.** Each sub-agent should receive the relevant type definitions, interface contracts, and any design doc excerpts it needs. Don't make sub-agents guess.
- **Use sub-agents for research too.** Exploring the codebase, searching for patterns, reading documentation — these are all good sub-agent tasks, especially when multiple lookups can happen in parallel.
- **Prefer multiple focused sub-agents over one large one.** A sub-agent with a narrow, well-defined task will produce better results than one juggling many concerns.

## Interface-Driven Design

- **Always define TypeScript interfaces/types before implementing** the code that uses them.
- Place shared types in `src/types/` so all modules reference a single source of truth.
- API request/response shapes, database row types, and component props should all have explicit type definitions.
- This enables parallel implementation — multiple agents can code against the same interface without coordinating on internal details.

## Test-First Implementation

- **Write tests before writing implementation code.** This applies to both unit tests and integration tests.
- Tests serve as the acceptance criteria — an implementation is correct when all tests pass.
- Use the test file to encode the expected behavior of the interface so that agents working in parallel have a concrete, runnable spec.
- Run tests with: `bun run test`
- Place test files adjacent to the code they test using the `*.test.ts` / `*.test.tsx` naming convention.

## Key Conventions

- Use `@supabase/ssr` for server-side Supabase clients (not the deprecated `auth-helpers`).
- Always use `supabase.auth.getUser()` on the server (never `getSession()`) for security.
- Middleware (`src/middleware.ts`) refreshes Supabase sessions on every request.
- Server Components are the default; only use `'use client'` when the component needs browser APIs or interactivity.
- Keep API routes thin — business logic belongs in dedicated modules under `src/lib/`.

## Commits

- **Split commits logically.** Each commit should represent a single coherent change (e.g., one commit for a migration, another for the DAL functions that use it). Don't bundle unrelated changes into one commit.
- **Do not add a `Co-Authored-By` line** or any other trailer crediting the agent as a collaborator. Commits should look like they came from the human developer.

## Common Commands

```bash
bun install          # Install dependencies
bun run dev          # Start dev server
bun run build        # Production build
bun run lint         # Run ESLint
bun run test         # Run tests (vitest)
```

## Agent Identity

At the start of every session, generate a unique name for yourself by running:

```bash
bash scripts/agent-name.sh
```

This outputs a two-word name like `swift-falcon` or `calm-otter`. **Remember this name for the entire session** and use it whenever you claim or update a task. This lets other agents (and humans) distinguish which agent is working on what.

## Task Management

**All agents must follow the task management system defined in [`docs/task-management.md`](docs/task-management.md).** Read it before starting any non-trivial work.

Key points (the full doc has detailed workflows, checklists, and rules):

- **Task files** live in `docs/tasks/` and move through `todo/` → `in-progress/` → `completed/`.
- **`docs/tasks/current-progress.md`** is the first file to read when starting a session. It lists what's ready, in progress, recently completed, and blocked.
- **Blocked-By** — each task declares which other tasks must complete before it can start. Never start a blocked task.
- **Touches** — each task declares which files/directories it will modify. Before starting, check for overlaps with in-progress tasks and coordinate if needed.
- **Timestamps** — always use `date '+%Y-%m-%d %H:%M:%S %Z'`. Never guess.
- **Keep tasks narrow** so many can run in parallel.
- **Break tasks down** — when starting a task, decompose it into a checklist of smaller implementation steps in the task file. This makes progress visible and enables parallel sub-agents to each pick up a step. If you discover significant missing work mid-task, create a new task file in `todo/` rather than letting the current task balloon in scope.

### Delegate task bookkeeping to a sub-agent

The orchestrator agent should **not** spend its own context on task file updates. Instead, delegate all task management operations to a dedicated sub-agent. This keeps the orchestrator focused on planning and coordination.

**When to spawn a task-management sub-agent:**
- Creating new task files (pass it the task title, description, acceptance criteria, Blocked-By, Touches, and References — let it handle numbering, timestamps, file creation, and updating `current-progress.md`).
- Starting a task (pass the task number — let it handle the dependency check, overlap check, file move, status update, and `current-progress.md` update).
- Updating a task mid-work (pass the task number and what to log — let it handle the timestamp, progress log append, and any Touches changes).
- Completing a task (pass the task number and summary — let it handle the file move, final log entry, criteria check-off, `current-progress.md` update, and unblocking downstream tasks).

**What to tell the sub-agent:** Always instruct it to read `docs/task-management.md` for the full procedure. Give it the specific operation (create / start / update / complete), the relevant task number or details, and let it handle everything else. The sub-agent should report back with a brief confirmation (e.g., "Created task 0005 in todo/, updated current-progress.md") so the orchestrator stays informed without having to read the task files itself.

**Batch when possible:** If you need to create multiple tasks at once (e.g., after decomposing a feature), spawn a single sub-agent with all the task details rather than one sub-agent per task. Similarly, if completing one task unblocks others, let the completing sub-agent handle the unblocking updates in the same pass.

**Note on dev server ports:** Multiple agents may be working in parallel on the same machine in separate Git worktrees, each running their own dev server. The dev server will not always be on port 3000 — it auto-increments when a port is taken (3001, 3002, etc.). Always read the actual port from the `bun run dev` output and use that port for any subsequent requests or browser checks.

