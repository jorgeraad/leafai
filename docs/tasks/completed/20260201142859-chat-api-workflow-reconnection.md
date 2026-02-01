# 20260201142859 - Chat API + Workflow + Reconnection

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-01 14:28:48 EST |
| **Last Modified**  | 2026-02-01 16:29:20 EST |
| **Status**         | completed |
| **Agent**          | calm-cedar |
| **Blocked-By**     | 20260201142848, 20260201142851, 20260201142852, 20260201142853 |
| **Touches**        | `src/app/api/chat/route.ts`, `src/app/api/chat/workflow.ts`, `src/app/api/runs/[runId]/route.ts`, `next.config.ts` |
| **References**     | [Design Doc](../../design-claude.md) |

## Description

Implement the core message-sending API, durable workflow definition, and stream reconnection endpoint. Integration layer orchestrating DAL, Drive, and AI Agent.

## Acceptance Criteria

- [x] `POST /api/chat` saves user message, starts workflow, returns SSE stream
- [x] Auth and session validation (401, 404 responses)
- [x] Workflow loads history, builds tools, runs agent, saves response
- [x] Workflow with no Drive integration runs agent with empty tools
- [x] Workflow on agent error calls `failAssistantMessage`
- [x] `GET /api/runs/:runId` returns readable stream with startIndex support
- [x] All tests pass

## Implementation Steps

- [x] Read design doc for Chat API, workflow, and reconnection specs
- [x] Look up Vercel AI SDK and Next.js route handler docs
- [x] Write tests for POST /api/chat route
- [x] Write tests for workflow logic
- [x] Write tests for GET /api/runs/:runId route
- [x] Implement POST /api/chat route
- [x] Implement workflow logic
- [x] Implement GET /api/runs/:runId route
- [x] Verify all tests pass

## Progress Log

### 2026-02-01 14:28:48 EST
Initial creation. Task extracted from design doc Section 7.6.3.

### 2026-02-01 16:23:18 EST
Starting implementation. Agent: calm-cedar. All 4 dependencies complete: Foundation (types, crypto, Supabase clients), DAL (message/session/integration queries), Google OAuth + Drive (getDriveClient, Drive helpers), AI Agent Core (runAgent, createDriveTools, buildSystemPrompt). No Touches overlap with in-progress tasks.

### 2026-02-01 16:29:20 EST
Completed. Installed `workflow` package (v4.0.1-beta.50). Wrapped `next.config.ts` with `withWorkflow`. Created 3 source files and 3 test files (8 tests). Route handler authenticates via `supabase.auth.getUser()`, validates session, saves user message, starts durable workflow, creates pending assistant message with run ID, returns SSE stream. Workflow uses `'use workflow'`/`'use step'` directives: loadHistory (finds pending assistant msg + builds message array), buildTools (checks Drive integration, creates tools if available), runAgentStep (writes chunks to workflow writable stream), saveResponse/failAssistant. Reconnection route passes `startIndex` to `run.getReadable()`. All 121 tests pass, build succeeds.
