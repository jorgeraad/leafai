# 20260201142849 - Database Migrations

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-01 14:28:48 EST |
| **Last Modified**  | 2026-02-01 15:04:34 EST |
| **Status**         | completed |
| **Blocked-By**     | none |
| **Touches**        | `supabase/migrations/`, `supabase/config.toml` |
| **References**     | [Design Doc](../../design-claude.md) |

## Description

Create all Supabase migration SQL files implementing the schema from Section 5. Only SQL files — no TypeScript.

## Acceptance Criteria

- [x] `supabase db reset` runs without errors
- [x] All 6 tables exist: `workspaces`, `workspace_members`, `integrations`, `chat_sessions`, `chat_participants`, `messages`
- [x] All 4 enum types exist: `integration_provider`, `integration_status`, `message_role`, `message_status`
- [x] RLS is enabled on all tables with all policies created
- [x] Foreign key cascades work correctly
- [x] Unique constraints enforced
- [x] Indexes exist on `chat_sessions(workspace_id, updated_at DESC)` and `messages(chat_session_id, created_at)`
- [x] `updated_at` triggers fire on UPDATE
- [x] CHECK constraints on `messages` work correctly

## Progress Log

### 2026-02-01 14:28:48 EST
Initial creation. Task extracted from design doc Section 7.6.3.

### 2026-02-01 14:53:25 EST
Starting implementation. No Touches overlap with in-progress task 20260201142848 (Foundation touches src/ files, this task touches supabase/).

### 2026-02-01 15:04:34 EST
Completed. Created migration `20260201145704_create_application_schema.sql` with all 6 tables, 4 enums, 6 RLS policies, 2 indexes, 4 updated_at triggers, and CHECK constraint. Verified with `supabase db reset` and direct psql queries against local instance.
