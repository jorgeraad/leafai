---
name: design-doc
description: Start the iterative design document creation process — research, draft, ask questions, refine, and finalize a design doc
disable-model-invocation: true
argument-hint: "<feature description>"
---

# Design Document Creation

You are starting the design document creation process. This is an **iterative, conversational** workflow. You will research, draft, ask questions, refine, and repeat until the design is complete.

**Before anything else**, read `docs/design-docs.md` to understand the full design document system, template, and conventions.

## Step 1: Understand the Request

Ask the user what they want to build. If they provided a description in the command arguments, use that as a starting point. Clarify:

- **What** is the feature or system?
- **Why** does it need to exist? What problem does it solve?
- **Who** is it for?
- **What's in scope** for this design? What's explicitly out?

If the user's description is vague, ask targeted questions to narrow the scope before proceeding. Do not start drafting until you have a clear understanding of what's being designed.

## Step 2: Research

Before writing anything, gather context. Run these in parallel where possible:

### Codebase Research
- Explore the existing codebase to understand current architecture, patterns, and conventions.
- Identify what already exists that the new feature will integrate with or build upon.
- Read existing design docs (`docs/design-claude.md`, anything in `docs/design-docs/`) for established patterns and decisions.
- Read `CLAUDE.md` for project conventions.

### External Documentation Research
- Look up documentation for every library, framework, and API the feature will involve.
- Use the Context7 MCP tools (`resolve-library-id` + `query-docs`) for library documentation.
- Use `WebSearch` and `WebFetch` for API docs, best practices, and reference architectures.
- **Never rely on memorized knowledge for library APIs.** Always verify against current docs.

### Prior Art
- Search for how similar features are implemented in well-known open-source projects.
- Note patterns, pitfalls, and best practices from the research.

## Step 3: Identify Open Questions

Before drafting, compile a list of every ambiguity, trade-off, and decision point you've identified. Categorize them:

- **Architecture decisions**: How should the system be structured? What components are needed?
- **Technology choices**: Which libraries/tools? What trade-offs between options?
- **Data modeling**: What's the schema? How does data flow?
- **Security**: What are the security implications? How are credentials/tokens handled?
- **Integration**: How does this connect to existing systems?
- **Scope**: What should be deferred to future work?
- **Edge cases**: What happens when things go wrong?

Present this list to the user. Some questions you can answer from research; others need user input. Ask the critical ones now — the answers will shape the first draft.

## Step 4: Write the First Draft

Create the design doc file:

1. Run `date '+%Y%m%d%H%M%S'` for the filename timestamp.
2. Run `date '+%Y-%m-%d %H:%M:%S %Z'` for the metadata timestamps.
3. Create the file in `docs/design-docs/` using the template from `docs/design-docs.md`.
4. Fill out every section with your best understanding. Where you're uncertain, write your best guess and mark it with `<!-- TBD: description of what needs to be resolved -->`.
5. Set status to `draft`.

The first draft should be substantive — not a skeleton with TODOs everywhere. Use your research to make concrete proposals for architecture, schema, interfaces, and implementation plan.

## Step 5: Present and Iterate

Present the draft to the user. For each section, highlight:
- Key decisions you made and why.
- Areas where you're uncertain and need input.
- Trade-offs you identified.

Then begin the iterative Q&A loop:

### For Each Open Question or Design Decision:

1. **Present the question clearly.** Explain why it matters.
2. **Show the options.** For each option, provide:
   - A concrete description (with code/schema examples where relevant).
   - Pros and cons.
   - Your recommendation (if you have one) and why.
3. **Ask the user** for their preference or concerns.
4. **Record the decision** as an appendix in the design doc (following the appendix convention from `docs/design-docs.md`).
5. **Update the main design sections** to reflect the decision.

### Probing Questions to Ask

Don't just answer questions the user raises — proactively ask about:

- **Scalability**: "This works for N users, but what happens at 10N? 100N?"
- **Error handling**: "What should happen when X fails? Should it retry, surface to the user, or fail silently?"
- **Security**: "This stores/transmits sensitive data. Have we considered encryption at rest? In transit? Access control?"
- **Migration**: "If we need to change this later, how hard is the migration?"
- **Consistency**: "This diverges from the existing pattern in X. Is that intentional?"
- **Dependencies**: "This relies on library X. What's our fallback if it's deprecated or has breaking changes?"
- **Testing**: "How do we test this? What's hard to test?"
- **User experience**: "From the user's perspective, what does this look like? Are there confusing edge cases?"
- **Integration**: "How does this interact with existing feature Y?"
- **Performance**: "Is there a hot path here? What's the expected latency/throughput?"

### When the User Raises a Concern

1. Take it seriously — don't dismiss concerns.
2. Research if needed (look up docs, check the codebase).
3. Present options for addressing the concern.
4. Record the resolution as an appendix.

### Iterate Until Complete

Continue the Q&A loop until:
- All TBDs in the doc are resolved.
- The user has no more questions or concerns.
- Every section of the template is substantively filled out.
- The implementation plan is detailed enough for agents to work from independently.

## Step 6: Finalize

1. Review the complete document for consistency — do the appendix decisions match what's in the main sections?
2. Ensure the implementation plan has:
   - Clear task breakdown with file ownership.
   - Dependency graph showing which tasks can run in parallel.
   - Interface contracts defined before implementation tasks.
   - Test plans for each task.
3. Run `date '+%Y-%m-%d %H:%M:%S %Z'` and update **Last Modified**.
4. Set **Status** to `review`.
5. Present the final document to the user for approval.
6. Once approved, set **Status** to `approved`.

## Important Reminders

- **This is iterative.** Do not try to produce a perfect document in one pass. The value is in the back-and-forth with the user.
- **Appendices are first-class.** They are not afterthoughts — they document the reasoning behind the design. A design doc with 5-8 appendices is healthier than one with zero.
- **Be concrete.** Show TypeScript interfaces, SQL schemas, API request/response shapes. Abstract prose is less useful than concrete examples.
- **Research everything.** Check library docs, codebase patterns, and best practices before proposing solutions.
- **Challenge the user when appropriate.** If they propose something that has downsides, present the downsides honestly and offer alternatives.
- **Reference `docs/design-claude.md`** as an example of a well-structured design doc with thorough appendices.
