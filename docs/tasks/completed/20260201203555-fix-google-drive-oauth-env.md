# 20260201203555 - Fix Google Drive OAuth — Add GOOGLE_* Env Vars and Validation

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-01 20:35:55 EST |
| **Last Modified**  | 2026-02-01 20:57:21 EST |
| **Status**         | completed |
| **Agent**          | light-lynx |
| **Blocked-By**     | none |
| **Touches**        | .env.example, src/lib/google/auth.ts, src/app/(auth)/auth/integrations/google-drive/callback/route.ts |
| **References**     | [Design Doc](../../design-claude.md), [Google OAuth2 Docs](https://developers.google.com/identity/protocols/oauth2) |

## Description

The Google Drive integration OAuth flow fails with "Missing required parameter: client_id" because the `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` environment variables are not set. The code in `src/lib/google/auth.ts` reads these env vars but there's no validation, so `undefined` is silently passed to Google's OAuth client. The same Google OAuth client ID used for Supabase Auth login can be reused — the user just needs to add the Drive callback as an additional authorized redirect URI. This task adds the env vars to `.env.example` as documentation and adds early validation in `createOAuth2Client()` to fail fast with a clear error message.

## Acceptance Criteria

- [x] `.env.example` includes `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` with comments explaining they are for the Google Drive integration (can reuse the same client ID as Supabase Auth)
- [x] `createOAuth2Client()` in `src/lib/google/auth.ts` throws a descriptive error if any of the three env vars are missing
- [x] The callback route path in code matches the expected `GOOGLE_REDIRECT_URI` value documented in `.env.example`

## Implementation Steps

_To be filled in when the task is started._

## Progress Log

### 2026-02-01 20:35:55 EST
Initial creation. User reported "Missing required parameter: client_id" error when clicking Google Drive integration connect button. Root cause: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` env vars are not set. The same Google OAuth client ID can be reused for both Supabase Auth login and Drive integration — user just needs to add the Drive callback as an authorized redirect URI and set the env vars.

### 2026-02-01 20:37:52 EST
Updated task to reflect that the same OAuth client will be reused (no separate client needed). Updated description and acceptance criteria accordingly.

### 2026-02-01 20:57:21 EST
Completed. Changes made:
- `.env.example`: Added `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` with comments, plus `TOKEN_ENCRYPTION_KEY` with generation instructions.
- `src/lib/google/auth.ts`: Added env var validation in `createOAuth2Client()`, added `email` scope to auth URL so `userinfo.get()` works.
- `src/app/(auth)/auth/integrations/google-drive/callback/route.ts`: Fixed `userinfo.get()` 401 by using `createOAuth2Client()` instead of bare `new google.auth.OAuth2()`.
