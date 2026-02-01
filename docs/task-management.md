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
7. [Gathering Dependency Context](#gathering-dependency-context)
8. [File Ownership (Touches)](#file-ownership-touches)
9. [current-progress.md](#current-progressmd)
10. [Agent Workflow — Step by Step](#agent-workflow--step-by-step)
11. [Quick-Reference Checklist](#quick-reference-checklist)
12. [Slash Commands](#slash-commands)
13. [Rules](#rules)

---

## Agent Identity

At the start of every session, generate a unique name by running:

```bash
bash scripts/agent-name.sh
```

This outputs a two-word name like `swift-falcon` or `calm-otter`. **Use this name for your entire session.** It identifies you in task files and `current-progress.md` so other agents can tell who is working on what.

- Set the `Agent` field in any task you move to `in-progress` or `completed`.
- Use your name in `current-progress.md` entries.
- If you see an in-progress task with a *different* agent name, another agent is working on it — do not take it over without coordination.

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
| **Agent**          | — |
| **Blocked-By**     | none |
| **Touches**        | src/lib/drive/, src/app/api/drive/ |
| **References**     | [Design Doc](../../design-claude.md) |

## Description

Brief description of what this task accomplishes and why.

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Implementation Steps

- [ ] Step 1
- [ ] Step 2
- [ ] Step 3

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

### Agent
The name of the agent currently working on (or that completed) this task. Set to `—` for tasks in `todo/`. When moving a task to `in-progress`, set this to your agent name (from `scripts/agent-name.sh`). Preserve the value when moving to `completed/`.

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

## Breaking Down Tasks

Tasks should be broken down into concrete implementation steps. This is tracked via the **Implementation Steps** checklist in the task file — separate from the Progress Log.

### Implementation Steps vs. Progress Log

- **Implementation Steps** is a checkbox to-do list of discrete work items (e.g., "Create migration file", "Add API route", "Write tests"). Check items off as they are completed. This gives a clear picture of what remains.
- **Progress Log** is an append-only journal of timestamped notes — decisions made, problems encountered, context for future readers. Keep entries brief.

### When to add steps

- **When starting a task**: Decompose the work into steps before writing code. This is the plan.
- **During work**: If new steps emerge, add them to the list.

### When to create a new task instead

If you discover a significant chunk of missing work that is separable from the current task (different files, different concern, could be done independently), **create a new task file** in `todo/` rather than growing the current task. Set its `Blocked-By` if it depends on the current task, or leave it unblocked if it can be done in parallel. Update `current-progress.md` accordingly.

The goal is to keep each task narrow and focused so multiple agents can work in parallel.

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

## Gathering Dependency Context

Before starting implementation on a task, **traverse its full dependency tree** to understand what was already built, what decisions were made, and what files exist. This is critical for producing correct, well-integrated code.

### Procedure

1. **Read the task's `Blocked-By` field.** For each listed task ID, find and read the completed task file.
2. **Recurse.** For each of those tasks, read *their* `Blocked-By` fields and repeat until you reach tasks with `Blocked-By: none`. This builds the full ancestor chain from root to current task.
3. **Extract context from each ancestor.** From each completed task file, note:
   - **Description** — what it accomplished
   - **Acceptance Criteria** — what was delivered (and what was descoped)
   - **Touches** — what files/directories were created or modified
   - **Final progress log entry** — summary of outcome and key decisions
4. **Identify sibling tasks.** Siblings are tasks that share at least one *direct* dependency with the current task (i.e., their `Blocked-By` lists overlap with yours). Find these by scanning all task files (in any directory) and checking for shared `Blocked-By` entries. Read sibling task files and extract the same context fields. Note each sibling's status — a completed sibling tells you what's already built in an adjacent area; an in-progress sibling tells you what's actively being changed.
5. **Produce a structured context summary.** Organize the information for easy reference:

```markdown
## Dependency Context for <TASK_ID>

### Ancestor Chain (root → current)
- **<ID> - <Title>** (completed): <1-line summary>. Touches: `<paths>`.
- **<ID> - <Title>** (completed): <1-line summary>. Touches: `<paths>`.

### Sibling Tasks
- **<ID> - <Title>** (<status>): <1-line summary>. Touches: `<paths>`.
```

### When to delegate

This traversal involves reading multiple files. Delegate it to a **sub-agent** so the main agent doesn't spend context on file reads. Pass the sub-agent the task ID and instruct it to follow this procedure and return the structured summary.

### Depth limits

Most dependency trees are shallow (2–3 levels). If a chain exceeds 5 levels, truncate to the 5 most recent ancestors and note that earlier history was omitted.

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

> **Shortcut:** Use `/task-start` to automate steps 1–3 (assess state, pick tasks, start them).

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
2. **Gather dependency context** (see [Gathering Dependency Context](#gathering-dependency-context) below). This gives you full knowledge of what was already built.
3. **Check for file overlaps:** Read `Touches` of all tasks in `in-progress/`. If overlap exists, read those tasks' progress logs and note the overlap in yours.
4. Move the file:
   ```bash
   mv docs/tasks/todo/<TASK_ID>-name.md docs/tasks/in-progress/<TASK_ID>-name.md
   ```
5. Run `date '+%Y-%m-%d %H:%M:%S %Z'` for the timestamp.
6. Update the task file:
   - Set **Status** to `in-progress`.
   - Set **Agent** to your agent name (from `scripts/agent-name.sh`).
   - Set **Last Modified** to current timestamp.
   - Add a progress log entry: "Starting work. <context about approach, any overlaps noted>."
7. Update `current-progress.md`:
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

> **Shortcut:** Use `/task-complete <task-id>` to automate this entire procedure, including acceptance criteria review and downstream unblocking.

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
- [ ] Gathered dependency context (traversed ancestor chain + identified siblings)
- [ ] Checked `Touches` overlap with all `in-progress/` tasks
- [ ] Noted any overlaps in progress log
- [ ] Moved file to `in-progress/`
- [ ] Updated Status + Agent + Last Modified
- [ ] Broke down work into Implementation Steps checklist
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

## Slash Commands

The following slash commands automate common task management workflows. Use them instead of performing the steps manually.

| Command | Description |
|---------|-------------|
| `/task-start` | Assess current state, show ready tasks, pick tasks to start, and begin implementation. Handles dependency checks, Touches overlap, file moves, and `current-progress.md` updates. |
| `/task-complete <task-id>` | Complete an in-progress task. Reviews acceptance criteria with you, moves the file to `completed/`, updates metadata, and unblocks downstream tasks. |
| `/task-progress <task-id or "all">` | Report on progress for a specific task or all tasks. Shows criteria/step completion, blocker status, and flags potential issues. |
| `/task-verify` | Audit the entire task system for inconsistencies. Checks that task file metadata matches directory location, `current-progress.md` is accurate, dependencies are correctly resolved, and flags issues for user review before applying fixes. |

These commands follow the same procedures documented in the [Agent Workflow](#agent-workflow--step-by-step) sections above. When a slash command is available for what you're doing, prefer it over manual steps.

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
11. **Keep this document in sync.** When creating or modifying a skill related to task management (anything in `.claude/skills/` that deals with tasks), update this document to reflect the change. This includes adding/updating entries in the [Slash Commands](#slash-commands) table and revising any procedures or rules that the new skill affects. This file is the source of truth for how the task system works — it must stay accurate.
