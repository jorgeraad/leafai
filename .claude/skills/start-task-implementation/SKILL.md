---
name: start-task-implementation
description: Begin a task implementation session by reviewing the task management system, summarizing current status, and picking tasks to implement
disable-model-invocation: true
argument-hint: ""
---

# Start Task Implementation

You are beginning a task implementation session. This session is focused on picking up tasks from the task management system and implementing them. Follow these steps exactly.

## Step 1: Familiarize yourself with the task management system

Read `docs/task-management.md` to understand the full task management procedures, especially:
- How tasks move through `todo/` → `in-progress/` → `completed/`
- The Blocked-By dependency system
- The Touches file ownership system
- How to update `current-progress.md`

## Step 2: Assess current state

Read these in parallel:
1. `docs/tasks/current-progress.md`
2. List all files in `docs/tasks/todo/` and read each task file
3. List all files in `docs/tasks/in-progress/` and read each task file
4. List all files in `docs/tasks/completed/` (just filenames, don't need full contents)

## Step 3: Summarize status to the user

Present a clear summary including:
- **Overview**: What's the current state of the project?
- **In Progress**: Any tasks currently being worked on (with brief descriptions)
- **Ready to Implement**: Tasks in `todo/` that are unblocked (all Blocked-By dependencies in `completed/`) and can be started now
- **Blocked**: Tasks in `todo/` that still have unresolved dependencies, and what they're waiting on
- **Recently Completed**: What was finished recently

## Step 4: Ask which tasks to implement

Ask the user which of the **Ready to Implement** tasks they want to pick up. Present the ready tasks as options. Wait for the user's response.

## Step 5: Start the selected tasks

For each task the user selects, follow the "Beginning work on a task" procedure from `docs/task-management.md`:

1. **Verify dependencies**: Confirm all `Blocked-By` tasks are in `completed/`. If not, warn the user.
2. **Check Touches overlap**: Read `Touches` of all `in-progress/` tasks. Note any overlaps.
3. **Move the task file** from `todo/` to `in-progress/`.
4. **Get a fresh timestamp** by running `date '+%Y-%m-%d %H:%M:%S %Z'`.
5. **Update the task file**:
   - Set **Status** to `in-progress`
   - Set **Last Modified** to the fresh timestamp
   - Add a progress log entry: "Starting implementation."
6. **Update `docs/tasks/current-progress.md`**:
   - Remove the task from **Ready**
   - Add it to **In Progress**

After all selected tasks are started, confirm what was done and begin implementation.
