---
name: complete-task
description: Complete a task by moving it to completed, updating all metadata, checking off criteria, and unblocking downstream tasks
disable-model-invocation: true
argument-hint: "<task-id or task name>"
---

# Complete Task

You are completing a task in the task management system. Follow these steps exactly.

## Step 0: Identify the task

If the user provided a task ID or name as an argument, use that. Otherwise, list all files in `docs/tasks/in-progress/` and ask the user which task they want to complete.

## Step 1: Read the task management system

Read `docs/task-management.md`, specifically the "Completing a task" section and the quick-reference checklist.

## Step 2: Read the task file

Read the task file from `docs/tasks/in-progress/`. If the task is not in `in-progress/`, warn the user — only in-progress tasks can be completed.

## Step 3: Review acceptance criteria

Check the **Acceptance Criteria** section of the task file. Present the criteria to the user and note which ones are checked off vs. still unchecked.

If there are unchecked criteria, ask the user:
- Should we mark them as done (if the work was actually completed)?
- Should we note them as descoped with a reason?
- Should we hold off on completing the task until they're done?

Do not complete a task with unchecked criteria unless the user explicitly confirms descoping.

## Step 4: Move the task file

```bash
mv docs/tasks/in-progress/<TASK_FILE> docs/tasks/completed/<TASK_FILE>
```

## Step 5: Update the task file

1. Run `date '+%Y-%m-%d %H:%M:%S %Z'` for a fresh timestamp.
2. Set **Status** to `completed`.
3. Set **Last Modified** to the fresh timestamp.
4. Check off all acceptance criteria (or annotate descoped ones).
5. Add a final **Progress Log** entry summarizing the outcome.

## Step 6: Update current-progress.md

1. Read `docs/tasks/current-progress.md`.
2. Remove the task from the **In Progress** section.
3. Add the task to the **Recently Completed** section with format: `- **<TASK_ID> - Title** — Completed YYYY-MM-DD`
4. Keep only the last ~10 entries in Recently Completed.

## Step 7: Unblock downstream tasks

1. List all files in `docs/tasks/todo/`.
2. For each todo task, read its `Blocked-By` field.
3. If any task lists the just-completed task ID in `Blocked-By`, check whether **all** of its other blockers are also in `completed/`.
4. If a task is now fully unblocked, move it from **Up Next** to **Ready** in `current-progress.md`.

## Step 8: Confirm

Report back to the user:
- Which task was completed
- Whether any downstream tasks were unblocked
- The current state of `current-progress.md` (brief summary)
