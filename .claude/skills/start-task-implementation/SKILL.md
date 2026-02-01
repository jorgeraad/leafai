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

## Step 5: Gather dependency context

For each selected task, build a full picture of what was already built by traversing the dependency tree. Follow the "Gathering Dependency Context" procedure from `docs/task-management.md`:

1. **Traverse the ancestor chain**: Read the task's `Blocked-By` field. For each listed task ID, read the completed task file. Then read *that* task's `Blocked-By` and repeat, until you reach tasks with `Blocked-By: none`.
2. **Extract context from each ancestor**: Note its Description, Acceptance Criteria (delivered vs. descoped), Touches (files created/modified), and final progress log entry.
3. **Identify sibling tasks**: Find tasks (in any directory) that share at least one direct `Blocked-By` entry with the current task. Read those files and extract the same context.
4. **Present the context summary** structured as:

```
## Dependency Context for <TASK_ID>

### Ancestor Chain (root → current)
- **<ID> - <Title>** (completed): <summary>. Touches: `<paths>`.

### Sibling Tasks
- **<ID> - <Title>** (<status>): <summary>. Touches: `<paths>`.
```

Delegate this traversal to a sub-agent to keep the orchestrator's context clean.

## Step 6: Start the selected tasks

For each task the user selects, follow the "Beginning work on a task" procedure from `docs/task-management.md`:

1. **Verify dependencies**: Confirm all `Blocked-By` tasks are in `completed/`. If not, warn the user.
2. **Check Touches overlap**: Read `Touches` of all `in-progress/` tasks. Note any overlaps.
3. **Move the task file** from `todo/` to `in-progress/`.
4. **Get a fresh timestamp** by running `date '+%Y-%m-%d %H:%M:%S %Z'`.
5. **Update the task file**:
   - Set **Status** to `in-progress`
   - Set **Last Modified** to the fresh timestamp
   - Add a progress log entry: "Starting implementation." Include a brief reference to the dependency context gathered in Step 5 (e.g., key files/types that ancestors created).
6. **Update `docs/tasks/current-progress.md`**:
   - Remove the task from **Ready**
   - Add it to **In Progress**

After all selected tasks are started, confirm what was done and begin implementation. The dependency context summary from Step 5 should inform your implementation approach.
