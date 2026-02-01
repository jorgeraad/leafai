# 20260201142859 - Chat API + Workflow + Reconnection

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-01 14:28:48 EST |
| **Last Modified**  | 2026-02-01 14:28:48 EST |
| **Status**         | todo |
| **Blocked-By**     | 20260201142848, 20260201142851, 20260201142852, 20260201142853 |
| **Touches**        | `src/app/api/chat/route.ts`, `src/app/api/chat/workflow.ts`, `src/app/api/runs/[runId]/route.ts` |
| **References**     | [Design Doc](../../design-claude.md) |

## Description

Implement the core message-sending API, durable workflow definition, and stream reconnection endpoint. Integration layer orchestrating DAL, Drive, and AI Agent.

## Acceptance Criteria

- [ ] `POST /api/chat` saves user message, starts workflow, returns SSE stream
- [ ] Auth and session validation (401, 404 responses)
- [ ] Workflow loads history, builds tools, runs agent, saves response
- [ ] Workflow with no Drive integration runs agent with empty tools
- [ ] Workflow on agent error calls `failAssistantMessage`
- [ ] `GET /api/runs/:runId` returns readable stream with startIndex support
- [ ] All tests pass

## Progress Log

### 2026-02-01 14:28:48 EST
Initial creation. Task extracted from design doc Section 7.6.3.
