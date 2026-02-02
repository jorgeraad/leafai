# 20260201223339 - Guide Agent When Google Drive Is Disconnected

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-01 22:33:39 EST |
| **Last Modified**  | 2026-02-01 22:34:08 EST |
| **Status**         | completed |
| **Agent**          | slim-finch |
| **Blocked-By**     | none |
| **Touches**        | src/lib/ai/prompts.ts |
| **References**     | [Design Doc](../../design-claude.md) |

## Description

When Google Drive is not connected, the AI agent receives a generic system prompt with no mention of Google Drive. If a user asks about their files, the agent responds with a generic "I can't access your files" message that doesn't explain how to fix the situation. The BASE_PROMPT should inform the agent that Google Drive integration is available but not yet connected, and instruct it to guide users to Settings > Integrations to connect.

## Acceptance Criteria

- [x] BASE_PROMPT in `src/lib/ai/prompts.ts` tells the agent that Google Drive can be connected
- [x] When a user asks about files without Drive connected, the agent explains how to enable it (Settings > Integrations)
- [x] The agent response is helpful and actionable, not a dead end

## Implementation Steps

- [x] Update BASE_PROMPT to mention Google Drive availability and guide users to Settings → Integrations

## Progress Log

### 2026-02-01 22:33:39 EST
Initial creation. User reported that the agent gives a useless response when asked about files without Google Drive connected.

### 2026-02-01 22:33:58 EST
Starting work. Single-file change to BASE_PROMPT in prompts.ts.

### 2026-02-01 22:34:08 EST
Completed. Updated BASE_PROMPT to explicitly tell the agent that Google Drive is not connected and to guide users to Settings → Integrations to connect it.
