# Design Document System

This document defines how design documents are created, structured, and maintained. **All agents must follow this system** when producing design docs.

---

## Table of Contents

1. [Purpose](#purpose)
2. [Directory Structure](#directory-structure)
3. [File Naming](#file-naming)
4. [Design Document Template](#design-document-template)
5. [Appendix Convention](#appendix-convention)
6. [The Design Process](#the-design-process)
7. [Slash Commands](#slash-commands)
8. [Rules](#rules)

---

## Purpose

Design documents capture the **what**, **why**, and **how** of a feature or system before implementation begins. They serve as:

- A shared reference for agents and humans during implementation.
- A record of decisions made, alternatives considered, and trade-offs accepted.
- The source of truth for interface contracts, schema definitions, and architectural choices.
- Input for the task management system — tasks are derived from the design doc's implementation plan.

A design doc is not a spec frozen in stone. It evolves through iterative Q&A with the user, and appendices are added as decisions are made. The final document should be comprehensive enough that an agent with no prior context can implement the feature by reading the doc alone.

---

## Directory Structure

```
docs/
  design-docs.md              # This file — the system definition
  design-docs/                 # All design documents live here
    YYYYMMDDHHmmss-short-name.md
    YYYYMMDDHHmmss-short-name.md
```

The original project design doc (`docs/design-claude.md`) predates this system. Future design docs go in `docs/design-docs/`.

---

## File Naming

Design document files use the same timestamp-prefix convention as task files:

```
YYYYMMDDHHmmss-short-kebab-case-name.md
```

The timestamp is generated at creation time:

```bash
date '+%Y%m%d%H%M%S'
```

Examples:
- `20260201160000-notification-system.md`
- `20260201173045-vector-search-pipeline.md`
- `20260202090000-team-workspaces.md`

---

## Design Document Template

Every design doc must use this structure. Sections can be expanded or reduced based on the feature's complexity, but the skeleton must be present.

````markdown
# <Feature Name> — Design Document

| Field             | Value |
|-------------------|-------|
| **Created**       | YYYY-MM-DD HH:MM:SS TZ |
| **Last Modified** | YYYY-MM-DD HH:MM:SS TZ |
| **Status**        | draft / review / approved / implemented |
| **Author**        | <agent name or human> |

## Overview

A 2–4 sentence summary of what this feature is, why it exists, and who it serves. A reader should understand the purpose of the entire document from this section alone.

---

## Goals & Non-Goals

### Goals
- What this feature will accomplish (bulleted list).

### Non-Goals
- What is explicitly out of scope and why.

---

## Architecture / Design

The core technical design. Include:
- Architecture diagrams (ASCII art or Mermaid) where helpful.
- Data flow descriptions.
- Key components and how they interact.

Structure this section with subsections as needed (e.g., "### Database Schema", "### API Design", "### UI Components").

---

## Tech Stack & Dependencies

| Layer | Technology | Justification |
|-------|-----------|---------------|
| ... | ... | ... |

List any new dependencies this feature introduces and why they were chosen over alternatives.

---

## Interface Contracts

Define the TypeScript interfaces, API signatures, and database schemas that form the boundaries between subsystems. These contracts enable parallel implementation.

```typescript
// Example: function signatures, type definitions, API shapes
```

---

## Implementation Plan

### Task Breakdown

Break the feature into discrete, parallelizable tasks. For each task, specify:
- **Overview**: What the task accomplishes.
- **File Ownership**: Which files it creates or modifies.
- **Dependencies**: Which other tasks must complete first.
- **Interface Contract**: What it produces and consumes.
- **Tests**: What tests verify correctness.
- **Done When**: Clear completion criteria.

### Dependency Graph

Show which tasks depend on which (ASCII art or list format).

### Execution Waves

Group tasks into waves that can run in parallel.

---

## Security Considerations

Enumerate security implications: authentication, authorization, data protection, input validation, etc. Reference OWASP top 10 where applicable.

---

## Future Considerations

Things explicitly deferred to later. This section prevents scope creep while acknowledging known gaps.

---

## Appendices

Appendices are added during the iterative design process. Each appendix captures a question that was raised, the options considered, and the decision made.

### Appendix Naming

Appendices are lettered sequentially: Appendix A, Appendix B, Appendix C, etc.

### Appendix Structure

Each appendix follows this format:

```markdown
## Appendix X: <Topic Title>

### The Question

What specific question or concern was raised? Who raised it (user or agent)?

### Options Considered

#### Option 1: <Name>
Description, pros, cons.

#### Option 2: <Name>
Description, pros, cons.

(Add more options as needed.)

### Verdict: <Chosen Option>

Why this option was chosen. What trade-offs were accepted. How it impacts the rest of the design.

### Impact on Design

What sections of the main design were updated as a result of this decision. (Optional — include when the decision caused changes to earlier sections.)
```
````

---

## Appendix Convention

Appendices are the mechanism for recording design decisions made during the iterative Q&A process. They serve as a decision log that future readers can reference to understand *why* the design looks the way it does.

**When to create an appendix:**
- When the user raises a question or concern about the design.
- When the agent identifies an ambiguity, trade-off, or decision point that has multiple valid approaches.
- When a design choice has non-obvious implications that should be documented.

**Appendix content should:**
- Present all reasonable options, not just the chosen one.
- Include concrete pros and cons for each option.
- State the verdict clearly and explain the reasoning.
- Note any impact on the main design sections (e.g., "This changed the schema in Section 3").

The existing project design doc (`docs/design-claude.md`) has 8 appendices (A through H) that serve as examples of this convention in practice.

---

## The Design Process

Creating a design doc is an **iterative, conversational process** between the agent and the user. The agent does not write the doc in one pass and present it as finished. Instead:

### Phase 1: Discovery

1. **Understand the request.** Ask the user what they want to build and why. Clarify the scope — what's in, what's out.
2. **Research the codebase.** Explore existing code, patterns, and conventions. Understand what already exists and what the new feature integrates with.
3. **Research external documentation.** Look up the APIs, libraries, and frameworks involved. Never rely on memorized knowledge for library APIs.
4. **Identify open questions.** List every ambiguity, trade-off, or decision point you can find. These become the seeds for appendices.

### Phase 2: First Draft

5. **Write the initial draft.** Fill out all sections of the template with your best understanding. Mark areas of uncertainty explicitly (e.g., "TBD pending user input on X").
6. **Present the draft to the user.** Walk through the key decisions and flag the open questions.

### Phase 3: Iterative Refinement

7. **Ask questions.** For each open question or design decision, present the options with pros/cons and ask the user for their preference. Ask probing questions:
   - "Have you considered X?"
   - "This approach means Y — is that acceptable?"
   - "There's a tension between A and B. Which do you prioritize?"
8. **Record decisions as appendices.** Each resolved question becomes an appendix with the full analysis.
9. **Update the main design.** After each decision, update the relevant sections of the doc to reflect the choice. The appendix explains *why*; the main sections show *what*.
10. **Repeat.** Continue asking questions and refining until all sections are complete and the user is satisfied.

### Phase 4: Finalization

11. **Review completeness.** Ensure every section is filled out, all TBDs are resolved, and the implementation plan has enough detail for agents to work from.
12. **Set status to `approved`.** The doc is ready for implementation.

### What Makes a Good Design Process

- **Ask more questions, not fewer.** It's better to over-clarify than to make assumptions. The appendices in `design-claude.md` (workflow mapping, realtime vs streaming, token strategy, encryption, etc.) came from asking probing questions.
- **Challenge assumptions.** If the user suggests an approach, think through the implications. If there's a better way, present it as an option.
- **Be concrete.** Show code snippets, schema examples, and interface definitions — not just prose descriptions.
- **Think about edge cases.** Security, error handling, scaling, migration paths, future extensibility.
- **Reference existing patterns.** The codebase has conventions. New features should follow them unless there's a good reason not to.

---

## Slash Commands

| Command | Description |
|---------|-------------|
| `/design-doc` | Start the design document creation process. Guides the user through discovery, drafting, and iterative refinement. |

---

## Rules

1. **All design docs go in `docs/design-docs/`.** Use the timestamp-prefix naming convention.
2. **Follow the template.** Every section must be present, even if some are brief.
3. **Iterate with the user.** Never present a design doc as final without going through the Q&A process.
4. **Record decisions as appendices.** Every non-trivial design choice gets an appendix with options, analysis, and verdict.
5. **Update the main design when appendices change it.** The appendix is the *why*; the main sections are the *what*. Both must stay in sync.
6. **Research before designing.** Look up documentation for every library and API involved. Do not guess at APIs.
7. **Keep the doc self-contained.** A reader with no prior context should be able to understand and implement the feature from the design doc alone.
8. **Timestamps come from `date`.** Never guess. Run the command.
9. **Status must be accurate.** `draft` while iterating, `review` when presented for final approval, `approved` when ready for implementation, `implemented` when all tasks are complete.
10. **Reference the design doc from tasks.** When tasks are created from a design doc, they should include it in their `References` field.
