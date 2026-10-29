# Evidence: audit-03 explicit button types and guard

**Date:** 2026-10-27
**Branch:** `fix/frontend-button-types` (base `5edd6e1`)
**Plan:** `docs/superpowers/plans/2026-10-27-audit-03-button-type-guard.md`

## Commits

| Commit | Message |
|---|---|
| `6d30e15` | `fix(frontend): declare explicit button types and guard against regressions` |
| `1c035e8` | `docs(spec): record explicit button type decision` |

## TDD

- Red: `frontend/src/components/buttonTypes.test.ts` written first; failed listing **41 offenders in 10 files**, matching the plan's verified count.
- Green: `type="button"` added as first attribute to those 41 opening tags only; guard passes (1/1).
- Controller review: all 41 diff line pairs differ only by `<button` -> `<button type="button"`; no already-typed button touched; no edit inside the forms at `PortfolioManagerView.tsx:784-818` or `TradeActionModal.tsx:89-189`; `ManageAssetsDrawer` and `TradingJournalView` untouched.
- Guard scope verified: `import.meta.glob('../**/*.tsx')` returns all 43 tsx files under `src` (the implementer's initial "components only" concern was disproved by the reviewer).

## Verification (fresh run, 2026-10-27, `frontend/`)

| Command | Result |
|---|---|
| `npm run lint` | exit 0 |
| `npm test` | 29 files / 187 tests passed, exit 0 |
| `npm run build` | built, exit 0 |

`package-lock.json` is not part of either commit; no dependency added.

## Review

Spec compliant, quality approved (Sonnet reviewer; no Critical/Important). Deferred minors: the scan is a regex/brace counter, not a parser (strings, comments, template literals could false-positive; fix is editing the test only); `path.includes('.test.')` is loose.

## Decision

Static test instead of `eslint-plugin-react`; audit severity corrected to low-priority hardening. See `docs/product/decisions/2026-10-27-explicit-button-types.md`.
