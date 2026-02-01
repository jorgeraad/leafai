# 20260201142849 - Database Migrations

| Field              | Value |
|--------------------|-------|
| **Created**        | 2026-02-01 14:28:48 EST |
| **Last Modified**  | 2026-02-01 14:28:48 EST |
| **Status**         | todo |
| **Blocked-By**     | none |
| **Touches**        | `supabase/migrations/`, `supabase/config.toml` |
| **References**     | [Design Doc](../../design-claude.md) |

## Description

Create all Supabase migration SQL files implementing the schema from Section 5. Only SQL files — no TypeScript.

## Acceptance Criteria

- [ ] `supabase db reset` runs without errors
- [ ] All 6 tables exist: `workspaces`, `workspace_members`, `integrations`, `chat_sessions`, `chat_participants`, `messages`
- [ ] All 4 enum types exist: `integration_provider`, `integration_status`, `message_role`, `message_status`
- [ ] RLS is enabled on all tables with all policies created
- [ ] Foreign key cascades work correctly
- [ ] Unique constraints enforced
- [ ] Indexes exist on `chat_sessions(workspace_id, updated_at DESC)` and `messages(chat_session_id, created_at)`
- [ ] `updated_at` triggers fire on UPDATE
- [ ] CHECK constraints on `messages` work correctly

## Progress Log

### 2026-02-01 14:28:48 EST
Initial creation. Task extracted from design doc Section 7.6.3.
