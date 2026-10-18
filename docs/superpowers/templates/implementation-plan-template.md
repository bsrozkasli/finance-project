# [Plan Set Name] Plan [N] — [Scope] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [One sentence describing the independently reviewable outcome of this plan.]

**Architecture:** [Two or three sentences explaining the approach, the boundary of this slice, and how it connects to the surrounding plans.]

**Tech Stack:** [Languages, frameworks, commands, and document formats used by this slice.]

**Plan Set:** Plan [N] of [M] in `[plan-set-index-path]`.

**Depends On:** [Exact predecessor plans and artifacts, or `None`.]

**Produces:** [Exact artifacts and contracts later plans consume.]

**Spec:** `[path-to-approved-spec-or-design]`

## Locked Decisions

- [Decision that an implementer must not reinterpret.]
- [Naming, data, contract, sequencing, or degradation decision.]
- [Explicitly deferred decision and the plan that owns it.]

## Global Constraints

- [Project-wide invariant copied exactly from the governing spec or repository instructions.]
- [Compatibility, data-integrity, privacy, or provider-degradation constraint.]
- [Working-tree or scope-preservation constraint.]

## Review Focus

- [Most likely high-impact failure mode and the task that proves the expected behavior.]
- [Second failure mode and its owning verification step.]
- [Continue until the five highest-risk uncovered conditions are represented.]

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `[exact/path]` | Create / Modify / Verify | [One clear responsibility.] |

---

## Task 1: [Independently Verifiable Outcome]

**Files:**
- Create: `[exact/path/to/new-file]`
- Modify: `[exact/path/to/existing-file:line]`
- Test: `[exact/path/to/test-file]`
- Verify: `[exact/path/or-contract]`

**Interfaces:**
- Consumes: [Exact artifact, function, type, ID family, or command from an earlier task/plan.]
- Produces: [Exact artifact, function signature, type, ID family, or evidence later work consumes.]
- Preserves: [Existing contract, endpoint, data, user change, or invariant that must not be altered.]

**Acceptance Evidence:**
- [Observable result.]
- [Command that proves it.]
- [Expected output or failure condition.]

- [ ] **Step 1: Write the failing test or validation gate**

Define the exact test name and assertions. For documentation-only work, create a machine-checkable validation fixture or state the deterministic precondition that must fail before the artifact exists.

- [ ] **Step 2: Run the focused check and confirm the expected failure**

Run: `[exact command]`

Expected: FAIL because `[specific missing behavior or artifact]`.

- [ ] **Step 3: Implement the smallest complete change**

Define the exact signature, schema, headings, IDs, or decision rules. Include a code block only when the algorithm or literal configuration cannot be inferred safely from the surrounding contract.

- [ ] **Step 4: Run the focused check and confirm it passes**

Run: `[exact command]`

Expected: PASS with `[specific observable output]`.

- [ ] **Step 5: Run the plan-level regression checks**

Run: `[exact commands for the affected runtime or documentation set]`

Expected: all commands exit `0`; unrelated working-tree state is unchanged.

- [ ] **Step 6: Commit atomically**

```powershell
git add [explicit paths only]
git diff --cached --check
git commit -m "<type>(<scope>): <imperative summary>"
```

---

## Plan Exit Criteria

- [ ] Every task has its own focused verification evidence.
- [ ] Every produced interface or artifact exists with the exact agreed name.
- [ ] Plan-level validation passes.
- [ ] No deferred work is represented as completed.
- [ ] Unrelated user changes remain unstaged and unmodified.

## Handoff to Plan [N+1]

- Inputs made available: [exact paths, IDs, commands, or interfaces].
- Conditions the next plan may assume: [verified facts only].
- Open risks carried forward: [risk, owner, and acceptance gate].

## Self-Review

**Spec coverage:** [Map every in-scope requirement to a task; list genuine out-of-scope items and their owning plan.]

**Step scan:** [Confirm each step requests one checkable action and contains neither vague placeholders nor unnecessary implementation transcripts.]

**Type and name consistency:** [Confirm paths, IDs, types, signatures, statuses, and commands match across tasks and neighboring plans.]

**Review focus:** [Confirm each high-risk condition is exercised by an owning task.]

**Proportion:** [Confirm the plan records decisions and proof, rather than rewriting the implementation or source specification.]
