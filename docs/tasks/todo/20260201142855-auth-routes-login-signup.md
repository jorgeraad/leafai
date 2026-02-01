# 20260201142855 - Auth Routes + Login + Signup

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-01 14:28:48 EST |
| **Last Modified**  | 2026-02-01 14:28:48 EST |
| **Status**         | todo |
| **Blocked-By**     | 20260201142848, 20260201142850, 20260201142851 |
| **Touches**        | `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`, `src/app/auth/actions.ts`, `src/app/(auth)/auth/callback/route.ts` |
| **References**     | [Design Doc](../../design-claude.md) |

## Description

Implement all authentication flows — login page (email/password + Google OAuth), signup page, server actions, and OAuth callback route handler.

## Acceptance Criteria

- [ ] Login page renders email/password form and Google sign-in button
- [ ] Signup page renders registration form with confirm password
- [ ] `signInWithEmail` works with valid/invalid credentials
- [ ] `signUpWithEmail` works, validates password match
- [ ] OAuth callback exchanges session and redirects
- [ ] Error cases handled (missing code, exchange failure)
- [ ] All tests pass

## Progress Log

### 2026-02-01 14:28:48 EST
Initial creation. Task extracted from design doc Section 7.6.3.
