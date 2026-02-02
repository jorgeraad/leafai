# 20260202100504 - Improve Citation Style in Agent Prompt

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-02 10:05:05 EST |
| **Last Modified**  | 2026-02-02 10:31:40 EST |
| **Status**         | completed |
| **Agent**          | clear-newt |
| **Blocked-By**     | none |
| **Touches**        | src/lib/ai/prompts.ts, src/components/chat/message-bubble.tsx |
| **References**     | [Citation Support Task](../../tasks/completed/20260201231443-add-citation-support.md) |

## Description

Update the AI agent's system prompt to encourage proper academic-style citations rather than just inline document links. Citations should include the document title, relevant metadata (author/owner if available, date), and a linked reference — following the common understanding of what a citation is, not just a hyperlink.

## Acceptance Criteria

- [x] DRIVE_PROMPT updated to instruct the agent to produce proper citations (title, metadata, link) rather than bare inline links
- [x] Citation instructions encourage a format closer to traditional citations (e.g., author/source, title, date) with the Drive link included
- [x] Instructions still tell the agent to cite each document where its information is used

## Implementation Steps

_To be filled in when the task is started._

## Progress Log

### 2026-02-02 10:05:05 EST
Initial creation. User requested improving citation guidance from simple doc links to true citations.

### 2026-02-02 10:06:22 EST
Completed. Updated DRIVE_PROMPT citation instructions to encourage proper citations with document title (linked), last-modified date, and inline attribution. The tools return `name`, `modifiedTime`, and `webViewLink` — no author field is available from the current Drive API fields, so citations use title + date + link. All 131 tests pass.

### 2026-02-02 10:10:22 EST
Reworked to ChatGPT-style citations. Prompt now instructs agent to use numbered `[n]` inline markers with a `<!-- sources -->` HTML comment block at the end. UI (`message-bubble.tsx`) now parses these, renders numbered pill badges inline (with hover tooltip showing doc title), and shows source cards at the bottom of the message. Non-citation messages render unchanged. All 131 tests pass.

### 2026-02-02 10:15:30 EST
Fixed two UI issues: (1) citation pills rendering on new lines instead of inline — switched from splitting text into multiple Markdown renders to a single-pass approach using React children traversal to inject pills; (2) tooltips clipped by message bubble — removed `overflow-hidden` from bubble wrapper.

### 2026-02-02 10:17:56 EST
Added streaming support for sources block — `parseCitations` now matches partial `<!-- sources` blocks (no closing `-->`) so the raw HTML comment is hidden and source cards appear progressively during streaming.

### 2026-02-02 10:20:15 EST
Added streaming support for inline citation markers — changed pill injection condition from `hasCitations` (requires parsed sources) to `hasInlineMarkers` (detects `[n]` patterns in text). Now pills render immediately as markers stream in, and gain tooltips/links once corresponding source lines arrive. All 131 tests pass. Task complete.

### 2026-02-02 10:31:40 EST
Fixed citation tooltip clipping — switched from CSS `absolute` positioning (clipped by ancestor overflow) to a React portal (`createPortal` to `document.body`) with `position: fixed` and `z-index: 9999`. Tooltip position is calculated from the pill's bounding rect on hover. All 131 tests pass.
