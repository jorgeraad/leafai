# 20260201142852 - Google OAuth + Drive Helpers

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-01 14:28:48 EST |
| **Last Modified**  | 2026-02-01 14:28:48 EST |
| **Status**         | todo |
| **Blocked-By**     | 20260201142848 |
| **Touches**        | `src/lib/google/auth.ts`, `src/lib/google/drive.ts`, `src/lib/google/index.ts` |
| **References**     | [Design Doc](../../design-claude.md) |

## Description

Implement Google OAuth2 client factory and Drive API helper functions. Pure googleapis wrappers with no database calls.

## Acceptance Criteria

- [ ] `createOAuth2Client` returns an OAuth2Client with correct credentials
- [ ] `getAuthUrl` returns URL with drive.readonly scope, offline access
- [ ] `exchangeCodeForTokens` returns `GoogleTokens`
- [ ] `revokeToken` calls the revocation endpoint
- [ ] `getDriveClient` returns a Drive instance
- [ ] `listFolder`, `readFile`, `searchFiles` work correctly
- [ ] All tests pass with mocked googleapis
- [ ] No imports from `lib/db/`

## Progress Log

### 2026-02-01 14:28:48 EST
Initial creation. Task extracted from design doc Section 7.6.3.
