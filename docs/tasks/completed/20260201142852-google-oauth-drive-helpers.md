# 20260201142852 - Google OAuth + Drive Helpers

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-01 14:28:48 EST |
| **Last Modified**  | 2026-02-01 15:59:45 EST |
| **Status**         | completed |
| **Agent**          | cool-bobcat |
| **Blocked-By**     | 20260201142848 |
| **Touches**        | `src/lib/google/auth.ts`, `src/lib/google/drive.ts`, `src/lib/google/index.ts` |
| **References**     | [Design Doc](../../design-claude.md) |

## Description

Implement Google OAuth2 client factory and Drive API helper functions. Pure googleapis wrappers with no database calls.

## Acceptance Criteria

- [x] `createOAuth2Client` returns an OAuth2Client with correct credentials
- [x] `getAuthUrl` returns URL with drive.readonly scope, offline access
- [x] `exchangeCodeForTokens` returns `GoogleTokens`
- [x] `revokeToken` calls the revocation endpoint
- [x] `getDriveClient` returns a Drive instance
- [x] `listFolder`, `readFile`, `searchFiles` work correctly
- [x] All tests pass with mocked googleapis
- [x] No imports from `lib/db/`

## Implementation Steps

- [x] Create `src/lib/google/auth.ts` with OAuth2 functions
- [x] Create `src/lib/google/drive.ts` with Drive API helpers
- [x] Create `src/lib/google/index.ts` barrel export
- [x] Write tests for auth functions
- [x] Write tests for drive functions

## Progress Log

### 2026-02-01 14:28:48 EST
Initial creation. Task extracted from design doc Section 7.6.3.

### 2026-02-01 15:57:25 EST
Starting implementation. Dependency 20260201142848 (Foundation) completed — provides types in `src/lib/types.ts` (GoogleTokens, DriveFile, etc.) and crypto in `src/lib/crypto.ts`. No in-progress tasks to check for Touches overlap. Design doc specifies interface contracts for auth.ts and drive.ts.

### 2026-02-01 15:59:45 EST
Completed. Created all 3 source files and 2 test files. 12 tests passing. auth.ts: createOAuth2Client, getAuthUrl (drive.readonly + offline + consent), exchangeCodeForTokens, revokeToken. drive.ts: getDriveClient (sets refresh_token credentials), listFolder, readFile (handles Google Docs→text, Sheets→CSV, and direct download), searchFiles. Barrel export in index.ts. No lib/db/ imports. Build passes.
