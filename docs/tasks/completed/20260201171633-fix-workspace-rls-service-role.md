# 20260201171633 - Fix Workspace Creation Blocked by RLS

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-01 17:16:33 EST |
| **Last Modified**  | 2026-02-01 17:22:47 EST |
| **Status**         | completed |
| **Agent**          | prime-otter |
| **Blocked-By**     | (none) |
| **Touches**        | `src/lib/supabase/admin.ts` (new), `src/lib/db/workspaces.ts`, `scripts/setup-env.sh`, `README.md` |
| **References**     | [Design Doc](../../design-claude.md) |

## Description

`getOrCreateWorkspace` uses the Supabase server client with the anon key, so RLS applies. The `workspaces` table has no INSERT policy (by design), causing the insert to fail. Fix by creating a Supabase admin client using the service-role key for privileged server-side operations (workspace + member creation). No new RLS policies needed.

## Acceptance Criteria

- [x] New `src/lib/supabase/admin.ts` exports `createAdminClient()` using `SUPABASE_SERVICE_ROLE_KEY`
- [x] `getOrCreateWorkspace` in `src/lib/db/workspaces.ts` uses admin client for INSERT operations
- [x] `getWorkspaceForUser` continues using the regular user client (RLS SELECT is fine)
- [x] `scripts/setup-env.sh` extracts and writes `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`
- [x] `README.md` env table updated to mention `SUPABASE_SERVICE_ROLE_KEY`
- [x] Login flow creates workspace without RLS error and redirects to `/w/<id>`

## Implementation Steps

1. Create `src/lib/supabase/admin.ts` with `createAdminClient()` helper
2. Update `src/lib/db/workspaces.ts` to use admin client for inserts
3. Update `scripts/setup-env.sh` to include service-role key extraction
4. Update `README.md` env table
5. Verify end-to-end login → workspace creation flow

## Progress Log

### 2026-02-01 17:17:55 EST
Starting implementation. No dependencies — standalone bugfix. Key file: `src/lib/db/workspaces.ts` uses anon-key client for INSERT; will create admin client in `src/lib/supabase/admin.ts` and use it for inserts only.

### 2026-02-01 17:22:47 EST
Completed. All 4 files modified, build passes. Security verified: `getOrCreateWorkspace` is only called from server-side auth flows after Supabase Auth verification. Manual e2e test confirmed workspace creation succeeds (redirect to `/w/<uuid>` works; 404 is expected since App Shell task isn't implemented yet).
