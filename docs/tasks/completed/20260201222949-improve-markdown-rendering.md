# Improve Markdown Rendering in Chat Message Bubbles

| Field         | Value |
|---------------|-------|
| Created       | 2026-02-01 22:29:49 EST |
| Last Modified | 2026-02-01 22:42:14 EST |
| Status        | completed |
| Agent         | keen-lynx |
| Blocked-By    | none |
| Touches       | `src/components/chat/message-bubble.tsx`, `package.json` |
| References    | none |

## Description

The current markdown rendering in chat message bubbles has issues:
1. Bullet points (unordered/ordered lists) aren't rendered properly
2. Line spacing between paragraphs needs improvement — paragraphs should have slightly more spacing than a simple line wrap

Currently using `react-markdown` with Tailwind's `prose prose-sm` classes but no remark/rehype plugins. Need to add `remark-gfm` for proper GFM support (lists, tables, strikethrough, etc.) and tune the prose typography for better paragraph/line spacing.

## Acceptance Criteria

- [x] Bullet points (unordered and ordered lists) render correctly in message bubbles
- [x] Paragraphs have visually distinct spacing compared to line wraps within a paragraph
- [x] GFM features (tables, strikethrough, task lists) work correctly
- [x] User message bubbles and assistant message bubbles both render markdown properly
- [x] No visual regressions in existing message rendering

## Implementation Steps

- [x] Add `remark-gfm` dependency
- [x] Configure `react-markdown` with `remark-gfm` plugin
- [x] Add/tune CSS for prose typography spacing in message bubbles
- [x] Test rendering with various markdown content

## Progress Log

- 2026-02-01 22:42:14 EST — Completed. Added `remark-gfm` and `@tailwindcss/typography` (via `@plugin`), configured prose utility classes for paragraph/list spacing, and fixed user bubble contrast by applying `prose-invert` on dark-background user messages.
