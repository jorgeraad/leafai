---
name: verify-tasks
description: Audit the task management system for inconsistencies, update current-progress.md, and flag issues for resolution
disable-model-invocation: true
---

# Verify Tasks

You are auditing and fixing the task management system. Follow these steps exactly.

## Step 1: Read the task management system

Read `docs/task-management.md` to understand the expected format and rules.

## Step 2: Gather all task data

In parallel, read:
- `docs/tasks/current-progress.md`
- All files in `docs/tasks/todo/`
- All files in `docs/tasks/in-progress/`
- All files in `docs/tasks/completed/`

## Step 3: Check each task file for issues

For every task file, verify:

1. **Status matches directory.** A file in `todo/` must have `Status: todo`, etc. Flag mismatches.
2. **Required fields present.** Every task must have: Created, Last Modified, Status, Agent, Blocked-By, Touches, References, Description, Acceptance Criteria, Implementation Steps, Progress Log.
3. **Blocked-By validity.** Each task ID in `Blocked-By` must correspond to an actual task file (in any directory). Flag references to non-existent tasks.
4. **Agent field.** Tasks in `in-progress/` and `completed/` should have a non-`—` Agent. Tasks in `todo/` should have `—`.
5. **Dependency resolution.** For tasks in `todo/`, check whether all `Blocked-By` tasks are actually in `completed/`. If they are, the task should be in the Ready section of `current-progress.md`, not Up Next.
6. **Touches overlaps.** Check all `in-progress/` tasks for overlapping Touches. Flag any overlaps found.

## Step 4: Verify current-progress.md accuracy

Compare the contents of `current-progress.md` against the actual task files:

1. **Ready section** — Should list exactly the tasks in `todo/` whose `Blocked-By` dependencies are all in `completed/` (or `none`). Flag any tasks that are listed as Ready but are actually blocked, or tasks that are unblocked but missing from Ready.
2. **In Progress section** — Should list exactly the tasks in `in-progress/`. Flag any mismatches.
3. **Recently Completed section** — Should include tasks in `completed/`. Flag any listed tasks that don't have a corresponding completed file, or recently completed tasks that are missing.
4. **Up Next section** — Should list exactly the tasks in `todo/` that still have unresolved blockers. Flag any mismatches.
5. **Overview** — Check if the overview text is still accurate given the current state.

## Step 5: Report findings

Present a summary to the user organized as:

### Inconsistencies Found
List each issue with:
- What the problem is
- Which file(s) are affected
- What the fix should be

### Questions / Ambiguities
List anything that needs user input to resolve (e.g., a task appears abandoned in `in-progress/` with no recent activity, unclear if it should be reset to `todo/`).

If there are questions, ask the user using AskUserQuestion before proceeding to fixes.

### Current State Summary
A brief accurate summary of where the project stands (how many tasks completed, in progress, ready, blocked).

## Step 6: Apply fixes

After reporting (and getting user input on any ambiguities):

1. **Fix task files** — correct any Status fields, Agent fields, or other metadata that doesn't match reality.
2. **Rebuild current-progress.md** — rewrite it from scratch based on the actual task file states. Use fresh timestamps where needed (`date '+%Y-%m-%d %H:%M:%S %Z'`). Follow the exact format from `docs/task-management.md`.
3. **Report what was changed** — list every file that was modified and what was fixed.
