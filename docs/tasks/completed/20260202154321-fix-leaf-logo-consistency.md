# 20260202154321 - Fix Leaf Logo SVG Consistency

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-02 15:43:21 EST |
| **Last Modified**  | 2026-02-02 15:44:22 EST |
| **Status**         | completed |
| **Agent**          | brave-heron |
| **Blocked-By**     | none |
| **Touches**        | src/components/icons/leaf-logo.tsx, public/leaf-icon.svg |
| **References**     | [Landing page logo](../../../src/components/logo.tsx) |

## Description

The leaf logo SVG in the sidebar (`LeafLogo` component) and browser tab favicon (`public/leaf-icon.svg`) use different SVG paths than the landing page logo. Update them to match the landing page version.

## Acceptance Criteria

- [x] Sidebar `LeafLogo` component uses the same SVG paths as the landing page logo
- [x] Browser tab favicon (`public/leaf-icon.svg`) uses the same SVG paths as the landing page logo
- [x] All three logos render identically

## Implementation Steps

- [x] Update `src/components/icons/leaf-logo.tsx` paths to match `logo.tsx`
- [x] Update `public/leaf-icon.svg` paths to match `logo.tsx`

## Progress Log

### 2026-02-02 15:43:21 EST
Initial creation. User reported sidebar and favicon logos look different from landing page. Starting work immediately.

### 2026-02-02 15:44:22 EST
Completed. Updated both files to use the landing page's SVG paths. The sidebar had 3 paths (leaf body + truncated stem + vein) while the landing page had 2 paths (leaf body + full curved stem). Aligned both sidebar component and favicon to the landing page version. Build passes.
