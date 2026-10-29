# Evidence: audit-02 news "Varlık haberleri" category mapping

**Date:** 2026-10-27
**Branch:** `fix/news-stock-category` (base `5edd6e1`)
**Plan:** `docs/superpowers/plans/2026-10-27-audit-02-news-stock-category.md`

## Commits

| Commit | Message |
|---|---|
| `8ed8709` | `fix(frontend): map portfolio and watchlist news to the asset news tab` |
| `2c81b7b` | `docs(spec): record news category mapping decision` |

## TDD

- Red: new `PORTFOLIO`/`WATCHLIST` hook cases failed (received `'macro'`); 2 failed, 9 passed in the two target files.
- Green: `mapNewsCategory` added to `useMarketContext.ts` (TECHNOLOGY/AI -> tech, PORTFOLIO/WATCHLIST -> stock, other present -> macro, absent -> market); 11/11 pass.
- `NewsFeedView` test passed immediately because the view already handled `'stock'`; kept as a contract test between the mapper output and the tab filter (visible under "Varlık haberleri", hidden under "Makroekonomi").

## Verification (fresh run, 2026-10-27, `frontend/`)

| Command | Result |
|---|---|
| `npm run lint` | exit 0 |
| `npm test` | 28 files / 190 tests passed, exit 0 |
| `npm run build` | built, exit 0 |

`package-lock.json` not committed; no endpoint or DTO change.

## Review

Spec compliant, quality approved (Sonnet reviewer; no Critical/Important).
Known consequence (recorded in the decision note, accepted): `DashboardHome.tsx` `portfolioNewsList` keeps only `'macro'` or held-symbol items, so PORTFOLIO/WATCHLIST items for unheld or symbol-less assets no longer appear in that widget when a portfolio is active; held-symbol items still appear first.
Deferred minors: `AI` -> tech and absent -> market are not covered by the new tests.

## Decision

See `docs/product/decisions/2026-10-27-news-stock-category-mapping.md`.
