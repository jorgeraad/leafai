# 20260201182012 - Migrate AI SDK to use OpenRouter

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-01 18:20:12 EST |
| **Last Modified**  | 2026-02-01 18:28:50 EST |
| **Status**         | completed |
| **Agent**          | keen-coyote |
| **Blocked-By**     | none |
| **Touches**        | src/lib/ai/agent.ts, src/lib/ai/title.ts, src/lib/ai/agent.test.ts, src/lib/ai/title.test.ts, package.json, .env.example, docs/design-claude.md |
| **References**     | [OpenRouter AI SDK Provider](https://github.com/OpenRouterTeam/ai-sdk-provider), [Design Doc](../../design-claude.md) |

## Description

Replace the direct `@ai-sdk/anthropic` provider with `@openrouter/ai-sdk-provider` so all LLM calls route through OpenRouter's unified API. This eliminates the need for individual provider API keys (e.g., `ANTHROPIC_API_KEY`) and enables easy model switching — any of OpenRouter's 300+ models can be used by changing a single model ID string.

## Acceptance Criteria

- [x] `@openrouter/ai-sdk-provider` is installed and `@ai-sdk/anthropic` is removed from dependencies
- [x] `src/lib/ai/agent.ts` uses `openrouter()` instead of `anthropic()` for model instantiation
- [x] `src/lib/ai/title.ts` uses `openrouter()` instead of `anthropic()` for model instantiation
- [x] `OPENROUTER_API_KEY` env var is documented in `.env.example` and `docs/design-claude.md`
- [x] `ANTHROPIC_API_KEY` references are removed from documentation
- [x] Tests in `src/lib/ai/agent.test.ts` and `src/lib/ai/title.test.ts` are updated to mock `@openrouter/ai-sdk-provider`
- [x] Model IDs use OpenRouter format (e.g., `anthropic/claude-sonnet-4-20250514`)
- [x] All tests pass

## Implementation Steps

- [x] Install `@openrouter/ai-sdk-provider` and remove `@ai-sdk/anthropic`
- [x] Update `src/lib/ai/agent.ts` to use `openrouter()` provider
- [x] Update `src/lib/ai/title.ts` to use `openrouter()` provider
- [x] Update test mocks in `agent.test.ts` and `title.test.ts`
- [x] Update `.env.example` with `OPENROUTER_API_KEY`
- [x] Update `docs/design-claude.md` references
- [x] Verify all AI tests pass

## Progress Log

### 2026-02-01 18:20:12 EST
Initial creation. User request to migrate from direct Anthropic provider to OpenRouter for unified model access. Current code uses `@ai-sdk/anthropic` in `src/lib/ai/agent.ts` and `src/lib/ai/title.ts` with `claude-sonnet-4-20250514`. Will replace with `@openrouter/ai-sdk-provider` using `createOpenRouter()` factory.

### 2026-02-01 18:23:43 EST
keen-coyote: Implementation complete. Replaced `@ai-sdk/anthropic` with `@openrouter/ai-sdk-provider@2.1.1`. Updated agent.ts, title.ts, both test files, .env.example, and design-claude.md. Model IDs now use OpenRouter format (`anthropic/claude-sonnet-4-20250514`). All 22 AI tests pass. 3 pre-existing test failures in other files (supabase config, workflow) are unrelated.

### 2026-02-01 18:28:50 EST
keen-coyote: Task completed. Also updated README.md with OpenRouter setup step and env files table.
