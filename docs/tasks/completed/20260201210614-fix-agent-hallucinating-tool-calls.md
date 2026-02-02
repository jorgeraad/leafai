# 20260201210614 - Fix Agent Hallucinating Tool Calls

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-01 21:06:14 EST |
| **Last Modified**  | 2026-02-01 22:17:16 EST |
| **Status**         | completed |
| **Agent**          | cool-coyote |
| **Blocked-By**     | none |
| **Touches**        | src/app/api/chat/workflow.ts, src/lib/ai/agent.ts, src/lib/ai/prompts.ts, src/lib/db/integrations.ts, src/lib/db/integrations.test.ts |
| **References**     | [Design Doc](../../design-claude.md) |

## Description

The AI agent hallucinates fake tool calls (generating XML that looks like `<function_calls>` and `<function_result>` as plain text) instead of actually invoking the registered Google Drive tools. This happens because `buildTools()` returns `{}` when `getIntegration()` returns null, but the system prompt still tells the model it can access Drive. The model then fakes tool usage in its text output. Need to debug why `getIntegration()` returns null despite the user having connected Google Drive, and fix the root cause.

## Acceptance Criteria

- [x] Identified and fixed the root cause of `getIntegration()` returning null for connected users
- [x] Agent correctly invokes real Google Drive tools (list_drive_folder, read_drive_file, search_drive) when a user has connected their Drive
- [x] Agent does not hallucinate fake tool calls when tools are unavailable (system prompt should reflect actual tool availability)

## Implementation Steps

- [x] Identify root cause: `getIntegration()` uses cookie-based Supabase client which has no auth context in workflow steps
- [x] Fix `integrations.ts` to use `createAdminClient()` for `getIntegration()` (matches pattern used by `messages.ts` and `workspaces.ts`)
- [x] Make system prompt conditional on tool availability (`hasTools` parameter)
- [x] Update tests for new admin client usage
- [x] Fix workflow step serialization: move tool creation into runAgentStep to avoid serializing Zod schemas

## Progress Log

### 2026-02-01 21:06:14 EST
Initial creation. User reported that the AI agent generates fake tool call XML in its text responses instead of actually calling Google Drive tools. Prior analysis identified that `buildTools()` likely returns empty tools because `getIntegration()` returns null.

### 2026-02-01 21:37:44 EST
Completed. Root cause: `getIntegration()` in `integrations.ts` used the cookie-based `createClient()` from `@/lib/supabase/server`. When called from a Vercel Workflow step (`'use step'`), `cookies()` returns nothing because the durable execution context doesn't have the original HTTP request cookies. This means the Supabase client has no JWT, `auth.uid()` is null, and the RLS policy `auth.uid() = user_id` blocks the query — returning no rows. Fix: switched `getIntegration()` to use `createAdminClient()` (bypasses RLS), which is the same pattern used by `messages.ts` and `workspaces.ts`. Also added defense-in-depth: the system prompt now only claims Drive access when tools are actually available (`hasTools` param in `buildSystemPrompt`).

### 2026-02-01 22:17:16 EST
Fixed second issue: Vercel Workflows serialize step return values, but `buildTools` step was returning tool objects containing Zod schemas which aren't serializable. Restructured workflow to return only the refresh token (a plain string) from the DB step, and construct tools inside `runAgentStep` where they're consumed without crossing a step boundary.
