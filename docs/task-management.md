# Task Management System

This document defines the procedure for tracking tasks across coding agent sessions. **All agents must follow this system.** It ensures work is persisted, visible to future agents, and safe to parallelize.

Read this entire document before starting any work.

---

## Table of Contents

1. [Directory Structure](#directory-structure)
2. [Task File Naming](#task-file-naming)
3. [Task File Template](#task-file-template)
4. [Field Reference](#field-reference)
5. [Timestamps](#timestamps)
6. [Dependencies (Blocked-By)](#dependencies-blocked-by)
7. [File Ownership (Touches)](#file-ownership-touches)
8. [current-progress.md](#current-progressmd)
9. [Agent Workflow — Step by Step](#agent-workflow--step-by-step)
10. [Quick-Reference Checklist](#quick-reference-checklist)
11. [Rules](#rules)

---

## Directory Structure

```
docs/tasks/
  current-progress.md   # High-level snapshot — the first thing any agent should read
  todo/                 # Tasks planned but not yet started
  in-progress/          # Tasks currently being worked on
  completed/            # Finished tasks
```

---

## Task File Naming

Every task file is a Markdown file prefixed with a timestamp in `YYYYMMDDHHmmss` format (14 digits), followed by a short kebab-case name:

```
YYYYMMDDHHmmss-short-task-name.md
```

The timestamp prefix is generated at task creation time using:

```bash
date '+%Y%m%d%H%M%S'
```

Examples:
- `20260201143052-setup-google-drive-integration.md`
- `20260201143518-add-chat-ui.md`
- `20260201150203-implement-rag-pipeline.md`

This format is naturally sortable, collision-resistant (two agents would have to create a task in the same second), and eliminates the need to scan directories for the "next number."

---

## Task File Template

Every task file must use this exact structure. The `<TASK_ID>` is the full timestamp prefix (e.g., `20260201143052`).

````markdown
# <TASK_ID> - Task Title

| Field              | Value |
|--------------------|-------|
| **Created**        | YYYY-MM-DD HH:MM:SS TZ |
| **Last Modified**  | YYYY-MM-DD HH:MM:SS TZ |
| **Status**         | todo / in-progress / completed |
| **Blocked-By**     | none |
| **Touches**        | src/lib/drive/, src/app/api/drive/ |
| **References**     | [Design Doc](../../design-claude.md) |

## Description

Brief description of what this task accomplishes and why.

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Progress Log

### YYYY-MM-DD HH:MM:SS TZ
Initial creation. <reason/context>
````

---

## Field Reference

### Created
The exact timestamp when the task file was first written. Set once, never changed.

### Last Modified
Updated **every time** anything in the file changes. Must come from running the `date` command.

### Status
Must match the directory the file is in:
- `todo` → file is in `todo/`
- `in-progress` → file is in `in-progress/`
- `completed` → file is in `completed/`

### Blocked-By
A comma-separated list of task IDs (timestamp prefixes) that must be completed before this task can start. Use `none` if the task has no dependencies.

Examples:
- `none` — task is ready to start (assuming it's in `todo/`)
- `20260201143052` — blocked until that task is in `completed/`
- `20260201143052, 20260201150203` — blocked until both are in `completed/`

**How agents use this field:**
1. Before starting a task, read its `Blocked-By` field.
2. For each listed task ID, check whether a file with that prefix exists in `completed/`.
3. If **all** listed tasks are in `completed/`, the task is unblocked and can be started.
4. If **any** listed task is NOT in `completed/`, the task is still blocked — do not start it.

### Touches
A list of file paths, directory paths, or glob patterns that this task is expected to create or modify. This tells other agents where your changes will land so they can avoid conflicts.

Examples:
- `src/lib/drive/client.ts` — a specific file
- `src/lib/drive/` — an entire directory
- `src/components/chat/**` — a glob pattern
- `supabase/migrations/` — migration files

**Rules for Touches:**
- Set this field when creating the task. Update it if scope changes during work.
- Be as specific as practical. Prefer listing specific files over broad directories when possible.
- When a directory is listed, it means any file within that directory tree may be modified.

### References
Links to design docs, specs, or other documents that informed this task. Every task must reference at least one document. Use relative paths from the task file's location.

---

## Timestamps

There are two kinds of timestamps in this system:

1. **File-name prefix** — compact, no separators, used for the filename:
   ```bash
   date '+%Y%m%d%H%M%S'
   # Output example: 20260201143052
   ```

2. **Human-readable timestamps** — used in the metadata table and progress log:
   ```bash
   date '+%Y-%m-%d %H:%M:%S %Z'
   # Output example: 2026-02-01 14:30:52 PST
   ```

Never guess, approximate, or reuse a previous timestamp. Run the command fresh each time.

---

## Dependencies (Blocked-By)

Dependencies are declared per-task using the `Blocked-By` metadata field. This is the **source of truth** for what blocks what.

### Determining if a task is ready

A task in `todo/` is **ready to start** if and only if:
1. Its `Blocked-By` field is `none`, OR
2. Every task ID listed in `Blocked-By` has a corresponding file in `completed/`.

To check programmatically:
```bash
# Example: check if a task blocked by 20260201143052 and 20260201150203 is ready
ls docs/tasks/completed/20260201143052-* docs/tasks/completed/20260201150203-* 2>/dev/null
# If both files exist, the task is unblocked
```

### When creating tasks with dependencies

- If task B depends on task A, set `Blocked-By: <A's task ID>` in task B.
- A task can depend on multiple tasks: `Blocked-By: 20260201143052, 20260201150203`.
- Keep dependencies minimal. Only declare a dependency if the task truly cannot start without the other being complete.
- Avoid circular dependencies. If A blocks B, B must not block A (directly or transitively).

### When completing a task that other tasks depend on

After moving a task to `completed/`, check if any tasks in `todo/` were blocked by it. If those tasks are now fully unblocked (all their `Blocked-By` tasks are in `completed/`), move them to the **Ready** section of `current-progress.md`.

---

## File Ownership (Touches)

The `Touches` field prevents agents from unknowingly making conflicting changes to the same files.

### Before starting a task

1. Read the task's `Touches` field.
2. List all files in `docs/tasks/in-progress/` and read each one's `Touches` field.
3. If there is **any overlap** between your task's `Touches` and another in-progress task's `Touches`:
   - **Read that other task's progress log** to understand what changes are being made.
   - **Note the overlap in your own progress log** when you begin work (e.g., "Overlaps with 20260201150203 on `src/lib/drive/`. Reviewed its progress log — no conflicts expected because it modifies `client.ts` and this task modifies `types.ts`.").
   - **Be cautious** when editing shared files. Prefer additive changes over restructuring.
4. If there is **no overlap**, proceed normally.

### During work

If you realize you need to modify files not listed in your `Touches` field, update the field immediately. This keeps other agents informed.

---

## current-progress.md

This file is the **first thing any agent should read** when starting a session. It provides a quick snapshot without requiring the agent to scan all task files.

It must maintain these sections:

```markdown
# Current Progress

## Overview
<Brief summary of the project's current state and what's actively being worked on.>

## Ready
<Tasks in todo/ that have NO unresolved Blocked-By dependencies. These can be started immediately.>

Format per entry:
- **<TASK_ID> - Title** — Brief description | Touches: `paths` | Blocked-By: none

## In Progress
<Tasks currently in in-progress/.>

Format per entry:
- **<TASK_ID> - Title** — Brief description | Touches: `paths` | Agent: <agent identifier if known>

## Recently Completed
<Tasks moved to completed/ recently. Keep the last ~10 entries.>

Format per entry:
- **<TASK_ID> - Title** — Completed YYYY-MM-DD

## Up Next
<Tasks in todo/ that are still blocked. Shows what's coming once dependencies clear.>

Format per entry:
- **<TASK_ID> - Title** — Blocked-By: 20260201143052, 20260201150203
```

**Why both Ready and Up Next?** An agent scanning for available work only needs to look at the **Ready** section. **Up Next** shows the pipeline so agents understand what's coming and can prioritize accordingly.

---

## Agent Workflow — Step by Step

### 1. Starting a session

1. Read `docs/tasks/current-progress.md`.
2. If you've been given a specific task, find it. If you're picking up work, choose from the **Ready** section.

### 2. Creating a new task

1. Run `date '+%Y%m%d%H%M%S'` to generate the task ID prefix.
2. Run `date '+%Y-%m-%d %H:%M:%S %Z'` for the human-readable timestamp.
3. Create the file in `docs/tasks/todo/` using the template, with the timestamp prefix and short name as the filename.
4. Set `Blocked-By` to the task IDs this depends on, or `none`.
5. Set `Touches` to the files/directories this task will modify.
6. Update `current-progress.md`:
   - If `Blocked-By` is `none`, add to **Ready**.
   - If `Blocked-By` lists other tasks, add to **Up Next**.

### 3. Beginning work on a task

1. **Check dependencies:** Verify all `Blocked-By` tasks are in `completed/`. If not, do not start.
2. **Check for file overlaps:** Read `Touches` of all tasks in `in-progress/`. If overlap exists, read those tasks' progress logs and note the overlap in yours.
3. Move the file:
   ```bash
   mv docs/tasks/todo/<TASK_ID>-name.md docs/tasks/in-progress/<TASK_ID>-name.md
   ```
4. Run `date '+%Y-%m-%d %H:%M:%S %Z'` for the timestamp.
5. Update the task file:
   - Set **Status** to `in-progress`.
   - Set **Last Modified** to current timestamp.
   - Add a progress log entry: "Starting work. <context about approach, any overlaps noted>."
6. Update `current-progress.md`:
   - Remove the task from **Ready**.
   - Add it to **In Progress** with the `Touches` summary.

### 4. Updating a task during work

1. Run `date '+%Y-%m-%d %H:%M:%S %Z'`.
2. Update **Last Modified**.
3. Append a progress log entry describing what was done, decisions made, or blockers hit.
4. Check off any completed acceptance criteria.
5. If `Touches` has changed, update it in both the task file and `current-progress.md`.

**When to add a progress log entry:**
- After completing a meaningful unit of work (e.g., finished a function, wrote a test, created a migration).
- When hitting a blocker or making a significant design decision.
- When modifying files not originally listed in `Touches`.
- At minimum, at least one entry per major step of the task.

### 5. Completing a task

1. Move the file:
   ```bash
   mv docs/tasks/in-progress/<TASK_ID>-name.md docs/tasks/completed/<TASK_ID>-name.md
   ```
2. Run `date '+%Y-%m-%d %H:%M:%S %Z'`.
3. Update the task file:
   - Set **Status** to `completed`.
   - Set **Last Modified** to current timestamp.
   - Add a final progress log entry summarizing the outcome.
   - Check off all acceptance criteria (or note what was descoped and why).
4. Update `current-progress.md`:
   - Remove from **In Progress**.
   - Add to **Recently Completed**.
5. **Unblock downstream tasks:**
   - Check all tasks in `todo/` — for any whose `Blocked-By` includes your task ID, check if all their other blockers are also in `completed/`.
   - If a task is now fully unblocked, move it from **Up Next** to **Ready** in `current-progress.md`.

---

## Quick-Reference Checklist

Use this as a reminder during work. Each box must be done at the indicated time.

**When creating a task:**
- [ ] Ran `date` for both the filename prefix and human-readable timestamp
- [ ] Set `Blocked-By` (or `none`)
- [ ] Set `Touches` with specific paths
- [ ] Set `References` to relevant docs
- [ ] Added to `current-progress.md` (Ready or Up Next)

**When starting a task:**
- [ ] Verified all `Blocked-By` tasks are in `completed/`
- [ ] Checked `Touches` overlap with all `in-progress/` tasks
- [ ] Noted any overlaps in progress log
- [ ] Moved file to `in-progress/`
- [ ] Updated Status + Last Modified
- [ ] Added progress log entry
- [ ] Updated `current-progress.md` (Ready → In Progress)

**When updating a task:**
- [ ] Ran `date` for timestamp
- [ ] Updated Last Modified
- [ ] Added progress log entry
- [ ] Updated `Touches` if scope changed
- [ ] Checked off completed acceptance criteria

**When completing a task:**
- [ ] Moved file to `completed/`
- [ ] Updated Status + Last Modified
- [ ] Added final progress log entry
- [ ] Checked off all acceptance criteria
- [ ] Updated `current-progress.md` (In Progress → Recently Completed)
- [ ] Checked for newly unblocked tasks (Up Next → Ready)

---

## Rules

1. **Never skip timestamps.** Every creation and modification must use a fresh timestamp from `date`.
2. **Always update `current-progress.md`** when a task changes status.
3. **One task per file.** Do not combine unrelated work into a single task.
4. **Keep progress logs append-only.** Never delete or rewrite earlier entries.
5. **Reference docs.** Every task must link to at least one design doc or reference document.
6. **Task IDs are timestamp-based and unique.** Never reuse a timestamp prefix, even if a task is deleted.
7. **Check Blocked-By before starting.** Never start a task whose dependencies are not all in `completed/`.
8. **Check Touches before starting.** Always scan `in-progress/` tasks for overlapping file ownership and note any overlaps.
9. **Update Touches if scope changes.** If you modify files outside your declared scope, update the field immediately.
10. **Keep tasks narrow.** Tasks should be small and self-contained so many can run in parallel. If a task is growing too large, split it.
