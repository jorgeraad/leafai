---
name: task-create
description: Create one or more new task files in docs/tasks/todo/ with proper timestamps, metadata, and current-progress.md updates
disable-model-invocation: true
argument-hint: "<task title and brief description>"
---

# Create Task

You are creating one or more new task files in the task management system. Follow these steps exactly.

## Step 0: Understand the request

The user wants to create a new task (or multiple tasks). They may provide:
- A title and description directly as arguments
- A feature request or bug report that needs to be decomposed into tasks
- A reference to a design doc or discussion that defines the work

If the request is vague, ask the user to clarify the task's scope, acceptance criteria, and which files/directories it will touch before proceeding.

## Step 1: Read the task management system

Read `docs/task-management.md`, specifically:
- The **Task File Template** section (for the exact structure)
- The **Field Reference** section (for how to fill each field)
- The **Task File Naming** section (for filename format)
- The **Creating a new task** workflow in "Agent Workflow — Step by Step"
- The **Quick-Reference Checklist** for task creation

## Step 2: Survey existing tasks

Read these in parallel to understand context and avoid duplicates:
1. `docs/tasks/current-progress.md`
2. List all files in `docs/tasks/todo/` and read each task file
3. List all files in `docs/tasks/in-progress/` and read each task file
4. List filenames in `docs/tasks/completed/` (just names, not full contents)

Check for:
- **Duplicates**: Is there already a task covering this work? If so, tell the user.
- **Dependencies**: Which existing tasks (if any) must complete before this one can start?
- **Touches overlap**: Which files/directories will this task modify, and do any in-progress tasks touch the same areas?

## Step 3: Determine task details

For each task to create, determine:

1. **Title**: Short, descriptive, imperative form (e.g., "Add Google Drive file picker", "Fix session refresh on token expiry")
2. **Description**: What the task accomplishes and why. 2–4 sentences.
3. **Acceptance Criteria**: A checklist of concrete deliverables. Each criterion should be independently verifiable. Include test requirements where appropriate.
4. **Blocked-By**: Task IDs (timestamp prefixes) this task depends on, or `none`. Only declare a dependency if the task truly cannot start without the other being complete.
5. **Touches**: Specific file paths, directory paths, or glob patterns this task will create or modify. Be as specific as practical.
6. **References**: Links to design docs, specs, or other documents that inform this task. Every task must have at least one reference. Use relative paths from the task file location (e.g., `[Design Doc](../../design-claude.md)`).

If creating multiple tasks, also determine the dependency relationships between them.

Present the planned task(s) to the user for confirmation before creating files. Show the title, description, acceptance criteria, Blocked-By, and Touches for each.

## Step 4: Generate timestamps

For each task, run both timestamp commands fresh (never reuse a previous timestamp):

```bash
date '+%Y%m%d%H%M%S'
```
This gives the filename prefix / task ID (e.g., `20260201143052`).

```bash
date '+%Y-%m-%d %H:%M:%S %Z'
```
This gives the human-readable timestamp for the metadata table and progress log.

If creating multiple tasks, run the commands separately for each task to ensure unique IDs (they must differ by at least one second).

## Step 5: Create the task file(s)

Create each task file in `docs/tasks/todo/` using this exact template:

````markdown
# <TASK_ID> - Task Title

| Field              | Value |
|--------------------|-------|
| **Created**        | YYYY-MM-DD HH:MM:SS TZ |
| **Last Modified**  | YYYY-MM-DD HH:MM:SS TZ |
| **Status**         | todo |
| **Agent**          | — |
| **Blocked-By**     | none (or comma-separated task IDs) |
| **Touches**        | path/to/file.ts, path/to/dir/ |
| **References**     | [Design Doc](../../design-claude.md) |

## Description

Brief description of what this task accomplishes and why.

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Implementation Steps

_To be filled in when the task is started._

## Progress Log

### YYYY-MM-DD HH:MM:SS TZ
Initial creation. <brief context about why this task was created>
````

**Important details:**
- The `Created` and `Last Modified` timestamps must be identical at creation time.
- `Status` must be `todo`.
- `Agent` must be `—` (em dash) for todo tasks.
- `Implementation Steps` should be left as a placeholder — the agent that starts the task will decompose it into steps.
- The progress log entry should note the origin of the task (e.g., "Extracted from design doc", "User request", "Discovered during task 20260201143052").

## Step 6: Update current-progress.md

Read `docs/tasks/current-progress.md` and update it:

- If the task's `Blocked-By` is `none`, add it to the **Ready** section:
  ```
  - **<TASK_ID> - Title** — Brief description | Touches: `paths` | Blocked-By: none
  ```

- If the task has dependencies, add it to the **Up Next** section:
  ```
  - **<TASK_ID> - Title** — Blocked-By: <task IDs>
  ```

## Step 7: Confirm

Report back to the user:
- Which task(s) were created (ID, title, filename)
- Where each was placed in `current-progress.md` (Ready or Up Next)
- Any dependency relationships between the new tasks
- Any Touches overlaps with existing in-progress tasks that were noted
