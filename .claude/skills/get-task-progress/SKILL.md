---
name: get-task-progress
description: Show the current progress of a specific task or all tasks in the task management system
disable-model-invocation: true
argument-hint: "<task-id, task name, or 'all'>"
---

# Get Task Progress

You are reporting on task progress from the task management system. Follow these steps exactly.

## Step 0: Identify scope

If the user provided a task ID or name as an argument, report on that specific task. If the user said "all" or provided no argument, ask the user:

- Do you want progress on a **specific task**? (list in-progress and todo tasks as options)
- Or an **overview of all tasks**?

## For a specific task:

### Step 1: Find the task file

Search across all three directories (`todo/`, `in-progress/`, `completed/`) for a file matching the provided task ID or name.

### Step 2: Read and summarize the task

Read the full task file and present:

- **Task**: ID and title
- **Status**: todo / in-progress / completed
- **Agent**: Who is working on it (if in-progress)
- **Blocked-By**: Dependencies and whether they are resolved (check if blocker files exist in `completed/`)
- **Touches**: Files/directories this task modifies
- **Acceptance Criteria**: List each criterion with its checked/unchecked status
- **Implementation Steps**: List each step with its checked/unchecked status, showing what's done and what remains
- **Progress Log**: Show the full log so the user can see the history of work

### Step 3: Assess health

Based on the task state, note:
- If blocked, explain what's blocking it and whether those blockers are in progress
- If in-progress, summarize how far along it appears (based on checked-off steps and criteria)
- If completed, just confirm it's done and when

## For all tasks (overview):

### Step 1: Read current-progress.md

Read `docs/tasks/current-progress.md` for the high-level snapshot.

### Step 2: Gather details

Read all task files across `todo/`, `in-progress/`, and `completed/` directories in parallel.

### Step 3: Present summary

Organize the report as:

- **In Progress**: For each task — title, agent, how many acceptance criteria / implementation steps are checked off vs. total, last progress log entry
- **Ready**: Tasks in `todo/` with no unresolved blockers — title, brief description
- **Blocked**: Tasks in `todo/` with unresolved blockers — title, what they're waiting on, whether those blockers are being worked on
- **Recently Completed**: Last ~5 completed tasks with completion dates

### Step 4: Highlight issues

Flag anything that looks concerning:
- Tasks in `in-progress/` with no recent progress log entries
- Tasks that appear blocked by other blocked tasks (deep dependency chains)
- Overlapping `Touches` between in-progress tasks
