# 20260201231443 - Add Citation Support with Drive Links

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-01 23:14:43 EST |
| **Last Modified**  | 2026-02-01 23:16:09 EST |
| **Status**         | completed |
| **Agent**          | brave-coyote |
| **Blocked-By**     | none |
| **Touches**        | src/lib/ai/prompts.ts, src/lib/ai/tools.ts, src/components/chat/message-bubble.tsx |
| **References**     | [Design Doc](../../design-claude.md) |

## Description

Add citation support to the AI agent so it references Google Drive documents with clickable links. The agent should include inline citations linking to Drive files whenever it uses information from a document. On the UI side, the existing markdown rendering already supports links — we just need to style them well and ensure the agent is prompted to produce them.

Key changes:
1. **Tool output enrichment**: Include the Drive file URL (`https://drive.google.com/file/d/{id}/view`) in tool results so the agent has the link available.
2. **System prompt update**: Instruct the agent to cite sources using markdown links `[Document Name](drive_url)` whenever referencing information from a file.
3. **UI link styling**: Ensure citation links in assistant messages look good — styled distinctly (e.g., colored, underlined) and open in a new tab.

## Acceptance Criteria

- [x] Tool results from `read_drive_file`, `list_drive_folder`, and `search_drive` include a `webViewLink` (Drive URL) for each file
- [x] System prompt instructs the agent to cite sources with markdown links `[filename](url)` whenever referencing document content
- [x] Citation links in assistant messages are visually distinct and open in new tabs
- [ ] Agent produces citations in practice when answering questions from Drive content (requires manual testing with connected Drive)

## Implementation Steps

- [x] Update `tools.ts` — add `webViewLink` field to tool results (construct from file ID)
- [x] Update `prompts.ts` — enhance DRIVE_PROMPT with detailed citation instructions
- [x] Update `message-bubble.tsx` — style links and add `target="_blank"` via react-markdown components
- [ ] Manual testing — verify citations appear and links work

## Progress Log

### 2026-02-01 23:14:43 EST
Initial creation. Adding citation support so the agent references Drive documents with clickable links.

### 2026-02-01 23:16:09 EST
Completed implementation. All three files updated:
- `tools.ts`: All three tools now include `webViewLink` constructed from file ID (`https://drive.google.com/file/d/{id}/view`)
- `prompts.ts`: DRIVE_PROMPT enhanced with explicit citation instructions — agent told to use `[Document Name](webViewLink)` inline
- `message-bubble.tsx`: Added custom `a` component to react-markdown — blue text, underline with hover transition, opens in new tab with `target="_blank" rel="noopener noreferrer"`
Build passes. Manual testing with connected Drive still needed to verify agent actually produces citations.
