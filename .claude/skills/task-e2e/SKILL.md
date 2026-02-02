---
name: task-e2e
description: End-to-end task lifecycle — creates a task, starts it, implements it, and completes it in one session
disable-model-invocation: true
argument-hint: "<task title and brief description>"
---

# End-to-End Task Lifecycle

You are running the full lifecycle of a task: create → start → complete, all in one session. This skill orchestrates three existing skills in sequence. **Do not duplicate their logic** — invoke each skill's full procedure as written.

## Phase 1: Create the task

Follow every step of the `/task-create` skill (`.claude/skills/task-create/SKILL.md`).

**Checkpoint:** If the task was created successfully, proceed to Phase 2. If user input was needed (e.g., clarification on scope, acceptance criteria, or Touches), stop here, summarize what was accomplished, and wait for the user's response before continuing.

## Phase 2: Start the task

Follow every step of the `/task-start` skill (`.claude/skills/task-start/SKILL.md`), with these adjustments:

- **Skip Step 4 (asking which task to implement)** — the task to start is the one just created in Phase 1.
- All other steps (reading the task management system, assessing current state, gathering dependency context, moving the file, updating metadata and `current-progress.md`) must still be performed exactly as described.

**Checkpoint:** If the task was started successfully, proceed to Phase 3. If there is a blocker (e.g., unresolved dependencies, Touches conflicts with in-progress tasks that the user needs to adjudicate), stop here, summarize all progress so far (task created, what blocked the start), and wait for the user's response before continuing.

## Phase 3: Implement and complete the task

First, implement the task — do the actual work described in the task's Description and Acceptance Criteria.

Then follow every step of the `/task-complete` skill (`.claude/skills/task-complete/SKILL.md`), with these adjustments:

- **Skip Step 0 (identifying the task)** — the task to complete is the one from Phase 1/2.
- All other steps (reading the task management system, reviewing acceptance criteria, moving the file, updating metadata, updating `current-progress.md`, unblocking downstream tasks) must still be performed exactly as described.

**Checkpoint:** If any acceptance criteria are not met after implementation, stop here, summarize what was accomplished and what remains, and wait for the user's response before continuing.

## Error handling

At **any point** during this workflow, if an error occurs or user input is required to proceed:

1. **Stop immediately** — do not skip the blocking step or guess.
2. **Summarize progress** — list which phases completed successfully and what the current state is (e.g., "Task 20260201150000 created in `todo/`, not yet started").
3. **Explain the blocker** — what information or decision is needed.
4. **Wait for the user** — once they respond, resume from the exact phase/step where you stopped.
