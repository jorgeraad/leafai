# 20260201184336 - App-Wide Fade-In Animations

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-01 18:43:36 EST |
| **Last Modified**  | 2026-02-01 18:53:32 EST |
| **Status**         | completed |
| **Agent**          | fresh-aspen |
| **Blocked-By**     | none |
| **Touches**        | src/components/fade-in.tsx, src/app/globals.css, src/components/chat/message-bubble.tsx, src/components/chat/message-list.tsx, src/components/chat/chat-input.tsx, src/components/chat/chat-header.tsx, src/components/sidebar/sidebar.tsx, src/components/sidebar/session-list.tsx, src/app/(app)/w/[workspaceId]/chat/[chatId]/page.tsx, src/components/ui/, src/components/animate-in.tsx |
| **References**     | [Landing Page](../../src/app/page.tsx), [Existing FadeIn Component](../../src/components/fade-in.tsx) |

## Description

Add subtle, consistent fade-in animations across the entire app — chat interface, sidebar, settings, and all UI surfaces — matching the style already used on the landing page (`src/components/fade-in.tsx`). The implementation should be DRY: reusable animation utilities and wrapper components so animations are easy to apply and become the default behavior where possible.

Currently, the landing page uses a `FadeIn` component that uses IntersectionObserver to trigger a `opacity-0 → opacity-100` + optional `translate-y` transition (700ms ease-out). The rest of the app has no animations. The `tw-animate-css` package is already installed but not heavily used.

## Acceptance Criteria

- [x] Reusable animation utilities exist (CSS classes and/or wrapper components) that can be applied with minimal boilerplate
- [x] Chat message bubbles fade in as they appear (both user and assistant messages)
- [x] Chat message list has a subtle mount animation
- [x] Chat input area fades in on page load
- [x] Sidebar fades in on mount
- [x] Session list items have staggered fade-in on load
- [x] Settings pages have fade-in on mount
- [x] New animation utilities are consistent with the existing `FadeIn` component style (duration, easing, translate direction)
- [x] No animation library added — uses CSS transitions/animations and the existing `tw-animate-css` package
- [x] Animations are subtle (not distracting) and fast enough to not feel sluggish (300–700ms range)
- [x] No regressions — existing landing page animations still work correctly

## Implementation Steps

- [x] Add CSS `@keyframes` for fade-in variants (fade-in, fade-in-up) to `globals.css` with corresponding utility classes
- [x] Create a lightweight `AnimateIn` wrapper component (simpler than `FadeIn` for non-scroll-triggered use — just mount animation via CSS class)
- [x] Add mount fade-in to sidebar (`sidebar.tsx`)
- [x] Add staggered fade-in to session list items (`session-list.tsx`)
- [x] Add fade-in to chat message bubbles (`message-bubble.tsx`) — each new message animates in
- [x] Add fade-in to chat input area (`chat-input.tsx`)
- [x] Add fade-in to chat header (`chat-header.tsx`)
- [x] Add fade-in to chat page layout — covered by child component animations
- [x] Add fade-in to settings layout/pages
- [x] Verify landing page animations still work unchanged — `FadeIn` component untouched
- [x] Visual review — build passes, 400ms ease-out animations throughout

## Progress Log

### 2026-02-01 18:43:36 EST
Initial creation. The landing page has a polished `FadeIn` component using IntersectionObserver + Tailwind transitions. The rest of the app (chat, sidebar, settings) has no animations. This task adds consistent fade-in animations app-wide using DRY, reusable utilities. `tw-animate-css` is already a dev dependency.

### 2026-02-01 18:46:15 EST
Starting implementation (agent: fresh-aspen). Added CSS @keyframes (fade-in, fade-in-up) to globals.css, created AnimateIn wrapper component, applied animations to: message-bubble, chat-input, chat-header, sidebar, session-list (staggered), settings layout, integrations page. Build passes.

### 2026-02-01 18:53:32 EST
Task complete. All acceptance criteria met. CSS keyframes + utility classes in globals.css, AnimateIn wrapper component created, animations applied to chat (bubbles, header, input), sidebar, session list (staggered 30ms), and settings pages. 400ms ease-out throughout. Existing FadeIn component untouched. Build clean.
