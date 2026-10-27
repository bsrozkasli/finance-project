# Decision: news category mapping for the `stock` tab

**Recorded:** 2026-10-27

**Decision input:** Delegated to the implementing agent. The product owner delegated follow-up decisions to the implementing agent (see the 2026-10-22 delegation), and this one is a small frontend display choice.

**Scope:** Frontend mapping only (`mapNewsCategory` in `frontend/src/hooks/useMarketContext.ts`, commit 8ed8709). No endpoint, DTO field, or backend change.

## Decision / Disposition

The backend `NewsCategory` value maps to the frontend `News['category']` as follows:

| Backend category | Frontend category |
| --- | --- |
| `TECHNOLOGY`, `AI` | `tech` |
| `PORTFOLIO`, `WATCHLIST` | `stock` |
| any other present category | `macro` |
| absent | `market` |

- **Contract:** unchanged. The wire values and field names stay as they are; only the client-side grouping changes. `PORTFOLIO` and `WATCHLIST` items were previously grouped as `macro` and now populate the `stock` tab.

## Limits (known consequence)

`DashboardHome.tsx` (`portfolioNewsList`, around line 476) keeps only `macro` items, or items whose symbol is held, when a portfolio is active.

- `PORTFOLIO` and `WATCHLIST` items were previously `macro` and were always shown. They are now `stock`.
- Those whose symbol is not held, or that have no symbol, no longer appear in that dashboard widget.
- Held-symbol items still appear and still sort first.
- **Accepted as intended:** the widget prioritizes held assets and macro news. No change was made to it.
- **Follow-up:** possible if watchlist news should show in that widget.

## Cost if wrong

A news tab shows the wrong grouping. No data, price, or persisted value changes. The revert is one function (`mapNewsCategory`).
