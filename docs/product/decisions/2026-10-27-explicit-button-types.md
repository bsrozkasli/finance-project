# Explicit button types in the frontend

**Recorded:** 2026-10-27

**Decision input:** Delegated to the implementing agent by the product owner, who asked the agent to decide open items and record each decision. This is a frontend hardening choice with no product-owner-owned question behind it.

**Scope:** `type` attribute on `<button>` elements in `frontend/src/**/*.tsx`, and the guard that keeps it explicit. No endpoint, DTO, route, or backend change.
**State:** Closed.

## Audit correction

The audit reported 4 files and about 10 buttons as high priority. Verification found 41 untyped buttons in 10 component files, and none of them is inside a `<form>`. An untyped button defaults to `type="submit"`, but with no enclosing form that has no effect today. This is hardening with low priority, not a live defect.

## Decision

1. **Explicit type.** All 41 untyped buttons now carry `type="button"` (commit 6d30e15).
2. **Guard.** A static test, `frontend/src/components/buttonTypes.test.ts`, scans `src/**/*.tsx` and fails when a `<button` has no `type`. It was verified to cover all 43 tsx files.
3. **Rejected alternative.** `eslint-plugin-react` (`react/button-has-type`) would add a new dependency and lint configuration for one rule. The static test needs no new dependency and runs in the existing test command.

## Cost if wrong

The scan can report a false positive, for example `<button` inside a string, comment, or template literal. The fix is to edit the test only. No production source changes. A missed case (a false negative) leaves a button that behaves as it did before this change.

## Limits

- No behavior change is intended: no button was inside a form, so `type="button"` preserves current behavior.
- A future button inside a `<form>` that must submit needs an explicit `type="submit"`, which the guard accepts.
